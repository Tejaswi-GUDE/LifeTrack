import { forwardRef, useId } from 'react';
import { cn } from '../../lib/cn';

/**
 * Select — styled native <select>. tokens.css ships `.select` at the 36px
 * filter size used in the flagship topbars; `size="field"` bumps it to the
 * 40px form size from Design System §11.
 *
 * props:
 *   options: Array<{ value, label, disabled? }>  OR  pass <option> children
 *   label, error, helperText
 *   size: 'filter' (default) | 'field'
 */
const Select = forwardRef(function Select(
  { label, error, helperText, options, size = 'filter', id, className, children, ...rest },
  ref,
) {
  const autoId = useId();
  const selectId = id || autoId;
  const help = error || helperText;

  const control = (
    <select
      ref={ref}
      id={selectId}
      aria-invalid={error ? true : undefined}
      className={cn('select', size === 'field' && 'select--field', className)}
      {...rest}
    >
      {options
        ? options.map((o) => (
            <option key={o.value} value={o.value} disabled={o.disabled}>
              {o.label}
            </option>
          ))
        : children}
    </select>
  );

  if (!label && !help) return control;

  return (
    <div className="field">
      {label && (
        <label className="field-label" htmlFor={selectId}>
          {label}
        </label>
      )}
      {control}
      {help && <div className={cn('field-help', error && 'field-help--error')}>{help}</div>}
    </div>
  );
});

export default Select;
