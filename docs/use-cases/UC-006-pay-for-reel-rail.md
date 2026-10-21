# UC-006 — Pay for reel-rail and use it with an account

<!-- id: UC-006 -->
<!-- built-in: supabase/ (schema ready, project not created yet) — see adr/0001 -->

**Who:** a person who wants to keep using reel-rail beyond a trial; later,
possibly someone who wants their ratings on phone and computer alike.
**Wants to:** sign in, pay a subscription, and have it just work.
**So that:** reel-rail can be a product (Matthias and his brother's plan).

## Success looks like

- Sign-in with an e-mail code (no password to forget).
- A subscription shows as active on every device they sign in on.
- Photos and videos still never leave the device unless a cloud plan says so
  in plain words.

## Open questions (for Matthias)

- **What is paid?** Everything after a trial, or a free tier (e.g. one
  folder, no trimming) plus "Pro"?
- **Price and period**, and which payment provider (Stripe is the usual
  pairing with Supabase).
- **Cloud version:** sync of ratings only (small, cheap), or uploading the
  photos themselves (storage costs, privacy promise changes)?
- **Native app:** deleting from the iPhone Photos library and reading videos
  without the long "preparing" wait need one (Capacitor wrapper). App Store
  subscriptions then run through Apple.

## Out of scope (until answered)

Payment UI, cloud storage of media, team accounts.
