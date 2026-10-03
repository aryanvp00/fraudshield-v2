const BASE = import.meta.env.VITE_API_URL || 'http://localhost:3001/api';

export const getToken = () => localStorage.getItem('fs_token');
export const getUser = () => { try { return JSON.parse(localStorage.getItem('fs_user') || 'null'); } catch { return null; } };
export const saveAuth = ({ token, user }) => {
  localStorage.setItem('fs_token', token);
  localStorage.setItem('fs_user', JSON.stringify(user));
};
export const logout = () => {
  localStorage.removeItem('fs_token');
  localStorage.removeItem('fs_user');
  window.location.reload();
};

const authH = (extra = {}) => (getToken() ? { ...extra, Authorization: `Bearer ${getToken()}` } : extra);
const J = { 'Content-Type': 'application/json' };

const handle = async (res) => {
  const data = await res.json().catch(() => ({}));
  if (res.status === 401) { logout(); }
  if (!res.ok) throw new Error(data.error || 'Server error');
  return data;
};

// ── AUTH ─────────────────────────────────────────────────────────────────────
const authPost = async (path, body) => {
  const res = await fetch(`${BASE}/auth/${path}`, { method: 'POST', headers: J, body: JSON.stringify(body || {}) });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) { const e = new Error(data.error || 'Server error'); e.fields = data.fields || {}; throw e; }
  return data;
};
export const getMe = () => fetch(`${BASE}/auth/me`, { headers: authH() }).then(handle);
export const login = (email, password) => authPost('login', { email, password });
export const register = (name, email, password, confirmPassword) => authPost('register', { name, email, password, confirmPassword });
export const demoLogin = () => authPost('demo');

// ── PREDICT ──────────────────────────────────────────────────────────────────
export const predictFraud = (payload) =>
  fetch(`${BASE}/predict`, { method: 'POST', headers: authH(J), body: JSON.stringify(payload) }).then(handle);

// ── TRANSACTIONS ─────────────────────────────────────────────────────────────
export const getTransactions = (params = {}) => {
  const q = new URLSearchParams(params).toString();
  return fetch(`${BASE}/transactions?${q}`, { headers: authH() }).then(handle);
};
export const getTransaction = (id) =>
  fetch(`${BASE}/transactions/${id}`, { headers: authH() }).then(handle);
export const reviewTransaction = (id) =>
  fetch(`${BASE}/transactions/${id}/review`, {
    method: 'PATCH', headers: authH(J),
    body: JSON.stringify({ reviewedBy: (getUser() || {}).name })
  }).then(handle);
export const deleteTransaction = (id) =>
  fetch(`${BASE}/transactions/${id}`, { method: 'DELETE', headers: authH() }).then(handle);

// ── DASHBOARD ────────────────────────────────────────────────────────────────
export const getDashboardStats = () =>
  fetch(`${BASE}/dashboard/stats`, { headers: authH() }).then(handle);

// ── MODEL ────────────────────────────────────────────────────────────────────
export const getModelMetadata = () =>
  fetch(`${BASE}/model/metadata`, { headers: authH() }).then(handle);
export const getModelStatus = () =>
  fetch(`${BASE}/model/status`, { headers: authH() }).then(handle);

export const trainModel = (file, onLog) => {
  const form = new FormData();
  form.append('dataset', file);
  return fetch(`${BASE}/model/train`, { method: 'POST', headers: authH(), body: form })
    .then(async res => {
      if (!res.ok) {
        const d = await res.json().catch(() => ({}));
        throw new Error(d.error || 'Training not allowed (admin only)');
      }
      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      const read = () => reader.read().then(({ done, value }) => {
        if (done) return;
        decoder.decode(value).split('\n').filter(l => l.startsWith('data:')).forEach(l => {
          onLog(l.replace('data: ', '').trim());
        });
        return read();
      });
      return read();
    });
};
