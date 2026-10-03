import { useState, useEffect, useRef, useCallback } from "react";
import {
  LineChart, Line, BarChart, Bar, PieChart, Pie, Cell,
  AreaChart, Area, ResponsiveContainer, XAxis, YAxis,
  CartesianGrid, Tooltip
} from "recharts";
import * as api from "./api";

// ── THEME ─────────────────────────────────────────────────────────────────────
const C = {
  bg: "#070B14", bgCard: "rgba(255,255,255,0.04)", bgCardHover: "rgba(255,255,255,0.07)",
  border: "rgba(255,255,255,0.08)", borderHover: "rgba(255,255,255,0.15)",
  accent: "#00D4AA", accentDim: "rgba(0,212,170,0.15)", accentGlow: "rgba(0,212,170,0.4)",
  danger: "#FF4757", dangerDim: "rgba(255,71,87,0.15)",
  warning: "#FFB347", warningDim: "rgba(255,179,71,0.15)",
  safe: "#2ED573", safeDim: "rgba(46,213,115,0.15)",
  blue: "#4A90E2", purple: "#9B59B6",
  textPrimary: "#F0F4FF", textSecondary: "rgba(240,244,255,0.55)", textMuted: "rgba(240,244,255,0.3)",
};

// ── INJECT STYLES ─────────────────────────────────────────────────────────────
const injectStyles = () => {
  if (document.getElementById("fs-styles")) return;
  const s = document.createElement("style");
  s.id = "fs-styles";
  s.textContent = `
    @import url('https://fonts.googleapis.com/css2?family=Space+Grotesk:wght@300;400;500;600;700&family=JetBrains+Mono:wght@400;500&display=swap');
    *{box-sizing:border-box;margin:0;padding:0}
    body{font-family:'Space Grotesk',sans-serif;background:${C.bg};color:${C.textPrimary};min-height:100vh}
    .glass{background:${C.bgCard};border:1px solid ${C.border};backdrop-filter:blur(12px);border-radius:16px}
    .mono{font-family:'JetBrains Mono',monospace}
    .btn-primary{background:linear-gradient(135deg,${C.accent},#00A882);color:#000;border:none;padding:10px 22px;border-radius:10px;font-weight:600;cursor:pointer;transition:all .2s;font-family:'Space Grotesk',sans-serif;font-size:14px}
    .btn-primary:hover{transform:translateY(-1px);box-shadow:0 8px 24px ${C.accentGlow}}
    .btn-primary:disabled{opacity:.5;cursor:not-allowed;transform:none}
    .btn-ghost{background:transparent;border:1px solid ${C.border};color:${C.textSecondary};padding:8px 16px;border-radius:8px;cursor:pointer;transition:all .2s;font-family:'Space Grotesk',sans-serif;font-size:13px}
    .btn-ghost:hover{border-color:${C.borderHover};color:${C.textPrimary};background:${C.bgCardHover}}
    .input{background:rgba(255,255,255,0.05);border:1px solid ${C.border};color:${C.textPrimary};padding:10px 14px;border-radius:10px;font-family:'Space Grotesk',sans-serif;font-size:14px;width:100%;outline:none;transition:border-color .2s}
    .input:focus{border-color:${C.accent};box-shadow:0 0 0 3px ${C.accentDim}}
    .input option{background:#1a1f2e}
    .nav-item{padding:10px 16px;border-radius:10px;cursor:pointer;transition:all .2s;display:flex;align-items:center;gap:10px;font-size:14px;font-weight:500;color:${C.textSecondary};border:1px solid transparent}
    .nav-item:hover{color:${C.textPrimary};background:${C.bgCardHover}}
    .nav-item.active{color:${C.accent};background:${C.accentDim};border-color:rgba(0,212,170,0.2)}
    .badge-FRAUD{background:${C.dangerDim};color:${C.danger};padding:3px 10px;border-radius:20px;font-size:11px;font-weight:700;border:1px solid rgba(255,71,87,0.3)}
    .badge-SAFE{background:${C.safeDim};color:${C.safe};padding:3px 10px;border-radius:20px;font-size:11px;font-weight:700;border:1px solid rgba(46,213,115,0.3)}
    .badge-SUSPICIOUS{background:${C.warningDim};color:${C.warning};padding:3px 10px;border-radius:20px;font-size:11px;font-weight:700;border:1px solid rgba(255,179,71,0.3)}
    .trow{border-bottom:1px solid ${C.border};transition:background .15s}
    .trow:hover{background:${C.bgCardHover}}
    .pulse{animation:pulse 2s infinite}
    @keyframes pulse{0%,100%{opacity:1}50%{opacity:.4}}
    .slide{animation:slide .35s ease}
    @keyframes slide{from{opacity:0;transform:translateY(10px)}to{opacity:1;transform:translateY(0)}}
    .skeleton{background:linear-gradient(90deg,rgba(255,255,255,.04) 25%,rgba(255,255,255,.09) 50%,rgba(255,255,255,.04) 75%);background-size:200% 100%;animation:shimmer 1.5s infinite;border-radius:8px}
    @keyframes shimmer{0%{background-position:200% 0}100%{background-position:-200% 0}}
    ::-webkit-scrollbar{width:4px;height:4px}
    ::-webkit-scrollbar-thumb{background:rgba(255,255,255,.1);border-radius:4px}
  `;
  document.head.appendChild(s);
};

// ── SMALL COMPONENTS ──────────────────────────────────────────────────────────
const Badge = ({ v }) => <span className={`badge-${v}`}>{v}</span>;

const StatCard = ({ label, value, sub, color = C.accent, icon, loading }) => (
  <div className="glass" style={{ padding: "20px 24px", position: "relative", overflow: "hidden" }}>
    <div style={{ position: "absolute", top: 0, left: 0, right: 0, height: "2px", background: `linear-gradient(90deg,transparent,${color},transparent)` }} />
    <div style={{ display: "flex", justifyContent: "space-between" }}>
      <div>
        <div style={{ fontSize: 11, color: C.textMuted, textTransform: "uppercase", letterSpacing: ".1em", marginBottom: 8 }}>{label}</div>
        {loading
          ? <div className="skeleton" style={{ width: 80, height: 32 }} />
          : <div style={{ fontSize: 28, fontWeight: 700, color, letterSpacing: "-.02em" }}>{value}</div>}
        {sub && !loading && <div style={{ fontSize: 12, color: C.textSecondary, marginTop: 6 }}>{sub}</div>}
      </div>
      <div style={{ fontSize: 26, opacity: .35 }}>{icon}</div>
    </div>
  </div>
);

const RiskBar = ({ label, value, color = C.danger }) => (
  <div style={{ marginBottom: 12 }}>
    <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 5, fontSize: 13 }}>
      <span style={{ color: C.textSecondary }}>{label}</span>
      <span style={{ color, fontWeight: 600 }}>{value}%</span>
    </div>
    <div style={{ background: "rgba(255,255,255,.06)", borderRadius: 4, height: 6 }}>
      <div style={{ width: `${value}%`, height: "100%", borderRadius: 4, background: `linear-gradient(90deg,${color}88,${color})`, transition: "width 1s cubic-bezier(.4,0,.2,1)" }} />
    </div>
  </div>
);

const Label = ({ children }) => (
  <div style={{ fontSize: 11, color: C.textMuted, textTransform: "uppercase", letterSpacing: ".06em", marginBottom: 6 }}>{children}</div>
);

const Err = ({ msg }) => msg ? (
  <div style={{ background: C.dangerDim, border: `1px solid rgba(255,71,87,.3)`, borderRadius: 10, padding: "12px 16px", fontSize: 13, color: C.danger, marginBottom: 16 }}>⚠ {msg}</div>
) : null;

const EmptyState = ({ go, text }) => (
  <div style={{ background: C.accentDim, border: `1px solid rgba(0,212,170,.3)`, borderRadius: 12, padding: "18px 22px", marginBottom: 24, display: "flex", alignItems: "center", justifyContent: "space-between", gap: 16, flexWrap: "wrap" }}>
    <div style={{ fontSize: 14, color: C.textPrimary }}>👋 {text || "No transactions yet. Analyze your first transaction in the Transaction Detector."}</div>
    {go && <button className="btn-primary" style={{ padding: "10px 18px" }} onClick={() => go("detect")}>⚡ Open Transaction Detector</button>}
  </div>
);

// ── SIDEBAR ───────────────────────────────────────────────────────────────────
const NAV = [
  { id: "dashboard", label: "Dashboard", icon: "⬛" },
  { id: "transactions", label: "Transactions", icon: "⇄" },
  { id: "detect", label: "Fraud Detector", icon: "⚡" },
  { id: "analytics", label: "Analytics", icon: "📊" },
  { id: "model", label: "ML Model", icon: "🤖" },
];

const Sidebar = ({ active, setActive, user, onLogout }) => (
  <div style={{ width: 220, minHeight: "100vh", background: "rgba(0,0,0,.4)", borderRight: `1px solid ${C.border}`, padding: "24px 16px", display: "flex", flexDirection: "column", gap: 4, flexShrink: 0 }}>
    <div style={{ marginBottom: 32, padding: "0 8px" }}>
      <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
        <div style={{ width: 34, height: 34, borderRadius: 8, background: `linear-gradient(135deg,${C.accent},#005F4B)`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 16 }}>⚡</div>
        <div>
          <div style={{ fontSize: 14, fontWeight: 700 }}>FraudShield</div>
          <div style={{ fontSize: 10, color: C.textMuted, letterSpacing: ".08em", textTransform: "uppercase" }}>UPI Guard v2.1</div>
        </div>
      </div>
    </div>
    {NAV.map(n => (
      <div key={n.id} className={`nav-item ${active === n.id ? "active" : ""}`} onClick={() => setActive(n.id)}>
        <span>{n.icon}</span><span>{n.label}</span>
      </div>
    ))}
    <div style={{ marginTop: "auto", padding: "16px 8px", borderTop: `1px solid ${C.border}` }}>
      <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
        <div style={{ width: 32, height: 32, borderRadius: "50%", background: "linear-gradient(135deg,#667eea,#764ba2)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 12, fontWeight: 700, flexShrink: 0 }}>{(user?.name || "?").trim().slice(0, 2).toUpperCase()}</div>
        <div style={{ minWidth: 0 }}>
          <div style={{ fontSize: 12, fontWeight: 600, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{user?.name}</div>
          <div style={{ fontSize: 10, color: C.textMuted, textTransform: "capitalize" }}>{user?.role}</div>
        </div>
      </div>
      <button className="btn-ghost" style={{ width: "100%", marginTop: 12, fontSize: 12, padding: "7px 10px" }} onClick={onLogout}>Logout</button>
    </div>
  </div>
);

// ── PAGE: DASHBOARD ───────────────────────────────────────────────────────────
const Dashboard = ({ go }) => {
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState("");

  useEffect(() => {
    api.getDashboardStats()
      .then(setStats)
      .catch(e => setErr(e.message))
      .finally(() => setLoading(false));
  }, []);

  const trend = stats?.trend || [];
  const alerts = stats?.alerts || [];

  return (
    <div className="slide" style={{ padding: "32px 36px", maxWidth: 1200 }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 32 }}>
        <div>
          <h1 style={{ fontSize: 26, fontWeight: 700, letterSpacing: "-.03em" }}>Fraud Detection Dashboard</h1>
          <p style={{ color: C.textSecondary, fontSize: 13, marginTop: 4 }}>Your personal transactions · Random Forest ML</p>
        </div>
        <div style={{ background: C.safeDim, border: `1px solid rgba(46,213,115,.3)`, borderRadius: 20, padding: "6px 14px", fontSize: 12, color: C.safe, display: "flex", alignItems: "center", gap: 6 }}>
          <span className="pulse" style={{ width: 7, height: 7, borderRadius: "50%", background: C.safe, display: "inline-block" }} />System Online
        </div>
      </div>

      <Err msg={err} />
      {!loading && !err && stats?.total === 0 && <EmptyState go={go} />}

      <div style={{ display: "grid", gridTemplateColumns: "repeat(4,1fr)", gap: 16, marginBottom: 28 }}>
        <StatCard label="Total Transactions" value={stats?.total ?? "—"} sub="Your account" color={C.accent} icon="⇄" loading={loading} />
        <StatCard label="Fraud Detected" value={stats?.fraud ?? "—"} sub={stats ? `${((stats.fraud / (stats.total || 1)) * 100).toFixed(1)}% fraud rate` : ""} color={C.danger} icon="🚨" loading={loading} />
        <StatCard label="Suspicious" value={stats?.suspicious ?? "—"} color={C.warning} icon="⚠️" loading={loading} />
        <StatCard label="Safe" value={stats?.safe ?? "—"} color={C.safe} icon="✅" loading={loading} />
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 340px", gap: 20, marginBottom: 20 }}>
        <div className="glass" style={{ padding: 24 }}>
          <div style={{ fontSize: 15, fontWeight: 600, marginBottom: 4 }}>Fraud Trend (Last 7 Days)</div>
          <div style={{ fontSize: 12, color: C.textMuted, marginBottom: 20 }}>Real data from your transactions</div>
          {loading
            ? <div className="skeleton" style={{ height: 220 }} />
            : (
              <ResponsiveContainer width="100%" height={220}>
                <AreaChart data={trend}>
                  <defs>
                    <linearGradient id="gF" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor={C.danger} stopOpacity={.3} />
                      <stop offset="95%" stopColor={C.danger} stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,.04)" />
                  <XAxis dataKey="_id" tick={{ fill: C.textMuted, fontSize: 11 }} axisLine={false} tickLine={false} />
                  <YAxis tick={{ fill: C.textMuted, fontSize: 11 }} axisLine={false} tickLine={false} />
                  <Tooltip contentStyle={{ background: "#0D1120", border: `1px solid ${C.border}`, borderRadius: 10, color: C.textPrimary }} />
                  <Area type="monotone" dataKey="safe" stroke={C.safe} fill="none" strokeWidth={2} />
                  <Area type="monotone" dataKey="suspicious" stroke={C.warning} fill="none" strokeWidth={2} strokeDasharray="5 3" />
                  <Area type="monotone" dataKey="fraud" stroke={C.danger} fill="url(#gF)" strokeWidth={2.5} />
                </AreaChart>
              </ResponsiveContainer>
            )}
        </div>

        <div className="glass" style={{ padding: 24 }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}>
            <div style={{ fontSize: 15, fontWeight: 600 }}>Live Alerts</div>
            <span style={{ background: C.dangerDim, color: C.danger, fontSize: 10, fontWeight: 700, borderRadius: 20, padding: "2px 8px", border: `1px solid rgba(255,71,87,.3)` }}>LIVE</span>
          </div>
          {alerts.length === 0
            ? <div style={{ color: C.textMuted, fontSize: 13, textAlign: "center", padding: 30 }}>No alerts yet</div>
            : alerts.map((a, i) => (
              <div key={a._id} style={{ padding: "12px 14px", background: i === 0 ? C.dangerDim : "rgba(255,255,255,.03)", border: `1px solid ${i === 0 ? "rgba(255,71,87,.3)" : C.border}`, borderRadius: 10, marginBottom: 10 }}>
                <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 4 }}>
                  <span style={{ fontSize: 10, color: C.textMuted, fontWeight: 600, textTransform: "uppercase" }}>{a.upiApp} · {a.type}</span>
                  <Badge v={a.verdict} />
                </div>
                <div style={{ fontSize: 13, fontWeight: 700, color: a.verdict === "FRAUD" ? C.danger : C.warning }}>₹{Number(a.amount).toLocaleString()}</div>
                <div style={{ fontSize: 11, color: C.textMuted, marginTop: 4 }}>{a.reasons?.[0]?.factor || "Anomaly detected"}</div>
                <div style={{ background: "rgba(255,255,255,.06)", borderRadius: 3, height: 4, marginTop: 8 }}>
                  <div style={{ width: `${a.fraudProbability}%`, height: "100%", borderRadius: 3, background: a.fraudProbability > 80 ? C.danger : C.warning }} />
                </div>
              </div>
            ))}
        </div>
      </div>

      {/* FRAUD BY APP */}
      {stats?.byApp?.length > 0 && (
        <div className="glass" style={{ padding: 24 }}>
          <div style={{ fontSize: 15, fontWeight: 600, marginBottom: 20 }}>Fraud Rate by UPI App (Real Data)</div>
          {stats.byApp.map(a => (
            <RiskBar key={a.app} label={`${a.app} (${a.total} txns)`} value={Math.round(a.fraudRate)} color={a.fraudRate > 30 ? C.danger : C.warning} />
          ))}
        </div>
      )}
    </div>
  );
};

// ── PAGE: TRANSACTIONS ────────────────────────────────────────────────────────
const Transactions = ({ go, user }) => {
  const [txns, setTxns] = useState([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState("ALL");
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [err, setErr] = useState("");

  const load = useCallback(() => {
    setLoading(true);
    const params = { limit: 15, page };
    if (filter !== "ALL") params.verdict = filter;
    if (search) params.search = search;
    api.getTransactions(params)
      .then(d => { setTxns(d.transactions); setTotal(d.total); })
      .catch(e => setErr(e.message))
      .finally(() => setLoading(false));
  }, [filter, search, page]);

  useEffect(() => { load(); }, [load]);

  const downloadCSV = () => {
    const headers = "ID,Type,Amount,Old Bal Sender,New Bal Sender,UPI App,Fraud %,Verdict\n";
    const rows = txns.map(t =>
      `${t._id},${t.type},${t.amount},${t.oldbalanceOrg},${t.newbalanceOrig},${t.upiApp},${t.fraudProbability},${t.verdict}`
    ).join("\n");
    const blob = new Blob([headers + rows], { type: "text/csv" });
    const a = document.createElement("a"); a.href = URL.createObjectURL(blob); a.download = "transactions.csv"; a.click();
  };

  return (
    <div className="slide" style={{ padding: "32px 36px", maxWidth: 1200 }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 28 }}>
        <div>
          <h1 style={{ fontSize: 26, fontWeight: 700, letterSpacing: "-.03em" }}>Transaction Logs</h1>
          <p style={{ color: C.textSecondary, fontSize: 13, marginTop: 4 }}>{total} total · your transactions</p>
        </div>
        <div style={{ display: "flex", gap: 10 }}>
          <button className="btn-ghost" onClick={downloadCSV}>↓ Export CSV</button>
          <button className="btn-ghost" onClick={load}>↻ Refresh</button>
        </div>
      </div>

      <Err msg={err} />
      {!loading && !err && total === 0 && filter === "ALL" && !search && <EmptyState go={go} />}

      <div style={{ display: "flex", gap: 12, marginBottom: 20, alignItems: "center" }}>
        <input className="input" style={{ maxWidth: 320 }} placeholder="🔍 Search UPI ID, type, app..." value={search} onChange={e => { setSearch(e.target.value); setPage(1); }} />
        <div style={{ display: "flex", gap: 8 }}>
          {["ALL", "FRAUD", "SUSPICIOUS", "SAFE"].map(f => (
            <button key={f} onClick={() => { setFilter(f); setPage(1); }} style={{ padding: "8px 14px", borderRadius: 8, border: `1px solid ${filter === f ? (f === "FRAUD" ? C.danger : f === "SUSPICIOUS" ? C.warning : f === "SAFE" ? C.safe : C.accent) : C.border}`, background: filter === f ? (f === "FRAUD" ? C.dangerDim : f === "SUSPICIOUS" ? C.warningDim : f === "SAFE" ? C.safeDim : C.accentDim) : "transparent", color: filter === f ? (f === "FRAUD" ? C.danger : f === "SUSPICIOUS" ? C.warning : f === "SAFE" ? C.safe : C.accent) : C.textSecondary, cursor: "pointer", fontSize: 12, fontWeight: 600, fontFamily: "Space Grotesk" }}>{f}</button>
          ))}
        </div>
      </div>

      <div className="glass" style={{ overflow: "hidden" }}>
        <table style={{ width: "100%", borderCollapse: "collapse" }}>
          <thead>
            <tr style={{ borderBottom: `1px solid ${C.border}` }}>
              {["Type", "Amount", "Old Bal (Sender)", "New Bal (Sender)", "UPI App", "Sender UPI", "Time", "Risk %", "Verdict", ""].map(h => (
                <th key={h} style={{ padding: "13px 14px", textAlign: "left", fontSize: 11, fontWeight: 600, color: C.textMuted, textTransform: "uppercase", letterSpacing: ".07em" }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {loading
              ? Array.from({ length: 8 }).map((_, i) => (
                <tr key={i}><td colSpan={10} style={{ padding: 14 }}><div className="skeleton" style={{ height: 20 }} /></td></tr>
              ))
              : txns.length === 0
                ? <tr><td colSpan={10} style={{ textAlign: "center", padding: 60, color: C.textMuted }}>No transactions found.</td></tr>
                : txns.map(t => (
                  <tr key={t._id} className="trow">
                    <td style={{ padding: "12px 14px" }}><span style={{ fontSize: 12, fontWeight: 600, background: "rgba(255,255,255,.06)", padding: "3px 8px", borderRadius: 6 }}>{t.type}</span></td>
                    <td style={{ padding: "12px 14px", fontWeight: 700, color: t.amount > 200000 ? C.danger : C.textPrimary }}>₹{Number(t.amount).toLocaleString()}</td>
                    <td style={{ padding: "12px 14px", fontSize: 12, color: C.textSecondary }} className="mono">₹{Number(t.oldbalanceOrg).toLocaleString()}</td>
                    <td style={{ padding: "12px 14px", fontSize: 12, color: t.newbalanceOrig === 0 ? C.danger : C.textSecondary }} className="mono">₹{Number(t.newbalanceOrig).toLocaleString()}</td>
                    <td style={{ padding: "12px 14px", fontSize: 12, color: C.textSecondary }}>{t.upiApp}</td>
                    <td style={{ padding: "12px 14px", fontSize: 11, color: C.textMuted }} className="mono">{t.senderUPI || "—"}</td>
                    <td style={{ padding: "12px 14px", fontSize: 11, color: C.textMuted }}>{new Date(t.createdAt).toLocaleTimeString()}</td>
                    <td style={{ padding: "12px 14px" }}>
                      <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                        <div style={{ width: 48, background: "rgba(255,255,255,.06)", borderRadius: 3, height: 5 }}>
                          <div style={{ width: `${t.fraudProbability}%`, height: "100%", borderRadius: 3, background: t.fraudProbability > 70 ? C.danger : t.fraudProbability > 40 ? C.warning : C.safe }} />
                        </div>
                        <span style={{ fontSize: 12, fontWeight: 700, color: t.fraudProbability > 70 ? C.danger : t.fraudProbability > 40 ? C.warning : C.safe }}>{t.fraudProbability?.toFixed(0)}%</span>
                      </div>
                    </td>
                    <td style={{ padding: "12px 14px" }}><Badge v={t.verdict} /></td>
                    <td style={{ padding: "12px 14px" }}>
                      {t.isReviewed
                        ? <span style={{ fontSize: 11, color: C.safe }}>✓ Reviewed</span>
                        : user?.role !== "demo" && <button className="btn-ghost" style={{ fontSize: 11, padding: "4px 10px" }} onClick={() => api.reviewTransaction(t._id).then(load).catch(e => setErr(e.message))}>Review</button>}
                    </td>
                  </tr>
                ))}
          </tbody>
        </table>
        <div style={{ padding: "14px 20px", display: "flex", justifyContent: "space-between", borderTop: `1px solid ${C.border}` }}>
          <span style={{ fontSize: 12, color: C.textMuted }}>Page {page} · {total} total</span>
          <div style={{ display: "flex", gap: 8 }}>
            <button className="btn-ghost" onClick={() => setPage(Math.max(1, page - 1))} disabled={page === 1} style={{ fontSize: 12, padding: "5px 12px" }}>← Prev</button>
            <button className="btn-ghost" onClick={() => setPage(page + 1)} disabled={page * 15 >= total} style={{ fontSize: 12, padding: "5px 12px" }}>Next →</button>
          </div>
        </div>
      </div>
    </div>
  );
};

// ── PAGE: FRAUD DETECTOR ──────────────────────────────────────────────────────
const PRESETS = [
  { label: "✅ Normal Payment", data: { type: "PAYMENT", amount: 1500, oldbalanceOrg: 50000, newbalanceOrig: 48500, oldbalanceDest: 20000, newbalanceDest: 21500, step: 14, upiApp: "Google Pay" } },
  { label: "🚨 Fraud Transfer", data: { type: "TRANSFER", amount: 450000, oldbalanceOrg: 452000, newbalanceOrig: 0, oldbalanceDest: 0, newbalanceDest: 450000, step: 2, upiApp: "PhonePe" } },
  { label: "⚠ Suspicious Cash Out", data: { type: "CASH_OUT", amount: 95000, oldbalanceOrg: 96000, newbalanceOrig: 0, oldbalanceDest: 1000, newbalanceDest: 96000, step: 3, upiApp: "Paytm" } },
];

const FraudDetector = () => {
  const [form, setForm] = useState({ type: "TRANSFER", amount: "", oldbalanceOrg: "", newbalanceOrig: "", oldbalanceDest: "", newbalanceDest: "", step: "1", upiApp: "Google Pay", senderUPI: "", receiverUPI: "", note: "" });
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState("");

  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));

  const analyze = async () => {
    setLoading(true); setErr(""); setResult(null);
    try {
      const payload = { ...form, amount: parseFloat(form.amount), oldbalanceOrg: parseFloat(form.oldbalanceOrg), newbalanceOrig: parseFloat(form.newbalanceOrig), oldbalanceDest: parseFloat(form.oldbalanceDest || 0), newbalanceDest: parseFloat(form.newbalanceDest || 0), step: parseInt(form.step || 1) };
      const r = await api.predictFraud(payload);
      setResult(r);
    } catch (e) {
      setErr(e.message.includes("model") ? "⚠ ML model not trained yet. Go to ML Model page and train first." : e.message);
    }
    setLoading(false);
  };

  const verdictColor = result ? (result.verdict === "FRAUD" ? C.danger : result.verdict === "SUSPICIOUS" ? C.warning : C.safe) : C.accent;

  return (
    <div className="slide" style={{ padding: "32px 36px", maxWidth: 1100 }}>
      <div style={{ marginBottom: 28 }}>
        <h1 style={{ fontSize: 26, fontWeight: 700, letterSpacing: "-.03em" }}>⚡ Real-Time Fraud Detector</h1>
        <p style={{ color: C.textSecondary, fontSize: 13, marginTop: 4 }}>Powered by your trained Random Forest model · Results saved to MongoDB</p>
      </div>

      <div style={{ display: "flex", gap: 10, marginBottom: 24 }}>
        <span style={{ fontSize: 12, color: C.textMuted, lineHeight: "34px" }}>Quick test:</span>
        {PRESETS.map(p => (
          <button key={p.label} className="btn-ghost" onClick={() => setForm(f => ({ ...f, ...p.data }))}>{p.label}</button>
        ))}
      </div>

      <Err msg={err} />

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 24 }}>
        {/* FORM */}
        <div className="glass" style={{ padding: 28 }}>
          <div style={{ fontSize: 15, fontWeight: 600, marginBottom: 20 }}>Transaction Details</div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}>

            <div style={{ gridColumn: "span 2" }}>
              <Label>Transaction Type</Label>
              <select className="input" value={form.type} onChange={e => set("type", e.target.value)}>
                {["PAYMENT", "TRANSFER", "CASH_OUT", "DEBIT", "CASH_IN"].map(t => <option key={t}>{t}</option>)}
              </select>
              <div style={{ fontSize: 11, color: C.textMuted, marginTop: 5 }}>
                ⚠ TRANSFER & CASH_OUT carry highest fraud risk
              </div>
            </div>

            {[
              { k: "amount", l: "Amount (₹)", ph: "e.g. 50000" },
              { k: "step", l: "Step (Hour of transaction)", ph: "1–744" },
              { k: "oldbalanceOrg", l: "Sender Balance BEFORE (₹)", ph: "e.g. 100000" },
              { k: "newbalanceOrig", l: "Sender Balance AFTER (₹)", ph: "e.g. 50000" },
              { k: "oldbalanceDest", l: "Receiver Balance BEFORE (₹)", ph: "e.g. 0" },
              { k: "newbalanceDest", l: "Receiver Balance AFTER (₹)", ph: "e.g. 50000" },
            ].map(f => (
              <div key={f.k}>
                <Label>{f.l}</Label>
                <input type="number" className="input" placeholder={f.ph} value={form[f.k]} onChange={e => set(f.k, e.target.value)} />
              </div>
            ))}

            <div>
              <Label>UPI App (display only)</Label>
              <select className="input" value={form.upiApp} onChange={e => set("upiApp", e.target.value)}>
                {["Google Pay", "PhonePe", "Paytm", "BHIM", "Amazon Pay"].map(a => <option key={a}>{a}</option>)}
              </select>
            </div>

            <div>
              <Label>Sender UPI ID (optional)</Label>
              <input className="input" placeholder="e.g. user@oksbi" value={form.senderUPI} onChange={e => set("senderUPI", e.target.value)} />
            </div>

            <div style={{ gridColumn: "span 2" }}>
              <Label>Receiver UPI ID (optional)</Label>
              <input className="input" placeholder="e.g. merchant@ybl" value={form.receiverUPI} onChange={e => set("receiverUPI", e.target.value)} />
            </div>

          </div>

          <button className="btn-primary" style={{ width: "100%", marginTop: 20, padding: 14, fontSize: 15 }} onClick={analyze} disabled={loading || !form.amount}>
            {loading ? "⚙ Running Random Forest..." : "⚡ Analyze Transaction"}
          </button>
        </div>

        {/* RESULT */}
        <div>
          {loading && (
            <div className="glass" style={{ padding: 28 }}>
              {["Extracting 14 features", "Computing balance ratios", "Running 100 decision trees", "Aggregating predictions", "Generating explanation"].map(s => (
                <div key={s} style={{ marginBottom: 14 }}>
                  <div style={{ fontSize: 12, color: C.textSecondary, marginBottom: 6 }}>{s}...</div>
                  <div className="skeleton" style={{ height: 6 }} />
                </div>
              ))}
            </div>
          )}

          {result && !loading && (
            <div className="slide">
              {/* VERDICT */}
              <div className="glass" style={{ padding: 28, marginBottom: 16, borderColor: `${verdictColor}55` }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 20 }}>
                  <div>
                    <div style={{ fontSize: 11, color: C.textMuted, textTransform: "uppercase", letterSpacing: ".1em", marginBottom: 8 }}>Fraud Probability</div>
                    <div style={{ fontSize: 52, fontWeight: 800, letterSpacing: "-.04em", color: verdictColor }}>{result.fraud_probability?.toFixed(1)}%</div>
                  </div>
                  <div style={{ textAlign: "right" }}>
                    <Badge v={result.verdict} />
                    <div style={{ marginTop: 10, fontSize: 12, color: C.textMuted }}>Confidence: <span style={{ color: C.textPrimary, fontWeight: 600 }}>{result.confidence}</span></div>
                    <div style={{ fontSize: 12, color: C.textMuted }}>Anomaly Score: <span className="mono" style={{ color: C.accent }}>{result.anomaly_score?.toFixed(4)}</span></div>
                  </div>
                </div>
                <div style={{ background: "rgba(255,255,255,.06)", borderRadius: 8, height: 12, overflow: "hidden" }}>
                  <div style={{ width: `${result.fraud_probability}%`, height: "100%", background: `linear-gradient(90deg,${C.safe},${C.warning},${C.danger})`, backgroundSize: "300px 12px", transition: "width 1s cubic-bezier(.4,0,.2,1)" }} />
                </div>
                <div style={{ display: "flex", justifyContent: "space-between", marginTop: 6, fontSize: 10, color: C.textMuted }}>
                  <span>SAFE</span><span>SUSPICIOUS</span><span>HIGH RISK</span><span>FRAUD</span>
                </div>
              </div>

              {/* EXPLAINABILITY */}
              <div className="glass" style={{ padding: 24, marginBottom: 16 }}>
                <div style={{ fontSize: 14, fontWeight: 600, color: C.warning, marginBottom: 4 }}>⚠ Why This Was Flagged</div>
                <div style={{ fontSize: 12, color: C.textMuted, marginBottom: 16 }}>Feature contributions from Random Forest decision trees</div>
                {result.reasons?.length > 0
                  ? result.reasons.map(r => <RiskBar key={r.factor} label={r.factor} value={r.contribution} color={r.contribution > 15 ? C.danger : C.warning} />)
                  : <div style={{ color: C.safe, fontSize: 13 }}>✅ No significant risk factors. Transaction appears legitimate.</div>}
              </div>

              {/* FEATURES USED */}
              <div className="glass" style={{ padding: 20 }}>
                <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 12 }}>Features Passed to Model</div>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
                  {Object.entries(result.features_used || {}).map(([k, v]) => (
                    <div key={k} style={{ fontSize: 12, display: "flex", justifyContent: "space-between", padding: "6px 10px", background: "rgba(255,255,255,.04)", borderRadius: 8 }}>
                      <span style={{ color: C.textMuted }}>{k}</span>
                      <span className="mono" style={{ color: C.accent }}>{String(v)}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {!result && !loading && (
            <div className="glass" style={{ padding: 40, textAlign: "center", border: `1px dashed ${C.border}` }}>
              <div style={{ fontSize: 40, marginBottom: 12 }}>⚡</div>
              <div style={{ fontSize: 15, color: C.textSecondary, marginBottom: 8 }}>Ready to Analyze</div>
              <div style={{ fontSize: 13, color: C.textMuted }}>Select a preset or fill in the form · Result saves to MongoDB automatically</div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

// ── PAGE: ANALYTICS ───────────────────────────────────────────────────────────
const Analytics = () => {
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.getDashboardStats().then(setStats).finally(() => setLoading(false));
  }, []);

  const FRAUD_TYPES = stats && stats.total > 0
    ? [
        { name: "Safe", value: stats.safe, color: C.safe },
        { name: "Suspicious", value: stats.suspicious, color: C.warning },
        { name: "Fraud", value: stats.fraud, color: C.danger },
      ]
    : [{ name: "No data yet", value: 1, color: "rgba(255,255,255,.08)" }];
  const pct = v => (stats && stats.total > 0 ? `${((v / stats.total) * 100).toFixed(0)}%` : "0%");

  return (
    <div className="slide" style={{ padding: "32px 36px", maxWidth: 1200 }}>
      <div style={{ marginBottom: 28 }}>
        <h1 style={{ fontSize: 26, fontWeight: 700, letterSpacing: "-.03em" }}>Deep Analytics</h1>
        <p style={{ color: C.textSecondary, fontSize: 13, marginTop: 4 }}>Statistical patterns from your real transaction data</p>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: 16, marginBottom: 24 }}>
        <StatCard label="Avg Fraud Amount" value={stats ? `₹${stats.avgFraudAmount?.toLocaleString()}` : "—"} color={C.danger} icon="₹" loading={loading} />
        <StatCard label="Total Fraud Txns" value={stats?.fraud ?? "—"} color={C.warning} icon="🚨" loading={loading} />
        <StatCard label="Safe Rate" value={stats ? `${((stats.safe / (stats.total || 1)) * 100).toFixed(1)}%` : "—"} color={C.safe} icon="✅" loading={loading} />
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 20, marginBottom: 20 }}>
        {/* TREND */}
        <div className="glass" style={{ padding: 24 }}>
          <div style={{ fontSize: 15, fontWeight: 600, marginBottom: 4 }}>Fraud vs Safe Over Time</div>
          <div style={{ fontSize: 12, color: C.textMuted, marginBottom: 16 }}>Your real transactions — last 7 days</div>
          {stats && !loading
            ? (
              <ResponsiveContainer width="100%" height={200}>
                <BarChart data={stats.trend}>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,.04)" />
                  <XAxis dataKey="_id" tick={{ fill: C.textMuted, fontSize: 10 }} axisLine={false} tickLine={false} />
                  <YAxis tick={{ fill: C.textMuted, fontSize: 10 }} axisLine={false} tickLine={false} />
                  <Tooltip contentStyle={{ background: "#0D1120", border: `1px solid ${C.border}`, borderRadius: 8, color: C.textPrimary }} />
                  <Bar dataKey="safe" fill={C.safe} radius={[4, 4, 0, 0]} name="Safe" />
                  <Bar dataKey="suspicious" fill={C.warning} radius={[4, 4, 0, 0]} name="Suspicious" />
                  <Bar dataKey="fraud" fill={C.danger} radius={[4, 4, 0, 0]} name="Fraud" />
                </BarChart>
              </ResponsiveContainer>
            )
            : <div className="skeleton" style={{ height: 200 }} />}
        </div>

        {/* FRAUD TYPE PIE */}
        <div className="glass" style={{ padding: 24 }}>
          <div style={{ fontSize: 15, fontWeight: 600, marginBottom: 4 }}>Verdict Distribution</div>
          <div style={{ fontSize: 12, color: C.textMuted, marginBottom: 16 }}>Your transactions only</div>
          <div style={{ display: "flex", alignItems: "center", gap: 20 }}>
            <ResponsiveContainer width={160} height={160}>
              <PieChart>
                <Pie data={FRAUD_TYPES} cx="50%" cy="50%" innerRadius={45} outerRadius={75} paddingAngle={3} dataKey="value">
                  {FRAUD_TYPES.map((e, i) => <Cell key={i} fill={e.color} />)}
                </Pie>
              </PieChart>
            </ResponsiveContainer>
            <div style={{ flex: 1 }}>
              {FRAUD_TYPES.map(t => (
                <div key={t.name} style={{ display: "flex", justifyContent: "space-between", marginBottom: 8, fontSize: 12 }}>
                  <span style={{ display: "flex", alignItems: "center", gap: 6, color: C.textSecondary }}>
                    <span style={{ width: 8, height: 8, borderRadius: 2, background: t.color, display: "inline-block" }} />{t.name}
                  </span>
                  <span style={{ color: t.color, fontWeight: 600 }}>{t.name === "No data yet" ? "–" : pct(t.value)}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* BY APP */}
      {stats?.byApp?.length > 0 && (
        <div className="glass" style={{ padding: 24 }}>
          <div style={{ fontSize: 15, fontWeight: 600, marginBottom: 20 }}>Fraud Rate by UPI App — Real Data</div>
          <ResponsiveContainer width="100%" height={200}>
            <BarChart data={stats.byApp}>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,.04)" />
              <XAxis dataKey="app" tick={{ fill: C.textMuted, fontSize: 11 }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fill: C.textMuted, fontSize: 11 }} axisLine={false} tickLine={false} unit="%" />
              <Tooltip contentStyle={{ background: "#0D1120", border: `1px solid ${C.border}`, borderRadius: 8 }} formatter={v => [`${v?.toFixed(1)}%`]} />
              <Bar dataKey="fraudRate" fill={C.danger} radius={[4, 4, 0, 0]} name="Fraud Rate %" />
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}
    </div>
  );
};

// ── PAGE: ML MODEL ────────────────────────────────────────────────────────────
const MLModel = ({ user }) => {
  const isAdmin = user?.role === "admin";
  const [status, setStatus] = useState(null);
  const [meta, setMeta] = useState(null);
  const [logs, setLogs] = useState([]);
  const [training, setTraining] = useState(false);
  const [file, setFile] = useState(null);
  const [err, setErr] = useState("");
  const fileRef = useRef();
  const logsRef = useRef();

  useEffect(() => {
    api.getModelStatus().then(setStatus).catch(() => setStatus({ trained: false }));
    api.getModelMetadata().then(setMeta).catch(() => {});
  }, []);

  useEffect(() => {
    if (logsRef.current) logsRef.current.scrollTop = logsRef.current.scrollHeight;
  }, [logs]);

  const startTraining = async () => {
    if (!file) { setErr("Please select your CSV file first"); return; }
    setTraining(true); setLogs([]); setErr("");
    try {
      await api.trainModel(file, log => {
        setLogs(l => [...l, log]);
        if (log === "TRAINING_COMPLETE") {
          setStatus({ trained: true });
          api.getModelMetadata().then(setMeta);
          setTraining(false);
        }
        if (log === "TRAINING_FAILED") { setErr("Training failed. Check your CSV format."); setTraining(false); }
      });
    } catch (e) { setErr(e.message); setTraining(false); }
  };

  return (
    <div className="slide" style={{ padding: "32px 36px", maxWidth: 1100 }}>
      <div style={{ marginBottom: 28 }}>
        <h1 style={{ fontSize: 26, fontWeight: 700, letterSpacing: "-.03em" }}>🤖 ML Model Engine</h1>
        <p style={{ color: C.textSecondary, fontSize: 13, marginTop: 4 }}>Random Forest Classifier · scikit-learn · Trained on your Kaggle dataset</p>
      </div>

      <Err msg={err} />

      {/* STATUS BANNER */}
      <div style={{ padding: "14px 20px", background: status?.trained ? C.safeDim : C.dangerDim, border: `1px solid ${status?.trained ? "rgba(46,213,115,.3)" : "rgba(255,71,87,.3)"}`, borderRadius: 12, marginBottom: 24, fontSize: 13, color: status?.trained ? C.safe : C.danger }}>
        {status?.trained ? "✅ Model is trained and ready. The Fraud Detector is using this model for real predictions." : "⚠ No trained model found. Upload your Kaggle CSV and train below."}
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 24 }}>
        {/* UPLOAD + TRAIN (admin only) */}
        {isAdmin ? <div className="glass" style={{ padding: 28 }}>
          <div style={{ fontSize: 15, fontWeight: 600, marginBottom: 20 }}>Train on Kaggle Dataset</div>

          <div style={{ background: C.accentDim, border: `1px solid rgba(0,212,170,.2)`, borderRadius: 12, padding: 16, marginBottom: 20 }}>
            <div style={{ fontSize: 12, fontWeight: 600, color: C.accent, marginBottom: 10, textTransform: "uppercase", letterSpacing: ".07em" }}>Required CSV Columns</div>
            <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
              {["step", "type", "amount", "oldbalanceOrg", "newbalanceOrig", "oldbalanceDest", "newbalanceDest", "isFraud"].map(col => (
                <span key={col} className="mono" style={{ fontSize: 11, background: "rgba(0,212,170,.1)", color: C.accent, padding: "3px 8px", borderRadius: 6, border: `1px solid ${C.accentDim}` }}>{col}</span>
              ))}
            </div>
            <div style={{ fontSize: 11, color: C.textMuted, marginTop: 10 }}>Your Kaggle file: PS_20174392719_1491204439457_log.csv ✓</div>
          </div>

          <div onClick={() => fileRef.current?.click()} style={{ border: `2px dashed ${file ? C.accent : C.border}`, borderRadius: 12, padding: "28px 20px", textAlign: "center", cursor: "pointer", marginBottom: 16, background: file ? C.accentDim : "transparent", transition: "all .2s" }}>
            <div style={{ fontSize: 28, marginBottom: 8 }}>{file ? "✅" : "📂"}</div>
            <div style={{ fontSize: 14, color: file ? C.accent : C.textSecondary, marginBottom: 4 }}>
              {file ? file.name : "Click to select CSV file"}
            </div>
            <div style={{ fontSize: 12, color: C.textMuted }}>{file ? `${(file.size / 1024 / 1024).toFixed(1)} MB` : "Supports .csv up to 500MB"}</div>
            <input ref={fileRef} type="file" accept=".csv" style={{ display: "none" }} onChange={e => setFile(e.target.files[0])} />
          </div>

          <button className="btn-primary" style={{ width: "100%", padding: 14, fontSize: 15 }} onClick={startTraining} disabled={training || !file}>
            {training ? `⚙ Training... (${logs.length} steps)` : "🚀 Train Random Forest"}
          </button>

          {training && (
            <div style={{ marginTop: 14 }}>
              <div style={{ display: "flex", justifyContent: "space-between", fontSize: 12, color: C.textMuted, marginBottom: 6 }}>
                <span>Training progress</span>
              </div>
              <div style={{ background: "rgba(255,255,255,.06)", borderRadius: 6, height: 8 }}>
                <div style={{ width: `${Math.min(100, (logs.length / 14) * 100)}%`, height: "100%", borderRadius: 6, background: `linear-gradient(90deg,${C.accent},#00A882)`, transition: "width .3s" }} />
              </div>
            </div>
          )}
        </div> : (
          <div className="glass" style={{ padding: 28, fontSize: 13, color: C.textSecondary }}>
            <div style={{ fontSize: 15, fontWeight: 600, marginBottom: 10, color: C.textPrimary }}>🔒 Training is admin-only</div>
            The model is trained once on the PaySim dataset by an administrator. You can analyze your own transactions in the Fraud Detector.
          </div>
        )}

        {/* LOGS + METRICS */}
        <div>
          <div className="glass" style={{ padding: 24, marginBottom: 16 }}>
            <div style={{ fontSize: 14, fontWeight: 600, marginBottom: 12 }}>Training Logs</div>
            <div ref={logsRef} className="mono" style={{ background: "rgba(0,0,0,.5)", borderRadius: 10, padding: 16, height: 200, overflowY: "auto", fontSize: 11, lineHeight: 2, border: `1px solid ${C.border}` }}>
              {logs.length === 0
                ? <span style={{ color: C.textMuted }}>$ Waiting... Upload CSV and click Train</span>
                : logs.map((l, i) => (
                  <div key={i} style={{ color: l.includes("✅") || l.includes("complete") ? C.safe : l.includes("error") || l.includes("FAILED") ? C.danger : C.textSecondary }}>{l}</div>
                ))}
            </div>
          </div>

          {meta && (
            <div className="glass" style={{ padding: 24 }}>
              <div style={{ fontSize: 14, fontWeight: 600, marginBottom: 16 }}>Model Performance</div>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginBottom: 20 }}>
                {[
                  { label: "Precision", value: meta.metrics ? `${(meta.metrics.precision * 100).toFixed(1)}%` : "—", color: C.safe },
                  { label: "Recall", value: meta.metrics ? `${(meta.metrics.recall * 100).toFixed(1)}%` : "—", color: C.safe },
                  { label: "F1 Score", value: meta.metrics ? `${(meta.metrics.f1 * 100).toFixed(1)}%` : "—", color: C.accent },
                  { label: "AUC-PR", value: meta.metrics ? meta.metrics.auc_pr.toFixed(3) : "—", color: C.accent },
                  { label: "Fraud Rate in Data", value: `${meta.fraud_rate}%`, color: C.danger },
                  { label: "Training Rows", value: meta.train_size?.toLocaleString(), color: C.accent },
                  { label: "Test Rows", value: meta.test_size?.toLocaleString(), color: C.blue },
                ].map(m => (
                  <div key={m.label} style={{ background: "rgba(255,255,255,.04)", borderRadius: 10, padding: "12px 14px", border: `1px solid ${C.border}`, textAlign: "center" }}>
                    <div style={{ fontSize: 20, fontWeight: 800, color: m.color }}>{m.value}</div>
                    <div style={{ fontSize: 10, color: C.textMuted, marginTop: 4 }}>{m.label}</div>
                  </div>
                ))}
              </div>
              <div style={{ fontSize: 11, color: C.textMuted, marginBottom: 16, lineHeight: 1.5 }}>
                {meta.metrics
                  ? `Measured on a stratified held-out test set (${meta.test_size?.toLocaleString()} rows, ${meta.metrics.positives_in_test} fraud cases), threshold ${meta.metrics.threshold}. `
                  : "Precision/recall not computed yet. Run ml/evaluate.py or retrain. "}
                Accuracy is not shown as a headline: only ~{meta.fraud_rate}% of PaySim rows are fraud, so predicting "safe" for everything already scores ~{(100 - meta.fraud_rate).toFixed(1)}%.
              </div>
              <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 12 }}>Feature Importance</div>
              {Object.entries(meta.feature_importance || {}).sort((a, b) => b[1] - a[1]).slice(0, 8).map(([f, v]) => (
                <RiskBar key={f} label={f} value={Math.round(v * 100)} color={v > 0.2 ? C.danger : v > 0.1 ? C.warning : C.accent} />
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

// ── MAIN APP ──────────────────────────────────────────────────────────────────
export default function App({ user, onLogout }) {
  useEffect(() => { injectStyles(); }, []);
  const [page, setPage] = useState("dashboard");

  const PAGES = {
    dashboard: <Dashboard go={setPage} />,
    transactions: <Transactions go={setPage} user={user} />,
    detect: <FraudDetector />,
    analytics: <Analytics />,
    model: <MLModel user={user} />,
  };

  return (
    <div style={{ display: "flex", minHeight: "100vh", background: C.bg }}>
      <Sidebar active={page} setActive={setPage} user={user} onLogout={onLogout} />
      <div style={{ flex: 1, overflowY: "auto", overflowX: "hidden" }}>
        {PAGES[page]}
      </div>
    </div>
  );
}
