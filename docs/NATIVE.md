# The native iPhone/iPad app (Capacitor)

**Status: wired, not run on a device yet.** The Xcode project (`ios/`), the
Photos plugin and the Photos source are in the repo. Build it on a Mac, or
without one on GitHub (§ Without a Mac). Nothing in the web app changes: in a
browser `isNativeApp()` is false and the plugin is never called.

## Why a native app

A web page on an iPhone cannot (README § files mode, UC-001, UC-002):

| Limit in Safari | What the plugin does instead |
| --- | --- |
| Picking videos from Photos copies (and may convert) every one before the page gets anything — the long "Preparing…" wait | `listAssets` reads the library's index instantly; `exportAsset` hands over one original only when it is opened |
| No deleting from the Photos library | `deleteAssets` deletes into **Recently Deleted** (iOS confirms; 30 days to undo) |
| No folders, no write access | The library is the source; trims are saved back with `NSPhotoLibraryAddUsageDescription` |

## Build it (on a Mac)

Requirements: macOS with **Xcode 16+**, Node 22+, an **Apple Developer
account** (99 €/year) for TestFlight / the App Store — a free Apple ID can
run it on your own iPhone for 7 days.

```bash
npm ci
npm run ios          # build the web app, copy it into ios/, open Xcode
```

In Xcode: select the **App** target → *Signing & Capabilities* → your Team;
plug in the iPhone, pick it as the run destination, ▶︎. For the brother:
*Product → Archive → Distribute → TestFlight*.

`npm run ios` = `vite build && cap sync ios && cap open ios`. After any web
change, `npx cap sync ios` copies the new `dist/` into the app.

## Without a Mac (Windows + Sideloadly)

1. GitHub → **Actions → ios → Run workflow** (the button appears once `main`
   is the default branch; every push to `main` that changes the app
   starts it too). It builds an unsigned `reel-rail.ipa` on a GitHub Mac (~10 min); download
   it from the run's **Artifacts**. On a private repo macOS minutes count ten
   times against the free allowance — start it by hand, not on every push.
2. On the Windows PC: install iTunes and iCloud from Apple's website (not the
   Microsoft Store), then [Sideloadly](https://sideloadly.io).
3. iPhone on the cable, drag the `.ipa` into Sideloadly, sign in with an
   Apple ID (a free one is fine), Start.
4. On the iPhone: *Settings → Privacy & Security → Developer Mode* on
   (restart), then *Settings → General → VPN & Device Management* → trust your
   Apple ID.
5. A free Apple ID's signature lasts **7 days**: then sideload again (the
   ratings stay — they live in the app's storage). A paid developer account
   makes it a year, or use TestFlight.

## What is where

```
capacitor.config.ts                 app id app.reelrail, web dir dist/
ios/App/App/PhotoLibraryPlugin.swift  requestAccess, listAssets, exportAsset, deleteAssets
ios/App/App/MainViewController.swift  registers the plugin (set in Main.storyboard)
ios/App/App/Info.plist              Photos usage texts (shown in the permission prompt)
src/native/photoLibrary.ts          the JS side: PhotoLibrary, isNativeApp(), assetFile()
src/native/photosSource.ts          PhotosSource: the library as a Source ("Open my Photos" on the start screen)
.github/workflows/ios.yml           unsigned .ipa on GitHub's Macs
```

## The Photos source

"Open my Photos" (start screen, app only) → `openPhotos()` → `PhotosSource`:

- `list()` from `listAssets` — instant, nothing copied. Each file carries
  `known` (id, capture time, GPS), so the scan reads no bytes at all.
- `getFile()` from `exportAsset` — one original, when it is shown; the last
  few stay in memory (the top card is shown as a thumbnail and an original).
- **Identity, decided 2026-11-11:** the Photos id (`ph-…`), not the content
  hash — hashing needs every original copied out first. The cost: the same
  photo on the computer is another item. Nothing pays that today, the app has
  no rating sync (Free tier, below). Revisit if sync comes to the app: then
  hash natively in Swift while streaming.
- Read-only (`kind: "files"`): a discard is hidden after its countdown, never
  deleted from Photos, and a trimmed video is handed to the share sheet
  ("Save Video"). **Next:** deleting into Recently Deleted via `deleteAssets`
  — behind the edit-or-leave question (hard rule 1), batched so iOS asks once
  per batch rather than once per photo.

## Paying: on the web only, never in the app

Decided by Matthias (2026-10-21): **no Apple in-app purchases.** Pro is sold
on the web (Stripe, still to be wired). App Review guideline 3.1.3(b) lets an
app unlock what was bought elsewhere only if it is *also* sold as an in-app
purchase; and the app must not point users to a web checkout (outside the
US storefront; in the EU only with Apple's external-purchase-link terms and
their commission). So:

- **The native app is the Free tier.** No sign-in, no Pro, no prices, no
  links to buy (`accountsEnabled` is false in the app). Everything that makes
  the app worth having on an iPhone — fast import, deleting into Recently
  Deleted, trimming — is Free anyway.
- **Pro (rating sync) lives in the browser** — the web app on the computer,
  and the Home Screen web app on the iPhone, where Apple takes nothing.
- Revisit if Pro should reach the native app: then either an in-app purchase
  after all, or an EU/US external-purchase link under Apple's current terms.

## Untested

The Swift side has not run on a device yet. The GitHub build compiles it;
expect the first device run to need small fixes. LIVE CHECK: build, grant Photos access,
check `listAssets` from Safari's Web Inspector console:
`Capacitor.Plugins.PhotoLibrary.listAssets().then(r => r.assets.length)`.
