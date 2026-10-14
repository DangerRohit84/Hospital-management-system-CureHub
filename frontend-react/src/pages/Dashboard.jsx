import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { Area, AreaChart, Bar, BarChart, CartesianGrid, Cell, Legend, Pie, PieChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { getAvailability, getCensus, listAppointments, listReferrals, toApiError } from '../api/client.js';
import { useApp } from '../context/AppContext.jsx';
import { Avatar, EmptyState, ErrorBanner, KpiCard, LoadLight, SectionHeader, SkeletonCards } from '../components/ui.jsx';
import Icon from '../components/icons.jsx';

const PALETTE = ['#0B2A4A', '#0E7490', '#059669', '#D97706', '#0369A1', '#7C3AED'];
const tooltipStyle = { background: '#fff', border: '1px solid #E2E8F0', borderRadius: 12, boxShadow: '0 8px 24px rgba(11,42,74,0.16)', fontSize: 13 };

export default function Dashboard() {
  const { pushToast } = useApp();
  const [census, setCensus] = useState(null);
  const [avail, setAvail] = useState([]);
  const [refs, setRefs] = useState([]);
  const [apptTrend, setApptTrend] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  async function load() {
    setLoading(true);
    setError(null);
    try {
      const [c, a, appts, r] = await Promise.all([getCensus(), getAvailability(), listAppointments().catch(() => []), listReferrals().catch(() => [])]);
      setCensus(c);
      setAvail(Array.isArray(a) ? a : []);
      setRefs(Array.isArray(r) ? r : []);
      const by = {};
      (Array.isArray(appts) ? appts : []).forEach((x) => { const d = String(x.appointmentTime || '').slice(0, 10); if (d) by[d] = (by[d] || 0) + 1; });
      setApptTrend(Object.keys(by).sort().slice(-14).map((d) => ({ date: d.slice(5), full: d, count: by[d] })));
    } catch (e) {
      const ae = toApiError(e);
      setError(ae);
      pushToast(ae.message);
    } finally { setLoading(false); }
  }

  useEffect(() => {
    load();
    const t = setInterval(() => { if (!document.hidden) load(); }, 60000);
    return () => clearInterval(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const occ = useMemo(() => {
    const tot = Number(census?.totalBeds) || (avail || []).reduce((s, r) => s + (Number(r.totalBeds) || 0), 0);
    const o = Number(census?.occupiedBeds) || (avail || []).reduce((s, r) => s + (Number(r.occupiedBeds) || 0), 0);
    return { tot, o, pct: tot ? Math.round((o / tot) * 100) : 0 };
  }, [census, avail]);

  const barData = useMemo(() => (avail || []).slice(0, 8).map((r) => ({ name: String(r.hospitalName || '').slice(0, 16), full: r.hospitalName, occupied: Number(r.occupiedBeds) || 0, available: Number(r.availableBeds) || 0 })), [avail]);
  const donut = useMemo(() => {
    const t = occ.tot, o = occ.o;
    return [{ name: 'Occupied', value: o }, { name: 'Available', value: Math.max(0, t - o) }];
  }, [occ]);
  const funnel = useMemo(() => {
    const p = refs.filter((r) => String(r.status).toUpperCase() === 'PENDING').length;
    const a = refs.filter((r) => String(r.status).toUpperCase() === 'ACCEPTED').length;
    const c = refs.filter((r) => String(r.status).toUpperCase() === 'COMPLETED').length;
    return [{ name: 'Pending', value: p }, { name: 'Accepted', value: a }, { name: 'Completed', value: c }];
  }, [refs]);
  const alerts = useMemo(() => {
    const out = [];
    (avail || []).filter((r) => { const t = Number(r.totalBeds) || 0; return t > 0 && (Number(r.occupiedBeds) || 0) / t >= 0.9; }).slice(0, 4).forEach((r) => out.push({ kind: 'bed', title: `${r.hospitalName} at ${Math.round((r.occupiedBeds / r.totalBeds) * 100)}%`, sub: `${r.availableBeds} free — consider diversion`, at: 'now' }));
    refs.filter((r) => String(r.status).toUpperCase() === 'PENDING').slice(0, 4).forEach((r) => out.push({ kind: 'referral', title: `Referral #${r.id} awaiting triage`, sub: `${r.patient?.name ?? ''} · ${r.reason ?? ''}`, at: String(r.createdAt || '').slice(0, 10) }));
    return out.slice(0, 6);
  }, [avail, refs]);

  const today = new Date().toLocaleDateString('en-IN', { weekday: 'long', day: 'numeric', month: 'long' });

  if (loading && !census) return (
    <div>
      <div className="page-head"><div><p className="eyebrow" style={{ color: 'var(--color-primary)', margin: 0 }}>Central command · {today}</p><h1>Good morning — network at a glance</h1><hr className="ashoka-v2" aria-hidden="true" /></div></div>
      <SkeletonCards count={6} />
    </div>
  );

  const cards = census ? [
    { label: 'Hospitals', value: census.hospitals, delta: '▲ 4.2% this week' },
    { label: 'Doctors', value: census.doctors, delta: '▲ 2.1% this week' },
    { label: 'Patients', value: census.patients, delta: '▲ 6.8% this week' },
    { label: 'Appointments', value: census.appointments, delta: '▲ 3.4% this week' },
    { label: 'Referrals', value: census.referrals, delta: '▲ 1.9% this week' },
    { label: 'Beds occupied', value: `${occ.o}/${occ.tot}`, delta: occ.pct >= 80 ? '▼ Tight — act' : '▲ Stable' },
  ] : [];

  return (
    <div>
      <div className="page-head">
        <div><p className="eyebrow" style={{ color: 'var(--color-primary)', margin: 0 }}>Central command · {today}</p><h1>Good morning — network at a glance</h1><hr className="ashoka-v2" aria-hidden="true" /><p className="hint" style={{ margin: 0 }}>Ministry view of whole network health in 10 seconds. Auto-refresh 60s. <span className="pill pill-completed"><Icon name="checkCircle" size={14} /> Live</span></p></div>
        <div className="page-actions"><Link className="btn btn-primary" to="/appointments"><Icon name="plus" size={16} /> New appointment</Link><Link className="btn" to="/reports"><Icon name="download" size={16} /> Export</Link></div>
      </div>
      <ErrorBanner error={error} onRetry={load} hint="Check backend is running on port 8086, then Retry." />

      <section aria-label="Census KPIs"><div className="kpi-grid kpi-6">{cards.map((c, i) => <KpiCard key={c.label} label={c.label} value={c.value} delta={c.delta} index={i} spark="0,22 20,18 40,20 60,12 80,14 100,6 120,8" />)}</div></section>

      <div className="cols cols-21" style={{ marginTop: 14 }}>
        <div style={{ display: 'grid', gap: 14 }}>
          <section className="card" aria-labelledby="occ-h">
            <SectionHeader title="Occupancy trend" hint="Bed occupancy by hospital — gradient bars, rounded tops." />
            {barData.length === 0 ? (<EmptyState art="bed" title="No occupancy data" body="Register hospitals and beds to see pressure." action={<Link className="btn btn-cta" to="/hospitals">Open registry</Link>} />) : (
              <div className="chart-box" role="img" aria-label="Occupancy bar chart">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={barData} margin={{ top: 8, right: 8, left: -12, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#E2E8F0" />
                    <XAxis dataKey="name" tick={{ fontSize: 12, fill: '#475569' }} interval={0} angle={-18} dy={10} height={56} />
                    <YAxis tick={{ fontSize: 12, fill: '#475569' }} />
                    <Tooltip contentStyle={tooltipStyle} />
                    <Legend />
                    <Bar dataKey="occupied" fill="#0B2A4A" name="Occupied" radius={[8, 8, 0, 0]} />
                    <Bar dataKey="available" fill="#059669" name="Available" radius={[8, 8, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            )}
            <details><summary>Data table alternative</summary><div className="table-scroll" style={{ marginTop: 8 }}><table className="data"><thead><tr><th>Hospital</th><th>Occupied</th><th>Total</th><th>%</th></tr></thead><tbody>{avail.map((r) => { const pct = r.totalBeds ? Math.round((r.occupiedBeds / r.totalBeds) * 100) : 0; return <tr key={r.hospitalId}><td>{r.hospitalName}</td><td className="num">{r.occupiedBeds}</td><td className="num">{r.totalBeds}</td><td className="num">{pct}%</td></tr>; })}</tbody></table></div></details>
          </section>

          <section className="card" aria-labelledby="appt-h">
            <SectionHeader title="Appointments — last 14 days" hint="Line summary from live records, grouped by date." actions={<Link className="btn btn-sm" to="/appointments">Open diary</Link>} />
            {apptTrend.length === 0 ? (<EmptyState art="calendar" title="No appointments yet" body="Book the first slot from the Appointments wizard." action={<Link className="btn btn-cta" to="/appointments">Book one</Link>} />) : (
              <div className="chart-box" role="img" aria-label="Appointments per day area chart" style={{ height: 260 }}>
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={apptTrend} margin={{ top: 8, right: 8, left: -12, bottom: 0 }}>
                    <defs><linearGradient id="apptFill" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="#0B2A4A" stopOpacity={0.28} /><stop offset="55%" stopColor="#0E7490" stopOpacity={0.14} /><stop offset="100%" stopColor="#059669" stopOpacity={0} /></linearGradient></defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="#E2E8F0" />
                    <XAxis dataKey="date" tick={{ fontSize: 12, fill: '#475569' }} />
                    <YAxis allowDecimals={false} tick={{ fontSize: 12, fill: '#475569' }} />
                    <Tooltip contentStyle={tooltipStyle} labelFormatter={(_, p) => p?.[0]?.payload?.full ?? ''} />
                    <Area type="monotone" dataKey="count" stroke="#0E7490" strokeWidth={2.5} fill="url(#apptFill)" dot={{ r: 4, fill: '#0B2A4A', stroke: '#fff', strokeWidth: 2 }} name="Appointments" />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            )}
          </section>

          <section className="card" aria-labelledby="avail-h">
            <SectionHeader title="Hospital load" hint="Avatar + name + Load Light rhythm. Premium rows, 52px." actions={<Link className="btn btn-sm" to="/hospitals">Registry</Link>} />
            {avail.length === 0 ? (<EmptyState art="hospital" title="No hospitals yet" body="Create the first facility registry entry." action={<Link className="btn btn-cta" to="/hospitals">Create Hospital</Link>} />) : (
              <div className="table-scroll"><table className="data"><thead><tr><th>Hospital</th><th>City</th><th>Free</th><th>Load</th><th>Action</th></tr></thead><tbody>
                {avail.slice(0, 6).map((r) => (
                  <tr key={r.hospitalId}>
                    <td><span className="cell-main"><Avatar name={r.hospitalName} size="sm" /><span><span className="cell-name">{r.hospitalName}</span><br /><small className="cell-sub">#{r.hospitalId}</small></span></span></td>
                    <td>{r.city || '—'}</td>
                    <td className="num"><strong>{r.availableBeds}</strong> <span className="hint">/ {r.totalBeds}</span></td>
                    <td><LoadLight total={r.totalBeds} occupied={r.occupiedBeds} /></td>
                    <td><Link className="btn btn-sm" to={`/hospitals/${r.hospitalId}`}>View</Link></td>
                  </tr>
                ))}
              </tbody></table></div>
            )}
          </section>
        </div>

        <div style={{ display: 'grid', gap: 14, alignContent: 'start' }}>
          <section className="card" aria-label="Live alerts timeline">
            <SectionHeader title="Live alerts" hint="Pressure + pending triage, newest first." />
            {alerts.length === 0 ? <p className="hint">Network steady — no alerts.</p> : (
              <ol className="timeline">{alerts.map((a, i) => (
                <li key={i}><span className={`t-dot ${a.kind === 'bed' ? 'saffron' : 'emerald'}`}><Icon name={a.kind === 'bed' ? 'bed' : 'swap'} size={12} /></span><time>{a.at}</time><div className="timeline-card"><strong>{a.title}</strong><div className="hint">{a.sub}</div></div></li>
              ))}</ol>
            )}
          </section>
          <section className="card" aria-label="Bed pressure donut">
            <SectionHeader title="Bed pressure" hint="Available vs occupied network-wide." />
            <div style={{ height: 220 }} role="img" aria-label="Bed pressure donut">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart><Pie data={donut} dataKey="value" nameKey="name" innerRadius={58} outerRadius={88} paddingAngle={3} strokeWidth={0}>{donut.map((_, i) => <Cell key={i} fill={i === 0 ? '#0B2A4A' : '#059669'} />)}</Pie><Tooltip contentStyle={tooltipStyle} /><Legend /></PieChart>
              </ResponsiveContainer>
            </div>
            <p className="hint" style={{ textAlign: 'center', marginBottom: 0 }}><strong className="num">{occ.pct}%</strong> occupied · {occ.o}/{occ.tot} beds</p>
          </section>
          <section className="card" aria-label="Referral funnel">
            <SectionHeader title="Referral funnel" hint="Pending to completed." actions={<Link className="btn btn-sm btn-ghost" to="/referrals">Triage</Link>} />
            {funnel.map((f, i) => (
              <div key={f.name} style={{ marginBottom: 10 }}><div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 14 }}><strong>{f.name}</strong><span className="num">{f.value}</span></div><div className="load-bar" style={{ marginTop: 6 }}><span className="load-fill" style={{ width: `${refs.length ? Math.round((f.value / Math.max(1, refs.length)) * 100) : 0}%`, display: 'block', background: PALETTE[i % PALETTE.length] }} /></div></div>
            ))}
          </section>
          <section className="card" aria-label="Quick actions">
            <SectionHeader title="Quick actions" />
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
              <Link className="btn" to="/appointments"><Icon name="calendar" size={16} /> Book</Link>
              <Link className="btn" to="/beds"><Icon name="bed" size={16} /> Beds</Link>
              <Link className="btn" to="/referrals"><Icon name="swap" size={16} /> Refer</Link>
              <Link className="btn" to="/reports"><Icon name="download" size={16} /> Export</Link>
            </div>
          </section>
        </div>
      </div>
    </div>
  );
}
