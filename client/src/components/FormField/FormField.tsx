import type { InputHTMLAttributes } from 'react';
import './FormField.css';

interface FormFieldProps extends InputHTMLAttributes<HTMLInputElement> {
  label: string;
  name: string;
  error?: string;
  hint?: string;
}

/** Labelled input with an inline error (or hint) wired up for screen readers. */
export default function FormField({ label, name, error, hint, id, className, ...inputProps }: FormFieldProps) {
  const inputId = id ?? `field-${name}`;
  const messageId = `${inputId}-message`;
  const message = error ?? hint;

  return (
    <div className={['form-field', error && 'form-field--invalid', className].filter(Boolean).join(' ')}>
      <label htmlFor={inputId} className="form-field__label">
        {label}
      </label>
      <input
        id={inputId}
        name={name}
        className="form-field__input"
        aria-invalid={error ? true : undefined}
        aria-describedby={message ? messageId : undefined}
        {...inputProps}
      />
      {message && (
        <p id={messageId} className={error ? 'form-field__error' : 'form-field__hint'}>
          {message}
        </p>
      )}
    </div>
  );
}
