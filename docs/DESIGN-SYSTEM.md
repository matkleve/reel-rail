# Design system

reel-rail is a tool for looking at photos. Every rule here serves that:
**the photo is the loudest thing on screen, the chrome is quiet and neutral,
and every action is one key or one click away.**

## Principles

1. **Photos first.** Chrome is pure neutral grey (zero saturation), so it
   never shifts how colours in a photo read. Warm colour (amber) appears in
   one role only: favourites and "you are here".
2. **Spotlight, not frames.** The current item is marked by light (it is lit,
   neighbours dim with distance) and depth (a deeper shadow, a hairline ring).
   It has no thick coloured border.
3. **The mouse teaches the keyboard.** Every action is a visible control,
   and every control's tooltip names its key. Nothing is keyboard-only.
4. **One control per concept.** Rating is one five-step control, not two
   arrows. Filters are a segmented choice plus one menu.
5. **Calm motion.** 120 ms for feedback, 200 ms for UI moves, 320 ms for
   entrances; a slight spring only where something physically grows (cards).

## Tokens — `src/styles/tokens.css`

Three layers. Components use only layer 2 and 3.

| Layer | Examples | Rule |
| --- | --- | --- |
| 1 Primitives | `--gray-0…11`, `--amber-4`, `--blue-4` | never referenced by components |
| 2 Semantic | `--surface-1/2/3`, `--text`, `--text-2/3`, `--border`, `--accent`, `--select`, `--pick`, `--danger`, `--rating-*`, `--tag-0…8` | what a value *means*; the light theme redefines only this layer |
| 3 Scales | `--text-xs…3xl`, `--space-1…12`, `--radius-xs…xl`, `--shadow-1…3`, `--dur-1…3`, `--ease-*` | all sizes come from here |

**Surfaces:** `--bg-stage` (darkest, behind photos) → `--surface-1` (header,
waveform) → `--surface-2` (popovers, dialogs) → `--surface-3` (hover,
inputs). Floating controls (dock, toasts, hints) use `--glass` with a blur.

**Text:** `--text` for content, `--text-2` for secondary text, `--text-3`
for hints and meta. Never use opacity to make text quieter.

**Meaning colours** (each has a `-soft` tint for backgrounds):

| Token | Means |
| --- | --- |
| `--accent` (amber) | favourite, current position, brand |
| `--select` (blue) | selection, focus |
| `--pick` (green) | in the picks folder |
| `--danger` (red) | discard, destructive |
| `--rating-m2 … --rating-2` | red → orange → neutral → green → gold, the five levels |
| `--tag-0 … --tag-8` | tags, equal lightness so no tag shouts; presets keep their slot |

**Type:** Inter Variable (bundled, so it works offline). 13 px base;
`--text-xl` 20 px for the stage date; `--text-3xl` 48 px only on the start
screen. Numbers that change (counters) use `.tabular`.

## Components — `src/ui/kit/`

| Component | Use |
| --- | --- |
| `Button` | the only button. Variants: `primary` (neutral, high contrast; one per view), `secondary`, `ghost` (default), `accent`, `danger`. Sizes `sm`/`md`/`lg`. Icon-only buttons require `label` and get a tooltip (with `kbd`) for free |
| `Tip` | CSS tooltip with optional keycap. Shows on hover (after 350 ms) and on keyboard focus |
| `Kbd` | a keycap |
| `Segmented` | one choice out of 2–5 visible options |
| `Switch` | an on/off row in menus and settings |
| `Popover` | menus and panels, on the native popover API. Positioned to its trigger, opens `below` or `above` |
| `Dialog` | native `<dialog>`. Fixed layout: head (title, subtitle, close), body, footer. Put `data-autofocus` on the field the dialog is about |

App-level patterns: `.tag` chips (colour from `tagStyle()`), `.dock`
(floating glass toolbar), `.empty-state`, `.progress`, `.toast`.

Every interactive element has all five states: default, hover, active
(scale 0.97), focus-visible (`--focus` ring), disabled (40 % opacity).

## Layout

```
┌ header 52px — brand · folder ▾ │ All | Good+ | Favorites · Filter │ saved · Picks · Series · Discards · theme · keys ┐
│ stage — date/place (top left) · hints (top centre) · count (top right)                                               │
│         carousel on the floor (80 % height)                                                                          │
│         dock: [rating ×5] │ [tags] │ [pick]          (+ selection bar above it when something is selected)          │
└ waveform 112px — days, tag-coloured waves, cursor ───────────────────────────────────────────────────────────────────┘
```

## Touch

`src/styles/responsive.css` holds every touch and small-screen override.

- `(pointer: coarse)`: controls grow to 40 px, rating buttons to 46 px
  (Apple's 44 px minimum), the dock to 62 px.
- `(hover: none)`: tooltips are off — they would stick after a tap. So on
  touch an icon-only button must be self-explanatory or keep its label.
- Header labels collapse in two steps: minor ones (Filter, Saved) below
  1240 px, the rest below 1100 px. An 11" iPad in landscape keeps "Share
  picks", "Series" and "Discards" as words.
- The stage owns every gesture (`touch-action: none`); swipes give live
  feedback (the row follows the finger, a pill names the level you will land
  on) before they commit.
- Safe-area insets pad the header and the waveform in the home-screen app.

## Discards

A discard is the smallest card (20 % of a favourite's height), sunk below
the floor, with a red bar that runs out. The current one also gets the
**leaving bar** above the dock — "Leaves in 26 s · Keep" — because on a phone
the card itself is too small to read. Countdowns are CSS animations started
from the time left at render: no timer per card.

## Phone (≤ 600 px)

Rating on the go is the job; the photo gets the room.

- Header: logo, library menu (icon), then Share/Picks, Series, Discards and
  **⋯**. The rating filter, the filter panel and the theme live in ⋯, whose
  button shows the number of active filters.
- Dock: seven 42 px targets — five levels, tags, Pick (icon only). A video
  is paused by tapping it; the scissors sit on the playing video.
- Portrait carousel: cards live in the band between the date and the dock,
  **measured** (`src/carousel/useInsets.ts`), not guessed; the centre card may
  take 84 % of the width.
- Waveform 72 px, axis as icons, no tag legend. The file name is hidden.
- Popovers cap their height to the screen and scroll.

## Rules

- No raw colour, radius, shadow or duration in a component or CSS rule:
  add a token first.
- Icons: `lucide-react`, 14–18 px, stroke 2. No emoji or Unicode symbols as
  icons.
- New controls go into `src/ui/kit/` once a second place needs them.
- Check both themes. The light theme is not an afterthought:
  `docs/TRAPS.md` has two entries that only showed up there.
