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

1. **Originals are never written, moved or deleted** — except the explicit,
   user-confirmed move into `_reel_trash/`. reel-rail writes only `.reel.json`
   (+ its temp file) into the source folder, and copies on export.
2. **`.reel.json` is the single source of truth.** New fields are optional so
   older files keep loading; a format change bumps `version` and `normalize()`
   refuses versions it does not know rather than guessing.
3. **No cloud, no backend, no network calls** at runtime.
4. **No new dependency without saying what it replaces and why the platform
   cannot do it.** Browser deps: react, zustand, exifr. Server: @vercel/functions
   (only for `next()` in the middleware). That is the list.
5. **No raw colors, radii or shadows in components or CSS rules** — tokens in
   `src/styles/tokens.css` only (dark is the default theme).
6. **Stay fast at 2,000+ media.** The carousel only mounts the cards around the
   current one and the waveform is one canvas; anything that
   renders per-medium must be O(visible), and per-change work at most O(n).
7. **Files ≤ 300 lines** (lint-enforced). Split by responsibility, not to dodge the rule.

## Where things live

```
src/fs/        file access: walk, hash, EXIF/video metadata, .reel.json, thumbnails, export
src/store/     zustand stores (useReel = data, useUi = screens/dialogs), filters, stacks, autosave
src/carousel/  the 3D carousel: pure layout (tested) + cards
src/timeline/  the waveform timeline: pure model (tested) + canvas
src/cleanup/   the "Unusable" view (move to _reel_trash)
src/series/    title suggestion/dice (pure, tested), create/list dialogs, export hook
src/ui/        screens, preview, info bar, top bar, keyboard, dialogs
scripts/       verify gate, e2e smoke test, icon renderer
middleware.ts  Vercel password gate (REEL_PASSWORD) — server side, never shipped to the browser
docs/          TRAPS.md (code that misleads), diary/ (what was decided)
```

Pure logic gets a `*.test.ts` next to it. Browser behaviour gets a step in
`scripts/e2e.mjs` — jsdom cannot see the File System Access API.

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
