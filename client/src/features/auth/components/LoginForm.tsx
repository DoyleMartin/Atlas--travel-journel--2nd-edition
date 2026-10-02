import Button from '../../../components/Button/Button';
import FormField from '../../../components/FormField/FormField';
import { useAuth } from '../../../hooks/useAuth';
import { useAuthForm } from '../useAuthForm';
import './LoginForm.css';

export default function LoginForm() {
  const { login } = useAuth();
  const { values, fieldErrors, formError, submitting, handleChange, handleSubmit } = useAuthForm(
    { email: '', password: '' },
    login,
  );

  return (
    <form className="login-form" onSubmit={handleSubmit} noValidate>
      {formError && (
        <p className="login-form__error" role="alert">
          {formError}
        </p>
      )}

      <FormField
        label="Email"
        name="email"
        type="email"
        autoComplete="email"
        inputMode="email"
        value={values.email}
        onChange={handleChange}
        error={fieldErrors.email}
        required
        autoFocus
      />
      <FormField
        label="Password"
        name="password"
        type="password"
        autoComplete="current-password"
        value={values.password}
        onChange={handleChange}
        error={fieldErrors.password}
        required
      />

      <Button type="submit" size="lg" fullWidth loading={submitting}>
        {submitting ? 'Logging in…' : 'Log in'}
      </Button>
    </form>
  );
}
