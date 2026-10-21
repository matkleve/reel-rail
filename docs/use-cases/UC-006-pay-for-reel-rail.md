# UC-006 — Pay for reel-rail and use it with an account

<!-- id: UC-006 -->
<!-- built-in: src/account/, supabase/migrations/ — see adr/0001 -->

**Who:** a person who wants to keep using reel-rail beyond a trial; later,
possibly someone who wants their ratings on phone and computer alike.
**Wants to:** sign in, pay a subscription, and have it just work.
**So that:** reel-rail can be a product (Matthias and his brother's plan).

## Success looks like

- Sign-in with an e-mail code (no password to forget).
- A subscription shows as active on every device they sign in on.
- Photos and videos still never leave the device unless a cloud plan says so
  in plain words.

## Decided (2026-10-21)

- **Free + Pro.** Free: everything on one device — sorting, countdown,
  Recently deleted, trimming, picks, series, export. **Pro: rating sync**
  between devices (enforced by the database). Further Pro features to be
  decided; client-side gates for them would be bypassable, so anything that
  must be paid for needs a server-side check like `has_pro()`.
- **Cloud = ratings only**, never photos.
- **Native iPhone app: prepare it** (Capacitor) — see docs/NATIVE.md.
- **No Apple in-app purchases.** Pro is bought on the web only; the native
  app is the Free tier and shows no account, prices or buy links (App Review
  3.1.3(b)). Pro on the iPhone = the Home Screen web app.

## Still open

- Price and period; Stripe account (payments not wired — until then Pro is
  granted by hand in the database for testing).
- Trial length.

## Out of scope (until answered)

Payment UI, cloud storage of media, team accounts.
