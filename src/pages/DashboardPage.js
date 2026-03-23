import React from 'react';
import Layout from '../components/Layout';

// Dashboard tile data
const tiles = [
  { label: "Today's Production", icon: '⚙️', color: '#1a4d7a' },
  { label: "Today's Sales", icon: '💰', color: '#1a6b3a' },
  { label: 'Current Stock', icon: '📦', color: '#1a4d7a' },
  { label: "Today's Profit", icon: '📈', color: '#1a6b3a' },
  { label: 'Pending Purchase Bills', icon: '🧾', color: '#c8441a' },
  { label: 'Stock Warnings', icon: '⚠️', color: '#b07a00' },
  { label: 'Document Expiry Alerts', icon: '📅', color: '#c8441a' },
];

const styles = {
  heading: {
    fontSize: '22px',
    fontWeight: 700,
    color: '#0f1923',
    marginBottom: '8px',
  },
  subheading: {
    color: '#5a7a99',
    fontSize: '14px',
    marginBottom: '28px',
  },
  grid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))',
    gap: '20px',
  },
  tile: (color) => ({
    background: '#fff',
    borderRadius: '8px',
    padding: '24px 20px',
    boxShadow: '0 2px 8px rgba(0,0,0,0.07)',
    borderTop: `4px solid ${color}`,
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'flex-start',
  }),
  icon: {
    fontSize: '28px',
    marginBottom: '12px',
  },
  tileLabel: {
    fontSize: '13px',
    fontWeight: 600,
    color: '#5a7a99',
    textTransform: 'uppercase',
    letterSpacing: '0.05em',
    marginBottom: '8px',
  },
  tileValue: {
    fontSize: '24px',
    fontWeight: 700,
    color: '#0f1923',
  },
};

export default function DashboardPage() {
  return (
    <Layout>
      <h1 style={styles.heading}>Dashboard</h1>
      <p style={styles.subheading}>Welcome to the Dry Sand Plant Management System</p>

      <div style={styles.grid}>
        {tiles.map((tile) => (
          <div key={tile.label} style={styles.tile(tile.color)}>
            <span style={styles.icon}>{tile.icon}</span>
            <span style={styles.tileLabel}>{tile.label}</span>
            <span style={styles.tileValue}>—</span>
          </div>
        ))}
      </div>
    </Layout>
  );
}
