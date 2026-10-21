# 0001. Accounts and subscriptions on Supabase; media stays on the device

- **Status:** Accepted (project creation pending — see Consequences)
- **Date:** 2026-10-21

## Context

reel-rail was built local-first with "no cloud, no backend" as a hard rule.
Matthias now wants it to become a paid product: sign-in, a subscription
model, maybe a "cloud version" later (UC-006). Whether photos are ever
uploaded is undecided. The base project (`grundriss`, docs/BACKEND.md) says:
pick deliberately, enforce access at the data layer, write this record first.

## Decision

We use **Supabase** for **auth** (e-mail one-time code) and a small Postgres
schema: `profiles` and `subscriptions`, row-level security so a user can
read only their own rows and **no client can write a subscription** (only
the payment webhook, with the service role, will). The browser talks to
Supabase only for sign-in and "is my subscription active?". **Media never
leaves the device**; `.reel.json` stays the source of truth.

The client goes through one adapter (`src/account/`); components never import
the SDK. Without `VITE_SUPABASE_URL` / `VITE_SUPABASE_ANON_KEY` the app runs
exactly as before (no account UI), so nothing breaks while the project does
not exist.

## Alternatives considered

- **No backend, license keys** — no sign-in to build, but no "active on every
  device" and no path to a cloud version.
- **Firebase** — comparable auth; Supabase wins on Postgres + RLS (the access
  rule lives in the database) and the existing Supabase account.
- **Uploading media now** — storage cost and a broken privacy promise for a
  feature nobody has asked for yet; revisit with UC-006's open questions.

## Consequences

- AGENTS.md rule 3 changes: network calls are allowed **to Supabase, for the
  account only**. Media bytes still never leave the device.
- A new dependency, `@supabase/supabase-js`, loaded only when an account
  feature is used.
- Payments are not wired: they need a provider account (Stripe) and prices.
  `subscriptions` is shaped for a Stripe webhook.
- **Blocked:** the Supabase organisation is at its free-plan limit of two
  active projects (feldpost, budget). The migration in
  `supabase/migrations/` is ready to apply once a slot is free (pause a
  project, or upgrade the organisation).
