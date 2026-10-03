# FraudShield — UPI Fraud Detection

React (Vite) + Express/MongoDB + Python Random Forest, trained on the PaySim dataset.
Each user has their own account and sees only their own transactions and analytics.

## Architecture
React (5173) → Express API (3001) → MongoDB · `predict.py` is spawned per request and loads the Random Forest.

## Features
- Register / login (bcrypt + JWT, server-side validation), read-only demo account
- Per-user data isolation: every query is filtered by `userId` taken from the JWT
- Transaction Detector with explainable reasons, history, dashboard and analytics
- Admin-only model training

## Model performance
Evaluated on a stratified 80/20 hold-out of PaySim (random_state=42, threshold 0.5).
Accuracy is not reported as a headline: ~0.13% of PaySim rows are fraud, so predicting "safe" always scores ~99.87%.

| Metric    | Value |
|-----------|-------|
| Precision | _fill from `ml/metadata.json` after running evaluate.py_ |
| Recall    | _…_ |
| F1        | _…_ |
| AUC-PR    | _…_ |

Note: PaySim is synthetic and its balance-based features are very informative, so these numbers will not transfer to real UPI traffic.

## Run locally
```bash
# ML (once)
cd ml && python3 -m venv ../venv && source ../venv/bin/activate && pip install -r requirements.txt
python3 train.py /path/to/PS_20174392719_1491204439457_log.csv   # trains + writes metrics
# or, if model.pkl already exists:
python3 evaluate.py /path/to/PS_20174392719_1491204439457_log.csv

# Backend (tab 1)
cd server && cp .env.example .env   # set MONGODB_URI, JWT_SECRET (openssl rand -hex 32)
npm install && npm run dev

# Frontend (tab 2)
cd client && cp .env.example .env && npm install && npm run dev
```
Make an admin: `node server/scripts/makeAdmin.js you@email.com`

## API
| Method | URL | Access |
|---|---|---|
| POST | /api/auth/register, /login, /demo | public |
| GET | /api/auth/me | user |
| POST | /api/predict | user (not demo) |
| GET | /api/transactions, /:id | own data only |
| PATCH/DELETE | /api/transactions/:id | own data, not demo |
| GET | /api/dashboard/stats | own data only |
| GET | /api/model/metadata, /status | user |
| POST | /api/model/train | admin |
