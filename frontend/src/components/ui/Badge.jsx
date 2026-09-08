import { cn } from '../../lib/cn';

/**
 * Badge — Design System §13 (the two independent axes).
 *   tone  = sentiment / hue:  teal | brick | ochre | slate | plum
 *   fill  = confidence style:  solid | outline | dashed
 *
 * `solid` reads as a verified record, `outline` as a self-reported note,
 * `dashed` as needs-review. Pass `glyph` for the seal (●) or flag (⚑).
 * This is a presentational primitive — StatusBadge / RiskBadge apply the
 * product's mapping rules on top of it.
 *
 * `variant` overrides tone/fill with a raw tokens.css badge modifier class
 * (e.g. "solid-teal", "dashed-brick", "neutral") — used when a server payload
 * already carries the exact treatment.
 */
const CLASS_MAP = {
  teal: { solid: 'solid-teal', outline: 'outline-teal', dashed: 'dashed-teal' },
  brick: { solid: 'solid-brick', outline: 'outline-brick', dashed: 'dashed-brick' },
  ochre: { solid: 'solid-ochre', outline: 'outline-ochre', dashed: 'outline-ochre' },
  slate: { solid: 'neutral', outline: 'outline-slate', dashed: 'outline-slate' },
  plum: { solid: 'solid-plum', outline: 'plum', dashed: 'plum' },
};

export default function Badge({ tone = 'slate', fill = 'outline', variant, glyph, className, children, ...rest }) {
  const toneMap = CLASS_MAP[tone] || CLASS_MAP.slate;
  const variantClass = variant || toneMap[fill] || toneMap.outline;
  return (
    <span className={cn('badge', variantClass, className)} {...rest}>
      {glyph != null && <span aria-hidden="true">{glyph}</span>}
      {children}
    </span>
  );
}
