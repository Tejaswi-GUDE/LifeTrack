import { forwardRef } from 'react';
import { cn } from '../../lib/cn';

/**
 * Button — Design System §10.
 * One shape language, four emphasis levels. No per-page variation, no arrow
 * glyphs appended to labels. Primary = the single next action in a view.
 *
 * props:
 *   variant: 'primary' | 'secondary' | 'ghost' | 'destructive'  (default 'secondary')
 *   size:    'md' | 'sm'                                         (default 'md')
 *   loading: boolean  — shows an inline spinner, disables the button
 *   as:      element type or component (default 'button')
 */
const VARIANTS = {
  primary: 'btn-primary',
  secondary: 'btn-secondary',
  ghost: 'btn-ghost',
  destructive: 'btn-destructive',
};

const Button = forwardRef(function Button(
  {
    variant = 'secondary',
    size = 'md',
    loading = false,
    disabled = false,
    as: Comp = 'button',
    className,
    children,
    type,
    ...rest
  },
  ref,
) {
  const isNativeButton = Comp === 'button';
  return (
    <Comp
      ref={ref}
      type={isNativeButton ? type || 'button' : undefined}
      disabled={isNativeButton ? disabled || loading : undefined}
      aria-disabled={!isNativeButton && (disabled || loading) ? true : undefined}
      aria-busy={loading || undefined}
      className={cn('btn', VARIANTS[variant] || VARIANTS.secondary, size === 'sm' && 'btn-sm', className)}
      {...rest}
    >
      {loading && <span className="lt-spinner" aria-hidden="true" />}
      {children}
    </Comp>
  );
});

export default Button;
