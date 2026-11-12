# Detail use cases — D-001 … D-100

The `UC-NNN` files are the big goals ("sort a trip down to the keepers").
These are the **small moments inside them**: one situation, what the app
should do, and whether it does today. They are written for the person the
iPhone app is built for — someone who shoots trips and events on an iPhone,
sorts on the phone, and wants the top shots plus enough fillers.

Status is judged against the code on `main` (2026-11-12), honestly:
`built` (works today), `partly` (there, but not the way described),
`missing` (not there), `decide` (needs a product decision first).

| Status | Count |
| --- | --- |
| built | 57 |
| partly | 19 |
| missing | 19 |
| decide | 5 |

## Top 10 to build next

Ranked by what it changes for someone sorting a weekend on the phone.

1. **D-031 — Timeline: each day is a stack that fans out.** The user's idea,
   specified:
   - *Closed:* the timeline strip shows one card per **day** — the day's best
     photo on top (highest rating, earliest on ties), two prints peeking out
     askew behind it, a caption "Sat 14 Oct · 312" and a tiny bar of that
     day's Top / Good / Bad / unrated counts. Days run left to right; the
     bars below keep showing the whole trip.
   - *Tap a day:* the stack **fans out** in place — the prints slide out of
     the pile into the familiar flat strip of that day's photos, the tapped
     day's first photo in the middle. A header chip "Saturday · 3 / 312 ✕"
     says where you are.
   - *Inside:* swipe ← / → goes through **every photo one by one** — bursts
     are **not** folded (each burst photo is its own card, the burst only
     shows as a thin bracket under its members). Rating, pick, tags and trim
     work as on any card.
   - *Leaving:* ✕ on the chip, a pinch-in, or swiping past the day's last
     photo folds the day back into its stack (the next day's stack slides in
     when you swipe on). Tapping the bars jumps to that moment and opens its
     day.
2. **D-012 — Swipe feels physical** (card follows the finger at 60 fps,
   flies on along the throw, never vanishes at the edge). In progress.
3. **D-011 — The print fits the photo** (portrait, landscape, square — no
   blurred side bars, no black). In progress.
4. **D-019 — Bursts in the deck are dealt one by one**, no "2" badge. In
   progress.
5. **D-006 — Sort only the new trip**, not the whole library: choose a date
   range or album when opening Photos.
6. **D-061 — Delete really deletes in the iPhone app** (via the Photos
   plugin, one iOS confirmation for the batch) instead of a checklist.
7. **D-051 — Save picks to an album "reel-rail picks"** in the iPhone app
   instead of the share sheet.
8. **D-040 — Bars that answer "where are my top shots?"**: tap a bar to jump
   there, Top segments always visible, a "next top shot" button.
9. **D-024 — Progress in the deck** ("47 left today") and a "sort only
   unrated" default.
10. **D-077 — Place filled in from the photo's GPS** (nearest town), so the
    caption is not "Add place" on every card.

---

## A. First start & Photos access

**D-001** I open the iPhone app for the first time.
Expected: one screen, one button "Open my Photos", a sentence that nothing is uploaded. Status: `built`

**D-002** iOS asks for photo access and I tap "Limited access".
Expected: the app works with the photos I chose and offers "Choose more photos" later. Status: `partly` — limited access works; no way to add more from inside the app.

**D-003** I denied access by mistake.
Expected: a clear message with a button that opens the app's iOS Settings page. Status: `partly` — the message names the path; no button.

**D-004** I open the web app in Safari instead.
Expected: "Add photos & videos" opens the photo picker; it says ratings stay on this device. Status: `built`

**D-005** My library has 25 000 photos.
Expected: listing is instant, nothing is copied until a photo is shown. Status: `built` — the Photos source lists metadata only.

**D-006** I only want to sort last weekend's trip.
Expected: pick a date range (or an album) before the deck starts. Status: `missing` — the whole library is loaded; filters only cover rating/tags.

**D-007** I come back the next day.
Expected: the app opens where I stopped, with all ratings. Status: `built`

**D-008** I shot 40 new photos since yesterday.
Expected: they appear without re-opening anything; the deck deals them next. Status: `partly` — re-opening Photos picks them up; no automatic refresh.

**D-009** I installed the app via Sideloadly and it stopped opening after 7 days.
Expected: ratings survive the re-install; the README says how to renew. Status: `built` — data lives in the app's storage, which a re-sign keeps (docs/NATIVE.md).

**D-010** My phone is set to German.
Expected: the whole app is German, dates too. Status: `built`

## B. Sort deck

**D-011** A portrait photo, then a landscape one, then a square one.
Expected: the white print frame hugs each photo; no blurred or black bars. Status: `built` (2026-11-12).

**D-012** I drag a card slowly, then flick it right.
Expected: it sticks to my finger, tilts, and keeps flying off-screen the way I threw it. Status: `built` — drag by CSS variables once per frame, fly-out along the throw (2026-11-12).

**D-013** I let go halfway.
Expected: it springs back to the middle, stamps fade out. Status: `built`

**D-014** I tap ♥ instead of swiping.
Expected: the card flies right exactly as if thrown; next card grows into place. Status: `built`

**D-015** I swipe up on a great shot.
Expected: "TOP" stamp while dragging, the card flies up, it is rated Top. Status: `built`

**D-016** I swipe down on a blurry one.
Expected: rated Delete; a short note says it leaves in a few seconds and can be undone. Status: `built`

**D-017** I threw the wrong way.
Expected: ↺ brings the card back on top with its old rating. Status: `built`

**D-018** I undo five times in a row.
Expected: five decisions come back, newest first. Status: `built` — up to 200.

**D-019** Two photos taken a second apart.
Expected: two cards, one after the other — no folding, no "2" badge. Status: `built` (2026-11-12).

**D-020** A video comes up in the deck.
Expected: it plays muted on the card; tap pauses; scissors open the trimmer. Status: `built`

**D-021** I want to hear the video.
Expected: a speaker button on the card. Status: `missing` — sound is a keyboard shortcut (M) only.

**D-022** The last card is thrown.
Expected: "All sorted" with "Open the timeline" and "Start over". Status: `built`

**D-023** I only want to go through what I haven't rated yet.
Expected: a toggle "Only unrated" (on by default when coming back). Status: `missing` — the filter has no "unrated" option; the deck deals from the current item on.

**D-024** I want to know how much is left.
Expected: "47 left" somewhere quiet; a thin progress line. Status: `missing`

**D-025** I set the filter to "Top" and open Sort.
Expected: the deck deals only Top photos (to re-check them). Status: `built`

**D-026** I want to pick a photo for sharing while sorting.
Expected: the ↓ pick button on the card, no extra screen. Status: `built`

**D-027** I tag a photo "food" in the deck.
Expected: tag button on the card, presets one tap away. Status: `built`

**D-028** I add the place on the first photo of a day.
Expected: the place field in the caption; the next photos of that day suggest the same place. Status: `partly` — editable per photo; no suggestion carried over.

**D-029** The note after a throw ("Good · Undo").
Expected: a quiet message in the app's style, not over the photo. Status: `built` — under the buttons, verdict icon + Undo (2026-11-12).

**D-030** I want to zoom into a photo to check focus.
Expected: pinch on the card zooms (no throw while two fingers are down). Status: `missing`

## C. Timeline view

**D-031** I open the Timeline tab and see a whole trip.
Expected: one stack per day; tap fans it out into its photos (see Top 10 #1). Status: `missing` — today a flat strip of all items with day separators; bursts folded.

**D-032** I'm in the timeline and see 300 photos of Saturday — what do I do with them?
Expected: the timeline is for **checking and choosing**, not first sorting: see where the Top shots are, fill gaps with Good ones, pick for sharing, trim videos. A one-line hint says so the first time. Status: `decide` — the role is clear in our heads, not in the UI.

**D-033** I swipe ← / → in the timeline.
Expected: one photo at a time, every photo — bursts not folded while going through one by one. Status: `partly` — browsing works; bursts are folded (Enter / tap opens them).

**D-034** I see a "2" on a card in the timeline.
Expected: either no burst folding at all, or a clear "burst of 2 — tap to open". Status: `decide` — with day stacks (D-031) the burst badge could go.

**D-035** I tap a burst in the timeline.
Expected: it fans out into its photos right there. Status: `partly` — Enter on a keyboard; on touch it is not obvious.

**D-036** I want to jump to Sunday.
Expected: tap Sunday's label on the bars, or swipe between day stacks. Status: `partly` — tap on the bars jumps; no day-to-day gesture.

**D-037** I want to see the whole trip at once.
Expected: pinch out on the bars shows all days; pinch in zooms to an hour. Status: `built` — pinch / + − 0 on the bars.

**D-038** I rate a photo in the timeline.
Expected: the same four buttons as in the deck; tap the lit one again to clear. Status: `built`

**D-039** I swipe up on a photo in the timeline.
Expected: decide — the same as the deck (Top) or one level up? Status: `decide` — today one level up/down; the deck uses ↑ = Top.

**D-040** I want to see where my Top shots are.
Expected: gold segments on the bars; tap one to jump there; a "next Top" button. Status: `partly` — bars show it; tap jumps to the time; no "next Top".

**D-041** I need a filler between two Top shots.
Expected: the bars show Good/Bad around them; the strip shows neighbours; rating one Good is one tap. Status: `built`

**D-042** I want to select several photos for a series.
Expected: long-press selects, more taps add, "Create series". Status: `built`

**D-043** I see a gap of 5 hours on the bars.
Expected: the night/pause is compressed, not empty space. Status: `built`

**D-044** The timeline in landscape on an iPad.
Expected: big strip, bars below, keyboard works. Status: `built`

**D-045** I want to go back from the timeline to sorting where I was.
Expected: the Sort tab continues at the photo selected in the timeline. Status: `built` — the deck deals from the current item.

## D. Changing my mind later

**D-046** A week later I think a Good one is actually Top.
Expected: find it in the timeline, tap ★. Status: `built`

**D-047** I want to undo a rating I changed in the timeline.
Expected: Z / an undo button. Status: `partly` — Z on a keyboard; no undo button on touch in the timeline.

**D-048** I rated all of Saturday Bad by accident with a selection.
Expected: one undo takes back the whole batch. Status: `built`

**D-049** I want to reset everything and sort again.
Expected: "Start over" keeps ratings; a separate "Clear all ratings" asks first. Status: `missing` — no clear-all.

**D-050** I want to see only photos I haven't decided on.
Expected: filter "Not rated". Status: `missing`

## E. Picks, sharing, saving

**D-051** I picked 12 photos and want them in my Photos app as a set.
Expected: "Save picks" puts them into an album "reel-rail picks". Status: `missing` — the share sheet ("Save images") is the way today.

**D-052** I share picks to WhatsApp.
Expected: the share sheet with all picks at once. Status: `built`

**D-053** I picked a photo twice.
Expected: the second tap unpicks it; the counter in the header updates. Status: `built`

**D-054** I want to share all Top shots of the trip.
Expected: filter Top → select all → share. Status: `partly` — filter yes; "select all" only via keyboard.

**D-055** I want the shared files to keep their date.
Expected: the photo keeps its original date in WhatsApp/Photos. Status: `built` — originals are shared, not re-encoded.

**D-056** I export a series as a folder on the computer.
Expected: files numbered in order with the series title. Status: `built`

**D-057** I want to see what I already shared.
Expected: a filter "Not exported yet", a badge on exported ones. Status: `built`

## F. Video & clips

**D-058** A 40-second video with 6 good seconds.
Expected: scissors → two handles → "Trim". Status: `built`

**D-059** A 3-minute match video with two goals.
Expected: "Add clip" twice, each clip becomes its own video at its own time. Status: `built` (UC-007)

**D-060** I want the clips but also the whole video.
Expected: "Keep the whole video". Status: `built`

**D-062** I want to hear the sound while trimming.
Expected: the trimmer plays with sound. Status: `built`

**D-063** An iPhone HEVC video with spatial audio.
Expected: trimmed without losing a track, or refused with a reason. Status: `built` — refused, never degraded.

**D-064** I want a clip exactly on a frame.
Expected: frame-exact handles. Status: `decide` — lossless cuts start at a key frame (≤ 1 s early); exact would mean re-encoding.

**D-065** A slow-motion video.
Expected: plays and trims like the Photos app (slow part slow). Status: `missing` — plays at the recorded speed.

**D-066** I want to see how long a video is before opening it.
Expected: a duration chip on the card. Status: `missing` — a play chip only.

## G. Deleting & Recently deleted

**D-061** I threw 80 photos down in the iPhone app.
Expected: after the countdown they are deleted from Photos (one iOS confirmation for the batch, they go to Photos' "Recently Deleted"). Status: `missing` — the plugin can delete, but the app shows a checklist to delete by hand.

**D-067** I threw one down and immediately regret it.
Expected: ↺, or the note's "Undo", within the countdown. Status: `built`

**D-068** I regret it a day later.
Expected: "Deleted" in the header → tap it → it is back. Status: `built`

**D-069** I want to empty Recently deleted now to free space.
Expected: "Delete now…" with one confirmation. Status: `built` (folder) / `partly` (iPhone: checklist)

**D-070** The countdown bar confuses me.
Expected: a sentence on first use: "Deleted photos leave after 30 s — tap to keep." Status: `partly` — the bar is there, the first-time explanation is not.

**D-071** I delete a photo that is in a series.
Expected: it leaves the series too; the series says one is missing. Status: `partly` — it leaves the rail; the series keeps the id silently.

**D-072** A burst of 8 — keep the best, delete the rest.
Expected: "Keep best, delete others" on a burst. Status: `built` — X in an open burst (keyboard); `partly` on touch.

## H. Tags, place, series

**D-073** I always tag the same things (food, people, drone).
Expected: presets, editable, one tap each. Status: `built`

**D-074** I want to see all "people" photos.
Expected: tag filter. Status: `built`

**D-075** I type a new tag on the phone.
Expected: a text field with suggestions from used tags. Status: `built`

**D-076** I want to rename a tag everywhere.
Expected: rename in tag presets updates every photo. Status: `missing`

**D-077** Every card says "Add place".
Expected: place filled from GPS (nearest town), editable. Status: `missing` — GPS is read, never turned into a place.

**D-078** I name a series "Porto day 2".
Expected: title suggestions from place and date. Status: `built`

**D-079** I want to reorder photos in a series.
Expected: drag to reorder. Status: `missing` — series follow time order.

**D-080** I want a series as a quick slideshow for my family.
Expected: play the series full screen. Status: `missing`

## I. Settings, language, look

**D-081** I want the dark theme in the evening.
Expected: More → Dark theme; or follow the system. Status: `partly` — a switch; does not follow the system setting.

**D-082** My phone is English but I want German.
Expected: a language choice in settings. Status: `missing` — follows the device only.

**D-083** I want bigger text.
Expected: iOS text size is respected. Status: `missing` — fixed pixel sizes.

**D-084** I turn off the swipe hints.
Expected: × hides them for good. Status: `built`

**D-085** I want haptic feedback on a throw.
Expected: a light tap when a card is decided (iPhone app). Status: `missing`

**D-086** I want to know what each gesture does again.
Expected: a help sheet (on phone, not just keyboard shortcuts). Status: `partly` — keyboard shortcut list; no touch help.

## J. iPhone app specifics

**D-087** The app icon on my home screen.
Expected: the reel-rail mark, not a placeholder. Status: `built` (from 2026-11-12, next build)

**D-088** I open the app with no network on a mountain.
Expected: everything works; nothing needs internet. Status: `built` — local only; the web app via its service worker.

**D-089** I'm in the app and a new photo arrives via AirDrop.
Expected: it shows up in the deck. Status: `partly` — after re-opening Photos.

**D-090** I want ratings to show up on my iPad too.
Expected: optional sync. Status: `decide` — account/sync exists for the web (ADR 0001); the native app is the free tier without accounts.

**D-091** I edited a photo in the Photos app after rating it.
Expected: the rating stays with the photo. Status: `built` — keyed by the Photos id, not the file's bytes.

**D-092** A Live Photo.
Expected: rated as one photo; the video part plays on long-press. Status: `partly` — the still is shown; no motion.

## K. Errors & edge cases

**D-093** A HEIC photo in Chrome on a laptop.
Expected: shown via its embedded preview, never a broken image. Status: `built`

**D-094** A photo without a date (screenshot, WhatsApp image).
Expected: placed by file date, marked "no date". Status: `partly` — file date used, not marked.

**D-095** My phone is almost full and I trim a video.
Expected: a clear "not enough space" before starting, nothing half-written. Status: `partly` — failures clean up; no space check up front.

**D-096** A video in a format that can't be trimmed (e.g. AVI).
Expected: no scissors; it still plays if the browser can. Status: `built`

**D-097** I close the app in the middle of a trim.
Expected: the original is untouched; no half file. Status: `built` — temp file first, original moves only after success.

**D-098** 2 000 photos from one day.
Expected: the deck and strip stay smooth; only visible cards are drawn. Status: `built` — O(visible).

**D-099** Two photos with exactly the same content (duplicate).
Expected: shown once, "duplicate" noted. Status: `built`

**D-100** Something went wrong (a red toast I don't understand).
Expected: plain words and what to do next, in my language. Status: `partly` — translated; some messages are still technical.
