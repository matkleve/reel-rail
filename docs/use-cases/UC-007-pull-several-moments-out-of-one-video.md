# UC-007 — Pull several moments out of one long video

<!-- id: UC-007 -->
<!-- built-in: src/trim (ClipBar, clips.ts, usePreview), src/store/clips.ts -->

**Who:** someone who filmed one long take — a 4-minute concert song, a drone
flight, a kid's football match — with two or three moments worth keeping.
**Wants to:** cut those moments out as separate short videos, in one go.
**So that:** each moment can be rated, shared and put in a series on its own,
and the long take does not clog the library.

## Scenarios

1. **Highlights, long take gone.** A 3-minute match video; the two goals at
   0:42 and 2:15. Mark both, save: two clips appear on the timeline at the
   times the goals happened; the long video is rated *Delete* and leaves
   the usual way (countdown, then Recently deleted / delete in Photos).
2. **Highlights, long take kept.** The same, but the whole video is a memory
   too: tick "Keep the whole video" — the clips are added, nothing is removed.
3. **One cut, kept as a copy.** A single clip with "Keep the whole video":
   a short version next to the full one (a teaser for a chat).
4. **One cut, replacing.** One clip, the whole video not kept: the plain trim
   from UC-002 — the cut file takes the original's name.
5. **On the iPhone.** The clips are handed to the share sheet together
   ("Save to Photos"); the long video is on the list to delete in Photos.

## Success looks like

- On the trim screen: "Add clip" puts a new 5-second clip at the playhead;
  every clip is framed on the filmstrip and numbered; tap a clip (on the strip
  or its chip) to adjust it, × to drop it. The shaded parts are what goes.
- Each clip is lossless (packet copy, like UC-002), gets its real time
  (original start + clip start) so it sits in the right spot on the timeline,
  and takes over the original's tags, place and series. A clip of a video
  rated *Delete* starts unrated.
- Clips are never stacked into a burst, even when seconds apart.
- Folder edited in place: `name-clip1.mov`, `name-clip2.mov` … next to the
  original, numbered in video order; a failure removes the ones written.
- Files mode / iPhone: all clips shared at once.

## Out of scope

- A folder left as it is (UC-003): it may not write files, so it keeps one
  remembered trim per video; "Add clip" is not offered there.
- Joining clips into one video, re-ordering, transitions, frame-exact cuts.
