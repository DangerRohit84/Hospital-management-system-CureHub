import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';

const AppCtx = createContext(null);

export const ROLES = ['SuperAdmin', 'HospitalAdmin', 'Doctor', 'Receptionist'];

function read(key, fallback) {
  try {
    const v = localStorage.getItem(key);
    return v == null ? fallback : JSON.parse(v);
  } catch {
    return fallback;
  }
}
function write(key, value) {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch {
    /* ignore */
  }
}
function clear(key) {
  try {
    localStorage.removeItem(key);
  } catch {
    /* ignore */
  }
}

let toastSeq = 1;

export function AppProvider({ children }) {
  const navigate = useNavigate();
  const [auth, setAuthState] = useState(() => read('hub.auth', null));
  const [role, setRoleState] = useState(() => read('hub.auth', null)?.role || read('hub.role', 'SuperAdmin'));
  const [hospitalScope, setHospitalScopeState] = useState(() => read('hub.hospitalScope', 'all'));
  const [myHospitalId, setMyHospitalIdState] = useState(() => read('hub.myHospitalId', ''));
  const [theme, setThemeState] = useState(() => read('hub.theme', 'light'));
  const [toasts, setToasts] = useState([]);
  const [recent, setRecent] = useState(() => read('hub.recentCentralIds', []));
  const timers = useRef([]);

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme === 'dark' ? 'dark' : 'light');
    write('hub.theme', theme);
  }, [theme]);

  const pushToast = useCallback((message, opts = {}) => {
    const id = toastSeq++;
    const t = { id, message, actionLabel: opts.actionLabel, onAction: opts.onAction };
    setToasts((prev) => [...prev.slice(-3), t]);
    const timer = setTimeout(() => {
      setToasts((prev) => prev.filter((x) => x.id !== id));
    }, opts.ms ?? 6000);
    timers.current.push(timer);
    return id;
  }, []);

  useEffect(() => () => timers.current.forEach(clearTimeout), []);

  const dismissToast = useCallback((id) => {
    setToasts((prev) => prev.filter((x) => x.id !== id));
  }, []);

  const setRole = useCallback((r) => {
    setRoleState(r);
    write('hub.role', r);
  }, []);
  const setHospitalScope = useCallback((s) => {
    setHospitalScopeState(s);
    write('hub.hospitalScope', s);
  }, []);
  const setMyHospitalId = useCallback((v) => {
    setMyHospitalIdState(v);
    write('hub.myHospitalId', v);
  }, []);
  const setTheme = useCallback((t) => {
    setThemeState(t === 'dark' ? 'dark' : 'light');
  }, []);

  // ---- Auth (demo local session; server RBAC to be enforced before prod) ----
  const login = useCallback((user) => {
    const session = {
      name: String(user?.name || 'Demo User').trim() || 'Demo User',
      email: String(user?.email || '').trim(),
      role: ROLES.includes(user?.role) ? user.role : 'Receptionist',
      hospitalId: user?.hospitalId != null && user?.hospitalId !== '' ? String(user.hospitalId) : '',
      hospitalName: String(user?.hospitalName || ''),
      centralId: String(user?.centralId || '').trim(),
      loginAt: new Date().toISOString(),
    };
    setAuthState(session);
    write('hub.auth', session);
    setRoleState(session.role);
    write('hub.role', session.role);
    if (session.hospitalId) {
      setMyHospitalIdState(session.hospitalId);
      write('hub.myHospitalId', session.hospitalId);
    }
    return session;
  }, []);

  const logout = useCallback(() => {
    setAuthState(null);
    clear('hub.auth');
  }, []);

  const updateProfile = useCallback((patch = {}) => {
    setAuthState((prev) => {
      if (!prev) return prev;
      const next = {
        ...prev,
        name: patch.name != null ? String(patch.name) : prev.name,
        email: patch.email != null ? String(patch.email) : prev.email,
        hospitalId: patch.hospitalId != null ? String(patch.hospitalId) : prev.hospitalId,
        hospitalName: patch.hospitalName != null ? String(patch.hospitalName) : prev.hospitalName,
      };
      write('hub.auth', next);
      return next;
    });
  }, []);

  const rememberCentralId = useCallback((centralId) => {
    const id = String(centralId || '').trim();
    if (!id) return;
    setRecent((prev) => {
      const next = [id, ...prev.filter((x) => x !== id)].slice(0, 5);
      write('hub.recentCentralIds', next);
      return next;
    });
  }, []);

  const goCentralId = useCallback(
    (centralId) => {
      const id = String(centralId || '').trim();
      if (!id) return;
      rememberCentralId(id);
      navigate(`/patients/${encodeURIComponent(id)}`);
    },
    [navigate, rememberCentralId],
  );

  // Non-SuperAdmin roles are locked to their assigned hospital.
  const lockedHospitalId =
    role === 'SuperAdmin' ? null : myHospitalId !== '' && myHospitalId != null ? String(myHospitalId) : null;

  const effectiveScopeId =
    role === 'SuperAdmin'
      ? hospitalScope === 'all'
        ? null
        : String(hospitalScope)
      : lockedHospitalId;

  const can = useMemo(
    () => ({
      manageHospitals: role === 'SuperAdmin',
      manageBeds: role === 'SuperAdmin' || role === 'HospitalAdmin',
      acceptReferrals: role === 'SuperAdmin' || role === 'HospitalAdmin',
      writeRecords: role === 'SuperAdmin' || role === 'Doctor',
      // Everyone may book (demo mock; doctors view own schedule). Explicit true —
      // no role gate here; server-side RBAC to be enforced before prod.
      bookAppointments: true,
    }),
    [role],
  );

  const value = {
    auth, isAuthenticated: !!auth, login, logout, updateProfile,
    role, setRole,
    hospitalScope, setHospitalScope,
    myHospitalId, setMyHospitalId,
    lockedHospitalId, effectiveScopeId, can,
    theme, setTheme: setTheme,
    toasts, pushToast, dismissToast,
    recent, rememberCentralId, goCentralId,
  };
  return <AppCtx.Provider value={value}>{children}</AppCtx.Provider>;
}

export function useApp() {
  const ctx = useContext(AppCtx);
  if (!ctx) throw new Error('useApp must be used inside AppProvider');
  return ctx;
}
