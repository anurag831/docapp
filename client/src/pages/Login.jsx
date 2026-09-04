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
      <div className="login-top-bar">
        <div className="login-top-brand">
          <span className="app-logo-inline">📄</span>
          <span className="app-name-inline">DocApp</span>
          <span className="badge-demo-tag">Project Demo</span>
        </div>
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

      <div className="login-showcase-wrapper">
        {/* Video Walkthrough Showcase */}
        <div className="login-video-showcase">
          <div className="video-showcase-header">
            <span className="video-live-pill">
              <span className="video-live-dot"></span> VIDEO WALKTHROUGH
            </span>
            <h2 className="video-showcase-title">System Architecture & Live Demo</h2>
            <p className="video-showcase-desc">
              Watch our 5-minute technical walkthrough covering real-time collaboration, version snapshot rollback, suggestions mode, and role permissions.
            </p>
          </div>

          <div className="video-iframe-container">
            <iframe
              src="https://www.youtube.com/embed/P_z_ix0IZn0"
              title="DocApp Project Video Walkthrough"
              frameBorder="0"
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
              allowFullScreen
            ></iframe>
          </div>

          <div className="video-showcase-footer">
            <div className="video-tags-list">
              <span className="feature-pill">⚡ WebSockets</span>
              <span className="feature-pill">📜 Version History</span>
              <span className="feature-pill">💬 Suggestions</span>
              <span className="feature-pill">🔒 RBAC</span>
            </div>
            <a
              href="https://youtu.be/P_z_ix0IZn0"
              target="_blank"
              rel="noopener noreferrer"
              className="video-watch-link"
              id="link-login-video"
              title="Watch on YouTube"
            >
              Watch on YouTube ↗
            </a>
          </div>
        </div>

        {/* Login Card */}
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
            Demo accounts — no password needed. Switch accounts in different tabs to test live collaboration.
          </p>
        </div>
      </div>
    </div>
  );
}
