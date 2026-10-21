# UC-002 — Cut a video down to the good part

<!-- id: UC-002 -->
<!-- built-in: src/trim, src/fs/trimVideo.ts, src/store/trim.ts -->

**Who:** the same person, on a video that is 40 s of waiting for 6 s of action.
**Wants to:** keep only the good part.
**So that:** what is cut away is gone, and only the kept part stays in the folder.

## Today

Trim in the Photos app (which keeps the original around), or a video editor
on a computer. Either way the original's quality and date are at risk.

## Success looks like

- Two handles on a filmstrip, a play button for the kept part; works by
  finger and by mouse.
- The cut is lossless and fast (no re-encode), HEVC from an iPhone included.
- The trimmed video keeps the original's date, rating, tags and series.
- Folder edited in place: the trimmed file replaces the original; the
  original waits 30 days in "Recently deleted".
- Folder left as it is (UC-003): the trim is remembered and applied on export.
- A video that cannot be trimmed without losing a track is refused, never
  silently degraded.

## Out of scope

Cutting out a middle section, speed changes, filters, frame-exact cuts (the
cut starts at the key frame at or before the left handle).
