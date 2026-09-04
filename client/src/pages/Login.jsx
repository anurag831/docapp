import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { auth } from '../api';
import { useTheme } from '../context/ThemeContext';

const USERS = [
  { name: 'Alice', email: 'alice@demo.com' },
  { name: 'Bob', email: 'bob@demo.com' },
  { name: 'Carol', email: 'carol@demo.com' },
];

export default function Login() {
  const navigate = useNavigate();
  const { theme, toggleTheme } = useTheme();
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (localStorage.getItem('userId')) {
      navigate('/', { replace: true });
    }
  }, [navigate]);

  const handleLogin = async (email) => {
    try {
      setLoading(true);
      setError('');
      const res = await auth.login(email);
      localStorage.setItem('userId', res.data.id);
      localStorage.setItem('userName', res.data.name);
      navigate('/');
    } catch (err) {
      setError(err.response?.data?.error || 'Login failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="login-container">
      <div className="login-theme-toggle-wrap">
        <button
          id="btn-login-theme"
          type="button"
          className="btn btn-outline btn-sm"
          onClick={toggleTheme}
          title={`Switch to ${theme === 'dark' ? 'light' : 'dark'} mode`}
        >
          {theme === 'dark' ? '☀️ Light' : '🌙 Dark'}
        </button>
      </div>
      <div className="login-card">
        <div className="login-header">
          <div className="app-logo">📄 DocApp</div>
          <h1>Google Docs Lite</h1>
          <p className="login-subtitle">Select a demo user account to get started</p>
        </div>

        {error && <div className="error-message">{error}</div>}

        <div className="demo-user-buttons">
          {USERS.map((user) => (
            <button
              key={user.email}
              id={`login-${user.name.toLowerCase()}`}
              className="btn btn-primary btn-block"
              disabled={loading}
              onClick={() => handleLogin(user.email)}
            >
              Login as {user.name}
            </button>
          ))}
        </div>

        <p className="login-note">
          Demo accounts — no password needed. Switch accounts to test sharing.
        </p>
      </div>
    </div>
  );
}
