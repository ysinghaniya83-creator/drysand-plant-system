import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';

const styles = {
  page: {
    minHeight: '100vh',
    background: '#0f1923',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontFamily: "'IBM Plex Sans', sans-serif",
  },
  card: {
    background: '#1e2d3d',
    borderRadius: '8px',
    padding: '40px',
    width: '100%',
    maxWidth: '400px',
    boxShadow: '0 8px 32px rgba(0,0,0,0.5)',
  },
  heading: {
    color: '#f7f4ef',
    fontSize: '22px',
    fontWeight: 700,
    marginBottom: '4px',
    textAlign: 'center',
  },
  subheading: {
    color: '#8a9bb0',
    fontSize: '13px',
    textAlign: 'center',
    marginBottom: '32px',
  },
  label: {
    display: 'block',
    color: '#8a9bb0',
    fontSize: '12px',
    fontWeight: 600,
    letterSpacing: '0.05em',
    textTransform: 'uppercase',
    marginBottom: '6px',
  },
  input: {
    width: '100%',
    padding: '10px 12px',
    background: '#0f1923',
    border: '1px solid #2a3d52',
    borderRadius: '4px',
    color: '#f7f4ef',
    fontSize: '14px',
    fontFamily: "'IBM Plex Sans', sans-serif",
    boxSizing: 'border-box',
    outline: 'none',
    marginBottom: '20px',
  },
  button: {
    width: '100%',
    padding: '12px',
    background: '#c8441a',
    border: 'none',
    borderRadius: '4px',
    color: '#f7f4ef',
    fontSize: '15px',
    fontWeight: 600,
    cursor: 'pointer',
    fontFamily: "'IBM Plex Sans', sans-serif",
    marginTop: '4px',
  },
  error: {
    background: 'rgba(200,68,26,0.15)',
    border: '1px solid #c8441a',
    borderRadius: '4px',
    color: '#ff7a55',
    fontSize: '13px',
    padding: '10px 12px',
    marginBottom: '16px',
  },
};

export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const { login } = useAuth();
  const navigate = useNavigate();

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      await login(email, password);
      navigate('/dashboard');
    } catch (err) {
      const code = err.code;
      if (code === 'auth/user-not-found' || code === 'auth/wrong-password' || code === 'auth/invalid-credential') {
        setError('Invalid email or password. Please try again.');
      } else if (code === 'auth/too-many-requests') {
        setError('Too many failed attempts. Please try again later.');
      } else if (code === 'auth/user-disabled') {
        setError('This account has been disabled. Please contact support.');
      } else {
        setError('Sign in failed. Please check your credentials and try again.');
      }
    } finally {
      setLoading(false);
    }
  }

  return (
    <div style={styles.page}>
      <div style={styles.card}>
        <h1 style={styles.heading}>Dry Sand Plant</h1>
        <p style={styles.subheading}>Management System — Sign In</p>

        {error && <div style={styles.error}>{error}</div>}

        <form onSubmit={handleSubmit}>
          <label style={styles.label}>Email</label>
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            style={styles.input}
            placeholder="admin@example.com"
            required
            autoComplete="email"
          />

          <label style={styles.label}>Password</label>
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            style={styles.input}
            placeholder="••••••••"
            required
            autoComplete="current-password"
          />

          <button type="submit" style={styles.button} disabled={loading}>
            {loading ? 'Signing in…' : 'Sign In'}
          </button>
        </form>
      </div>
    </div>
  );
}
