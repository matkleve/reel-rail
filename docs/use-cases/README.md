# Use cases

What a person is trying to accomplish — in their words, before any decision
about screens or components. One file per use case, `UC-NNN-slug.md`
(format from the `grundriss` base project).

A use case is not a feature. "Swipe down to discard" is a feature; "end up
with a folder that holds only the shots worth keeping" is a use case, and the
swipe is one answer to it. Keeping the two apart is what lets us notice when
a requested feature is not the cheapest answer.

## Format

```markdown
# UC-NNN — <one line, from the user's side>

<!-- id: UC-NNN -->
<!-- built-in: where it lives in the code -->

**Who:** …
**Wants to:** …
**So that:** …

## Today

How they do it now, and what it costs them.

## Success looks like

Observable outcomes. If none of these can be observed from outside, the use
case is really a technical task — put it in an issue, not here.

## Out of scope

The adjacent things a reader would assume are included.
```

## Index

| ID | Use case | Status |
| --- | --- | --- |
| [UC-001](UC-001-sort-a-trip-folder-down-to-the-keepers.md) | Sort a trip folder down to the keepers | built |
| [UC-002](UC-002-cut-a-video-down-to-the-good-part.md) | Cut a video down to the good part | built |
| [UC-003](UC-003-keep-the-originals-take-the-result-elsewhere.md) | Keep the originals, take the result elsewhere | built |
| [UC-004](UC-004-take-a-discard-back.md) | Take a discard back | built |
| [UC-005](UC-005-share-the-best-shots.md) | Share the best shots | built |
| [UC-006](UC-006-pay-for-reel-rail.md) | Pay for reel-rail and use it with an account | open questions |
