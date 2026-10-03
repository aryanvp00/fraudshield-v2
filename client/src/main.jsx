import React, { useState, useEffect } from 'react'
import ReactDOM from 'react-dom/client'
import App from './App.jsx'
import Login from './Login.jsx'
import * as api from './api'

function Root() {
  const [user, setUser] = useState(api.getToken() ? api.getUser() : null);

  // drop stale/invalid token on load (api.handle logs out on 401)
  useEffect(() => { if (api.getToken()) api.getMe().catch(() => {}); }, []);

  if (!user) return <Login onAuth={setUser} />;
  return <App user={user} onLogout={api.logout} />;
}

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <Root />
  </React.StrictMode>
)
