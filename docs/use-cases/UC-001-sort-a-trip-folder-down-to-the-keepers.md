# UC-001 — Sort a trip folder down to the keepers

<!-- id: UC-001 -->
<!-- built-in: src/carousel, src/ui/Dock.tsx, src/store/discards.ts, src/fs/deletion.ts -->

**Who:** someone back from a trip (first user: Matthias's brother), on a
phone on the go or at a computer.
**Wants to:** pick the trip's folder, swipe through every photo and video,
and throw out what is not worth keeping.
**So that:** the folder ends up holding only the shots worth keeping —
without a second pass, an export step, or a pile of "maybe".

## Today

Hundreds of shots a day in the camera roll or on an SD card. Sorting means
the Photos app, one item at a time, with delete as a separate gesture, and
anything not deleted stays forever. Most people never finish.

## Success looks like

- They choose a folder once; next time one tap continues where they stopped.
- One swipe per item: left/right browses, up/down rates on five levels.
- A shot swiped all the way down **shrinks and shows a ~30 s countdown**;
  when it runs out, the shot **leaves the folder** (into "Recently deleted").
- Thirty days later it is gone for good — like "Recently deleted" on a phone.
- The same works with a keyboard on a computer (↑/↓, ←/→).
- Nothing is uploaded anywhere.

## Out of scope

Deleting from the iPhone Photos library itself (a browser cannot; needs a
native app — see UC-006 / README). Editing photos. Cloud backup.
