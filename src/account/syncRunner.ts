import { useReel } from "@/store/useReel";
import { useUi } from "@/store/useUi";

import { sb, useAccount } from "./account";
import { applyRemote, toPush, type RemoteRating } from "./sync";

const CHUNK = 300;
const PUSH_DELAY_MS = 3000;
const sinceKey = (email: string) => `reel-rail:synced-until:${email}`;

/**
 * Runs rating sync while someone with Pro is signed in and a library is open:
 * pull on open / sign-in, push 3 s after the last change. The database
 * refuses writes without Pro (RLS), so this only ever tries for Pro.
 */
export function startSync(): () => void {
  let timer: ReturnType<typeof setTimeout> | undefined;
  let running = false;

  const live = () => {
    const a = useAccount.getState();
    return Boolean(a.email && a.plan?.active && useUi.getState().phase === "ready");
  };

  const pull = async () => {
    const supabase = await sb();
    const ids = Object.keys(useReel.getState().reel.media);
    const rows: RemoteRating[] = [];
    for (let i = 0; i < ids.length; i += CHUNK) {
      const { data, error } = await supabase
        .from("ratings")
        .select("media_id, rating, tags, place, updated_at")
        .in("media_id", ids.slice(i, i + CHUNK));
      if (error) throw error;
      rows.push(...(data as RemoteRating[]));
    }
    // Applied to the reel as it is now, not as it was when the pull started.
    const { reel, changed } = applyRemote(useReel.getState().reel, rows);
    if (changed.length) useReel.getState().refresh(reel);
  };

  const push = async () => {
    const email = useAccount.getState().email!;
    const since = localStorage.getItem(sinceKey(email)) ?? undefined;
    const rows = toPush(useReel.getState().reel, since);
    if (!rows.length) return;
    const supabase = await sb();
    for (let i = 0; i < rows.length; i += CHUNK) {
      const { error } = await supabase
        .from("ratings")
        .upsert(rows.slice(i, i + CHUNK), { onConflict: "user_id,media_id" });
      if (error) throw error;
    }
    const newest = rows.reduce((t, r) => (r.updated_at > t ? r.updated_at : t), since ?? "");
    localStorage.setItem(sinceKey(email), newest);
  };

  const run = async (withPull: boolean) => {
    if (running || !live()) return;
    running = true;
    useAccount.setState({ sync: "syncing" });
    try {
      if (withPull) await pull();
      await push();
      useAccount.setState({ sync: "synced" });
    } catch (err) {
      console.warn("reel-rail: sync failed", err);
      useAccount.setState({ sync: "error" });
    } finally {
      running = false;
    }
  };

  const offReel = useReel.subscribe((s, prev) => {
    if (s.reel === prev.reel || !live()) return;
    clearTimeout(timer);
    timer = setTimeout(() => void run(false), PUSH_DELAY_MS);
  });
  // A library opened, or Pro signed in: pull first.
  const offUi = useUi.subscribe((s, prev) => {
    if (s.phase === "ready" && prev.phase !== "ready") void run(true);
  });
  const offAccount = useAccount.subscribe((s, prev) => {
    if (s.plan?.active && !prev.plan?.active) void run(true);
    if (!s.email) useAccount.setState({ sync: "off" });
  });

  return () => {
    clearTimeout(timer);
    offReel();
    offUi();
    offAccount();
  };
}
