/** A keycap. Keys are shown the way they are printed: "Space", "⌘", "↑". */
export function Kbd({ children }: { children: string }) {
  return <kbd className="kbd">{children}</kbd>;
}
