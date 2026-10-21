import { CircleUserRound, LogOut } from "lucide-react";
import { useState, type FormEvent } from "react";

import { accountsEnabled, sendCode, signOut, useAccount, verifyCode } from "@/account/account";

import { Button } from "./kit/Button";
import { Popover } from "./kit/Popover";

/** Sign in with an e-mail code; shows the plan once signed in. Absent while accounts are off. */
export function AccountMenu() {
  const email = useAccount((s) => s.email);
  if (!accountsEnabled) return null;
  return (
    <Popover
      align="end"
      className="account-menu"
      trigger={(p) => (
        <Button
          icon={CircleUserRound}
          label={email ? `Account — ${email}` : "Sign in"}
          variant={email ? "secondary" : "ghost"}
          {...p}
        />
      )}
    >
      {email ? <SignedIn email={email} /> : <SignIn />}
    </Popover>
  );
}

const SYNC_TEXT = {
  off: "",
  syncing: "Syncing ratings…",
  synced: "Ratings in sync",
  error: "Sync failed — retries on the next change",
};

function SignedIn({ email }: { email: string }) {
  const plan = useAccount((s) => s.plan);
  const sync = useAccount((s) => s.sync);
  return (
    <div className="account-panel">
      <div className="popover-label">Signed in</div>
      <p className="account-email">{email}</p>
      {plan?.active ? (
        <p className="note">
          <strong>Pro</strong>
          {plan.until ? ` · until ${new Date(plan.until).toLocaleDateString()}` : ""}
          {SYNC_TEXT[sync] ? ` · ${SYNC_TEXT[sync]}` : ""}
        </p>
      ) : (
        <p className="note">
          Free. <strong>Pro</strong> keeps your ratings, tags and places in sync between phone and computer — the photos
          stay on each device.
        </p>
      )}
      <hr />
      <button type="button" className="menu-item" onClick={() => void signOut()}>
        <LogOut size={15} /> Sign out
      </button>
    </div>
  );
}

function SignIn() {
  const [email, setEmail] = useState("");
  const [code, setCode] = useState("");
  const [sent, setSent] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string>();

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setError(undefined);
    try {
      if (!sent) {
        await sendCode(email.trim());
        setSent(true);
      } else await verifyCode(email.trim(), code.trim());
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setBusy(false);
    }
  };

  return (
    <form className="account-panel" onSubmit={(e) => void submit(e)}>
      <div className="popover-label">{sent ? "Enter the code from the e-mail" : "Sign in or create an account"}</div>
      {!sent ? (
        <input
          className="input"
          type="email"
          autoComplete="email"
          placeholder="you@example.com"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
          data-autofocus
        />
      ) : (
        <input
          className="input tabular"
          inputMode="numeric"
          autoComplete="one-time-code"
          placeholder="123456"
          value={code}
          onChange={(e) => setCode(e.target.value)}
          required
          data-autofocus
        />
      )}
      {error && <p className="account-error">{error}</p>}
      <Button type="submit" variant="primary" disabled={busy}>
        {sent ? "Sign in" : "Send code"}
      </Button>
      <p className="note">
        Your photos stay on this device. The account holds your plan and, with Pro, your ratings — never the photos.
      </p>
    </form>
  );
}
