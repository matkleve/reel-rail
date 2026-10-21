# Traps

Bugs that looked correct. Read the relevant entry **before your second attempt**
at a fix. Format: what looked right, what was true, the check that catches it.
Newest at the top. (Format from grundriss.)

---

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
