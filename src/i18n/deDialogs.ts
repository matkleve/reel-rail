/** German: dialogs — deleted items, trim, series, tag presets, workflow, shortcuts, account. See de.ts. */
export const DE_DIALOGS: Record<string, string> = {
  Close: "Schließen",
  Cancel: "Abbrechen",
  Save: "Speichern",
  Done: "Fertig",

  // Recently deleted
  "A browser can’t delete from your photo library: use this list to clear them out in the Photos app.":
    "Ein Browser kann nichts aus deiner Fotomediathek löschen: Nimm diese Liste, um sie in der Fotos-App zu löschen.",
  "This folder is left as it is — these are just not part of the export.":
    "Dieser Ordner bleibt, wie er ist — diese sind nur nicht Teil des Exports.",
  "Moved to _reel_trash/ and deleted for good after {days} days.":
    "Verschoben nach _reel_trash/ und nach {days} Tagen endgültig gelöscht.",
  "Nothing deleted": "Nichts gelöscht",
  "Throw a photo down (or rate it Delete): a bar runs out, and it lands here.":
    "Wirf ein Foto nach unten (oder bewerte es mit Löschen): Ein Balken läuft ab, dann landet es hier.",
  "Tap one to bring it back.": "Tipp eins an, um es zurückzuholen.",
  "{path} — bring back": "{path} — zurückholen",
  today: "heute",
  "{n} d": "{n} T",
  "Bring back": "Zurückholen",
  "Deleting…": "Lösche …",
  "Delete 1 file ({size}) for good? This can’t be undone.":
    "1 Datei ({size}) endgültig löschen? Das lässt sich nicht rückgängig machen.",
  "Delete {n} files ({size}) for good? This can’t be undone.":
    "{n} Dateien ({size}) endgültig löschen? Das lässt sich nicht rückgängig machen.",
  "Delete 1 file": "1 Datei löschen",
  "Delete {n} files": "{n} Dateien löschen",
  "Don’t want to wait {days} days?": "Keine {days} Tage warten?",
  "Delete now…": "Jetzt löschen …",
  "1 item": "1 Element",
  "{n} items": "{n} Elemente",

  // Trim
  "Keep {part} of {whole}": "{part} von {whole} behalten",
  Pause: "Pause",
  "Play the kept part": "Behaltenen Teil abspielen",
  "Trimmed. Save it to Photos, then delete the original there.":
    "Geschnitten. Sichere es in Fotos und lösch dort dann das Original.",
  "Save to Photos…": "In Fotos sichern …",
  Download: "Herunterladen",
  "Trimming… {pct} %": "Schneide … {pct} %",
  "The cut is lossless. Your library keeps the original until you delete it in Photos.":
    "Der Schnitt ist verlustfrei. Das Original bleibt in deiner Mediathek, bis du es in Fotos löschst.",
  "The folder stays as it is — the trim is applied when you export the result.":
    "Der Ordner bleibt, wie er ist — der Schnitt wird beim Exportieren des Ergebnisses angewendet.",
  "The cut-away part leaves the folder. The original waits {days} days in Recently deleted.":
    "Der weggeschnittene Teil verlässt den Ordner. Das Original wartet {days} Tage in „Zuletzt gelöscht“.",
  "Trim & replace": "Schneiden & ersetzen",
  Trim: "Schneiden",
  "Trim start": "Schnittanfang",
  "Trim end": "Schnittende",
  // Several clips out of one video (UC-007)
  Clips: "Clips",
  "Remove clip {n}": "Clip {n} entfernen",
  "Add clip": "Clip hinzufügen",
  "Keep the whole video": "Ganzes Video behalten",
  "Clip ready. Save it to Photos.": "Clip fertig. Sichere ihn in Fotos.",
  "{n} clips ready. Save them to Photos.": "{n} Clips fertig. Sichere sie in Fotos.",
  "Each clip becomes a video of its own, at its own time. The whole video stays.":
    "Jeder Clip wird ein eigenes Video, zu seiner eigenen Uhrzeit. Das ganze Video bleibt.",
  "Each clip becomes a video of its own, at its own time. The whole video is rated Delete.":
    "Jeder Clip wird ein eigenes Video, zu seiner eigenen Uhrzeit. Das ganze Video wird auf „Löschen“ gesetzt.",
  "Save clip": "Clip sichern",
  "Save {n} clips": "{n} Clips sichern",
  "{n} clips, {part} of {whole}": "{n} Clips, {part} von {whole}",
  "Play this clip": "Diesen Clip abspielen",
  "1 clip saved next to the original": "1 Clip neben dem Original gesichert",
  "{n} clips saved next to the original": "{n} Clips neben dem Original gesichert",

  // Series
  "Series created": "Serie erstellt",
  "New series": "Neue Serie",
  "{n} items · saved with your ratings — files are only copied when you share":
    "{n} Elemente · mit deinen Bewertungen gespeichert — Dateien werden erst beim Teilen kopiert",
  "{n} items · saved with your ratings — files are only copied when you export":
    "{n} Elemente · mit deinen Bewertungen gespeichert — Dateien werden erst beim Exportieren kopiert",
  Title: "Titel",
  "Series title": "Titel der Serie",
  "Roll a funny title": "Lustigen Titel würfeln",
  "Create & share…": "Erstellen & teilen …",
  "Create & export…": "Erstellen & exportieren …",
  "Share…": "Teilen …",
  "Export…": "Exportieren …",
  "{n} saved": "{n} gespeichert",
  "No series yet": "Noch keine Serien",
  "Select a few items —": "Markier ein paar Elemente —",
  or: "oder",
  "+ click — and press": "+ Klick — und drück",
  Share: "Teilen",
  "Export again": "Erneut exportieren",
  Export: "Exportieren",
  shared: "geteilt",
  downloaded: "heruntergeladen",
  "exported to {path}": "exportiert nach {path}",
  "Copying {done} of {total}…": "Kopiere {done} von {total} …",
  Shared: "Geteilt",
  Downloaded: "Heruntergeladen",
  "Exported to": "Exportiert nach",
  "Export failed: {error}": "Export fehlgeschlagen: {error}",

  // Tag presets
  "Tag presets": "Tag-Vorlagen",
  "Keys 1–9 add or remove these tags on the current item or the selection.":
    "Die Tasten 1–9 setzen oder entfernen diese Tags beim aktuellen Element oder den markierten.",
  "Reset to defaults": "Auf Standard zurücksetzen",
  "Preset {n}": "Vorlage {n}",

  // How to work on a folder
  "How should reel-rail work on “{folder}”?": "Wie soll reel-rail mit „{folder}“ arbeiten?",
  "You can change this later in the folder menu.": "Du kannst das später im Ordner-Menü ändern.",
  "Edit this folder": "Diesen Ordner bearbeiten",
  "Discards and the cut-away parts of videos leave the folder — it ends up holding only what you keep. They wait 30 days in Recently deleted.":
    "Gelöschtes und weggeschnittene Teile von Videos verlassen den Ordner — am Ende ist nur noch drin, was du behältst. Sie warten 30 Tage in „Zuletzt gelöscht“.",
  "Leave it as it is, export the result": "So lassen, Ergebnis exportieren",
  "Nothing in this folder changes. When you are done, “Export result…” copies what you kept — trims applied — into a new folder.":
    "In diesem Ordner ändert sich nichts. Wenn du fertig bist, kopiert „Ergebnis exportieren …“ alles Behaltene — geschnitten — in einen neuen Ordner.",

  // Keyboard shortcuts
  "Everything also works with the mouse — hover a button to see its key.":
    "Alles geht auch mit der Maus — zeig auf einen Knopf, um seine Taste zu sehen.",
  Browse: "Blättern",
  "Previous / next (wheel and swipe work too)": "Vorheriges / nächstes (Scrollrad und Wischen gehen auch)",
  "First / last": "Erstes / letztes",
  "Open / close a burst": "Serienbild öffnen / schließen",
  "Zoom the timeline in / out / whole trip": "Zeitleiste vergrößern / verkleinern / ganze Reise",
  "Rate & keep": "Bewerten & behalten",
  "Better rating": "Bessere Bewertung",
  "Worse rating": "Schlechtere Bewertung",
  "In Sort: good, bad, top, delete": "Beim Sortieren: gut, schlecht, top, löschen",
  "Undo the last rating": "Letzte Bewertung rückgängig",
  "Open burst: all but the best → discard": "Offenes Serienbild: alle außer dem besten → löschen",
  "Pick: copy to your picks folder (again: undo)": "Auswählen: in den Auswahl-Ordner kopieren (nochmal: rückgängig)",
  Select: "Markieren",
  "Extend the selection": "Markierung erweitern",
  Click: "Klick",
  "Add or remove one item": "Ein Element hinzufügen oder entfernen",
  "Clear the selection": "Markierung aufheben",
  "Create a series from the selection": "Serie aus den markierten erstellen",
  "Describe & view": "Beschreiben & ansehen",
  "Toggle a tag preset": "Tag-Vorlage an/aus",
  "Tag menu": "Tag-Menü",
  "Edit the place": "Ort bearbeiten",
  "Video: play/pause, sound": "Video: abspielen/pausieren, Ton",
  "Video: trim": "Video: schneiden",
  "This overlay": "Diese Übersicht",

  // Account
  "Account — {email}": "Konto — {email}",
  "Sign in": "Anmelden",
  "Syncing ratings…": "Bewertungen werden abgeglichen …",
  "Ratings in sync": "Bewertungen abgeglichen",
  "Sync failed — retries on the next change": "Abgleich fehlgeschlagen — neuer Versuch bei der nächsten Änderung",
  "Signed in": "Angemeldet",
  "until {date}": "bis {date}",
  "Free.": "Kostenlos.",
  "keeps your ratings, tags and places in sync between phone and computer — the photos stay on each device.":
    "hält deine Bewertungen, Tags und Orte zwischen Handy und Computer abgeglichen — die Fotos bleiben auf jedem Gerät.",
  "Sign out": "Abmelden",
  "Enter the code from the e-mail": "Gib den Code aus der E-Mail ein",
  "Sign in or create an account": "Anmelden oder Konto erstellen",
  "you@example.com": "du@beispiel.de",
  "Send code": "Code senden",
  "Your photos stay on this device. The account holds your plan and, with Pro, your ratings — never the photos.":
    "Deine Fotos bleiben auf diesem Gerät. Das Konto speichert dein Abo und mit Pro deine Bewertungen — nie die Fotos.",
};
