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

## Paying inside an iPhone app

Apple requires **In-App Purchase** for digital subscriptions sold inside an
iOS app (Apple takes 15–30 %). A subscription bought on the web
(Stripe) can be honoured in the app after sign-in; the app itself may not
link to the web checkout in every country. Plan the price with that in mind
(UC-006).

## Untested

Nothing here has been compiled — this environment has no Xcode. Expect the
first build to need small fixes. LIVE CHECK: build, grant Photos access,
check `listAssets` from Safari's Web Inspector console:
`Capacitor.Plugins.PhotoLibrary.listAssets().then(r => r.assets.length)`.
