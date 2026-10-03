"""Compute real metrics for the EXISTING model.pkl without retraining.
Uses the same stratified split as train.py (test_size=0.2, random_state=42), so the
test set is the same held-out 20% the model never saw.

Usage (from ml/):  python3 evaluate.py /path/to/PS_20174392719_1491204439457_log.csv
"""
import sys, os, json, pickle
import pandas as pd
from sklearn.model_selection import train_test_split
from features import FEATURES, engineer, compute_metrics

here = os.path.dirname(os.path.abspath(__file__))
if len(sys.argv) < 2:
    sys.exit("Usage: python3 evaluate.py /path/to/paysim.csv")

model = pickle.load(open(os.path.join(here, 'model.pkl'), 'rb'))
le = pickle.load(open(os.path.join(here, 'label_encoder.pkl'), 'rb'))

df = pd.read_csv(sys.argv[1])
X, y = engineer(df, le), df['isFraud']
_, X_test, _, y_test = train_test_split(X, y, test_size=0.2, random_state=42, stratify=y)

m = compute_metrics(y_test, model.predict_proba(X_test)[:, 1])
print(json.dumps(m, indent=2))

meta_path = os.path.join(here, 'metadata.json')
meta = json.load(open(meta_path)) if os.path.exists(meta_path) else {}
meta.pop("accuracy", None)  # remove the misleading headline number
meta["metrics"] = m
meta["evaluation"] = "Stratified 80/20 hold-out, random_state=42, threshold 0.5"
meta["test_size"] = int(len(X_test))
json.dump(meta, open(meta_path, 'w'), indent=2)
print("\n✅ metadata.json updated")
