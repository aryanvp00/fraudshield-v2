import sys
import json
import pickle
import numpy as np
import os

script_dir = os.path.dirname(os.path.abspath(__file__))

# Load model + encoder
with open(os.path.join(script_dir, 'model.pkl'), 'rb') as f:
    model = pickle.load(f)

with open(os.path.join(script_dir, 'label_encoder.pkl'), 'rb') as f:
    le = pickle.load(f)

# Read input from Node.js (passed as JSON string argument)
input_data = json.loads(sys.argv[1])

txn_type   = input_data.get('type', 'TRANSFER')
amount     = float(input_data.get('amount', 0))
oldbalOrg  = float(input_data.get('oldbalanceOrg', 0))
newbalOrg  = float(input_data.get('newbalanceOrig', 0))
oldbalDest = float(input_data.get('oldbalanceDest', 0))
newbalDest = float(input_data.get('newbalanceDest', 0))
step       = int(input_data.get('step', 1))

# Encode type safely
known_classes = list(le.classes_)
if txn_type not in known_classes:
    txn_type = 'TRANSFER'
type_encoded = int(le.transform([txn_type])[0])

# Derived features — must match train.py exactly
hour = step % 24
is_night = 1 if (hour >= 22 or hour <= 5) else 0
amount_ratio = amount / (oldbalOrg + 1)
sender_balance_change = oldbalOrg - newbalOrg
receiver_balance_change = newbalDest - oldbalDest
balance_mismatch = abs(sender_balance_change - amount)
dest_prev_zero = 1 if oldbalDest == 0 else 0
orig_emptied = 1 if newbalOrg == 0 else 0

features = np.array([[
    type_encoded, amount, oldbalOrg, newbalOrg,
    oldbalDest, newbalDest, hour, is_night,
    amount_ratio, sender_balance_change, receiver_balance_change,
    balance_mismatch, dest_prev_zero, orig_emptied
]])

# Predict
fraud_prob = float(model.predict_proba(features)[0][1])
is_fraud = bool(model.predict(features)[0])
fraud_percent = round(fraud_prob * 100, 2)

# Verdict
if fraud_percent >= 70:
    verdict = "FRAUD"
elif fraud_percent >= 40:
    verdict = "SUSPICIOUS"
else:
    verdict = "SAFE"

# Explainability — which features contributed most
importances = model.feature_importances_
feature_names = [
    'type_encoded', 'amount', 'oldbalanceOrg', 'newbalanceOrig',
    'oldbalanceDest', 'newbalanceDest', 'hour', 'is_night',
    'amount_ratio', 'sender_balance_change', 'receiver_balance_change',
    'balance_mismatch', 'dest_prev_zero', 'orig_emptied'
]
feature_values = features[0]
reasons = []

if amount > 200000:
    reasons.append({"factor": "High Transaction Amount", "contribution": round(float(importances[1]) * 100, 1)})
if is_night:
    reasons.append({"factor": "Late Night Transaction", "contribution": round(float(importances[7]) * 100, 1)})
if orig_emptied:
    reasons.append({"factor": "Sender Account Emptied", "contribution": round(float(importances[13]) * 100, 1)})
if dest_prev_zero:
    reasons.append({"factor": "Receiver Had Zero Balance (Mule?)", "contribution": round(float(importances[12]) * 100, 1)})
if balance_mismatch > 1000:
    reasons.append({"factor": "Balance Mismatch Detected", "contribution": round(float(importances[11]) * 100, 1)})
if txn_type in ['TRANSFER', 'CASH_OUT']:
    reasons.append({"factor": f"High-Risk Transaction Type ({txn_type})", "contribution": round(float(importances[0]) * 100, 1)})

result = {
    "fraud_probability": fraud_percent,
    "verdict": verdict,
    "confidence": "HIGH" if fraud_percent > 80 or fraud_percent < 20 else "MEDIUM",
    "anomaly_score": round(fraud_prob, 4),
    "reasons": reasons[:5],
    "features_used": {
        "type": txn_type,
        "amount": amount,
        "hour": hour,
        "is_night": bool(is_night),
        "orig_emptied": bool(orig_emptied),
        "balance_mismatch": round(balance_mismatch, 2)
    }
}

print(json.dumps(result))
