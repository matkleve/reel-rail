import { Capacitor } from "@capacitor/core";
import type { SupabaseClient } from "@supabase/supabase-js";
import { create } from "zustand";

/**
 * The account adapter — the only module that talks to Supabase
 * (docs/adr/0001). Components use `useAccount` and the functions below,
 * never the SDK. Media never goes through here.
 *
 * Without VITE_SUPABASE_URL / VITE_SUPABASE_ANON_KEY (both public by design:
 * row-level security is what protects the data) accounts are off and the app
 * behaves as before.
 */

const URL = import.meta.env.VITE_SUPABASE_URL as string | undefined;
const KEY = import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined;
/**
 * Off inside the native iPhone app: Pro is sold on the web only, never as an
 * Apple in-app purchase, and App Review (3.1.3(b)) does not let an app unlock
 * what is bought elsewhere without offering it as an in-app purchase too. The
 * app is the Free tier — see docs/NATIVE.md § Paying.
 */
export const accountsEnabled = Boolean(URL && KEY) && !Capacitor.isNativePlatform();

let client: Promise<SupabaseClient> | undefined;
/** Loaded on first use: the SDK is only downloaded by someone who signs in. */
export function sb(): Promise<SupabaseClient> {
  client ??= import("@supabase/supabase-js").then(({ createClient }) =>
    createClient(URL!, KEY!, { auth: { persistSession: true, storageKey: "reel-rail:auth" } }),
  );
  return client;
}

export type Subscription = { status: string; plan: string; current_period_end: string | null };
export type Plan = { active: boolean; plan?: string; until?: string };

/** Pure: does this subscription row unlock the paid features right now? */
export function planOf(row: Subscription | null, now = Date.now()): Plan {
  if (!row) return { active: false };
  const until = row.current_period_end ?? undefined;
  const live = row.status === "active" || row.status === "trialing";
  return { active: live && (!until || new Date(until).getTime() > now), plan: row.plan, until };
}

export type SyncState = "off" | "syncing" | "synced" | "error";
type AccountState = { email?: string; plan?: Plan; checked: boolean; sync: SyncState };
export const useAccount = create<AccountState>()(() => ({ checked: false, sync: "off" }));

async function refresh(): Promise<void> {
  const supabase = await sb();
  const { data } = await supabase.auth.getUser();
  const email = data.user?.email;
  if (!email) return useAccount.setState({ email: undefined, plan: undefined, checked: true });
  // RLS returns only the signed-in user's row.
  const { data: row } = await supabase
    .from("subscriptions")
    .select("status, plan, current_period_end")
    .maybeSingle<Subscription>();
  useAccount.setState({ email, plan: planOf(row ?? null), checked: true });
}

/** On start: restore a saved session (if accounts are on and one was saved). */
export function startAccount(): void {
  if (!accountsEnabled) return;
  // Coming back from the e-mail's sign-in link: the SDK reads the session from the URL.
  const fromLink = /access_token=|[?&]code=/.test(window.location.hash + window.location.search);
  try {
    if (!fromLink && !localStorage.getItem("reel-rail:auth")) return useAccount.setState({ checked: true });
  } catch {
    return;
  }
  void refresh().catch(() => useAccount.setState({ checked: true }));
}

/** Step 1: an e-mail with a one-time code (no password to forget). */
export async function sendCode(email: string): Promise<void> {
  // The e-mail carries a code (template with {{ .Token }}) and a link back here; either signs in.
  const { error } = await (
    await sb()
  ).auth.signInWithOtp({
    email,
    options: { shouldCreateUser: true, emailRedirectTo: window.location.origin },
  });
  if (error) throw error;
}

/** Step 2: the code from the e-mail. */
export async function verifyCode(email: string, token: string): Promise<void> {
  const { error } = await (await sb()).auth.verifyOtp({ email, token, type: "email" });
  if (error) throw error;
  await refresh();
}

export async function signOut(): Promise<void> {
  await (await sb()).auth.signOut();
  useAccount.setState({ email: undefined, plan: undefined });
}
