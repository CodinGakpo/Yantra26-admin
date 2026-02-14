import pandas as pd
import joblib
import time
from collections import deque
import os
from datetime import datetime
import requests
import json


STREAM_FILE = "sensor_logs.csv"
MODEL_PATH = "hazard_multilabel_fscst_rf.pkl"
ALERT_API = "http://localhost:8000/api/hazard-alert"
ALERT_LOG = "alerts_log.csv"
BUFFER_SIZE = 5
CONSISTENCY_THRESHOLD = 2

FEATURE_COLUMNS = [
    "mq2_level",
    "mq2_delta",
    "mq7_level",
    "mq7_delta",
    "temp_delta",
    "humidity_delta",
    "acc_mag",
    "acc_rms",
    "acc_variance",
    "dominant_freq",
    "anomaly_duration"
]

HAZARD_INDEX = {
    "FIRE": 0,
    "SMOKE": 1,
    "CO_GAS": 2,
    "STRUCTURAL": 3
}

DEPARTMENT_MAP = {
    "FIRE": "Fire Department",
    "SMOKE": "Fire Department",
    "CO_GAS": "Fire Department",
    "STRUCTURAL": "Public Works Department"
}

model = joblib.load(MODEL_PATH)

prediction_buffer = deque(maxlen=BUFFER_SIZE)
last_row_count = 0
active_hazards = set()


if not os.path.exists(ALERT_LOG):
    with open(ALERT_LOG, "w") as f:
        f.write("time,type,hazard,dept,latitude,longitude,details\n")

print("Monitoring stream...\n")


while True:

    if not os.path.exists(STREAM_FILE):
        time.sleep(1)
        continue

    df = pd.read_csv(STREAM_FILE)
    current_row_count = len(df)

    if current_row_count > last_row_count:

        new_rows = df.iloc[last_row_count:current_row_count]

        for _, row in new_rows.iterrows():

            timestamp = datetime.now().strftime("%Y-%m-%d %H:%M:%S")
            latitude = row.get("latitude", None)
            longitude = row.get("longitude", None)

            X = pd.DataFrame([row[FEATURE_COLUMNS].values],
                             columns=FEATURE_COLUMNS)

            prediction = model.predict(X)[0]
            prediction_buffer.append(prediction)

            print("Raw Prediction:", prediction)

            with open(ALERT_LOG, "a") as f:
                f.write(
                    f"{timestamp},PREDICTION,NONE,NONE,{latitude},{longitude},\"{list(prediction)}\"\n"
                )

            if len(prediction_buffer) >= BUFFER_SIZE:

                hazard_counts = {
                    name: sum(p[idx] for p in prediction_buffer)
                    for name, idx in HAZARD_INDEX.items()
                }

                current_detected = set()

                for hazard, count in hazard_counts.items():
                    if count >= CONSISTENCY_THRESHOLD:
                        current_detected.add(hazard)

               
                for hazard in current_detected:
                    if hazard not in active_hazards:

                        dept = DEPARTMENT_MAP[hazard]

                        message = {
                            "time": timestamp,
                            "hazard": hazard,
                            "dept": dept,
                            "latitude": latitude,
                            "longitude": longitude,
                            "sensor_values": row.to_dict()
                        }

                        print(f"\n ALERT: {hazard} → {dept}")
                        print("DETAILS:", message)

                        # Log activation
                        with open(ALERT_LOG, "a") as f:
                            f.write(
                                f"{timestamp},ALERT,{hazard},{dept},{latitude},{longitude},\"ACTIVATED\"\n"
                            )

                        try:
                            requests.post(ALERT_API, json=message, timeout=2)
                        except:
                            print("⚠ Server not reachable — logged locally")

                        active_hazards.add(hazard)

             
                resolved = active_hazards - current_detected
                for hazard in resolved:

                    dept = DEPARTMENT_MAP[hazard]

                    print(f"✔ {hazard} CLEARED")

                    with open(ALERT_LOG, "a") as f:
                        f.write(
                            f"{timestamp},CLEAR,{hazard},{dept},{latitude},{longitude},\"RESOLVED\"\n"
                        )

                    active_hazards.remove(hazard)

        last_row_count = current_row_count

    time.sleep(1)
