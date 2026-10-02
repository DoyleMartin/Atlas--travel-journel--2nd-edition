import Button from '../../../components/Button/Button';
import FormField from '../../../components/FormField/FormField';
import { useAuth } from '../../../hooks/useAuth';
import { useAuthForm } from '../useAuthForm';
import './RegisterForm.css';

export default function RegisterForm() {
  const { register } = useAuth();
  const { values, fieldErrors, formError, submitting, handleChange, handleSubmit } = useAuthForm(
    { username: '', email: '', password: '' },
    register,
  );

  return (
    <form className="register-form" onSubmit={handleSubmit} noValidate>
      {formError && (
        <p className="register-form__error" role="alert">
          {formError}
        </p>
      )}

      <FormField
        label="Username"
        name="username"
        autoComplete="username"
        autoCapitalize="none"
        spellCheck={false}
        value={values.username}
        onChange={handleChange}
        error={fieldErrors.username}
        hint="3–30 characters: letters, numbers and underscores"
        required
        autoFocus
      />
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
      />
      <FormField
        label="Password"
        name="password"
        type="password"
        autoComplete="new-password"
        value={values.password}
        onChange={handleChange}
        error={fieldErrors.password}
        hint="At least 8 characters"
        required
      />

      <Button type="submit" size="lg" fullWidth loading={submitting}>
        {submitting ? 'Creating account…' : 'Create account'}
      </Button>
    </form>
  );
}
