import numpy as np
import pandas as pd

np.random.seed(42)

SAMPLES = 10000

data = []

for _ in range(SAMPLES):

    mq2_level = np.random.uniform(0.02, 0.12)
    mq2_delta = np.random.uniform(0.0, 0.02)
    mq7_level = np.random.uniform(0.02, 0.15)
    mq7_delta = np.random.uniform(0.0, 0.02)

    temp_delta = np.random.uniform(-1, 2)
    humidity_delta = np.random.uniform(-5, 5)

    acc_mag = np.random.uniform(0.9, 1.5)
    acc_rms = np.random.uniform(0.05, 0.2)
    acc_variance = np.random.uniform(0.001, 0.03)
    dominant_freq = np.random.uniform(0.5, 3)
    anomaly_duration = np.random.uniform(0, 3)

    fire = 0
    smoke = 0
    co_gas = 0
    structural = 0

    scenario = np.random.choice(
        ["normal","fire","smoke","co","structural",
         "fire_struct","smoke_co","fire_co","all"],
        p=[0.40,0.12,0.10,0.10,0.10,0.07,0.05,0.04,0.02]
    )

    if scenario in ["fire","fire_struct","fire_co","all"]:
        mq2_level = np.random.uniform(0.20, 0.55)
        mq2_delta = np.random.uniform(0.05, 0.20)
        temp_delta = np.random.uniform(6, 12)
        humidity_delta = np.random.uniform(-20, -8)
        anomaly_duration = np.random.uniform(6, 20)
        fire = 1
        smoke = 1  

    if scenario in ["smoke","smoke_co"]:
        mq2_level = np.random.uniform(0.18, 0.40)
        mq2_delta = np.random.uniform(0.05, 0.15)
        temp_delta = np.random.uniform(2, 5)
        anomaly_duration = np.random.uniform(6, 15)
        smoke = 1

    if scenario in ["co","smoke_co","fire_co","all"]:
        mq7_level = np.random.uniform(0.22, 0.60)
        mq7_delta = np.random.uniform(0.05, 0.20)
        anomaly_duration = np.random.uniform(6, 20)
        co_gas = 1

    if scenario in ["structural","fire_struct","all"]:
        acc_mag = np.random.uniform(2.2, 3.5)
        acc_rms = np.random.uniform(0.35, 0.9)
        acc_variance = np.random.uniform(0.06, 0.2)
        dominant_freq = np.random.uniform(5.5, 10)
        anomaly_duration = np.random.uniform(6, 25)
        structural = 1

    data.append([
        mq2_level,
        mq2_delta,
        mq7_level,
        mq7_delta,
        temp_delta,
        humidity_delta,
        acc_mag,
        acc_rms,
        acc_variance,
        dominant_freq,
        anomaly_duration,
        fire,
        smoke,
        co_gas,
        structural
    ])

columns = [
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
    "anomaly_duration",
    "fire",
    "smoke",
    "co_gas",
    "structural"
]

df = pd.DataFrame(data, columns=columns)
df.to_csv("realistic_multilabel_dataset.csv", index=False)

print("Dataset generated successfully.")
print(df.head())
