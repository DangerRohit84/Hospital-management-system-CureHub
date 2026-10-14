import { useEffect, useMemo, useRef, useState } from 'react';
import { Link, NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom';
import { ROLES, useApp } from '../context/AppContext.jsx';
import { API_BASE, WS_BASE, getAvailability, listAppointments, listHospitals, listReferrals } from '../api/client.js';
import Breadcrumbs from './Breadcrumbs.jsx';
import Icon from './icons.jsx';
import { Avatar } from './ui.jsx';

const NAV_SECTIONS = [
  { label: 'Overview', items: [{ to: '/dashboard', label: 'Command', icon: 'dashboard', end: true, roles: ['SuperAdmin', 'HospitalAdmin', 'Doctor', 'Receptionist'] }] },
  {
    label: 'Network', items: [
      { to: '/hospitals', label: 'Hospitals', icon: 'building', roles: ['SuperAdmin', 'HospitalAdmin', 'Doctor', 'Receptionist'] },
      { to: '/doctors', label: 'Doctors', icon: 'stethoscope', roles: ['SuperAdmin', 'HospitalAdmin', 'Doctor', 'Receptionist'] },
      { to: '/patients', label: 'Patients', icon: 'users', roles: ['SuperAdmin', 'HospitalAdmin', 'Doctor', 'Receptionist'] },
    ],
  },
  {
    label: 'Care flows', items: [
      { to: '/appointments', label: 'Appointments', icon: 'calendar', roles: ['SuperAdmin', 'HospitalAdmin', 'Doctor', 'Receptionist'] },
      { to: '/referrals', label: 'Referrals', icon: 'swap', key: 'referrals', roles: ['SuperAdmin', 'HospitalAdmin', 'Doctor', 'Receptionist'] },
      { to: '/beds', label: 'Beds', icon: 'bed', roles: ['SuperAdmin', 'HospitalAdmin', 'Receptionist'] },
      { to: '/records', label: 'Records', icon: 'file', roles: ['SuperAdmin', 'Doctor'] },
    ],
  },
  {
    label: 'Insights', items: [
      { to: '/reports', label: 'Reports', icon: 'chart', roles: ['SuperAdmin', 'HospitalAdmin'] },
    ],
  },
  {
    label: 'Account', items: [
      { to: '/profile', label: 'Profile', icon: 'user', roles: ['SuperAdmin', 'HospitalAdmin', 'Doctor', 'Receptionist'] },
      { to: '/settings', label: 'Settings', icon: 'settings', roles: ['SuperAdmin', 'HospitalAdmin', 'Doctor', 'Receptionist'] },
      { to: '/help', label: 'Help', icon: 'help', roles: ['SuperAdmin', 'HospitalAdmin', 'Doctor', 'Receptionist'] },
    ],
  },
];

function readCollapsed() {
  try { return JSON.parse(localStorage.getItem('hub.navCollapsed') || 'false'); } catch { return false; }
}

export default function Layout() {
  const { auth, role, setRole, hospitalScope, setHospitalScope, myHospitalId, setMyHospitalId, lockedHospitalId, theme, setTheme, toasts, dismissToast, recent, goCentralId, logout, pushToast } = useApp();
  const [hospitals, setHospitals] = useState([]);
  const [ticker, setTicker] = useState({ occupancy: '—', pending: '—', updated: '' });
  const [live, setLive] = useState(true);
  const [navOpen, setNavOpen] = useState(false);
  const [rail, setRail] = useState(readCollapsed);
  const [pendingRefs, setPendingRefs] = useState(0);
  const [q, setQ] = useState('');
  const [topQ, setTopQ] = useState('');
  const [notifOpen, setNotifOpen] = useState(false);
  const [avatarOpen, setAvatarOpen] = useState(false);
  const [notifs, setNotifs] = useState([]);
  const [scrolled, setScrolled] = useState(false);
  const searchRef = useRef(null);
  const notifRef = useRef(null);
  const avatarRef = useRef(null);
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    listHospitals().then((rows) => setHospitals(Array.isArray(rows) ? rows : [])).catch(() => {});
  }, []);

  useEffect(() => {
    try { localStorage.setItem('hub.navCollapsed', JSON.stringify(rail)); } catch { /* ignore */ }
  }, [rail]);

  useEffect(() => {
    function onScroll() { setScrolled(window.scrollY > 8); }
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  async function refreshTicker() {
    try {
      const [avail, refs, appts] = await Promise.all([getAvailability(), listReferrals().catch(() => []), listAppointments(0, 20).catch(() => [])]);
      const tot = (avail || []).reduce((a, r) => a + (Number(r.totalBeds) || 0), 0);
      const occ = (avail || []).reduce((a, r) => a + (Number(r.occupiedBeds) || 0), 0);
      const pct = tot ? Math.round((occ / tot) * 100) : 0;
      const pending = (refs || []).filter((x) => String(x.status).toUpperCase() === 'PENDING').length;
      setTicker({ occupancy: `${pct}%`, pending: String(pending), updated: new Date().toLocaleTimeString() });
      setPendingRefs(pending);
      const full = (avail || []).filter((r) => { const t = Number(r.totalBeds) || 0; const o = Number(r.occupiedBeds) || 0; return t > 0 && o / t >= 0.9; }).slice(0, 3);
      const items = [];
      if (pending > 0) items.push({ id: 'pending', icon: 'swap', title: `${pending} referral${pending === 1 ? '' : 's'} awaiting triage`, link: '/referrals', hint: 'Kanban — drag to ACCEPTED' });
      full.forEach((r) => items.push({ id: `full-${r.hospitalId}`, icon: 'bed', title: `${r.hospitalName} at ${r.totalBeds ? Math.round((r.occupiedBeds / r.totalBeds) * 100) : 0}% — pressure`, link: `/hospitals/${r.hospitalId}`, hint: 'Open detail — beds tab' }));
      const today = new Date().toISOString().slice(0, 10);
      const todays = (Array.isArray(appts) ? appts : []).filter((a) => String(a.appointmentTime || '').slice(0, 10) === today).length;
      if (todays > 0) items.push({ id: 'today', icon: 'calendar', title: `${todays} appointment${todays === 1 ? '' : 's'} scheduled today`, link: '/appointments', hint: 'Open diary' });
      if (items.length === 0) items.push({ id: 'ok', icon: 'checkCircle', title: 'Network steady — no alerts', link: '/dashboard', hint: 'All wards under 90%' });
      setNotifs(items);
    } catch { /* best-effort */ }
  }

  useEffect(() => {
    refreshTicker();
    if (!live) return undefined;
    const t = setInterval(() => { if (!document.hidden) refreshTicker(); }, 60000);
    return () => clearInterval(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [live]);

  useEffect(() => {
    function onKey(e) {
      if (e.key === '/' && !/input|textarea|select/i.test(document.activeElement?.tagName || '')) { e.preventDefault(); searchRef.current?.focus(); }
      if (e.key === 'Escape') { setNavOpen(false); setNotifOpen(false); setAvatarOpen(false); }
    }
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, []);

  useEffect(() => {
    function onDoc(e) {
      if (notifOpen && notifRef.current && !notifRef.current.contains(e.target)) setNotifOpen(false);
      if (avatarOpen && avatarRef.current && !avatarRef.current.contains(e.target)) setAvatarOpen(false);
    }
    document.addEventListener('mousedown', onDoc);
    return () => document.removeEventListener('mousedown', onDoc);
  }, [notifOpen, avatarOpen]);

  useEffect(() => { setNavOpen(false); setNotifOpen(false); setAvatarOpen(false); }, [location.pathname]);

  function submitSearch(e) {
    e.preventDefault();
    const id = q.trim();
    if (id) { goCentralId(id); setQ(''); }
  }

  const scopeLocked = role !== 'SuperAdmin';
  const topMatches = useMemo(() => {
    const s = topQ.trim().toLowerCase();
    if (!s) return [];
    return hospitals.filter((h) => `${h.name} ${h.city}`.toLowerCase().includes(s)).slice(0, 6);
  }, [topQ, hospitals]);

  function doLogout() {
    const name = auth?.name || role;
    logout();
    pushToast(`Signed out ${name} — demo session cleared.`);
    navigate('/', { replace: true });
  }

  const myHospitalName = hospitals.find((h) => String(h.id) === String(auth?.hospitalId || myHospitalId))?.name || auth?.hospitalName || '';
  const initials = String(auth?.name || role || 'U').split(/\s+/).map((w) => w[0]).join('').slice(0, 2).toUpperCase();

  return (
    <div className={`shell ${rail ? 'rail' : ''}`}>
      <a className="skip-link" href="#main">Skip to main content</a>
      <a className="skip-link" href="#centralid-search">Skip to CentralId search</a>
      {navOpen && <div className="scrim" onClick={() => setNavOpen(false)} aria-hidden="true" />}
      <aside className={`sidenav ${navOpen ? 'open' : ''}`} aria-label="Primary">
        <div className="brand">
          <Link to="/dashboard" className="brand-row" style={{ textDecoration: 'none', color: 'inherit' }} onClick={() => setNavOpen(false)}>
            <span className="emblem" aria-hidden="true"><Icon name="plus" size={24} /></span>
            <span>
              <span className="brand-name">CureHub</span>
              <br />
              <span className="brand-sub">One Citizen, One Record</span>
            </span>
          </Link>
          <button type="button" className="collapse-btn" onClick={() => setRail((v) => !v)} aria-label={rail ? 'Expand sidebar' : 'Collapse sidebar'} aria-pressed={rail} title="Collapse to icon rail">
            <Icon name={rail ? 'chevronRight' : 'chevronLeft'} size={14} />
          </button>
        </div>
        <nav className="nav-links" aria-label="Sections">
          {NAV_SECTIONS.map((sec) => {
            const items = sec.items.filter((n) => n.roles.includes(role));
            if (items.length === 0) return null;
            return (
              <div key={sec.label}>
                <div className="nav-sep" aria-hidden="true">{sec.label}</div>
                {items.map((n) => (
                  <NavLink key={n.to} to={n.to} end={n.end} onClick={() => setNavOpen(false)} className={({ isActive }) => (isActive ? 'active' : undefined)} title={rail ? n.label : undefined}>
                    <span className="nav-ico" aria-hidden="true"><Icon name={n.icon} size={20} /></span>
                    <span className="nav-label-text">{n.label}</span>
                    {n.key === 'referrals' && pendingRefs > 0 && (<span className="nav-badge" aria-label={`${pendingRefs} pending referrals`}>{pendingRefs}</span>)}
                  </NavLink>
                ))}
              </div>
            );
          })}
          <div className="nav-sep" aria-hidden="true">Public</div>
          <Link to="/" onClick={() => setNavOpen(false)} title={rail ? 'Public site' : undefined}>
            <span className="nav-ico" aria-hidden="true"><Icon name="globe" size={20} /></span>
            <span className="nav-label-text">Public site</span>
          </Link>
          <Link to="/emergency" onClick={() => setNavOpen(false)} title={rail ? 'Emergency' : undefined}>
            <span className="nav-ico" aria-hidden="true"><Icon name="alert" size={20} /></span>
            <span className="nav-label-text">Emergency 108</span>
          </Link>
          <Link to="/schemes" onClick={() => setNavOpen(false)} title={rail ? 'Schemes' : undefined}>
            <span className="nav-ico" aria-hidden="true"><Icon name="shield" size={20} /></span>
            <span className="nav-label-text">PM-JAY Schemes</span>
          </Link>
        </nav>
        <div className="sidenav-foot">
          <Link to="/profile" className="user-chip" onClick={() => setNavOpen(false)} style={{ textDecoration: 'none' }}>
            <Avatar name={auth?.name || role} size="sm" />
            <span className="user-meta">
              <strong style={{ fontSize: 14 }}>{auth?.name || 'Demo session'}</strong>
              <br />
              <small className="hint">{role}{myHospitalName ? ` · ${myHospitalName}` : ''}</small>
            </span>
            <span style={{ marginLeft: 'auto', width: 8, height: 8, borderRadius: 99, background: 'var(--color-success)' }} title="Session active" />
          </Link>
          <div className="sidenav-note">Central DB + SOAP <code>/ws/central.wsdl</code><br />API <code>{API_BASE}</code>{WS_BASE && WS_BASE !== API_BASE ? (<><br />SOAP <code>{WS_BASE}/ws/central.wsdl</code></>) : null}</div>
        </div>
      </aside>

      <div className="main-col">
        <header className={`topbar ${scrolled ? 'scrolled' : ''}`}>
          <div className="topbar-inner">
            <button type="button" className="btn btn-sm menu-btn" onClick={() => setNavOpen((v) => !v)} aria-label="Toggle navigation" aria-expanded={navOpen}><Icon name="menu" size={18} /></button>
            <Link to="/dashboard" className="topbar-title">Central Command</Link>
            <span className="env-pill" title="Backend environment"><span className="dot" aria-hidden="true" /> LIVE :8086</span>
            <div className="topsearch" role="search" aria-label="Hospital quick search">
              <span className="search-ico" aria-hidden="true"><Icon name="search" size={18} /></span>
              <input type="search" placeholder="Search hospitals, doctors, centralId… ( / )" value={topQ} onChange={(e) => setTopQ(e.target.value)} aria-label="Search hospitals by name or city" />
              {topQ.trim() && (
                <div className="topsearch-pop" role="listbox" aria-label="Matching hospitals">
                  {topMatches.length === 0 ? (<div className="hint" style={{ padding: 10 }}>No match — try another city.</div>) : topMatches.map((h) => (
                    <button key={h.id} type="button" role="option" aria-selected="false" onClick={() => { navigate(`/hospitals/${h.id}`); setTopQ(''); }}>
                      <Avatar name={h.name} size="sm" /><span><strong>{h.name}</strong> <small className="hint">{h.city}</small></span>
                    </button>
                  ))}
                </div>
              )}
            </div>
            <div className="notif-wrap" ref={notifRef}>
              <button type="button" className="btn btn-sm notif-btn" aria-label={`Notifications, ${notifs.length} items`} aria-expanded={notifOpen} aria-haspopup="true" onClick={() => setNotifOpen((v) => !v)}>
                <span aria-hidden="true"><Icon name="bell" size={18} /></span>
                {notifs.length > 0 && notifs[0].id !== 'ok' && <span className="nav-badge notif-count">{pendingRefs > 0 ? pendingRefs : notifs.length}</span>}
              </button>
              {notifOpen && (
                <div className="notif-pop" role="dialog" aria-label="Notifications">
                  <div className="notif-head"><strong>Live alerts</strong><span className="hint">{ticker.updated || ''}</span></div>
                  <ul>
                    {notifs.map((n) => (
                      <li key={n.id}>
                        <Link to={n.link} onClick={() => setNotifOpen(false)}>
                          <span aria-hidden="true" style={{ color: 'var(--color-primary)' }}><Icon name={n.icon} size={18} /></span>
                          <span><strong>{n.title}</strong><br /><small className="hint">{n.hint}</small></span>
                        </Link>
                      </li>
                    ))}
                  </ul>
                  <button type="button" className="btn btn-sm btn-ghost" onClick={refreshTicker}><Icon name="refresh" size={14} /> Refresh now</button>
                </div>
              )}
            </div>
            <div className="notif-wrap" ref={avatarRef}>
              <button type="button" className="avatar-btn" onClick={() => setAvatarOpen((v) => !v)} aria-label="Account menu" aria-expanded={avatarOpen} aria-haspopup="true">{initials}</button>
              {avatarOpen && (
                <div className="avatar-menu" role="menu" aria-label="Account">
                  <div style={{ padding: '14px 14px 10px', borderBottom: '1px solid var(--color-border-subtle)' }}>
                    <strong>{auth?.name || 'Demo session'}</strong>
                    <div style={{ marginTop: 6, display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                      <span className="pill pill-info">{role}</span>
                      {myHospitalName && <span className="hint">{myHospitalName}</span>}
                    </div>
                    <div style={{ marginTop: 10, display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                      <select value={role} onChange={(e) => setRole(e.target.value)} style={{ maxWidth: 140, minHeight: 40 }} aria-label="Switch role (mock)">{ROLES.map((r) => <option key={r} value={r}>{r}</option>)}</select>
                      <button type="button" className="btn btn-sm btn-ghost" onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')} aria-pressed={theme === 'dark'}>{theme === 'dark' ? 'Light mode' : 'Dark mode'}</button>
                    </div>
                  </div>
                  <Link to="/profile" onClick={() => setAvatarOpen(false)}><Icon name="user" size={16} /> Profile</Link>
                  <Link to="/settings" onClick={() => setAvatarOpen(false)}><Icon name="settings" size={16} /> Settings</Link>
                  <button type="button" onClick={doLogout}><Icon name="logout" size={16} /> Logout — clear session</button>
                </div>
              )}
            </div>
          </div>
          <div style={{ maxWidth: 1280, margin: '0 auto', padding: '10px 16px 0', width: '100%' }}>
            <div className={`scope-banner ${role === 'SuperAdmin' ? 'super' : ''}`} role="status">
              <Icon name={role === 'SuperAdmin' ? 'shield' : 'pin'} size={18} />
              <span style={{ flex: 1 }}>{role === 'SuperAdmin' ? 'SuperAdmin — full network view. Ministry scope: every hospital.' : lockedHospitalId ? `You are viewing ${hospitals.find((h) => String(h.id) === String(lockedHospitalId))?.name ?? `Hospital #${lockedHospitalId}`} — role ${role} is locked to this facility.` : `${role} — pick your assigned hospital in Profile to lock this portal to one facility.`}</span>
              {role !== 'SuperAdmin' && <Link to="/profile">Change</Link>}
            </div>
            <Breadcrumbs />
          </div>
        </header>

        <div className="cmdbar">
          <form className="cmdbar-inner" onSubmit={submitSearch} role="search" aria-label="CentralId command bar">
            <div style={{ minWidth: 120 }}>
              <div className="cmdbar-eyebrow">Central ID</div>
              <div className="hint">One citizen, one record</div>
            </div>
            <input ref={searchRef} id="centralid-search" type="search" placeholder="MH-2026-004213 — press / to focus" autoComplete="off" value={q} onChange={(e) => setQ(e.target.value)} aria-describedby="cid-hint" style={{ fontSize: 18 }} />
            <button className="btn btn-primary btn-lg" type="submit" style={{ minHeight: 48 }}>Go <Icon name="arrowRight" size={16} /></button>
            <span className="ticker" aria-live="polite">
              <span className="live-dot" aria-hidden="true" />
              <span>Occupancy <strong className="num">{ticker.occupancy}</strong></span>
              <span>Pending <strong className="num">{ticker.pending}</strong></span>
              <span className="hint">{ticker.updated}</span>
              <button type="button" className="btn btn-sm btn-ghost" aria-pressed={live} onClick={() => setLive((v) => !v)}>{live ? 'Live — Pause' : 'Paused — Resume'}</button>
            </span>
          </form>
          <div style={{ maxWidth: 1280, margin: '0 auto', padding: '8px 16px 0' }}>
            <span id="cid-hint" className="hint">Type any centralId and jump to unified history in one step.</span>
            {recent.length > 0 && (
              <div className="recent-chips" style={{ marginTop: 6 }}>
                {recent.map((id) => (<button key={id} type="button" className="chip-btn" onClick={() => goCentralId(id)} title={`Open ${id}`}>{id}</button>))}
              </div>
            )}
          </div>
        </div>

        <main id="main" className="page" tabIndex={-1}>
          <Outlet />
        </main>

        <footer className="footer">
          CureHub · Central DB + SOAP <code>/ws/central.wsdl</code> · API <code>{API_BASE}</code> · synthetic demo data only · <Link to="/help">Help</Link> · <Link to="/">Public site</Link>
        </footer>
      </div>

      <div className="toast-region" aria-live="polite">
        {toasts.map((t) => (
          <div key={t.id} className="toast" role="alert">
            <Icon name="checkCircle" size={18} />
            <span style={{ flex: 1 }}>{t.message}</span>
            {t.actionLabel && (<button type="button" onClick={() => { t.onAction?.(); dismissToast(t.id); }}>{t.actionLabel}</button>)}
            <button type="button" onClick={() => dismissToast(t.id)} aria-label="Dismiss notification"><Icon name="x" size={14} /></button>
          </div>
        ))}
      </div>
    </div>
  );
}
