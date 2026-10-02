import { Link, Navigate, useLocation } from 'react-router';
import { useAuth } from '../../../hooks/useAuth';
import { getRedirect } from '../authRedirect';
import AuthLayout from '../components/AuthLayout';
import LoginForm from '../components/LoginForm';
import './LoginPage.css';

export default function LoginPage() {
  const { status } = useAuth();
  const location = useLocation();
  const redirectTo = getRedirect(location.state);

  // Already logged in (or just logged in) → go where they were headed
  if (status === 'authed') return <Navigate to={redirectTo} replace />;

  return (
    <AuthLayout
      title="Welcome back"
      subtitle="Log in to pick up where your map left off."
      footer={
        <>
          New to Atlas?{' '}
          <Link to="/register" state={location.state}>
            Create an account
          </Link>
        </>
      }
    >
      <LoginForm />
    </AuthLayout>
  );
}
