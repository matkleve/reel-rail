/** The mark: three cards on a rail, the best one tallest and gold — the app in one glyph. */
export function Logo({ size = 22 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" aria-hidden="true" className="logo">
      <rect x="2" y="12" width="5" height="7" rx="1.2" fill="currentColor" opacity=".45" />
      <rect x="9" y="4" width="7" height="15" rx="1.5" fill="var(--accent)" />
      <rect x="18" y="9" width="4.5" height="10" rx="1.2" fill="currentColor" opacity=".7" />
      <rect x="1" y="20.5" width="22" height="1.5" rx=".75" fill="currentColor" opacity=".35" />
    </svg>
  );
}
