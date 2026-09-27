import Badge from './Badge';
import { cn } from '../../lib/cn';

/**
 * StatusBadge — applies the product's rules (Design System §2 / §13) on top
 * of the generic Badge:
 *   • hue  comes from the outcome status (what happened)
 *   • fill comes from confidence / provenance (how sure we are)
 * The same status renders three visibly different ways depending on trust.
 *
 * props:
 *   status:     backend Trainee.currentStatus
 *   confidence: 'high' | 'medium' | 'low'
 *   provenance: 'verified' | 'self_reported' | 'needs_review'  (overrides confidence-derived fill)
 *   showConfidence: also render a companion "Confidence: X" chip
 */
const STATUS_META = {
  in_training: { tone: 'slate', label: 'In training' },
  dropped_out: { tone: 'brick', label: 'Dropped out' },
  certified_no_outcome: { tone: 'slate', label: 'Certified — no outcome yet' },
  employed: { tone: 'teal', label: 'Employed' },
  self_employed: { tone: 'teal', label: 'Self-employed' },
  apprentice: { tone: 'teal', label: 'Apprentice' },
  apprenticeship_converted: { tone: 'teal', label: 'Apprenticeship converted' },
  further_education: { tone: 'teal', label: 'Further education' },
  unemployed: { tone: 'slate', label: 'Unemployed' },
  job_lost: { tone: 'brick', label: 'Job lost' },
  not_responding: { tone: 'slate', label: 'Not responding' },
  other: { tone: 'slate', label: 'Other' },
};

const VERIFICATION_LABELS = {
  0: 'L0 Unknown',
  1: 'L1 Self-reported',
  2: 'L2 Assisted',
  3: 'L3 Document verified',
  4: 'L4 Employer confirmed',
  5: 'L5 Official record',
};

function resolveFill({ provenance, confidence }) {
  if (provenance === 'verified') return { fill: 'solid', glyph: '●' };
  if (provenance === 'needs_review') return { fill: 'dashed', glyph: '⚑' };
  if (provenance === 'self_reported') return { fill: 'outline' };
  if (confidence === 'high') return { fill: 'solid', glyph: '●' };
  return { fill: 'outline' }; // medium / low / unknown
}

export default function StatusBadge({ status, confidence, verificationLevel, provenance, showConfidence = false, className, title }) {
  const meta = STATUS_META[status] || STATUS_META.other;
  const { fill, glyph } = resolveFill({ provenance, confidence });

  // Format: "Employed · L4" if verification level available
  const badgeLabel = verificationLevel
    ? `${meta.label} · ${VERIFICATION_LABELS[verificationLevel.level] || 'L0'}`
    : meta.label;

  // Build history tooltip
  let historyTooltip = title;
  if (verificationLevel && verificationLevel.history && verificationLevel.history.length > 0) {
    const entries = verificationLevel.history.map((h) => {
      const levelLabel = VERIFICATION_LABELS[h.level] || `L${h.level}`;
      const date = h.verifiedAt ? new Date(h.verifiedAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) : '?';
      return `${levelLabel} on ${date}${h.actor ? ` by ${h.actor}` : ''}`;
    });
    historyTooltip = entries.join(' → ');
  }

  return (
    <span className={cn('inline-flex items-center gap-2', className)}>
      <Badge tone={meta.tone} fill={fill} glyph={glyph} title={historyTooltip}>
        {badgeLabel}
      </Badge>
      {showConfidence && confidence && (
        <Badge tone="slate" fill="solid">
          Confidence: {confidence[0].toUpperCase() + confidence.slice(1)}
        </Badge>
      )}
    </span>
  );
}
