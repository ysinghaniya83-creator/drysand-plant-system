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

// Shared input style
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

// ─── Inward Form ─────────────────────────────────────────────────────────────

const inwardDefaults = {
  date: '',
  vehicleNumber: '',
  partyName: '',
  materialType: 'Wet Sand',
  royaltyNumber: '',
  royaltyWeight: '',
  invoiceNumber: '',
  grossWeight: '',
  tareWeight: '',
  fromLocation: '',
  challanNumber: '',
  rate: '',
  unit: 'Ton',
  outTime: '',
};

function InwardEntry() {
  const [form, setForm] = useState(inwardDefaults);
  const [entries, setEntries] = useState([]);
  const [submitting, setSubmitting] = useState(false);
  const [msg, setMsg] = useState('');

  // Auto-calculate net weight
  const netWeight =
    form.grossWeight !== '' && form.tareWeight !== ''
      ? Math.max(0, parseFloat(form.grossWeight) - parseFloat(form.tareWeight))
      : '';

  // Listen to recent 10 entries
  useEffect(() => {
    const q = query(
      collection(db, 'weighbridge_inward'),
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
      await addDoc(collection(db, 'weighbridge_inward'), {
        ...form,
        netWeight: netWeight !== '' ? netWeight : 0,
        createdAt: new Date(),
      });
      setForm(inwardDefaults);
      setMsg('Entry saved successfully!');
    } catch (err) {
      setMsg(`Error: ${err.message || 'Failed to save entry. Please try again.'}`);
    } finally {
      setSubmitting(false);
    }
  }

  const isSand = form.materialType === 'Wet Sand';
  const isCoal = form.materialType === 'Coal';

  return (
    <div>
      <form onSubmit={handleSubmit}>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0 24px' }}>
          <div style={fieldStyle}>
            <label style={labelStyle}>Date</label>
            <input type="date" name="date" value={form.date} onChange={handleChange} style={inputStyle} required />
          </div>
          <div style={fieldStyle}>
            <label style={labelStyle}>Vehicle Number</label>
            <input type="text" name="vehicleNumber" value={form.vehicleNumber} onChange={handleChange} style={inputStyle} required placeholder="GJ 01 AB 1234" />
          </div>
          <div style={fieldStyle}>
            <label style={labelStyle}>Party Name</label>
            <input type="text" name="partyName" value={form.partyName} onChange={handleChange} style={inputStyle} required />
          </div>
          <div style={fieldStyle}>
            <label style={labelStyle}>Material Type</label>
            <select name="materialType" value={form.materialType} onChange={handleChange} style={inputStyle}>
              <option value="Wet Sand">Wet Sand</option>
              <option value="Coal">Coal</option>
            </select>
          </div>

          {/* Conditional fields */}
          {isSand && (
            <>
              <div style={fieldStyle}>
                <label style={labelStyle}>Royalty Number</label>
                <input type="text" name="royaltyNumber" value={form.royaltyNumber} onChange={handleChange} style={inputStyle} />
              </div>
              <div style={fieldStyle}>
                <label style={labelStyle}>Royalty Weight (Ton)</label>
                <input type="number" name="royaltyWeight" value={form.royaltyWeight} onChange={handleChange} style={inputStyle} min="0" step="0.01" />
              </div>
            </>
          )}
          {isCoal && (
            <div style={fieldStyle}>
              <label style={labelStyle}>Invoice Number</label>
              <input type="text" name="invoiceNumber" value={form.invoiceNumber} onChange={handleChange} style={inputStyle} />
            </div>
          )}

          <div style={fieldStyle}>
            <label style={labelStyle}>Gross Weight</label>
            <input type="number" name="grossWeight" value={form.grossWeight} onChange={handleChange} style={inputStyle} required min="0" step="0.01" />
          </div>
          <div style={fieldStyle}>
            <label style={labelStyle}>Tare Weight</label>
            <input type="number" name="tareWeight" value={form.tareWeight} onChange={handleChange} style={inputStyle} required min="0" step="0.01" />
          </div>
          <div style={fieldStyle}>
            <label style={labelStyle}>Net Weight (auto)</label>
            <input type="number" value={netWeight} readOnly style={readonlyStyle} />
          </div>
          <div style={fieldStyle}>
            <label style={labelStyle}>From Location</label>
            <input type="text" name="fromLocation" value={form.fromLocation} onChange={handleChange} style={inputStyle} />
          </div>
          <div style={fieldStyle}>
            <label style={labelStyle}>Challan Number (optional)</label>
            <input type="text" name="challanNumber" value={form.challanNumber} onChange={handleChange} style={inputStyle} />
          </div>
          <div style={fieldStyle}>
            <label style={labelStyle}>Rate</label>
            <input type="number" name="rate" value={form.rate} onChange={handleChange} style={inputStyle} min="0" step="0.01" />
          </div>
          <div style={fieldStyle}>
            <label style={labelStyle}>Unit</label>
            <select name="unit" value={form.unit} onChange={handleChange} style={inputStyle}>
              <option value="Ton">Ton</option>
              <option value="Kg">Kg</option>
            </select>
          </div>
          <div style={fieldStyle}>
            <label style={labelStyle}>Out Time</label>
            <input type="time" name="outTime" value={form.outTime} onChange={handleChange} style={inputStyle} />
          </div>
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

      {/* Recent entries table */}
      <h3 style={{ marginTop: '32px', marginBottom: '12px', fontSize: '15px', color: '#0f1923' }}>Recent 10 Entries</h3>
      <div style={{ overflowX: 'auto' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px' }}>
          <thead>
            <tr style={{ background: '#0f1923', color: '#f7f4ef' }}>
              {['Date', 'Vehicle', 'Party', 'Material', 'Gross', 'Tare', 'Net', 'From', 'Rate'].map((h) => (
                <th key={h} style={{ padding: '8px 12px', textAlign: 'left', fontWeight: 600 }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {entries.length === 0 ? (
              <tr><td colSpan={9} style={{ padding: '16px', textAlign: 'center', color: '#8a9bb0' }}>No entries yet</td></tr>
            ) : (
              entries.map((e, i) => (
                <tr key={e.id} style={{ background: i % 2 === 0 ? '#fff' : '#f7f4ef' }}>
                  <td style={{ padding: '8px 12px' }}>{e.date}</td>
                  <td style={{ padding: '8px 12px' }}>{e.vehicleNumber}</td>
                  <td style={{ padding: '8px 12px' }}>{e.partyName}</td>
                  <td style={{ padding: '8px 12px' }}>{e.materialType}</td>
                  <td style={{ padding: '8px 12px' }}>{e.grossWeight}</td>
                  <td style={{ padding: '8px 12px' }}>{e.tareWeight}</td>
                  <td style={{ padding: '8px 12px', fontWeight: 600, color: '#1a6b3a' }}>{e.netWeight}</td>
                  <td style={{ padding: '8px 12px' }}>{e.fromLocation}</td>
                  <td style={{ padding: '8px 12px' }}>{e.rate} / {e.unit}</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// ─── Outward Form ─────────────────────────────────────────────────────────────

const outwardDefaults = {
  date: '',
  vehicleNumber: '',
  partyName: '',
  materialType: '600µm',
  grossWeight: '',
  tareWeight: '',
  destination: '',
  rate: '',
  unit: 'Ton',
};

function OutwardEntry() {
  const [form, setForm] = useState(outwardDefaults);
  const [entries, setEntries] = useState([]);
  const [submitting, setSubmitting] = useState(false);
  const [msg, setMsg] = useState('');

  const netWeight =
    form.grossWeight !== '' && form.tareWeight !== ''
      ? Math.max(0, parseFloat(form.grossWeight) - parseFloat(form.tareWeight))
      : '';

  useEffect(() => {
    const q = query(
      collection(db, 'weighbridge_outward'),
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
      await addDoc(collection(db, 'weighbridge_outward'), {
        ...form,
        netWeight: netWeight !== '' ? netWeight : 0,
        createdAt: new Date(),
      });
      setForm(outwardDefaults);
      setMsg('Entry saved successfully!');
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
            <label style={labelStyle}>Vehicle Number</label>
            <input type="text" name="vehicleNumber" value={form.vehicleNumber} onChange={handleChange} style={inputStyle} required />
          </div>
          <div style={fieldStyle}>
            <label style={labelStyle}>Party Name</label>
            <input type="text" name="partyName" value={form.partyName} onChange={handleChange} style={inputStyle} required />
          </div>
          <div style={fieldStyle}>
            <label style={labelStyle}>Material Type</label>
            <select name="materialType" value={form.materialType} onChange={handleChange} style={inputStyle}>
              <option value="600µm">600µm Finished Sand</option>
              <option value="1200µm">1200µm Finished Sand</option>
              <option value="Bagged Sand">Bagged Sand</option>
            </select>
          </div>
          <div style={fieldStyle}>
            <label style={labelStyle}>Gross Weight</label>
            <input type="number" name="grossWeight" value={form.grossWeight} onChange={handleChange} style={inputStyle} required min="0" step="0.01" />
          </div>
          <div style={fieldStyle}>
            <label style={labelStyle}>Tare Weight</label>
            <input type="number" name="tareWeight" value={form.tareWeight} onChange={handleChange} style={inputStyle} required min="0" step="0.01" />
          </div>
          <div style={fieldStyle}>
            <label style={labelStyle}>Net Weight (auto)</label>
            <input type="number" value={netWeight} readOnly style={readonlyStyle} />
          </div>
          <div style={fieldStyle}>
            <label style={labelStyle}>Destination</label>
            <input type="text" name="destination" value={form.destination} onChange={handleChange} style={inputStyle} />
          </div>
          <div style={fieldStyle}>
            <label style={labelStyle}>Rate</label>
            <input type="number" name="rate" value={form.rate} onChange={handleChange} style={inputStyle} min="0" step="0.01" />
          </div>
          <div style={fieldStyle}>
            <label style={labelStyle}>Unit</label>
            <select name="unit" value={form.unit} onChange={handleChange} style={inputStyle}>
              <option value="Ton">Ton</option>
              <option value="Kg">Kg</option>
            </select>
          </div>
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

      <h3 style={{ marginTop: '32px', marginBottom: '12px', fontSize: '15px', color: '#0f1923' }}>Recent 10 Entries</h3>
      <div style={{ overflowX: 'auto' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px' }}>
          <thead>
            <tr style={{ background: '#0f1923', color: '#f7f4ef' }}>
              {['Date', 'Vehicle', 'Party', 'Material', 'Gross', 'Tare', 'Net', 'Destination', 'Rate'].map((h) => (
                <th key={h} style={{ padding: '8px 12px', textAlign: 'left', fontWeight: 600 }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {entries.length === 0 ? (
              <tr><td colSpan={9} style={{ padding: '16px', textAlign: 'center', color: '#8a9bb0' }}>No entries yet</td></tr>
            ) : (
              entries.map((e, i) => (
                <tr key={e.id} style={{ background: i % 2 === 0 ? '#fff' : '#f7f4ef' }}>
                  <td style={{ padding: '8px 12px' }}>{e.date}</td>
                  <td style={{ padding: '8px 12px' }}>{e.vehicleNumber}</td>
                  <td style={{ padding: '8px 12px' }}>{e.partyName}</td>
                  <td style={{ padding: '8px 12px' }}>{e.materialType}</td>
                  <td style={{ padding: '8px 12px' }}>{e.grossWeight}</td>
                  <td style={{ padding: '8px 12px' }}>{e.tareWeight}</td>
                  <td style={{ padding: '8px 12px', fontWeight: 600, color: '#1a6b3a' }}>{e.netWeight}</td>
                  <td style={{ padding: '8px 12px' }}>{e.destination}</td>
                  <td style={{ padding: '8px 12px' }}>{e.rate} / {e.unit}</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// ─── Main Page ─────────────────────────────────────────────────────────────

export default function WeighbridgePage() {
  const [activeTab, setActiveTab] = useState('inward');

  return (
    <Layout>
      <h1 style={{ fontSize: '22px', fontWeight: 700, color: '#0f1923', marginBottom: '20px' }}>Weighbridge</h1>

      {/* Tabs */}
      <div style={{ borderBottom: '2px solid #e4ddd5', marginBottom: '28px', display: 'flex', gap: '4px' }}>
        <button style={tabBtn(activeTab === 'inward')} onClick={() => setActiveTab('inward')}>
          Inward Entry
        </button>
        <button style={tabBtn(activeTab === 'outward')} onClick={() => setActiveTab('outward')}>
          Outward Entry
        </button>
      </div>

      <div style={{ background: '#fff', borderRadius: '8px', padding: '28px', boxShadow: '0 2px 8px rgba(0,0,0,0.07)' }}>
        {activeTab === 'inward' ? <InwardEntry /> : <OutwardEntry />}
      </div>
    </Layout>
  );
}
