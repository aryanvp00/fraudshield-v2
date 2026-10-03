"""Shared feature engineering. Must match predict.py exactly."""
import pandas as pd

FEATURES = [
    'type_encoded', 'amount', 'oldbalanceOrg', 'newbalanceOrig',
    'oldbalanceDest', 'newbalanceDest', 'hour', 'is_night',
    'amount_ratio', 'sender_balance_change', 'receiver_balance_change',
    'balance_mismatch', 'dest_prev_zero', 'orig_emptied'
]

def engineer(df: pd.DataFrame, le) -> pd.DataFrame:
    df = df.copy()
    df['type_encoded'] = le.transform(df['type'])
    df['hour'] = df['step'] % 24
    df['is_night'] = ((df['hour'] >= 22) | (df['hour'] <= 5)).astype(int)
    df['amount_ratio'] = df['amount'] / (df['oldbalanceOrg'] + 1)
    df['sender_balance_change'] = df['oldbalanceOrg'] - df['newbalanceOrig']
    df['receiver_balance_change'] = df['newbalanceDest'] - df['oldbalanceDest']
    df['balance_mismatch'] = (df['sender_balance_change'] - df['amount']).abs()
    df['dest_prev_zero'] = (df['oldbalanceDest'] == 0).astype(int)
    df['orig_emptied'] = (df['newbalanceOrig'] == 0).astype(int)
    return df[FEATURES]

def compute_metrics(y_true, proba, threshold=0.5):
    """Imbalance-aware metrics on a held-out set."""
    from sklearn.metrics import (precision_score, recall_score, f1_score,
                                 average_precision_score, roc_auc_score,
                                 confusion_matrix, accuracy_score)
    pred = (proba >= threshold).astype(int)
    tn, fp, fn, tp = confusion_matrix(y_true, pred).ravel()
    return {
        "precision": round(float(precision_score(y_true, pred, zero_division=0)), 4),
        "recall": round(float(recall_score(y_true, pred, zero_division=0)), 4),
        "f1": round(float(f1_score(y_true, pred, zero_division=0)), 4),
        "auc_pr": round(float(average_precision_score(y_true, proba)), 4),
        "roc_auc": round(float(roc_auc_score(y_true, proba)), 4),
        "accuracy": round(float(accuracy_score(y_true, pred)), 6),  # misleading on imbalanced data
        "threshold": threshold,
        "confusion_matrix": {"tn": int(tn), "fp": int(fp), "fn": int(fn), "tp": int(tp)},
        "positives_in_test": int(tp + fn),
        "baseline_auc_pr": round(float(y_true.mean()), 6),  # AUC-PR of a random classifier
    }
