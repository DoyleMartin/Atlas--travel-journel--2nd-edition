import { Navigate, Route, Routes } from 'react-router';
import { AuthProvider } from './context/AuthContext';
import { MapProvider } from './context/MapContext';
import { ToastProvider } from './context/ToastContext';
import AppLayout from './components/AppLayout/AppLayout';
import ProtectedRoute from './components/ProtectedRoute/ProtectedRoute';
import LoginPage from './features/auth/pages/LoginPage';
import RegisterPage from './features/auth/pages/RegisterPage';
import MapPage from './features/map/pages/MapPage';
import ProfilePage from './features/social/pages/ProfilePage';
import './App.css';

export default function App() {
  return (
    <AuthProvider>
      <ToastProvider>
        <MapProvider>
          <Routes>
            <Route path="/login" element={<LoginPage />} />
            <Route path="/register" element={<RegisterPage />} />

            <Route element={<AppLayout />}>
              {/* Public: anyone can view a profile */}
              <Route path="/u/:username" element={<ProfilePage />} />

              {/* Logged-in only */}
              <Route element={<ProtectedRoute />}>
                <Route index element={<MapPage />} />
              </Route>
            </Route>

            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </MapProvider>
      </ToastProvider>
    </AuthProvider>
  );
}
