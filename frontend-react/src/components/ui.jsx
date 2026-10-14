import { useEffect, useState } from 'react';
import { loadOf } from '../api/client.js';
import Icon from './icons.jsx';

/* Count-up numbers 800ms, respects reduced-motion */
export function useCountUp(target, duration = 800) {
  const [val, setVal] = useState(0);
  const num = Number(String(target).replace(/[^0-9.-]/g, '')) || 0;
  const isNum = /^-?[\d,.]+$/.test(String(target).trim());
  useEffect(() => {
    if (window.matchMedia?.('(prefers-reduced-motion: reduce)').matches || !isNum) {
      setVal(num);
      return;
    }
    let raf;
    const t0 = performance.now();
    const tick = (t) => {
      const p = Math.min(1, (t - t0) / duration);
      const e = 1 - Math.pow(1 - p, 3);
      setVal(Math.round(num * e));
      if (p < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [num, duration, isNum]);
  if (!isNum) return target;
  return val.toLocaleString('en-IN');
}

export function Avatar({ name, size = 'md', ring = false }) {
  const initials = String(name || 'U').replace(/^Dr\.?\s*/i, '').split(/\s+/).map((w) => w[0]).join('').slice(0, 2).toUpperCase() || 'U';
  return (
    <span className={`avatar avatar-${size} ${ring ? 'avatar-ring' : ''}`} aria-hidden="true">
      {initials}
    </span>
  );
}

export function LoadLight({ total, occupied, showBar = true }) {
  const { pct, level, label } = loadOf(total, occupied);
  const free = Math.max(0, (Number(total) || 0) - (Number(occupied) || 0));
  return (
    <span className="load-wrap" title={`Occupied ${occupied} of ${total}`}>
      <span className={`load-light load-${level}`}>
        <span className="load-dot" aria-hidden="true" />
        {label}
      </span>
      <span className="load-meta num">{pct}% · {free}/{total} free</span>
      {showBar && (
        <span className="load-bar" role="img" aria-label={`${label} ${pct} percent occupied`}>
          <span className={`load-fill ${level}`} style={{ width: `${pct}%`, display: 'block' }} />
        </span>
      )}
    </span>
  );
}

export function OccupancyBar({ total, occupied }) {
  const { pct, level } = loadOf(total, occupied);
  return (
    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 8 }}>
      <span className="occ-track" aria-hidden="true">
        <span className={`occ-fill ${level === 'available' ? '' : level}`} style={{ width: `${pct}%`, display: 'block' }} />
      </span>
      <span className="num" style={{ fontWeight: 700 }}>{pct}%</span>
    </span>
  );
}

const PILL_ICON = { BOOKED: 'clock', PENDING: 'clock', CANCELLED: 'xCircle', COMPLETED: 'checkCircle', ACCEPTED: 'checkCircle', AVAILABLE: 'checkCircle', TIGHT: 'alert', FULL: 'xCircle' };
export function StatusPill({ status }) {
  const s = String(status || '').toUpperCase();
  const cls = s === 'BOOKED' || s === 'PENDING' ? 'pill-pending' : s === 'CANCELLED' ? 'pill-cancelled' : s === 'AVAILABLE' || s === 'COMPLETED' || s === 'ACCEPTED' ? 'pill-completed' : 'pill-info';
  return (
    <span className={`pill ${cls}`}>
      <Icon name={PILL_ICON[s] || 'checkCircle'} size={14} /> {s || '—'}
    </span>
  );
}

const KPI_HUES = ['teal', 'emerald', 'saffron', 'blue', 'violet', 'rose'];
const KPI_ICONS = ['building', 'stethoscope', 'users', 'calendar', 'swap', 'bed'];
export function KpiCard({ label, value, delta, hue, icon, spark, index = 0 }) {
  const animated = useCountUp(value);
  const h = hue || KPI_HUES[index % KPI_HUES.length];
  const ic = icon || KPI_ICONS[index % KPI_ICONS.length];
  return (
    <div className="card kpi-card kpi">
      <div className="kpi-top">
        <span className={`kpi-icon ${h}`} aria-hidden="true"><Icon name={ic} size={20} /></span>
        {delta && <span className={`delta-pill ${String(delta).includes('▲') ? 'delta-up' : String(delta).includes('▼') ? 'delta-down' : 'delta-up'}`}>{delta}</span>}
      </div>
      <div className="kpi-label" style={{ marginTop: 10 }}>{label}</div>
      <div className="kpi-value num">{animated}</div>
      {spark && (
        <svg className="spark" width="100%" height="28" viewBox="0 0 120 28" aria-hidden="true" preserveAspectRatio="none">
          <polyline points={spark} fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" opacity="0.45" />
        </svg>
      )}
    </div>
  );
}

export function SectionHeader({ title, hint, actions, eyebrow }) {
  return (
    <div className="section-head">
      <div>
        {eyebrow && <p className="eyebrow" style={{ color: 'var(--color-primary)', marginBottom: 4 }}><span className="pulse-dot" style={{ width: 7, height: 7, borderRadius: 99, background: 'var(--color-saffron)', display: 'inline-block' }} /> {eyebrow}</p>}
        <h2 style={{ margin: 0 }}>{title}</h2>
        {hint && <p className="hint" style={{ margin: '4px 0 0' }}>{hint}</p>}
      </div>
      {actions && <div className="page-actions">{actions}</div>}
    </div>
  );
}

export function Skeleton({ height = 60, count = 1, label = 'Loading' }) {
  return (
    <div role="status" aria-label={label}>
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className="skeleton" style={{ height, marginBottom: 8 }} />
      ))}
      <span className="hint">Loading…</span>
    </div>
  );
}

export function SkeletonCards({ count = 6 }) {
  return (
    <div className="kpi-grid" role="status" aria-label="Loading statistics">
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className="card kpi-card"><div className="skeleton" style={{ height: 18, width: '40%' }} /><div className="skeleton" style={{ height: 34, marginTop: 8 }} /><div className="skeleton" style={{ height: 14, width: '60%', marginTop: 8 }} /></div>
      ))}
    </div>
  );
}

export function ErrorBanner({ error, onRetry, hint }) {
  if (!error) return null;
  const msg = typeof error === 'string' ? error : error.message || 'Something went wrong.';
  return (
    <div className="alert alert-error" role="alert">
      <Icon name="alert" size={20} />
      <div style={{ flex: 1 }}>
        <strong>What happened:</strong> {msg}
        {hint ? <div className="hint" style={{ marginTop: 4 }}>What to do: {hint}</div> : null}
        {onRetry ? (
          <div style={{ marginTop: 8, display: 'flex', gap: 8 }}>
            <button type="button" className="btn btn-sm" onClick={onRetry}><Icon name="refresh" size={14} /> Retry</button>
          </div>
        ) : null}
      </div>
    </div>
  );
}

const EMPTY_ICON = { hospital: 'building', doctor: 'stethoscope', patient: 'users', calendar: 'calendar', referral: 'swap', bed: 'bed', record: 'file', search: 'search', default: 'heart' };
export function EmptyState({ title, body, action, secondary, art = 'default' }) {
  return (
    <div className="empty">
      <div className="empty-art" aria-hidden="true"><Icon name={EMPTY_ICON[art] || EMPTY_ICON.default} size={44} /></div>
      <h3 style={{ marginBottom: 4 }}>{title}</h3>
      <p className="hint" style={{ marginTop: 0, maxWidth: 440, marginLeft: 'auto', marginRight: 'auto' }}>{body}</p>
      {(action || secondary) && <div style={{ display: 'flex', gap: 8, justifyContent: 'center', flexWrap: 'wrap', marginTop: 12 }}>{action}{secondary}</div>}
    </div>
  );
}

export function Pagination({ page, size, onPage, onSize, hasMore }) {
  return (
    <div className="pager" aria-label="Pagination">
      <button type="button" className="btn btn-sm" disabled={page <= 0} onClick={() => onPage(page - 1)}>
        <Icon name="chevronLeft" size={14} /> Prev
      </button>
      <span className="hint num">Page {page + 1} · size {size}</span>
      <button type="button" className="btn btn-sm" disabled={!hasMore} onClick={() => onPage(page + 1)}>
        Next <Icon name="chevronRight" size={14} />
      </button>
      <label className="hint" htmlFor="page-size">Per page</label>
      <select id="page-size" value={String(size)} onChange={(e) => onSize(Number(e.target.value))} style={{ width: 90 }}>
        {[5, 10, 20].map((n) => (<option key={n} value={n}>{n}</option>))}
      </select>
    </div>
  );
}

export function Field({ label, hint, error, children, id, required }) {
  return (
    <div>
      <label className="field-label" htmlFor={id}>{label}{required && <span style={{ color: 'var(--color-saffron)' }} aria-hidden="true"> *</span>}</label>
      {children}
      {hint ? <div className="field-hint" id={id ? `${id}-hint` : undefined}>{hint}</div> : null}
      {error ? <div className="field-error" role="alert"><Icon name="alert" size={14} /> {error}</div> : null}
    </div>
  );
}
