# The native iPhone/iPad app (Capacitor)

**Status: prepared, not built yet.** The Xcode project (`ios/`) and the Photos
plugin are in the repo; building needs a Mac. Nothing in the web app changes:
in a browser `isNativeApp()` is false and the plugin is never called.

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

## What is where

```
capacitor.config.ts                 app id app.reelrail, web dir dist/
ios/App/App/PhotoLibraryPlugin.swift  requestAccess, listAssets, exportAsset, deleteAssets
ios/App/App/MainViewController.swift  registers the plugin (set in Main.storyboard)
ios/App/App/Info.plist              Photos usage texts (shown in the permission prompt)
src/native/photoLibrary.ts          the JS side: PhotoLibrary, isNativeApp(), assetFile()
```

## Next step: a Photos source

The app still opens photos through the file picker today. The next piece is a
`PhotosSource` (beside `FolderSource` / `FilesSource` in `src/fs/`):

- `list()` from `listAssets` — instant, no copying.
- `getFile()` from `exportAsset` — one original, on demand.
- Recently Deleted → `deleteAssets` when a discard's countdown runs out
  (one confirmation per batch from iOS — batch them, e.g. when leaving the
  app, rather than one prompt per photo).
- **Open decision:** identity. Today an item is known by a hash of its
  first + last MB + size, which is what matches the same photo on the
  computer (and rating sync). Computing it needs the bytes — fine for photos,
  slow for long videos. Options: hash natively in Swift while streaming
  (no copy into the web view), or key by the Photos id and match by hash
  lazily. Decide before building.

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

Nothing here has been compiled — this environment has no Xcode. Expect the
first build to need small fixes. LIVE CHECK: build, grant Photos access,
check `listAssets` from Safari's Web Inspector console:
`Capacitor.Plugins.PhotoLibrary.listAssets().then(r => r.assets.length)`.
