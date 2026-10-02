import { useState, type ChangeEvent, type FormEvent } from 'react';
import { parseApiError, type ParsedApiError } from '../../services/api';

/** Form state shared by LoginForm and RegisterForm: values, submit, and server errors per field. */
export function useAuthForm<T extends Record<string, string>>(initial: T, submit: (values: T) => Promise<unknown>) {
  const [values, setValues] = useState<T>(initial);
  const [error, setError] = useState<ParsedApiError | null>(null);
  const [submitting, setSubmitting] = useState(false);

  function handleChange(e: ChangeEvent<HTMLInputElement>) {
    const { name, value } = e.target;
    setValues((v) => ({ ...v, [name]: value }));
    // Editing a field clears its error
    setError((err) => {
      if (!err?.fields[name]) return err;
      const { [name]: _removed, ...fields } = err.fields;
      return { ...err, fields };
    });
  }

  async function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setSubmitting(true);
    setError(null);
    try {
      await submit(values);
      // On success the page redirects and this form unmounts
    } catch (err) {
      setError(parseApiError(err));
      setSubmitting(false);
    }
  }

  // A banner only for errors not tied to a specific field (wrong password, rate limit, server down)
  const hasFieldErrors = !!error && Object.keys(error.fields).length > 0;
  const formError = error && !hasFieldErrors ? error.message : null;

  return { values, fieldErrors: error?.fields ?? {}, formError, submitting, handleChange, handleSubmit };
}
