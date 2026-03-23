import React from 'react';
import Layout from '../components/Layout';

export default function ProfitPage() {
  return (
    <Layout>
      <div style={{ padding: '16px' }}>
        <h1 style={{ fontSize: '22px', fontWeight: 700, color: '#0f1923', marginBottom: '12px' }}>
          Profit
        </h1>
        <div
          style={{
            background: '#fff',
            borderRadius: '8px',
            padding: '48px',
            boxShadow: '0 2px 8px rgba(0,0,0,0.07)',
            textAlign: 'center',
            color: '#5a7a99',
            fontSize: '18px',
            fontWeight: 500,
          }}
        >
          Profit — Coming Soon
        </div>
      </div>
    </Layout>
  );
}
