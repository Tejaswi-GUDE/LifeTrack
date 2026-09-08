import { forwardRef, useId } from 'react';
import { cn } from '../../lib/cn';

/**
 * Input — Design System §11.
 * Label sits above the field (caption style, sentence case). Focus: --ink
 * border + focus ring. Error: --brick border + helper text + an error icon
 * (colour is never the only error signal). `size="lg"` is the 48px
 * conversational-follow-up variant.
 */
const ErrorIcon = () => (
  <svg width="14" height="14" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden="true">
    <circle cx="10" cy="10" r="8" />
    <path d="M10 6v5M10 14h.01" />
  </svg>
);

const Input = forwardRef(function Input(
  { label, error, helperText, size = 'md', multiline = false, id, className, ...rest },
  ref,
) {
  const autoId = useId();
  const inputId = id || autoId;
  const help = error || helperText;
  const Field = multiline ? 'textarea' : 'input';

  return (
    <div className="field">
      {label && (
        <label className="field-label" htmlFor={inputId}>
          {label}
        </label>
      )}
      <Field
        ref={ref}
        id={inputId}
        aria-invalid={error ? true : undefined}
        aria-describedby={help ? `${inputId}-help` : undefined}
        className={cn('input', size === 'lg' && 'input--lg', error && 'input--error', className)}
        {...rest}
      />
      {help && (
        <div id={`${inputId}-help`} className={cn('field-help', error && 'field-help--error')}>
          {error && <ErrorIcon />}
          <span>{help}</span>
        </div>
      )}
    </div>
  );
});

export default Input;
