import { HashRouter, Navigate, Route, Routes } from 'react-router-dom';
import { Suspense, lazy } from 'react';
import Layout from './components/Layout.jsx';
import ProtectedRoute from './components/ProtectedRoute.jsx';
import PublicLayout from './components/PublicChrome.jsx';
import { AppProvider } from './context/AppContext.jsx';
import Landing from './pages/Landing.jsx';
import Login from './pages/Login.jsx';
import Signup from './pages/Signup.jsx';
import Forgot from './pages/Forgot.jsx';
import NotFound from './pages/NotFound.jsx';
import Hospitals from './pages/Hospitals.jsx';
import HospitalDetail from './pages/HospitalDetail.jsx';
import Doctors from './pages/Doctors.jsx';
import Patients from './pages/Patients.jsx';
import PatientDetail from './pages/PatientDetail.jsx';
import Appointments from './pages/Appointments.jsx';
import Referrals from './pages/Referrals.jsx';
import Beds from './pages/Beds.jsx';
import Records from './pages/Records.jsx';
import Profile from './pages/Profile.jsx';
import Settings from './pages/Settings.jsx';
import Help from './pages/Help.jsx';
import Emergency from './pages/Emergency.jsx';
import Schemes from './pages/Schemes.jsx';
// L8 perf: Dashboard + Reports pull Recharts (~large). Lazy-split so the initial
// citizen chunk stays lean; staff charts load on demand with a skeleton fallback.
const Dashboard = lazy(() => import('./pages/Dashboard.jsx'));
const Reports = lazy(() => import('./pages/Reports.jsx'));

function ChartFallback() {
  return <div role="status" aria-label="Loading charts" style={{ padding: 24 }}><div className="skeleton" style={{ height: 260 }} /><p className="hint">Loading charts…</p></div>;
}

export default function App() {
  return (
    <HashRouter>
      <AppProvider>
        <Routes>
          {/* Citizen public surface — no login, ORS mental model */}
          <Route element={<PublicLayout />}>
            <Route index element={<Landing />} />
            <Route path="hospitals" element={<Hospitals />} />
            <Route path="hospitals/:id" element={<HospitalDetail />} />
            <Route path="doctors" element={<Doctors />} />
            <Route path="appointments" element={<Appointments />} />
            <Route path="emergency" element={<Emergency />} />
            <Route path="schemes" element={<Schemes />} />
            <Route path="reports" element={<Suspense fallback={<ChartFallback />}><Reports /></Suspense>} />
            <Route path="help" element={<Help />} />
          </Route>

          {/* Auth shell — standalone split-screen */}
          <Route path="login" element={<Login />} />
          <Route path="signup" element={<Signup />} />
          <Route path="forgot" element={<Forgot />} />

          {/* Staff surface — demo session via localStorage hub.auth */}
          <Route element={<ProtectedRoute />}>
            <Route element={<Layout />}>
              <Route path="dashboard" element={<Suspense fallback={<ChartFallback />}><Dashboard /></Suspense>} />
              <Route path="patients" element={<Patients />} />
              <Route path="patients/:centralId" element={<PatientDetail />} />
              <Route path="referrals" element={<Referrals />} />
              <Route element={<ProtectedRoute roles={['SuperAdmin', 'HospitalAdmin', 'Receptionist']} />}>
                <Route path="beds" element={<Beds />} />
              </Route>
              <Route element={<ProtectedRoute roles={['SuperAdmin', 'Doctor']} />}>
                <Route path="records" element={<Records />} />
              </Route>
              <Route path="profile" element={<Profile />} />
              <Route path="settings" element={<Settings />} />
            </Route>
          </Route>

          <Route path="404" element={<NotFound />} />
          <Route path="*" element={<NotFound />} />
        </Routes>
      </AppProvider>
    </HashRouter>
  );
}
