/**
 * The mark: the top pick — a print with a star on top of the pile, on
 * terracotta. Same drawing as public/icon.svg (the app icon); colours from
 * the --logo-* tokens, the same in both themes.
 */
export function Logo({ size = 22 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 512 512" aria-hidden="true" className="logo">
      <rect width="512" height="512" rx="120" fill="var(--logo-bg)" />
      <rect x="140" y="118" width="210" height="256" rx="22" fill="var(--logo-back)" opacity=".55" transform="rotate(-9 256 270)" />
      <g transform="rotate(6 256 270)">
        <rect x="158" y="120" width="220" height="270" rx="24" fill="var(--logo-print)" />
        <rect x="176" y="138" width="184" height="184" rx="14" fill="var(--logo-photo)" />
        <path d="M268 182 l17 35 38 5 -28 26 7 38 -34-18 -34 18 7-38 -28-26 38-5z" fill="var(--logo-bg)" />
      </g>
    </svg>
  );
}
