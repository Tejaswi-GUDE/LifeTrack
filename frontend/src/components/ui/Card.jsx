import { forwardRef } from 'react';
import { cn } from '../../lib/cn';

/**
 * Card — Design System §9.
 * Flat --paper-raised surface, hairline border, --radius-md, NO shadow at rest.
 * Variants are a 2px semantic left-edge only (never a coloured header bar or
 * a tinted body). Header uses H3 (Plex Sans 600); no eyebrow label.
 *
 * props:
 *   accent: 'brick' | 'teal' | 'ochre'   — semantic left-edge
 *   title, subtitle                       — optional card header
 *   as: element type (default 'div')
 */
const ACCENTS = {
  brick: 'accent-brick',
  teal: 'accent-teal',
  ochre: 'accent-ochre',
};

const Card = forwardRef(function Card(
  { accent, title, subtitle, as: Comp = 'div', className, children, ...rest },
  ref,
) {
  return (
    <Comp ref={ref} className={cn('card', accent && ACCENTS[accent], className)} {...rest}>
      {title != null && <div className="card-title">{title}</div>}
      {subtitle != null && <div className="card-sub">{subtitle}</div>}
      {children}
    </Comp>
  );
});

export default Card;
