# AGENTS.md

**reel-rail** — local-first PWA to sort, rate and bundle travel photos/videos
on a timeline. Vite · React 19 · TypeScript · Zustand · File System Access API.
Process and conventions adapted from the `grundriss` base project.

Keep this file short; detail lives in `README.md` and `docs/`.

## Commands

```bash
npm run dev       # dev server, http://localhost:5173
npm run verify    # the gate: typecheck, lint, unit tests, build, e2e (real Chromium)
```

Never report work as done without a green `verify`. Re-run one check alone:
`node scripts/verify.mjs e2e`.

## Hard rules

1. **Originals change only the way the user chose for the folder.** A new
   folder asks once: *edit it* or *leave it and export the result*
   (`workflow` in `.reel.json`). Edited: a discard leaves the folder when its
   ~30 s countdown runs out (moved to `_reel_trash/`), a trimmed video
   replaces its original (which goes to `_reel_trash/` too), and what waited
   30 days in `_reel_trash/` is deleted for good. Left as it is: nothing in
   the folder is written, moved or deleted. Deleting for good happens only in
   `src/store/discards.ts`, only to paths reel-rail itself created in
   `_reel_trash/`, re-checked right before each file. Otherwise reel-rail
   writes only `.reel.json` (+ its temp file) and copies on export / picks.
2. **`.reel.json` is the single source of truth.** New fields are optional so
   older files keep loading; a format change bumps `version` and `normalize()`
   refuses versions it does not know rather than guessing.
3. **Media never leaves the device.** The only network calls are to Supabase
   for the account (sign-in, "is my subscription active?") — through
   `src/account/` only, and only when the env vars are set
   ([`docs/adr/0001`](docs/adr/0001-accounts-and-subscriptions-on-supabase.md)).
4. **No new dependency without saying what it replaces and why the platform
   cannot do it.** Browser deps: react, zustand, exifr, lucide-react (icons —
   tree-shaken, a consistent set beats hand-drawn SVGs), @fontsource-variable/inter
   (bundled typeface, so it works offline), mediabunny (lossless MP4/MOV
   trimming — the platform has no muxer; loaded only when someone trims),
   @supabase/supabase-js (accounts; loaded only when someone signs in).
   Server: @vercel/functions (only for `next()` in the middleware). That is
   the list.
5. **Design system first:** [`docs/DESIGN-SYSTEM.md`](docs/DESIGN-SYSTEM.md).
   No raw colors, radii, shadows or durations in components or CSS rules —
   tokens in `src/styles/tokens.css` only. Buttons, tooltips, popovers and
   dialogs come from `src/ui/kit/`. Check both themes.
6. **Stay fast at 2,000+ media.** The carousel only mounts the cards around the
   current one and the waveform is one canvas; anything that
   renders per-medium must be O(visible), and per-change work at most O(n).
7. **Files ≤ 300 lines** (lint-enforced). Split by responsibility, not to dodge the rule.

## Where things live

```
src/fs/        file access: Source (FolderSource | FilesSource), hash, metadata, .reel.json, thumbnails, share, export
src/store/     zustand stores (useReel = data, useUi = screens/dialogs), filters, stacks, autosave
src/carousel/  the 3D carousel: pure layout + gesture classifier (tested), cards, swipe hook
src/timeline/  the waveform timeline: pure model (tested) + canvas
src/cleanup/   "Recently deleted" (bring back, delete now)
src/account/   the Supabase adapter: sign-in, subscription (nothing else talks to Supabase)
supabase/      migrations (schema + row-level security) and the policy checklist
src/trim/      the video trim dialog (filmstrip, handles, preview)
src/series/    title suggestion/dice (pure, tested), create/list dialogs, export hook
src/ui/kit/    design-system components: Button, Tip, Kbd, Segmented, Switch, Popover, Dialog
src/ui/        header, stage overlay, dock, start screen, help, settings, keyboard
scripts/       verify gate, e2e smoke test, icon renderer
middleware.ts  Vercel password gate (REEL_PASSWORD) — server side, never shipped to the browser
docs/          use-cases/ (what people want — start here), adr/ (big decisions),
               TRAPS.md (code that misleads), diary/ (what was decided)
```

Pure logic gets a `*.test.ts` next to it. Browser behaviour gets a step in
`scripts/e2e.mjs` (folder mode) or `scripts/e2e-ipad.mjs` (files mode, touch,
iPad viewports) — jsdom cannot see the File System Access API.

**Two modes, one app.** Folder mode (Chrome/Edge desktop) can write; files
mode (iPad, Safari, Firefox, Brave) is read-only and shares instead. Anything
that touches files goes through `getSource()`; anything only a folder can do
checks `sourceKind` and offers the files-mode alternative.

## Code style

- Imports use the `@/` alias (`src/`).
- Copy (UI text) is English.
- Comment the **why**. A comment that records a rejected alternative is what
  stops the next agent from reintroducing the bug.
- Conventional Commits: `feat:`, `fix:`, `docs:`, `refactor:`, `chore:`.

## Working with the user

When the user corrects you, fix the code and note it in today's
`docs/diary/` entry; a code trap goes to `docs/TRAPS.md`.

**Automated gates do not prove everything.** For things only a real disk and a
real picker show (permission prompts, HEIC, big videos), end with a
`LIVE CHECK (you)` list of steps to click.
