/** German: toasts and errors from the store and file code. See de.ts. */
export const DE_MESSAGES: Record<string, string> = {
  // Deleting and bringing back
  "Deleting stopped: {error}": "Löschen abgebrochen: {error}",
  "Deleted 1 file · {size} freed": "1 Datei gelöscht · {size} frei",
  "Deleted {n} files · {size} freed": "{n} Dateien gelöscht · {size} frei",
  "1 file could not be deleted": "1 Datei konnte nicht gelöscht werden",
  "{n} files could not be deleted": "{n} Dateien konnten nicht gelöscht werden",
  "Deleted 1 file after 30 days · {size} freed": "1 Datei nach 30 Tagen gelöscht · {size} frei",
  "Deleted {n} files after 30 days · {size} freed": "{n} Dateien nach 30 Tagen gelöscht · {size} frei",
  "1 file could not be deleted — trying again next time":
    "1 Datei konnte nicht gelöscht werden — nächstes Mal neuer Versuch",
  "{n} files could not be deleted — trying again next time":
    "{n} Dateien konnten nicht gelöscht werden — nächstes Mal neuer Versuch",
  "This file is being moved right now — try again in a moment.":
    "Diese Datei wird gerade verschoben — versuch es gleich nochmal.",
  "Couldn’t bring it back: {error}": "Zurückholen ging nicht: {error}",
  "Already in Recently deleted — bring it back from there": "Schon in „Zuletzt gelöscht“ — hol es von dort zurück",

  // Trim
  "Trimmed — the original is in Recently deleted for {days} days":
    "Geschnitten — das Original liegt {days} Tage in „Zuletzt gelöscht“",
  "Trim saved — it is applied when you export the result":
    "Schnitt gespeichert — er wird beim Exportieren des Ergebnisses angewendet",
  "Trimming failed: {error}": "Schneiden fehlgeschlagen: {error}",
  "Sharing failed: {error}": "Teilen fehlgeschlagen: {error}",
  "This video can’t be trimmed without re-encoding it.": "Dieses Video lässt sich nicht ohne Neukodierung schneiden.",
  "This video has a sound track reel-rail can’t keep when trimming.":
    "Dieses Video hat eine Tonspur, die reel-rail beim Schneiden nicht behalten kann.",
  "This video has a picture track reel-rail can’t keep when trimming.":
    "Dieses Video hat eine Bildspur, die reel-rail beim Schneiden nicht behalten kann.",
  "Trimming produced no data": "Beim Schneiden kam nichts heraus",

  // Picks
  "Could not write to “{folder}”: {error}": "Konnte nicht in „{folder}“ schreiben: {error}",
  "Copied to {folder}": "Nach {folder} kopiert",
  "{n} items copied to {folder}": "{n} Elemente nach {folder} kopiert",
  "Removed from the list — 1 copy left in {folder} because it changed":
    "Von der Liste genommen — 1 Kopie bleibt in {folder}, weil sie geändert wurde",
  "Removed from the list — {n} copies left in {folder} because they changed":
    "Von der Liste genommen — {n} Kopien bleiben in {folder}, weil sie geändert wurden",
  "Removed from {folder}": "Aus {folder} entfernt",
  Unpicked: "Abgewählt",
  "Picked — share them with “Share picks”": "Ausgewählt — teil sie mit „Auswahl teilen“",
  "Picked {n} — share them with “Share picks”": "{n} ausgewählt — teil sie mit „Auswahl teilen“",
  "Nothing picked yet — tap Pick (or press Space) on a photo first":
    "Noch nichts ausgewählt — tipp zuerst bei einem Foto auf Auswählen (oder drück die Leertaste)",
  "reel-rail picks": "reel-rail Auswahl",
  "1 file downloaded": "1 Datei heruntergeladen",
  "{n} files downloaded": "{n} Dateien heruntergeladen",
  "Could not share: {error}": "Teilen ging nicht: {error}",

  // Export
  "{absent} of {total} photos aren’t loaded right now — add them again, then share.":
    "{absent} von {total} Fotos sind gerade nicht geladen — füg sie wieder hinzu und teil dann.",
  "None of these files are in the folder any more.": "Keine dieser Dateien ist mehr im Ordner.",
  "Nothing kept yet": "Noch nichts behalten",
  "{folder} – sorted": "{folder} – sortiert",
  Trip: "Reise",
  "Exporting {done} of {total}…": "Exportiere {done} von {total} …",
  "Exported {n} to {path}": "{n} nach {path} exportiert",
  "Export stopped: {error}": "Export abgebrochen: {error}",

  // Opening
  "Access to the folder was not granted.": "Der Zugriff auf den Ordner wurde nicht erlaubt.",
  "That selection had no photos or videos.": "In dieser Auswahl waren keine Fotos oder Videos.",
  "Already here — nothing new": "Schon da — nichts Neues",
  "{n} added": "{n} hinzugefügt",
  "reel-rail needs access to your photos. Allow it in Settings → Privacy & Security → Photos → reel-rail.":
    "reel-rail braucht Zugriff auf deine Fotos. Erlaub ihn unter Einstellungen → Datenschutz & Sicherheit → Fotos → reel-rail.",
  "My photos": "Meine Fotos",
  Photos: "Fotos",
  "“{path}” is not loaded — add it again": "„{path}“ ist nicht geladen — füg es wieder hinzu",
  "“{path}” is no longer in Photos": "„{path}“ ist nicht mehr in Fotos",
  "reel-rail is open in another tab or window with an older version — close it and reload.":
    "reel-rail ist in einem anderen Tab oder Fenster mit einer älteren Version offen — schließ es und lade neu.",
  "Unsupported .reel.json version {version}": "Nicht unterstützte .reel.json-Version {version}",
  "Nothing open": "Nichts geöffnet",
  "Only possible with a folder opened in Chrome or Edge": "Geht nur mit einem in Chrome oder Edge geöffneten Ordner",
  "The copy of {path} is incomplete": "Die Kopie von {path} ist unvollständig",
};
