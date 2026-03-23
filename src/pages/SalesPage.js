import React, { useState, useEffect } from 'react';
import {
  collection,
  addDoc,
  query,
  orderBy,
  limit,
  onSnapshot,
} from 'firebase/firestore';
import { db } from '../services/firebase';
import Layout from '../components/Layout';

const inputStyle = {
  width: '100%',
  padding: '9px 11px',
  border: '1px solid #c8d4df',
  borderRadius: '4px',
  fontSize: '14px',
  fontFamily: "'IBM Plex Sans', sans-serif",
  boxSizing: 'border-box',
  background: '#fff',
  color: '#0f1923',
  outline: 'none',
};

const readonlyStyle = {
  ...inputStyle,
  background: '#d4f0dc',
  fontWeight: 600,
  cursor: 'not-allowed',
};

const labelStyle = {
  display: 'block',
  fontSize: '12px',
  fontWeight: 600,
  color: '#5a7a99',
  textTransform: 'uppercase',
  letterSpacing: '0.04em',
  marginBottom: '4px',
};

const fieldStyle = { marginBottom: '16px' };

const tabBtn = (active) => ({
  padding: '10px 24px',
  border: 'none',
  borderBottom: active ? '3px solid #c8441a' : '3px solid transparent',
  background: 'transparent',
  fontSize: '14px',
  fontWeight: active ? 700 : 400,
  color: active ? '#c8441a' : '#5a7a99',
  cursor: 'pointer',
  fontFamily: "'IBM Plex Sans', sans-serif",
});

const submitBtn = {
  padding: '11px 28px',
  background: '#c8441a',
  color: '#fff',
  border: 'none',
  borderRadius: '4px',
  fontSize: '14px',
  fontWeight: 600,
  cursor: 'pointer',
  fontFamily: "'IBM Plex Sans', sans-serif",
  marginTop: '8px',
};

// ─── Loose Sales ──────────────────────────────────────────────────────────────

const looseDefaults = {
  date: '',
  party: '',
  grade: '600µm',
  netWeight: '',
  rate: '',
  transportCost: '',
};

function LooseSales() {
  const [form, setForm] = useState(looseDefaults);
  const [entries, setEntries] = useState([]);
  const [submitting, setSubmitting] = useState(false);
  const [msg, setMsg] = useState('');

  // Auto-calculate amount
  const amount =
    form.netWeight !== '' && form.rate !== ''
      ? (parseFloat(form.netWeight) * parseFloat(form.rate)).toFixed(2)
      : '';

  useEffect(() => {
    const q = query(
      collection(db, 'sales_loose'),
      orderBy('createdAt', 'desc'),
      limit(10)
    );
    const unsub = onSnapshot(q, (snap) => {
      setEntries(snap.docs.map((d) => ({ id: d.id, ...d.data() })));
    });
    return unsub;
  }, []);

  function handleChange(e) {
    setForm((prev) => ({ ...prev, [e.target.name]: e.target.value }));
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setSubmitting(true);
    setMsg('');
    try {
      await addDoc(collection(db, 'sales_loose'), {
        ...form,
        amount: amount !== '' ? parseFloat(amount) : 0,
        createdAt: new Date(),
      });
      setForm(looseDefaults);
      setMsg('Sale entry saved!');
    } catch (err) {
      setMsg(`Error: ${err.message || 'Failed to save entry. Please try again.'}`);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div>
      <form onSubmit={handleSubmit}>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0 24px' }}>
          <div style={fieldStyle}>
            <label style={labelStyle}>Date</label>
            <input type="date" name="date" value={form.date} onChange={handleChange} style={inputStyle} required />
          </div>
          <div style={fieldStyle}>
            <label style={labelStyle}>Party Name</label>
            <input type="text" name="party" value={form.party} onChange={handleChange} style={inputStyle} required />
          </div>
          <div style={fieldStyle}>
            <label style={labelStyle}>Grade</label>
            <select name="grade" value={form.grade} onChange={handleChange} style={inputStyle}>
              <option value="600µm">600µm</option>
              <option value="1200µm">1200µm</option>
            </select>
          </div>
          <div style={fieldStyle}>
            <label style={labelStyle}>Net Weight (Ton)</label>
            <input type="number" name="netWeight" value={form.netWeight} onChange={handleChange} style={inputStyle} required min="0" step="0.01" />
          </div>
          <div style={fieldStyle}>
            <label style={labelStyle}>Rate (per Ton)</label>
            <input type="number" name="rate" value={form.rate} onChange={handleChange} style={inputStyle} required min="0" step="0.01" />
          </div>
          <div style={fieldStyle}>
            <label style={labelStyle}>Amount (auto)</label>
            <input type="number" value={amount} readOnly style={readonlyStyle} />
          </div>
          <div style={fieldStyle}>
            <label style={labelStyle}>Transport Cost</label>
            <input type="number" name="transportCost" value={form.transportCost} onChange={handleChange} style={inputStyle} min="0" step="0.01" />
          </div>
        </div>

        {msg && (
          <div style={{ marginBottom: '12px', color: msg.includes('Error') ? '#c8441a' : '#1a6b3a', fontWeight: 600, fontSize: '13px' }}>
            {msg}
          </div>
        )}
        <button type="submit" style={submitBtn} disabled={submitting}>
          {submitting ? 'Saving…' : 'Submit Sale'}
        </button>
      </form>

      <h3 style={{ marginTop: '32px', marginBottom: '12px', fontSize: '15px', color: '#0f1923' }}>Recent 10 Entries</h3>
      <div style={{ overflowX: 'auto' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px' }}>
          <thead>
            <tr style={{ background: '#0f1923', color: '#f7f4ef' }}>
              {['Date', 'Party', 'Grade', 'Net Wt (T)', 'Rate', 'Amount', 'Transport'].map((h) => (
                <th key={h} style={{ padding: '8px 12px', textAlign: 'left', fontWeight: 600 }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {entries.length === 0 ? (
              <tr><td colSpan={7} style={{ padding: '16px', textAlign: 'center', color: '#8a9bb0' }}>No entries yet</td></tr>
            ) : (
              entries.map((e, i) => (
                <tr key={e.id} style={{ background: i % 2 === 0 ? '#fff' : '#f7f4ef' }}>
                  <td style={{ padding: '8px 12px' }}>{e.date}</td>
                  <td style={{ padding: '8px 12px' }}>{e.party}</td>
                  <td style={{ padding: '8px 12px' }}>{e.grade}</td>
                  <td style={{ padding: '8px 12px' }}>{e.netWeight}</td>
                  <td style={{ padding: '8px 12px' }}>{e.rate}</td>
                  <td style={{ padding: '8px 12px', fontWeight: 600, color: '#1a6b3a' }}>₹{e.amount}</td>
                  <td style={{ padding: '8px 12px' }}>{e.transportCost}</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// ─── Bag Sales ────────────────────────────────────────────────────────────────

const bagDefaults = {
  date: '',
  party: '',
  grade: '600µm',
  bagSize: '25',
  numberOfBags: '',
  rate: '',
  transportCost: '',
};

function BagSales() {
  const [form, setForm] = useState(bagDefaults);
  const [entries, setEntries] = useState([]);
  const [submitting, setSubmitting] = useState(false);
  const [msg, setMsg] = useState('');

  // Auto-calculated fields
  const totalWeight =
    form.numberOfBags !== '' && form.bagSize !== ''
      ? ((parseFloat(form.numberOfBags) * parseFloat(form.bagSize)) / 1000).toFixed(3)
      : '';

  const perBagPrice =
    form.rate !== '' && form.bagSize !== ''
      ? ((parseFloat(form.rate) * parseFloat(form.bagSize)) / 1000).toFixed(2)
      : '';

  const totalAmount =
    form.numberOfBags !== '' && perBagPrice !== ''
      ? (parseFloat(form.numberOfBags) * parseFloat(perBagPrice)).toFixed(2)
      : '';

  useEffect(() => {
    const q = query(
      collection(db, 'sales_bag'),
      orderBy('createdAt', 'desc'),
      limit(10)
    );
    const unsub = onSnapshot(q, (snap) => {
      setEntries(snap.docs.map((d) => ({ id: d.id, ...d.data() })));
    });
    return unsub;
  }, []);

  function handleChange(e) {
    setForm((prev) => ({ ...prev, [e.target.name]: e.target.value }));
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setSubmitting(true);
    setMsg('');
    try {
      await addDoc(collection(db, 'sales_bag'), {
        ...form,
        totalWeight: totalWeight !== '' ? parseFloat(totalWeight) : 0,
        perBagPrice: perBagPrice !== '' ? parseFloat(perBagPrice) : 0,
        totalAmount: totalAmount !== '' ? parseFloat(totalAmount) : 0,
        createdAt: new Date(),
      });
      setForm(bagDefaults);
      setMsg('Bag sale entry saved!');
    } catch (err) {
      setMsg(`Error: ${err.message || 'Failed to save entry. Please try again.'}`);
    } finally {
      setSubmitting(false);
    }
  }

  const readonlyStyle2 = { ...inputStyle, background: '#d4f0dc', fontWeight: 600, cursor: 'not-allowed' };

  return (
    <div>
      <form onSubmit={handleSubmit}>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0 24px' }}>
          <div style={fieldStyle}>
            <label style={labelStyle}>Date</label>
            <input type="date" name="date" value={form.date} onChange={handleChange} style={inputStyle} required />
          </div>
          <div style={fieldStyle}>
            <label style={labelStyle}>Party Name</label>
            <input type="text" name="party" value={form.party} onChange={handleChange} style={inputStyle} required />
          </div>
          <div style={fieldStyle}>
            <label style={labelStyle}>Grade</label>
            <select name="grade" value={form.grade} onChange={handleChange} style={inputStyle}>
              <option value="600µm">600µm</option>
              <option value="1200µm">1200µm</option>
            </select>
          </div>
          <div style={fieldStyle}>
            <label style={labelStyle}>Bag Size (kg)</label>
            <select name="bagSize" value={form.bagSize} onChange={handleChange} style={inputStyle}>
              <option value="20">20 kg</option>
              <option value="25">25 kg</option>
              <option value="40">40 kg</option>
            </select>
          </div>
          <div style={fieldStyle}>
            <label style={labelStyle}>Number of Bags</label>
            <input type="number" name="numberOfBags" value={form.numberOfBags} onChange={handleChange} style={inputStyle} required min="1" step="1" />
          </div>
          <div style={fieldStyle}>
            <label style={labelStyle}>Total Weight (Ton, auto)</label>
            <input type="number" value={totalWeight} readOnly style={readonlyStyle2} />
          </div>
          <div style={fieldStyle}>
            <label style={labelStyle}>Rate (per Ton)</label>
            <input type="number" name="rate" value={form.rate} onChange={handleChange} style={inputStyle} required min="0" step="0.01" />
          </div>
          <div style={fieldStyle}>
            <label style={labelStyle}>Per Bag Price (auto)</label>
            <input type="number" value={perBagPrice} readOnly style={readonlyStyle2} />
          </div>
          <div style={fieldStyle}>
            <label style={labelStyle}>Total Amount (auto)</label>
            <input type="number" value={totalAmount} readOnly style={readonlyStyle2} />
          </div>
          <div style={fieldStyle}>
            <label style={labelStyle}>Transport Cost</label>
            <input type="number" name="transportCost" value={form.transportCost} onChange={handleChange} style={inputStyle} min="0" step="0.01" />
          </div>
        </div>

        {msg && (
          <div style={{ marginBottom: '12px', color: msg.includes('Error') ? '#c8441a' : '#1a6b3a', fontWeight: 600, fontSize: '13px' }}>
            {msg}
          </div>
        )}
        <button type="submit" style={submitBtn} disabled={submitting}>
          {submitting ? 'Saving…' : 'Submit Sale'}
        </button>
      </form>

      <h3 style={{ marginTop: '32px', marginBottom: '12px', fontSize: '15px', color: '#0f1923' }}>Recent 10 Entries</h3>
      <div style={{ overflowX: 'auto' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px' }}>
          <thead>
            <tr style={{ background: '#0f1923', color: '#f7f4ef' }}>
              {['Date', 'Party', 'Grade', 'Bag Size', 'Bags', 'Total Wt (T)', 'Rate', 'Per Bag', 'Total Amt', 'Transport'].map((h) => (
                <th key={h} style={{ padding: '8px 12px', textAlign: 'left', fontWeight: 600 }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {entries.length === 0 ? (
              <tr><td colSpan={10} style={{ padding: '16px', textAlign: 'center', color: '#8a9bb0' }}>No entries yet</td></tr>
            ) : (
              entries.map((e, i) => (
                <tr key={e.id} style={{ background: i % 2 === 0 ? '#fff' : '#f7f4ef' }}>
                  <td style={{ padding: '8px 12px' }}>{e.date}</td>
                  <td style={{ padding: '8px 12px' }}>{e.party}</td>
                  <td style={{ padding: '8px 12px' }}>{e.grade}</td>
                  <td style={{ padding: '8px 12px' }}>{e.bagSize} kg</td>
                  <td style={{ padding: '8px 12px' }}>{e.numberOfBags}</td>
                  <td style={{ padding: '8px 12px' }}>{e.totalWeight}</td>
                  <td style={{ padding: '8px 12px' }}>{e.rate}</td>
                  <td style={{ padding: '8px 12px' }}>₹{e.perBagPrice}</td>
                  <td style={{ padding: '8px 12px', fontWeight: 600, color: '#1a6b3a' }}>₹{e.totalAmount}</td>
                  <td style={{ padding: '8px 12px' }}>{e.transportCost}</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function SalesPage() {
  const [activeTab, setActiveTab] = useState('loose');

  return (
    <Layout>
      <h1 style={{ fontSize: '22px', fontWeight: 700, color: '#0f1923', marginBottom: '20px' }}>Sales</h1>

      <div style={{ borderBottom: '2px solid #e4ddd5', marginBottom: '28px', display: 'flex', gap: '4px' }}>
        <button style={tabBtn(activeTab === 'loose')} onClick={() => setActiveTab('loose')}>
          Loose Sales
        </button>
        <button style={tabBtn(activeTab === 'bag')} onClick={() => setActiveTab('bag')}>
          Bag Sales
        </button>
      </div>

      <div style={{ background: '#fff', borderRadius: '8px', padding: '28px', boxShadow: '0 2px 8px rgba(0,0,0,0.07)' }}>
        {activeTab === 'loose' ? <LooseSales /> : <BagSales />}
      </div>
    </Layout>
  );
}
