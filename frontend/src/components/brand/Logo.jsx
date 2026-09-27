/**
 * Logo — LifeTrack wordmark/logo.
 * variant: "auto" (adapts to theme) or "onDark" (light version for dark backgrounds)
 */
export default function Logo({ variant = 'auto', className = '' }) {
  return (
    <div className={`logo logo-${variant} ${className}`} aria-label="LifeTrack">
      <svg
        width="24"
        height="24"
        viewBox="0 0 24 24"
        fill="currentColor"
        xmlns="http://www.w3.org/2000/svg"
        className="logo-icon"
      >
        {/* Simple upward trend mark: ascending line with dot */}
        <polyline
          points="4,16 8,12 12,14 18,6"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        <circle cx="18" cy="6" r="2" fill="currentColor" />
      </svg>
      <span className="logo-text">LifeTrack</span>
    </div>
  );
}
