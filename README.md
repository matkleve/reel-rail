# reel-rail

Sort, rate and bundle hundreds of travel photos and videos a day — on a
timeline, with the keyboard, entirely on your own computer.

- **No cloud, no backend, no upload.** reel-rail reads a folder on your disk
  through the browser's File System Access API.
- **Your originals are never changed.** All decisions live in one file,
  `.reel.json`, inside the folder.
- **Installable** as an app (PWA) and works offline.

Best in **Chrome or Edge on a computer** (folder mode). On an **iPad**, in
Safari, Firefox or Brave it runs in [files mode](#ipad-safari-firefox-brave--files-mode).

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
npm run e2e:ipad   # files mode on iPad-sized touch viewports (needs a build)
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
tilted, reflective floor. The current one is big, in the middle and lit;
its neighbours dim with distance. Videos start playing muted. **Its rating
is its size and height:**

| Rating | What happens |
| --- | --- |
| 2 Favorite | biggest, rises highest, star badge |
| 1 Good | bigger, rises a little, tags show as chips below |
| 0 Normal | stands on the floor |
| −1 Not great | smaller, slides a little down |
| −2 Discard | small, faded, sunk below the floor |

Arrow keys, the mouse wheel or a two-finger swipe flip through the carousel.
Day changes show as a separator with the date.

**The dock** floats under the photo: the five rating levels (click one),
tags, and Pick. With a selection, a bar above it offers "Create series".
Every button's tooltip shows its keyboard shortcut. Date, time and place sit
at the top left; click the place (or press P) to type one.

**The waveform** at the bottom is the whole trip as glowing waves:

- **Thickness** = how many photos/videos you took at that moment.
- **Height** = how good they are: the wave rises above the middle line where
  the shots are good and dips below it where they are weak. A thin bright
  line traces the overall quality.
- **Colour** = tag: every tag has its own wave in its own colour (legend
  bottom right); untagged media form a neutral blue glow.
- Every photo is a small spark at its own rating height.

Click or drag on it to jump there; the mouse wheel / pinch zooms from the
whole trip down to half an hour. (Nights and long pauses are shortened so the
busy parts get the room.)

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
the others as discards.

**Series.** Select items (Shift + ←/→, Ctrl/⌘ + click), press **S**. The
suggested title is built from place + most common tag + month ("Porto – Tram –
Oct 26"); the dice button rolls a silly alternative. **Export…** copies the
files in order as `01_…`, `02_…` into a new folder named after the title.

**Filters** (top bar): All / ≥ Good / Favorites / Hide discards, "Never exported",
and tags. Filtered items stay in place, greyed out, and arrow keys skip them.

**Discards** (top bar) shows everything rated −2 as a grid with its total
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
| ↑ / ↓ | Better / worse (five levels) |
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
| X | In an open burst: all but the best → discard |
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
  version: 2;                     // v1 files are migrated: −1 "unusable" → −2
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
  rating: -2 | -1 | 0 | 1 | 2;  // discard, not great, normal, good, favorite
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

## iPad, Safari, Firefox, Brave — files mode

Folder mode (above) needs Chrome or Edge on a computer. **Everywhere else
reel-rail switches to files mode by itself:** iPad and iPhone (every browser
there is Safari underneath), Safari on the Mac, Firefox, and Brave (which
turns folder access off by default).

**On the iPad:**

1. Open **https://reel-rail.vercel.app** in Safari, log in, then Share →
   **Add to Home Screen**. From then on it opens full-screen like an app (log
   in once more inside the app — home-screen apps keep their own cookies).
2. Tap **Add photos & videos** → Photo Library (or Choose File for the Files
   app, an SD-card reader or a USB-C drive). Select an album → Select all.
3. **Swipe** left/right to browse, **swipe up/down** to rate (a label shows
   the level you will land on), **press and hold** a photo to select it. The
   dock buttons do the same by tap; a Magic Keyboard runs all shortcuts.
4. **Pick** the keepers, then **Share picks** in the header: the share sheet
   offers Save to Photos, Save to Files, AirDrop, Instagram…
   A series is shared the same way, numbered `01_…`, `02_…`.
5. Ratings, tags, picks and series are saved **on the device**. Next time,
   add the same photos again and everything comes back (matched by content
   hash) — the start screen says how many rated items it remembers.

**What is different from folder mode:** the browser only lends files for one
session and cannot write to them, so there is no `.reel.json` next to the
photos, no picks *folder* (share instead), and "Discards" is a checklist —
delete those in the Photos app. On desktop Safari/Firefox/Brave you can also
add a whole folder (read-only). Try files mode in Chrome with
`?mode=files` in the address.

Caveats: the Photos picker may convert HEIC to JPEG ("Options → Most
Compatible"), and then a photo's hash differs from the original on the Mac;
picking from **Files** passes originals through unchanged. Switch
"Location" on in the picker's options to keep GPS.

---

## Project layout

```
src/fs/        file access: sources (folder / picked files), hash, EXIF/video metadata, .reel.json, thumbnails, share, export, picks, trash
src/store/     zustand stores, filters, stacks, autosave, actions
src/carousel/  the 3D carousel: pure layout + gestures (tested), cards, swipe, original/video
src/timeline/  the waveform: pure model (tested), canvas drawing, component
src/series/    title suggestion + dice, series dialogs, export
src/cleanup/   the "Discards" view
src/ui/kit/    design-system components (see docs/DESIGN-SYSTEM.md)
src/ui/        header, stage overlay, dock, start screen, help, settings, keyboard
middleware.ts  password gate when hosted on Vercel
scripts/       verify gate, e2e test, icon renderer
docs/          TRAPS.md, diary/
```

Rules for contributors (human or agent): [`AGENTS.md`](AGENTS.md).
