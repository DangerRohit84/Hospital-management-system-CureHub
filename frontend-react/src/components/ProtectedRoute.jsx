import { Navigate, Outlet, useLocation } from 'react-router-dom';
import { useApp } from '../context/AppContext.jsx';

/**
 * Guards private routes. Unauthenticated users are sent to /login
 * with `?next=` preserved. Optional `roles` prop restricts by role.
 */
export default function ProtectedRoute({ roles }) {
  const { isAuthenticated, role } = useApp();
  const location = useLocation();

  if (!isAuthenticated) {
    const next = encodeURIComponent(location.pathname + location.search + location.hash);
    return <Navigate to={`/login?next=${next}`} replace />;
  }

  if (Array.isArray(roles) && roles.length > 0 && !roles.includes(role)) {
    return (
      <div className="page" style={{ maxWidth: 720 }}>
        <div className="card" style={{ textAlign: 'center', padding: 32 }}>
          <div className="empty-art" aria-hidden="true" style={{ marginBottom: 12 }}>!</div>
          <p className="eyebrow" style={{ color: 'var(--color-warning)' }}>403 · Restricted</p>
          <h1>Restricted — {role} cannot open this section</h1>
          <hr className="ashoka-v2" aria-hidden="true" />
          <div className="alert alert-warn" role="alert" style={{ textAlign: 'left' }}>
            This area needs one of: <strong>{roles.join(', ')}</strong>. You are signed in as{' '}
            <strong>{role}</strong>. Ask a SuperAdmin to elevate your account or switch role in the avatar menu.
          </div>
          <p style={{ display: 'flex', gap: 8, justifyContent: 'center', flexWrap: 'wrap' }}>
            <a className="btn btn-primary" href="#/dashboard">Back to dashboard</a>{' '}
            <a className="btn" href="#/help">How roles work</a>
          </p>
        </div>
      </div>
    );
  }

  return <Outlet />;
}
