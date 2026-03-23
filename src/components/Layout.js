import React from 'react';
import Sidebar from './Sidebar';

// Layout wraps all protected pages with the sidebar
export default function Layout({ children }) {
  return (
    <div style={{ display: 'flex', minHeight: '100vh', fontFamily: "'IBM Plex Sans', sans-serif" }}>
      <Sidebar />
      <main
        style={{
          marginLeft: '240px',
          flex: 1,
          background: '#f7f4ef',
          minHeight: '100vh',
          padding: '32px',
        }}
      >
        {children}
      </main>
    </div>
  );
}
