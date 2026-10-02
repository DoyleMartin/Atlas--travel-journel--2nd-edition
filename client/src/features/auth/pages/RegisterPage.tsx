import { Link, Navigate, useLocation } from 'react-router';
import { useAuth } from '../../../hooks/useAuth';
import { getRedirect } from '../authRedirect';
import AuthLayout from '../components/AuthLayout';
import RegisterForm from '../components/RegisterForm';
import './RegisterPage.css';

export default function RegisterPage() {
  const { status } = useAuth();
  const location = useLocation();
  const redirectTo = getRedirect(location.state);

  if (status === 'authed') return <Navigate to={redirectTo} replace />;

  return (
    <AuthLayout
      title="Start your atlas"
      subtitle="Build your lifetime travel map in minutes."
      footer={
        <>
          Already have an account?{' '}
          <Link to="/login" state={location.state}>
            Log in
          </Link>
        </>
      }
    >
      <RegisterForm />
    </AuthLayout>
  );
}
