# Cockpit

Deine eigene Startoberfläche für Windows. Nach der Anmeldung öffnet sich Cockpit im Vollbild – von hier aus startest du Programme, findest deine Dateien und gehst ins Internet, ohne das Windows-Startmenü.

## Funktionen

- **Start** – Begrüßung, Uhr, angeheftete Apps, zuletzt verwendete Dateien, Laufwerke mit freiem Speicher, Lieblings-Websites
- **Apps** – alle installierten Programme (inkl. Store-Apps wie Rechner oder Fotos) als Kacheln, filterbar nach Ordner; Stern heftet an die Startseite
- **Dateien** – alle Laufwerke und Ordner durchklicken, sortieren (Name, Datum, Größe, Typ), filtern; zusätzlich alle Dateien nach Typ sortiert (Dokumente, Bilder, Videos, Musik, Archive, Programme …), Bilder als Vorschau
- **Internet** – Suche oder Adresse eingeben, eigene Websites als Kacheln anlegen
- **Suche oben** – einfach lostippen: findet Apps, Dateien oder sucht im Internet (Pfeiltasten + Enter)
- **Rechtsklick** auf eine Datei: Öffnen, im Explorer zeigen, Pfad kopieren

## Notausgang zu Windows

| Was | Wie |
|---|---|
| Zu Windows wechseln / zurück zu Cockpit | `Strg + Alt + D`, Menü **Windows** oben links oder Klick auf das Cockpit-Symbol im Infobereich der Taskleiste |
| Cockpit komplett beenden | `Strg + Alt + Q` oder **Windows → Cockpit beenden** |
| Notfall | Task-Manager (`Strg + Umschalt + Esc`) → Cockpit beenden |
| Zwischen offenen Programmen wechseln | `Alt + Tab` |

Windows selbst läuft unverändert im Hintergrund weiter – Cockpit legt sich nur darüber.

## Installieren

1. Auf GitHub im Repo auf **Actions** → **Windows-Installer bauen** → den neuesten grünen Lauf öffnen.
2. Unten bei **Artifacts** auf **Cockpit-Installer** klicken und die ZIP-Datei herunterladen.
3. ZIP entpacken und `Cockpit-Setup-….exe` starten.
   Windows zeigt eventuell „Der Computer wurde durch Windows geschützt“ an, weil das Programm nicht signiert ist → **Weitere Informationen** → **Trotzdem ausführen**.
4. Nach der Installation startet Cockpit ab sofort bei jeder Anmeldung automatisch. Abschalten lässt sich das unter **Einstellungen → Mit Windows starten**.

## Entwicklung

```bash
npm install
npm start          # App starten
npm run check      # Syntax prüfen
npm run dist       # Windows-Installer bauen (unter Windows)
```

`src/renderer/index.html` lässt sich auch direkt im Browser öffnen – dann zeigt die Oberfläche Beispieldaten (`mock-api.js`).

Aufbau:

- `src/main.js` – Hauptprozess: Fenster, Tastenkombinationen, Autostart, Apps/Dateien einlesen
- `src/preload.js` – sichere Brücke zwischen Oberfläche und Hauptprozess
- `src/renderer/` – Oberfläche (HTML, CSS, JavaScript)
- `.github/workflows/build-windows.yml` – baut bei jedem Push den Windows-Installer
