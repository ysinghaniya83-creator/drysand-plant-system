import React, { useState } from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';

// Color palette
const colors = {
  ink: '#0f1923',
  accent: '#c8441a',
  paper: '#f7f4ef',
  blue: '#1a4d7a',
  green: '#1a6b3a',
  inkLight: '#1e2d3d',
  textMuted: '#8a9bb0',
};

const navGroups = [
  {
    label: 'Operations',
    links: [
      { to: '/dashboard', label: 'Dashboard' },
      { to: '/weighbridge', label: 'Weighbridge' },
      { to: '/production', label: 'Production' },
      { to: '/bagging', label: 'Bagging' },
      { to: '/sales', label: 'Sales' },
    ],
  },
  {
    label: 'Finance & Stock',
    links: [
      { to: '/purchase', label: 'Purchase & Bills' },
      { to: '/expenses', label: 'Expenses' },
      { to: '/accounts', label: 'Accounts' },
      { to: '/profit', label: 'Profit' },
      { to: '/closing-stock', label: 'Closing Stock' },
    ],
  },
  {
    label: 'Reports & People',
    links: [
      { to: '/vehicles', label: 'Vehicles' },
      { to: '/employees', label: 'Employees' },
      { to: '/reports', label: 'Reports' },
    ],
  },
  {
    label: 'System',
    links: [{ to: '/masters', label: 'Masters' }],
  },
];

export default function Sidebar() {
  const { logout } = useAuth();
  const navigate = useNavigate();
  const [loggingOut, setLoggingOut] = useState(false);

  async function handleLogout() {
    setLoggingOut(true);
    try {
      await logout();
      navigate('/login');
    } catch (err) {
      console.error('Logout failed', err);
      setLoggingOut(false);
    }
  }

  return (
    <aside
      style={{
        width: '240px',
        minHeight: '100vh',
        background: colors.ink,
        color: colors.paper,
        position: 'fixed',
        top: 0,
        left: 0,
        display: 'flex',
        flexDirection: 'column',
        fontFamily: "'IBM Plex Sans', sans-serif",
        boxShadow: '2px 0 8px rgba(0,0,0,0.4)',
        zIndex: 100,
      }}
    >
      {/* Brand header */}
      <div
        style={{
          padding: '20px 16px 16px',
          borderBottom: `2px solid ${colors.accent}`,
        }}
      >
        <div
          style={{
            fontSize: '13px',
            fontWeight: 700,
            color: colors.accent,
            letterSpacing: '0.08em',
            textTransform: 'uppercase',
          }}
        >
          Dry Sand Plant
        </div>
        <div
          style={{
            fontSize: '11px',
            color: colors.textMuted,
            marginTop: '2px',
          }}
        >
          Management System
        </div>
      </div>

      {/* Navigation groups */}
      <nav style={{ flex: 1, overflowY: 'auto', padding: '8px 0' }}>
        {navGroups.map((group) => (
          <div key={group.label} style={{ marginBottom: '8px' }}>
            <div
              style={{
                fontSize: '10px',
                fontWeight: 600,
                color: colors.textMuted,
                letterSpacing: '0.1em',
                textTransform: 'uppercase',
                padding: '10px 16px 4px',
              }}
            >
              {group.label}
            </div>
            {group.links.map((link) => (
              <NavLink
                key={link.to}
                to={link.to}
                style={({ isActive }) => ({
                  display: 'block',
                  padding: '9px 16px',
                  fontSize: '14px',
                  fontWeight: isActive ? 600 : 400,
                  color: isActive ? colors.paper : colors.textMuted,
                  background: isActive ? colors.accent : 'transparent',
                  textDecoration: 'none',
                  borderRadius: '4px',
                  margin: '1px 8px',
                  transition: 'background 0.15s, color 0.15s',
                })}
              >
                {link.label}
              </NavLink>
            ))}
          </div>
        ))}
      </nav>

      {/* Logout button */}
      <div style={{ padding: '12px 8px', borderTop: `1px solid ${colors.inkLight}` }}>
        <button
          onClick={handleLogout}
          disabled={loggingOut}
          style={{
            width: '100%',
            padding: '10px 16px',
            background: 'transparent',
            border: `1px solid ${colors.accent}`,
            borderRadius: '4px',
            color: colors.accent,
            fontSize: '14px',
            fontWeight: 600,
            cursor: 'pointer',
            fontFamily: "'IBM Plex Sans', sans-serif",
          }}
        >
          {loggingOut ? 'Logging out…' : 'Logout'}
        </button>
      </div>
    </aside>
  );
}
