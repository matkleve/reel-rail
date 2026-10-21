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

### Hosting (Vercel) with a password

The app is a static site. On Vercel, `middleware.ts` puts a password page in
front of it: set the environment variable **`REEL_PASSWORD`** in the Vercel
project and redeploy. After logging in, the browser remembers it for a year
(cookie). Changing the password logs everyone out. Without the variable the
site stays locked. Locally (`npm run dev`) there is no password.

---

## How it works

**The carousel.** Your photos and videos stand side by side on a slightly
tilted, reflective floor; the current one is big in the middle and plays
(videos start muted). **Its rating is its size and height:**

| Rating | What happens |
| --- | --- |
| 2 top | biggest, rises highest, star badge |
| 1 like | bigger, rises a little, tags show as chips below |
| 0 neutral | stands on the floor |
| −1 unusable | shrinks, fades and slides down below the floor |

Arrow keys, the mouse wheel or a two-finger swipe flip through the carousel.
Day changes show as a dashed separator with the date.

**The waveform** at the bottom is the whole trip as a "sound wave": it is
thick where you took many photos and thin where you took few. Liked shots are
coloured, top shots get a dot above the bar. Click or drag on it to jump
there; the mouse wheel / pinch zooms from the whole trip down to half an hour.
(Nights and long pauses are shortened so the busy parts get the room.)

**Picks — Space.** Press Space to copy the current item (or the selection)
into your **picks folder**, e.g. a "to post" or "Downloads" folder. You
choose it the first time; the button in the top bar shows it and lets you
change it. Press Space again to take the copy back out. Picked items get a
green ↓ badge.

**Tags.** Keys 1–9 toggle the nine tag presets (Food, People, Landscape, City,
Drone, Sunset, Selfie, Nature, Night — editable under ⚙). T opens a field for
a free tag with autocomplete. The "Tags" filter shows items with any of the
chosen tags.

**Bursts.** Shots less than 3 seconds apart are stacked into one card with a
counter. Enter opens the stack; the best-rated shot is its cover; X marks all
the others as unusable.

**Series.** Select items (Shift + ←/→, Ctrl/⌘ + click), press **S**. The
suggested title is built from place + most common tag + month ("Porto – Tram –
Oct 26"); the dice button rolls a silly alternative. **Export…** copies the
files in order as `01_…`, `02_…` into a new folder named after the title.

**Filters** (top bar): All / ≥ Like / Top / Hide unusable, "Never exported",
and tags. Filtered items stay in place, greyed out, and arrow keys skip them.

**Unusable** (top bar) shows everything rated −1 as a grid with its total
size. Click a tile to keep it. "Move to trash folder" moves the files into
`_reel_trash/` inside your folder. Nothing is deleted, and moving a file back
brings it back with its rating.

**Place:** there is no reverse geocoding (that would need the internet). Type
a place in the info bar (or press **P**). With a selection it applies to all
selected items. Until then, a telling folder name (e.g. `Porto/`) is used for
title suggestions.

### Keyboard shortcuts

Press **?** in the app for this list.

| Key | Action |
| --- | --- |
| ← / → | Previous / next (skips filtered ones) |
| ↑ / ↓ | Rating +1 / −1 |
| Space | Pick: copy to the picks folder (again: take it back) |
| V / M | Video play/pause / sound on/off |
| Shift + ← / → | Extend selection |
| Ctrl/⌘ + click, Shift + click | Add single item / range to selection |
| Esc | Clear selection |
| Z | Undo last rating |
| 1 – 9 | Toggle tag preset |
| T | Free tag |
| P | Edit place |
| Enter | Open / close a burst |
| X | In an open burst: all but the best → unusable |
| S | Create series from selection |
| + / − / 0 | Zoom the waveform in / out / whole trip |
| Home / End | First / last |
| ? | Show / hide shortcuts |

With a selection, ↑/↓, 1–9, T, P and Space apply to all selected items.

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
  exportedTo: { series: string; at: string; path?: string }[];
                         // series = Series.id, or "picks" for the Space-key copy
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
5. **Touch:** swipe up/down to rate, left/right to move, long-press to select;
   the waveform already works with a finger.
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
src/fs/        file access: walk, hash, EXIF/video metadata, .reel.json, thumbnails, export, picks, trash
src/store/     zustand stores, filters, stacks, autosave, actions
src/carousel/  the 3D carousel: pure layout (tested), cards, original/video
src/timeline/  the waveform: pure model (tested), canvas drawing, component
src/series/    title suggestion + dice, series dialogs, export
src/cleanup/   the "Unusable" view
src/ui/        start screen, info bar, top bar, tags, keyboard, dialogs
middleware.ts  password gate when hosted on Vercel
scripts/       verify gate, e2e test, icon renderer
docs/          TRAPS.md, diary/
```

Rules for contributors (human or agent): [`AGENTS.md`](AGENTS.md).
