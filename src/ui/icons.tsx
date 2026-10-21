/** The handful of glyphs the app needs — inline, so there is no icon dependency. */

type P = { size?: number; className?: string };

export const PlayIcon = ({ size = 14, className }: P) => (
  <svg width={size} height={size} viewBox="0 0 24 24" className={className} aria-hidden="true">
    <path d="M8 5v14l11-7z" fill="currentColor" />
  </svg>
);

export const StarIcon = ({ size = 14, className }: P) => (
  <svg width={size} height={size} viewBox="0 0 24 24" className={className} aria-hidden="true">
    <path
      d="M12 2.5l2.9 6.1 6.6.8-4.9 4.6 1.3 6.6L12 17.3l-5.9 3.3 1.3-6.6L2.5 9.4l6.6-.8z"
      fill="currentColor"
    />
  </svg>
);

export const CheckIcon = ({ size = 10, className }: P) => (
  <svg width={size} height={size} viewBox="0 0 24 24" className={className} aria-hidden="true">
    <path d="M4 12.5l5 5L20 6.5" stroke="currentColor" strokeWidth="3.5" fill="none" strokeLinecap="round" />
  </svg>
);

export const DiceIcon = ({ size = 18, className }: P) => (
  <svg width={size} height={size} viewBox="0 0 24 24" className={className} aria-hidden="true">
    <rect x="3" y="3" width="18" height="18" rx="4" stroke="currentColor" strokeWidth="2" fill="none" />
    <circle cx="8" cy="8" r="1.6" fill="currentColor" />
    <circle cx="16" cy="16" r="1.6" fill="currentColor" />
    <circle cx="12" cy="12" r="1.6" fill="currentColor" />
    <circle cx="16" cy="8" r="1.6" fill="currentColor" />
    <circle cx="8" cy="16" r="1.6" fill="currentColor" />
  </svg>
);

export const PickIcon = ({ size = 14, className }: P) => (
  <svg width={size} height={size} viewBox="0 0 24 24" className={className} aria-hidden="true">
    <path
      d="M12 4v11m0 0l-4.5-4.5M12 15l4.5-4.5M5 19.5h14"
      stroke="currentColor"
      strokeWidth="2.6"
      fill="none"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </svg>
);
