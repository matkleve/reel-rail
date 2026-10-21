# UC-004 — Take a discard back

<!-- id: UC-004 -->
<!-- built-in: src/ui/LeavingBar.tsx, src/cleanup/CleanupDialog.tsx, src/store/discards.ts -->

**Who:** anyone who swiped down one time too many.
**Wants to:** undo it — right away, or days later.
**So that:** fast sorting never costs a shot they wanted.

## Success looks like

- During the countdown: "Leaves in 26 s · Keep" above the dock; one tap, or
  swiping up, keeps it. Z undoes too.
- After it: "Recently deleted" shows it with the days left; one tap brings it
  back — file back at its old place, rating normal.
- After 30 days, or after a confirmed "Delete now", it cannot come back.
