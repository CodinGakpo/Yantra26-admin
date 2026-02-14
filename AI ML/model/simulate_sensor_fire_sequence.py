import pandas as pd
import time
import os
from datetime import datetime
import numpy as np

STREAM_FILE = "sensor_logs.csv"
DELAY_SECONDS = 1
DEVICE_ID = "ESP32_01"

BASE_LAT = 12.9692
BASE_LONG = 79.1559

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

if os.path.exists(STREAM_FILE):
    os.remove(STREAM_FILE)

print("Simulating 30-step hazard escalation with GPS...\n")

rows = []

# 1–5 Normal
for _ in range(5):
    rows.append([0.08,0.01,0.09,0.01,0.5,-1,1.1,0.1,0.01,1.5,1])

# 6–10 Light Smoke
for _ in range(5):
    rows.append([0.20,0.05,0.10,0.02,3.0,-2,1.2,0.15,0.02,2.0,7])

# 11–15 Fire Begins
for _ in range(5):
    rows.append([0.35,0.12,0.12,0.02,7.0,-10,1.3,0.18,0.02,2.5,10])

# 16–22 Fire + Smoke + CO
for _ in range(7):
    rows.append([0.45,0.18,0.30,0.10,9.0,-15,1.5,0.22,0.03,3.0,15])

# 23–26 Severe
for _ in range(4):
    rows.append([0.50,0.20,0.40,0.15,11.0,-18,1.6,0.25,0.04,3.5,18])

# 27–30 Recovery
for _ in range(4):
    rows.append([0.10,0.02,0.10,0.02,1.0,-2,1.2,0.12,0.02,2.0,3])


for i, values in enumerate(rows):

    row = pd.DataFrame([values], columns=FEATURE_COLUMNS)

    row["timestamp"] = datetime.now().strftime("%Y-%m-%d %H:%M:%S")
    row["device_id"] = DEVICE_ID

  
    lat_noise = np.random.uniform(-0.00005, 0.00005)
    long_noise = np.random.uniform(-0.00005, 0.00005)

    row["latitude"] = BASE_LAT + lat_noise
    row["longitude"] = BASE_LONG + long_noise

    ordered_columns = [
        "timestamp",
        "device_id",
        "latitude",
        "longitude"
    ] + FEATURE_COLUMNS

    row = row[ordered_columns]

    write_header = not os.path.exists(STREAM_FILE)

    row.to_csv(STREAM_FILE, mode="a", header=write_header, index=False)

    print(f"Streamed row {i+1}")
    time.sleep(DELAY_SECONDS)

print("\nSimulation complete.")
