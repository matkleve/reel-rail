# Design system

reel-rail is a tool for looking at photos. Every rule here serves that:
**the photo is the loudest thing on screen, the chrome is quiet and warm,
and every action is one key or one click away.**

The look is **"Sand"** (chosen by the user 2026-11, replacing neutral black
with hairlines): cream, terracotta, round shapes, photos framed like prints.
The dark theme is **"Glut"**: the same shapes in warm espresso.

## Principles

1. **Photos first.** The chrome is warm but low in saturation (cream,
   espresso), so a photo's own colours still read true. Strong colour is kept
   for meaning: the four ratings, and terracotta (`--accent`) for the brand,
   "you are here" and the active tab.
2. **Prints, not lines.** Every photo sits in a frame (`--frame`, white in
   Sand) like a print; neighbours lie a little askew. Shapes are told apart
   by fill and soft shadow — no hairlines, no borders between areas. Controls
   are pills and circles (`--radius-full`); nothing in the chrome has a square
   corner.
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
timeline) → `--surface-2` (popovers, dialogs) → `--surface-3` (hover,
inputs). Floating controls (dock, toasts, hints) use `--glass` with a blur.

**Text:** `--text` for content, `--text-2` for secondary text, `--text-3`
for hints and meta. Never use opacity to make text quieter.

**Meaning colours** (each has a `-soft` tint for backgrounds):

| Token | Means |
| --- | --- |
| `--accent` (amber) | top shots, current position, brand |
| `--select` (blue) | selection, focus |
| `--pick` (green) | in the picks folder |
| `--danger` (red) | discard, destructive |
| `--rating-m2 … --rating-2` | red → orange → neutral → green → gold, the five levels |
| `--tag-0 … --tag-8` | tags, equal lightness so no tag shouts; presets keep their slot |

**Type:** Nunito Variable for everything (round, friendly at small sizes)
and Fraunces Variable (`--font-display`) for dates and titles — the caption
on a print. Both bundled, so they work offline. 13 px base;
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
┌ header 52px — brand · folder ▾ · Sort|Timeline │ All | Good+ | Top · Filter │ saved · Picks · Series · Deleted · theme · keys ┐
│ Sort:     the swipe deck, centred, at most 560 px wide; round buttons under it; no timeline                                 │
│ Timeline: date/place (top left) · hints · count (top right)                                                                  │
│           the flat strip, cards on one centre line between the date and the dock                                            │
│           dock: [rating ×5] │ [tags] │ [pick]          (+ selection bar above it when something is selected)               │
└ timeline 112px (Timeline only) — day labels, legend, stacked bars, cursor ─────────────────────────────────────────────────┘
```

**The rating is never size or position.** It is a chip on the card
(`.card-rating`), a stamp on the deck, a colour in the bars — the same words
(Top, Good, Bad, Delete) and colours (`--rating-*`) everywhere. Until
2026-11 it was size and height in a 3D carousel; a "bad" shot shrunk and sunk
was too small to judge as the filler it may need to be.

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
- Safe-area insets pad the header and the timeline (the tab bar on a phone) in the home-screen app.

## Discards

A discard (Delete) is greyed, with a red bar that runs out. The current one
also gets the **leaving bar** above the dock — "Leaves in 26 s · Keep". Countdowns are CSS animations started
from the time left at render: no timer per card.

## The swipe deck (Sort)

`src/swipe/`, `src/styles/deck.css`. The phone starts here; a bigger screen
switches to it in the header.

- One card at a time, the whole photo (contain) over a blurred copy of itself.
  The next card waits underneath and grows into place as the top one is thrown.
- **Throw = decision:** ↑ Top, → Good, ← Bad (stays as a filler), ↓ Delete.
  A stamp (TOP / GOOD / BAD / DELETE, in the rating colours) fades in as the
  card leans. A short fast flick counts too (`deckGesture.ts`, tested). The
  arrow keys throw the same way; Z takes the last throw back.
- Round buttons under the deck: undo, Delete (trash), Bad (✕, big), Top (★), Good (♥,
  big). Pick, tags and — for a trimmable video — the scissors sit on the
  card, top right.
- After each throw a note says what happened, with **Undo**; a delete says
  when it leaves.
- On the photo: date and time, the place field, tags. Colours there come from
  `--on-photo*` and `--photo-scrim`, the same in both themes — the photo is
  not lighter because the chrome is.

## Phone (≤ 600 px)

- Two tabs at the thumb: **Sort** and **Timeline**. Sorting has no timeline
  row; the Timeline tab shows the strip, the dock and 72 px of bars.
- Header: logo, library menu (icon), then Share/Picks, Series, Deleted and
  **⋯** (rating filter, filter panel, theme).
- Popovers cap their height to the screen and scroll.

## Rules

- No raw colour, radius, shadow or duration in a component or CSS rule:
  add a token first.
- Logo (`src/ui/Logo.tsx`, `public/icon.svg`): the top pick — a print with a
  star on top of the pile, on terracotta. The user's pick of three (2026-11-12).
  Colours from the `--logo-*` tokens, the same in both themes. After editing
  `public/icon.svg` run `node scripts/make-icons.mjs`: it writes the web icons,
  the iPhone app icon and the launch splash.
- Icons: `lucide-react`, 14–18 px, stroke 2. No emoji or Unicode symbols as
  icons.
- New controls go into `src/ui/kit/` once a second place needs them.
- Check both themes. The light theme is not an afterthought:
  `docs/TRAPS.md` has two entries that only showed up there.
