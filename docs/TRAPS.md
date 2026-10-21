# Traps

Bugs that looked correct. Read the relevant entry **before your second attempt**
at a fix. Format: what looked right, what was true, the check that catches it.
Newest at the top. (Format from grundriss.)

---

## Mouse drags in tests produce clicks; finger swipes do not

**Looked right:** after a swipe, a flag swallows the click that ends on a
card; e2e swipes (mouse drags) all green.

**Was true:** browsers synthesise `click` only for taps. A finger swipe ends
with no click, so the flag stayed armed and ate the *next* tap — on an iPad,
swipe then tap a neighbour did nothing. Mouse drags always produce a click,
so the test could not see it. Found by the fresh-context review.

**The check:** reset per gesture (on pointerdown), and test with touch
pointer events that have no click: `scripts/e2e-ipad.mjs` dispatches a
`pointerType: "touch"` swipe, then taps.

## A swipe that starts on an <img> never ends

**Looked right:** pointerdown/move/up listeners on the stage; tests of the
gesture maths green.

**Was true:** the centre card's full-size `<img>` was draggable. The browser
started a native image drag on the first move and cancelled the pointer
stream — no pointerup ever arrived, so nothing happened. Thumbnails had
`draggable={false}`; the original did not.

**The check:** `draggable={false}` + `-webkit-user-drag: none` on stage
images and `dragstart` prevented on the stage; `scripts/e2e-ipad.mjs` swipes
starting on the centre card.

## A canvas reads colour tokens before the theme attribute is set

**Looked right:** the waveform redraws when `theme` changes, reading its
colours from CSS custom properties.

**Was true:** React runs child effects before parent effects. The App set
`data-theme` in a `useEffect`, so the waveform (a child) redrew with the *old*
theme's tokens — a white line on the light theme.

**The check:** set `data-theme` in a `useLayoutEffect` (runs before all
passive effects); look at a light-theme screenshot, not just the dark one.

## Re-setting state from a local variable silently drops derived fields

**Looked right:** `openFolder` called `load(reel)` (which derives burst
`stackId`s into the media) and then `setState({ reel: { ...reel } })` to kick
off the first save.

**Was true:** `reel` was the *scan result*, not the store's reel. The second
call overwrote the derived `stackId`s, and the first save wrote a file without
them. Everything on screen still looked right because stacks are recomputed in
memory.

**The check:** derive from the store (`setState((s) => …s.reel)`), and assert
the *saved file* in e2e, not just the screen (`burst stackId not saved`).

## A button that changes type during its own click submits the form

**Looked right:** "Create & export…" is `type="button"`, so clicking it cannot
submit the series form.

**Was true:** the click handler set state that swapped the footer for one with
a `type="submit"` "Done" button in the same position. React flushes discrete
events synchronously and *reused the clicked DOM element* for the new button;
the browser then ran the submit default action on it, and the dialog closed
mid-export — with the export itself succeeding, which made it look random.

**The check:** distinct `key`s on the alternative footers, and actions that
must not submit are `onClick` on `type="button"`. Covered by `scripts/e2e.mjs`
(series step).

## A field that remounts per item re-runs its "focus me" effect

**Looked right:** the place field selects itself when the `placeFocus` counter
changes (keyboard `P`).

**Was true:** the field is keyed by media id, so every arrow key mounts a new
one — and on mount the counter is non-zero, so the effect fired again and the
field stole focus. The next shortcut (`S`) was typed into it.

**The check:** compare against the value captured at mount, not against zero.

## There is no atomic rename in the File System Access API

`FileSystemHandle.move()` is not available everywhere and refuses to overwrite
in some Chrome versions. `saveReel` therefore writes `.reel.tmp.json` first,
then `.reel.json`, then removes the temp file; `loadReel` falls back to the
temp file if `.reel.json` is missing or torn. Do not "simplify" this to a
single write.

## Chrome cannot decode HEIC

`createImageBitmap` and `<img>` both fail on HEIC in Chrome. The thumbnailer
falls back to the JPEG preview iPhones embed (`exifr.thumbnail`); the preview
keeps showing that thumbnail. Low resolution there is expected, not a bug.

## A tilted 3D plane can win the hit test over the card on it

The carousel's `.stage-plane` is `rotateX(4deg)` with `preserve-3d`, and the
cards sit in it at the same depth. Where the tilt makes the depths nearly
equal — the upper part of a card — Chrome picked the (invisible, full-size)
plane as the click target, so taps on the top of a card, and the trim button
there, did nothing. The plane is `pointer-events: none`, cards `auto`. Do
not give the plane pointer events back; a tap on empty floor still reaches
`.stage`, which is what the swipe hook listens on.

## mediabunny stamps "now" as the video's creation time

A trimmed MOV/MP4 gets `mvhd` creation time = the moment of trimming, and
`mvhd` is where reel-rail (and Photos) read "taken at". `trimVideo.ts`
patches the time back (original + cut start) in the moov box as it streams
past. Without it a trimmed video jumps to today on the next scan of a
folder without `.reel.json`.

## The Playwright Chromium has no H.264/AAC

The bundled Chromium cannot play the codecs iPhones record (H.264, HEVC,
AAC), so the e2e video fixture is VP9 + Opus in MP4. The unit test trims a
real H.264/AAC MOV in Node, where no decoding is needed.
