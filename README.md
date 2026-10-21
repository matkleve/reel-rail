# reel-rail

Sort, rate and bundle hundreds of travel photos and videos a day — on a
timeline, with the keyboard, entirely on your own computer.

- **No cloud, no backend, no upload.** reel-rail reads a folder on your disk
  through the browser's File System Access API.
- **Your originals are never changed.** All decisions live in one file,
  `.reel.json`, inside the folder.
- **Installable** as an app (PWA) and works offline.

Runs in **Chrome or Edge on a desktop computer** (Windows, macOS, Linux,
ChromeOS). For iPad, see [below](#ipad).

---

## Setup

Requires Node.js 22+.

```bash
npm install
npm run dev        # → http://localhost:5173  (open in Chrome or Edge)
```

Click **Open folder**, pick the folder with your trip's photos/videos (sub-folders
are included), and allow read/write access. The next time, one click on
**Continue with "…"** is enough.

To use it as an installed app:

```bash
npm run build
npm run preview    # → http://localhost:4173, then "Install" in the address bar
```

Other commands:

```bash
npm test           # unit tests
npm run e2e        # end-to-end test in real Chromium (needs a build)
npm run verify     # everything: typecheck, lint, tests, build, e2e
```

---

## How it works

The screen has three parts: the **preview** of the current item on top, a
thin **info bar** (date, place, path, rating, selection), and the **timeline**
in the lower third.

On the timeline every photo/video sits on a line in the order it was taken.
**Its size is its rating:**

| Rating | Size | Looks like |
| --- | --- | --- |
| −1 unusable | 16 px | tiny, faded, slips *below* the line |
| 0 neutral | 56 px | stands on the line |
| 1 like | 80 px | bigger |
| 2 top | 110 px | biggest, with a star |

Day markers show date and place; pauses longer than 3 hours get visibly more
room. Videos have a play icon; exported items get a small green check.

**Series:** select items (Shift + ←/→, Ctrl/⌘ + click), press **S**. The
suggested title is built from place + most common tag + month ("Porto – Tram –
Oct 26"); the dice button rolls a silly alternative. A series is first only
saved in `.reel.json`. **Export…** asks for a target folder, creates a
sub-folder named after the title and copies the files in order as `01_…`,
`02_…`. Every exported item remembers it in `exportedTo`.

**Filters** (top bar): All / ≥ Like / Top / Hide unusable, and "Never
exported". Filtered items stay on the timeline greyed out so you keep your
bearings; arrow keys skip them.

**Place:** there is no reverse geocoding (that would need the internet). Type
a place in the info bar (or press **P**); with a selection it applies to all
selected items. Until then, a telling folder name (e.g. `Porto/`) is used for
title suggestions.

### Keyboard shortcuts

Press **?** in the app for this list.

| Key | Action |
| --- | --- |
| ← / → | Previous / next medium (skips filtered ones) |
| ↑ | Rating +1 (max: top) |
| ↓ | Rating −1 (min: unusable) |
| Space | Play / pause video |
| Shift + ← / → | Extend selection |
| Ctrl/⌘ + click | Add / remove a single item |
| Shift + click | Select range |
| Esc | Clear selection |
| Z | Undo last rating |
| S | Create series from selection |
| P | Edit place (applies to selection) |
| Home / End | First / last medium |
| ? | Show / hide shortcuts |

With a selection, ↑/↓ rate all selected items at once (one undo step).

---

## `.reel.json`

One JSON file in the root of the opened folder. It is the single source of
truth; delete it and reel-rail starts from scratch (your photos are untouched
either way).

```ts
type ReelFile = {
  version: 1;
  media: Record<string, Media>;   // keyed by Media.id
  series: Series[];
  tagPresets: string[];           // keys 1–9 (phase 2)
};

type Media = {
  id: string;            // SHA-256 of (first 1 MB + last 1 MB + file size)
  path: string;          // relative path inside the folder, "/"-separated
  type: "photo" | "video";
  takenAt: string;       // ISO time: EXIF (photos) / mvhd atom (videos) / file date
  gps?: { lat: number; lng: number };
  place?: string;        // free text
  rating: -1 | 0 | 1 | 2;
  tags: string[];
  stackId?: string;      // burst group (phase 2)
  exportedTo: { series: string; at: string }[];  // series = Series.id
  // bookkeeping, all optional:
  size?: number;         // bytes — with mtime, lets a re-open skip re-hashing
  mtime?: number;        // file.lastModified at the last scan
  missing?: boolean;     // file not found on the last scan (kept, not deleted)
  altPaths?: string[];   // byte-identical duplicates found at other paths
};

type Series = {
  id: string;
  title: string;
  mediaIds: string[];    // in timeline order
  createdAt: string;
  exportedPath?: string; // "<target folder>/<series folder>" of the last export
};
```

- **Why the hash?** It identifies a file by content, so renaming or moving a
  file keeps its rating, and duplicates are recognised. Head + tail + size is
  fast even for multi-GB videos.
- **Re-opening a folder:** new files are added, vanished ones get
  `missing: true` (handy when an SD card is not plugged in), and everything
  else is matched back by hash.
- **Saving** happens 500 ms after the last change. It writes
  `.reel.tmp.json` first, then `.reel.json`, then removes the temp file; if a
  crash leaves `.reel.json` broken, the temp copy is used on the next start.

---

## iPad

**Today it does not run on iPad.** Every browser on iPadOS uses Apple's WebKit
engine, and WebKit does not offer the folder access (`showDirectoryPicker`)
that reel-rail is built on. Chrome or Edge on an iPad behave like Safari here.
You get the "open in Chrome or Edge on a computer" screen instead.

What an **iPad mode** would look like (about a day of work, plus the touch
gestures from phase 3):

1. **Host it** as a static site over HTTPS (Netlify, Cloudflare Pages or
   GitHub Pages; there is no server code). In Safari: Share → **Add to Home
   Screen**. That makes it a full-screen app, and Safari does not clear
   storage for home-screen apps.
2. **Import with the normal file picker** instead of a folder: "Choose files"
   lets your brother pick from **Photos** or **Files** (iCloud Drive, a USB-C
   SSD or SD-card reader, a network share), and multi-select works.
3. **Keep `.reel.json` in browser storage** (IndexedDB) instead of in the
   folder. Media are not copied: on the next session he picks the files again,
   and the content hash puts every rating back in place. This is exactly what
   the hash design is good for.
4. **Export via the share sheet** (`navigator.share` with files): "Save to
   Files", "Save Images" to Photos, AirDrop, or straight into Instagram. Files
   keep the `01_`, `02_` order prefixes.
5. **Touch:** swipe up/down to rate, left/right to move, long-press to select.
   With a Magic Keyboard, all shortcuts above work as they are.
6. **Sync with the desktop** by exporting/importing the review file (for
   example through iCloud Drive).

Caveats: photos picked from the Photos app may be converted from HEIC to JPEG
(then their hash differs from the original on the Mac), and the picker can
strip location data if "Location" is switched off in its options. Picking from
**Files** passes the originals through unchanged.

The alternative is a native wrapper (e.g. Capacitor) with real file access.
That works, but it needs an Apple developer account and App Store/TestFlight
distribution.

---

## Project layout

```
src/fs/        file access: walk, hash, EXIF/video metadata, .reel.json, thumbnails, export
src/store/     zustand stores, filters, autosave
src/timeline/  the rail: pure layout, virtualised view, items, markers
src/series/    title suggestion + dice, series dialogs, export
src/ui/        screens, preview, info bar, top bar, keyboard, dialogs
scripts/       verify gate, e2e test, icon renderer
docs/          TRAPS.md, diary/
```

Rules for contributors (human or agent): [`AGENTS.md`](AGENTS.md).
