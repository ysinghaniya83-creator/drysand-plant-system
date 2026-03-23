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

const defaultFinishedSand = [
  { grade: '600µm', quantity: '' },
  { grade: '1200µm', quantity: '' },
];

const formDefaults = {
  date: '',
  shift: 'Morning',
  rawSandUsed: '',
  coalUsed: '',
  coalUnit: 'Ton',
  wastage: '',
};

export default function ProductionPage() {
  const [form, setForm] = useState(formDefaults);
  const [finishedSand, setFinishedSand] = useState(defaultFinishedSand);
  const [entries, setEntries] = useState([]);
  const [submitting, setSubmitting] = useState(false);
  const [msg, setMsg] = useState('');

  useEffect(() => {
    const q = query(
      collection(db, 'production'),
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

  function handleSandRow(index, field, value) {
    setFinishedSand((prev) =>
      prev.map((row, i) => (i === index ? { ...row, [field]: value } : row))
    );
  }

  function addSandRow() {
    setFinishedSand((prev) => [...prev, { grade: '', quantity: '' }]);
  }

  function removeSandRow(index) {
    setFinishedSand((prev) => prev.filter((_, i) => i !== index));
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setSubmitting(true);
    setMsg('');
    try {
      await addDoc(collection(db, 'production'), {
        ...form,
        finishedSand,
        createdAt: new Date(),
      });
      setForm(formDefaults);
      setFinishedSand(defaultFinishedSand);
      setMsg('Production entry saved!');
    } catch (err) {
      setMsg(`Error: ${err.message || 'Failed to save entry. Please try again.'}`);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Layout>
      <h1 style={{ fontSize: '22px', fontWeight: 700, color: '#0f1923', marginBottom: '20px' }}>Production</h1>

      <div style={{ background: '#fff', borderRadius: '8px', padding: '28px', boxShadow: '0 2px 8px rgba(0,0,0,0.07)' }}>
        <form onSubmit={handleSubmit}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0 24px' }}>
            <div style={fieldStyle}>
              <label style={labelStyle}>Date</label>
              <input type="date" name="date" value={form.date} onChange={handleChange} style={inputStyle} required />
            </div>
            <div style={fieldStyle}>
              <label style={labelStyle}>Shift</label>
              <select name="shift" value={form.shift} onChange={handleChange} style={inputStyle}>
                <option>Morning</option>
                <option>Evening</option>
                <option>Night</option>
              </select>
            </div>
            <div style={fieldStyle}>
              <label style={labelStyle}>Raw Sand Used (Ton)</label>
              <input type="number" name="rawSandUsed" value={form.rawSandUsed} onChange={handleChange} style={inputStyle} min="0" step="0.01" required />
            </div>
            <div style={fieldStyle}>
              <label style={labelStyle}>Coal Used</label>
              <div style={{ display: 'flex', gap: '8px' }}>
                <input type="number" name="coalUsed" value={form.coalUsed} onChange={handleChange} style={{ ...inputStyle, flex: 2 }} min="0" step="0.01" />
                <select name="coalUnit" value={form.coalUnit} onChange={handleChange} style={{ ...inputStyle, flex: 1 }}>
                  <option value="Ton">Ton</option>
                  <option value="Kg">Kg</option>
                </select>
              </div>
            </div>
            <div style={fieldStyle}>
              <label style={labelStyle}>Wastage (Ton)</label>
              <input type="number" name="wastage" value={form.wastage} onChange={handleChange} style={inputStyle} min="0" step="0.01" />
            </div>
          </div>

          {/* Finished sand rows */}
          <div style={{ marginBottom: '20px' }}>
            <label style={{ ...labelStyle, marginBottom: '10px' }}>Finished Sand Output</label>
            {finishedSand.map((row, i) => (
              <div key={i} style={{ display: 'flex', gap: '12px', marginBottom: '8px', alignItems: 'center' }}>
                <input
                  type="text"
                  placeholder="Grade (e.g. 600µm)"
                  value={row.grade}
                  onChange={(e) => handleSandRow(i, 'grade', e.target.value)}
                  style={{ ...inputStyle, flex: 2 }}
                />
                <input
                  type="number"
                  placeholder="Quantity (Ton)"
                  value={row.quantity}
                  onChange={(e) => handleSandRow(i, 'quantity', e.target.value)}
                  style={{ ...inputStyle, flex: 2 }}
                  min="0"
                  step="0.01"
                />
                {finishedSand.length > 1 && (
                  <button
                    type="button"
                    onClick={() => removeSandRow(i)}
                    style={{ background: '#c8441a', color: '#fff', border: 'none', borderRadius: '4px', padding: '9px 12px', cursor: 'pointer', fontSize: '14px' }}
                  >
                    ✕
                  </button>
                )}
              </div>
            ))}
            <button
              type="button"
              onClick={addSandRow}
              style={{ padding: '8px 16px', background: '#1a4d7a', color: '#fff', border: 'none', borderRadius: '4px', cursor: 'pointer', fontSize: '13px', fontFamily: "'IBM Plex Sans', sans-serif" }}
            >
              + Add Grade
            </button>
          </div>

          {msg && (
            <div style={{ marginBottom: '12px', color: msg.includes('Error') ? '#c8441a' : '#1a6b3a', fontWeight: 600, fontSize: '13px' }}>
              {msg}
            </div>
          )}
          <button type="submit" style={submitBtn} disabled={submitting}>
            {submitting ? 'Saving…' : 'Submit Entry'}
          </button>
        </form>

        {/* Recent entries */}
        <h3 style={{ marginTop: '32px', marginBottom: '12px', fontSize: '15px', color: '#0f1923' }}>Recent 10 Entries</h3>
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px' }}>
            <thead>
              <tr style={{ background: '#0f1923', color: '#f7f4ef' }}>
                {['Date', 'Shift', 'Raw Sand (T)', 'Coal Used', 'Finished Sand', 'Wastage (T)'].map((h) => (
                  <th key={h} style={{ padding: '8px 12px', textAlign: 'left', fontWeight: 600 }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {entries.length === 0 ? (
                <tr><td colSpan={6} style={{ padding: '16px', textAlign: 'center', color: '#8a9bb0' }}>No entries yet</td></tr>
              ) : (
                entries.map((e, i) => (
                  <tr key={e.id} style={{ background: i % 2 === 0 ? '#fff' : '#f7f4ef' }}>
                    <td style={{ padding: '8px 12px' }}>{e.date}</td>
                    <td style={{ padding: '8px 12px' }}>{e.shift}</td>
                    <td style={{ padding: '8px 12px' }}>{e.rawSandUsed}</td>
                    <td style={{ padding: '8px 12px' }}>{e.coalUsed} {e.coalUnit}</td>
                    <td style={{ padding: '8px 12px' }}>
                      {Array.isArray(e.finishedSand)
                        ? e.finishedSand.map((s) => `${s.grade}: ${s.quantity}T`).join(', ')
                        : '—'}
                    </td>
                    <td style={{ padding: '8px 12px' }}>{e.wastage}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </Layout>
  );
}
