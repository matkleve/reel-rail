# UC-003 — Keep the originals, take the result elsewhere

<!-- id: UC-003 -->
<!-- built-in: src/ui/WorkflowDialog.tsx, src/store/exportResult.ts, src/fs/exportResult.ts -->

**Who:** someone whose folder is an archive (a backup drive, a shared NAS)
they do not want changed.
**Wants to:** sort and trim the same way as in UC-001/002, but get the result
as a new folder.
**So that:** the original folder is untouched and the result is ready to use.

## Today

Copy the whole folder first, then sort the copy — doubling the space and the time.

## Success looks like

- The first time a folder is opened, reel-rail asks: **edit this folder**, or
  **leave it as it is and export the result**. Changeable later.
- Left as it is: discards just leave the rail; trims are remembered.
- "Export result…" copies everything kept — sub-folders as they were, trims
  applied — into a new folder. The source folder is byte-for-byte unchanged.

## Out of scope

Exporting to the cloud, re-encoding for size, renaming schemes (series
export does numbered names — UC-005).
