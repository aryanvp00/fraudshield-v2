import { useState } from "react";
import * as api from "./api";

const box = { minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", background: "#0b0f1a", color: "#e5e7eb", fontFamily: "system-ui, sans-serif", padding: 16 };
const card = { width: 380, maxWidth: "100%", padding: 28, background: "#111827", border: "1px solid #1f2937", borderRadius: 12 };
const input = { width: "100%", boxSizing: "border-box", padding: "10px 12px", background: "#0b0f1a", border: "1px solid #374151", borderRadius: 8, color: "#e5e7eb", fontSize: 14 };
const btn = { width: "100%", padding: "10px 12px", border: 0, borderRadius: 8, background: "#6366f1", color: "#fff", fontSize: 14, cursor: "pointer", marginBottom: 10 };
const ghost = { ...btn, background: "transparent", border: "1px solid #374151", color: "#9ca3af" };
const errS = { color: "#f87171", fontSize: 12, margin: "4px 0 0" };

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
function validate(mode, f) {
  const e = {};
  if (mode === "register" && (f.name.trim().length < 2 || f.name.trim().length > 50)) e.name = "Name must be 2-50 characters";
  if (!EMAIL_RE.test(f.email.trim())) e.email = "Enter a valid email address";
  if (mode === "register") {
    if (f.password.length < 8) e.password = "At least 8 characters";
    else if (!/[a-z]/.test(f.password) || !/[A-Z]/.test(f.password) || !/\d/.test(f.password)) e.password = "Needs uppercase, lowercase and a number";
    if (f.confirm !== f.password) e.confirm = "Passwords do not match";
  } else if (!f.password) e.password = "Enter your password";
  return e;
}

export default function Login({ onAuth }) {
  const [mode, setMode] = useState("login");
  const [f, setF] = useState({ name: "", email: "", password: "", confirm: "" });
  const [errs, setErrs] = useState({});
  const [formErr, setFormErr] = useState("");
  const [busy, setBusy] = useState(false);
  const set = k => ev => setF(p => ({ ...p, [k]: ev.target.value }));

  const run = async (fn) => {
    setFormErr(""); setBusy(true);
    try { const r = await fn(); api.saveAuth(r); onAuth(r.user); }
    catch (e) {
      if (e.fields && Object.keys(e.fields).length) setErrs({ name: e.fields.name, email: e.fields.email, password: e.fields.password, confirm: e.fields.confirmPassword });
      else setFormErr(e.message);
    }
    setBusy(false);
  };

  const submit = () => {
    const e = validate(mode, f);
    setErrs(e);
    if (Object.keys(e).length) return;
    run(() => mode === "login" ? api.login(f.email.trim(), f.password) : api.register(f.name.trim(), f.email.trim(), f.password, f.confirm));
  };

  const field = (k, ph, type = "text") => (
    <div style={{ marginBottom: 12 }}>
      <input style={{ ...input, borderColor: errs[k] ? "#f87171" : "#374151" }} placeholder={ph} type={type} value={f[k]} onChange={set(k)}
        autoComplete={k === "password" ? (mode === "login" ? "current-password" : "new-password") : k === "email" ? "email" : "off"}
        onKeyDown={ev => ev.key === "Enter" && submit()} />
      {errs[k] && <div style={errS}>{errs[k]}</div>}
    </div>
  );

  return (
    <div style={box}>
      <div style={card}>
        <h2 style={{ margin: "0 0 4px" }}>🛡️ FraudShield</h2>
        <p style={{ margin: "0 0 20px", color: "#9ca3af", fontSize: 13 }}>{mode === "login" ? "Sign in to see your transactions" : "Create your account"}</p>
        {mode === "register" && field("name", "Full name")}
        {field("email", "Email", "email")}
        {field("password", mode === "register" ? "Password (8+, upper, lower, number)" : "Password", "password")}
        {mode === "register" && field("confirm", "Confirm password", "password")}
        {formErr && <div style={{ ...errS, fontSize: 13, marginBottom: 10 }}>{formErr}</div>}
        <button style={btn} disabled={busy} onClick={submit}>{busy ? "Please wait…" : mode === "login" ? "Login" : "Register"}</button>
        <button style={ghost} disabled={busy} onClick={() => run(api.demoLogin)}>Try demo (read-only)</button>
        <div style={{ textAlign: "center", fontSize: 13, color: "#9ca3af", cursor: "pointer" }} onClick={() => { setErrs({}); setFormErr(""); setMode(mode === "login" ? "register" : "login"); }}>
          {mode === "login" ? "No account? Register" : "Have an account? Login"}
        </div>
      </div>
    </div>
  );
}
