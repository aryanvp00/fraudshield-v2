import pandas as pd
from sklearn.ensemble import RandomForestClassifier
from sklearn.model_selection import train_test_split
from sklearn.preprocessing import LabelEncoder
import pickle, json, sys, os
from features import FEATURES, engineer, compute_metrics

print("Loading dataset...")
csv_path = sys.argv[1] if len(sys.argv) > 1 else "data.csv"
df = pd.read_csv(csv_path)
print(f"Dataset loaded: {len(df)} rows")

le = LabelEncoder().fit(df['type'])
X = engineer(df, le)
y = df['isFraud']
print(f"Fraud cases: {y.sum()} ({y.mean()*100:.2f}%)")

# Stratified hold-out split: test set keeps the same tiny fraud ratio
X_train, X_test, y_train, y_test = train_test_split(
    X, y, test_size=0.2, random_state=42, stratify=y
)

print("Training Random Forest (this takes 2-3 min on full dataset)...")
model = RandomForestClassifier(
    n_estimators=100, class_weight={0: 1, 1: 10},
    random_state=42, n_jobs=-1, max_depth=20
)
model.fit(X_train, y_train)

# ── EVALUATE (precision / recall / F1 / AUC-PR; accuracy is NOT the headline) ──
proba = model.predict_proba(X_test)[:, 1]
metrics = compute_metrics(y_test, proba)
print(f"Precision: {metrics['precision']:.4f}  Recall: {metrics['recall']:.4f}  "
      f"F1: {metrics['f1']:.4f}  AUC-PR: {metrics['auc_pr']:.4f}")
print(f"Confusion matrix: {metrics['confusion_matrix']}")

script_dir = os.path.dirname(os.path.abspath(__file__))
with open(os.path.join(script_dir, 'model.pkl'), 'wb') as f:
    pickle.dump(model, f)
with open(os.path.join(script_dir, 'label_encoder.pkl'), 'wb') as f:
    pickle.dump(le, f)

metadata = {
    "metrics": metrics,
    "evaluation": "Stratified 80/20 hold-out, random_state=42, threshold 0.5",
    "features": FEATURES,
    "fraud_rate": round(float(y.mean() * 100), 2),
    "train_size": int(len(X_train)),
    "test_size": int(len(X_test)),
    "feature_importance": dict(zip(FEATURES, model.feature_importances_.tolist())),
    "type_classes": le.classes_.tolist(),
}
with open(os.path.join(script_dir, 'metadata.json'), 'w') as f:
    json.dump(metadata, f, indent=2)

print("\n✅ Model saved → ml/model.pkl")
print(json.dumps({"status": "done", "precision": metrics["precision"], "recall": metrics["recall"],
                  "f1": metrics["f1"], "auc_pr": metrics["auc_pr"]}))
