import { Navigate, Outlet, useLocation } from 'react-router';
import { useAuth } from '../../hooks/useAuth';
import './ProtectedRoute.css';

/** Layout route: renders child routes only when logged in, otherwise sends the user to /login and back afterwards. */
export default function ProtectedRoute() {
  const { status } = useAuth();
  const location = useLocation();

  if (status === 'loading') return <div className="protected-route__loading" aria-busy="true" />;

  if (status === 'anon') {
    return <Navigate to="/login" replace state={{ from: location.pathname + location.search }} />;
  }

  return <Outlet />;
}
