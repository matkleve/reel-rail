/** Calendar days of shots, in local time — the day a person means, not UTC. */

export function dayKey(takenAt: string): string {
  const d = new Date(takenAt);
  const p = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`;
}

/** Noon of a day key, for formatting it (noon: no time zone edge pulls it to the day before). */
export function dayDate(key: string): Date {
  const [y, m, d] = key.split("-").map(Number);
  return new Date(y!, m! - 1, d!, 12);
}
