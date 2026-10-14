import { useEffect, useMemo, useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { listHospitals } from '../api/client.js';
import { ROLES, useApp } from '../context/AppContext.jsx';
import { Field } from '../components/ui.jsx';
import Icon from '../components/icons.jsx';

function BrandPanel() {
  return (
    <div className="auth-brand">
      <div>
        <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
          <span className="emblem" aria-hidden="true"><Icon name="plus" size={24} /></span>
          <div><strong style={{ fontFamily: 'var(--font-display)', fontSize: 18 }}>CureHub</strong><div style={{ color: '#BAE6FD', fontSize: 13 }}>One Citizen, One Record, Every Hospital</div></div>
        </div>
        <h2 style={{ fontSize: 'clamp(26px,3vw,36px)', marginTop: 28, color: '#fff' }}>Care continuity starts with one ID.</h2>
        <p style={{ color: '#E0F2FE', maxWidth: 440 }}>One search across every public hospital — appointments, beds, referrals and notes. No more lost transfers.</p>
        <ul style={{ listStyle: 'none', padding: 0, display: 'grid', gap: 8, marginTop: 14 }}>
          {['One search — centralId jumps to full history', 'Live beds — Available / Tight / Full with words', 'Audit-ready — exports + SOAP bridge'].map((t) => (
            <li key={t} style={{ display: 'flex', gap: 8, alignItems: 'center' }}><Icon name="checkCircle" size={18} /> {t}</li>
          ))}
        </ul>
      </div>
      <div style={{ display: 'grid', gap: 12 }}>
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          <span className="float-chip"><span className="live-dot" /> Occupancy 72%</span>
          <span className="float-chip">4 referrals pending</span>
          <span className="float-chip">ABHA-linked 12,408</span>
        </div>
        <div className="quote-card">“We stopped losing patients in transfers.” — Duty Officer, District Hospital</div>
      </div>
    </div>
  );
}

export default function Login() {
  const { login, isAuthenticated, pushToast } = useApp();
  const navigate = useNavigate();
  const location = useLocation();
  const next = useMemo(() => {
    const q = new URLSearchParams(location.search);
    const n = q.get('next') || '/dashboard';
    return n.startsWith('/') ? n : '/dashboard';
  }, [location.search]);

  const [hospitals, setHospitals] = useState([]);
  const [form, setForm] = useState({ name: '', email: '', role: 'Receptionist', hospitalId: '', centralId: '' });
  const [errors, setErrors] = useState({});
  const [busy, setBusy] = useState(false);
  const [showCid, setShowCid] = useState(false);

  useEffect(() => {
    listHospitals().then((r) => setHospitals(Array.isArray(r) ? r : [])).catch(() => {});
  }, []);

  useEffect(() => {
    if (isAuthenticated) navigate(next, { replace: true });
  }, [isAuthenticated, navigate, next]);

  function validate() {
    const e = {};
    if (!form.name.trim()) e.name = 'Display name is required (2+ characters). Try your duty name.';
    else if (form.name.trim().length < 2) e.name = 'Name looks too short.';
    if (form.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email.trim())) e.email = 'Enter a valid email or leave it blank.';
    if (!ROLES.includes(form.role)) e.role = 'Pick a valid role.';
    if (form.role !== 'SuperAdmin' && !form.hospitalId) e.hospitalId = 'Non-SuperAdmin roles need a hospital scope.';
    if (form.centralId && !/^[A-Za-z0-9-]{4,32}$/.test(form.centralId.trim())) e.centralId = 'centralId may use letters, digits and dashes (4–32 chars). Try MH-2026-000001.';
    setErrors(e);
    return Object.keys(e).length === 0;
  }

  function submit(e) {
    e.preventDefault();
    if (!validate()) return;
    setBusy(true);
    try {
      const h = hospitals.find((x) => String(x.id) === String(form.hospitalId));
      const session = login({ name: form.name.trim(), email: form.email.trim(), role: form.role, hospitalId: form.role === 'SuperAdmin' ? '' : form.hospitalId, hospitalName: h?.name || '', centralId: form.centralId.trim() });
      pushToast(`Welcome, ${session.name} (${session.role}).`);
      navigate(next, { replace: true });
    } finally {
      setBusy(false);
    }
  }

  function quickRole(r) {
    setForm((f) => ({ ...f, role: r, hospitalId: r === 'SuperAdmin' ? '' : f.hospitalId }));
  }

  return (
    <div className="auth-split">
      <a className="skip-link" href="#login-form">Skip to login form</a>
      <BrandPanel />
      <div className="auth-form-col">
        <div className="auth-card auth-narrow">
          <h1 style={{ fontSize: 26 }}>Welcome back</h1>
          <p className="hint" style={{ marginTop: 0 }}>Sign in to Central Command — lands on <code>{next}</code>.</p>
          <hr className="ashoka-v2" aria-hidden="true" />
          <div className="role-quick" role="group" aria-label="Quick role pick">
            {ROLES.map((r) => (
              <button key={r} type="button" className={`chip-btn ${form.role === r ? 'chip-active' : ''}`} aria-pressed={form.role === r} onClick={() => quickRole(r)} style={{ minHeight: 40 }}>{r}</button>
            ))}
          </div>
          <form id="login-form" onSubmit={submit} noValidate>
            <div className="form-grid">
              <Field label="Display name" id="li-name" required error={errors.name} hint="Shown in topbar + profile.">
                <div className="input-wrap"><span className="input-ico"><Icon name="user" size={18} /></span><input id="li-name" className={errors.name ? 'input-error' : ''} value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="e.g. Meera Nair — Front Desk" autoComplete="name" required style={{ minHeight: 48 }} /></div>
              </Field>
              <Field label="Work email (optional)" id="li-email" error={errors.email}>
                <div className="input-wrap"><span className="input-ico"><Icon name="mail" size={18} /></span><input id="li-email" type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} placeholder="you@curehub.in" autoComplete="email" style={{ minHeight: 48 }} /></div>
              </Field>
              <div className="form-grid form-grid-2">
                <Field label="Role" id="li-role" required error={errors.role} hint="SuperAdmin sees all; others are hospital-scoped.">
                  <select id="li-role" value={form.role} onChange={(e) => setForm({ ...form, role: e.target.value })} style={{ minHeight: 48 }}>
                    {ROLES.map((r) => <option key={r} value={r}>{r}</option>)}
                  </select>
                </Field>
                <Field label="Hospital scope" id="li-hosp" error={errors.hospitalId} hint={form.role === 'SuperAdmin' ? 'SuperAdmin is ministry-wide.' : 'Locked after login.'}>
                  <select id="li-hosp" value={form.hospitalId} onChange={(e) => setForm({ ...form, hospitalId: e.target.value })} disabled={form.role === 'SuperAdmin'} style={{ minHeight: 48 }}>
                    <option value="">{form.role === 'SuperAdmin' ? 'All Hospitals (ministry)' : '— choose hospital —'}</option>
                    {hospitals.map((h) => <option key={h.id} value={String(h.id)}>{h.name} · {h.city}</option>)}
                  </select>
                </Field>
              </div>
              <Field label="Staff centralId (optional)" id="li-cid" error={errors.centralId} hint="Links you to a patient/staff record if you have one.">
                <div className="input-wrap"><span className="input-ico"><Icon name="search" size={18} /></span>
                  <input id="li-cid" type={showCid ? 'text' : 'password'} value={form.centralId} onChange={(e) => setForm({ ...form, centralId: e.target.value })} placeholder="MH-2026-000001" autoComplete="off" style={{ minHeight: 48, paddingRight: 48 }} />
                  <button type="button" onClick={() => setShowCid((v) => !v)} aria-label={showCid ? 'Hide centralId' : 'Show centralId'} style={{ position: 'absolute', right: 6, top: '50%', transform: 'translateY(-50%)', border: 0, background: 'none', cursor: 'pointer', minWidth: 44, minHeight: 44, color: 'var(--color-muted)' }}><Icon name="eye" size={18} /></button>
                </div>
              </Field>
            </div>
            <button className="btn btn-primary btn-lg" disabled={busy} style={{ width: '100%', marginTop: 6 }}>{busy ? (<><span className="spinner" /> Signing you in…</>) : (<>Sign in <Icon name="arrowRight" size={18} /></>)}</button>
            <div className="demo-hint"><Icon name="shield" size={16} /> <strong>Demo build:</strong> no password. Pick a role to explore. By signing in you agree to PHI-safe use.</div>
            <div className="auth-actions">
              <Link className="btn" to="/signup">New here? Sign up</Link>
              <Link className="btn btn-ghost" to="/forgot">Forgot?</Link>
            </div>
          </form>
          <p className="hint"><Link to="/">← Back to landing</Link> · <Link to="/dashboard">Explore dashboard</Link></p>
        </div>
      </div>
    </div>
  );
}
