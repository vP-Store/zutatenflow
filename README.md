# Cockpit

Deine eigene Oberfläche für Windows. Nach der Anmeldung öffnet sich Cockpit im Vollbild. Von hier aus startest du Programme, wechselst zwischen offenen Fenstern, verwaltest deine Dateien und gehst ins Internet, ohne Startmenü und Taskleiste.

**Download:** [Cockpit-Setup.exe (neueste Version)](https://github.com/vP-Store/zutatenflow/releases/latest/download/Cockpit-Setup.exe)

## Funktionen

**Start**
- Begrüßung, große Uhr, Schnellzugriff auf WLAN, Bluetooth, Sound, Anzeige, Energie, Updates und Drucker
- Widgets: Wetter mit 4-Tage-Vorschau, PC-Auslastung (Prozessor, Arbeitsspeicher, Festplatte, Akku), Kalender mit Kalenderwoche, Notizen (werden automatisch gespeichert)
- Angeheftete Apps (per Ziehen sortierbar), häufig verwendete Apps, zuletzt verwendete Dateien, Laufwerke, angeheftete Ordner, Lieblings-Websites

**Dock (unten)**
- Alle offenen Fenster wie in der Taskleiste: Klick holt das Fenster nach vorne, mittlere Maustaste schließt es, Rechtsklick bietet Minimieren und Schließen
- Status: Internetverbindung, Sound, Akku

**Apps**
- Alle installierten Programme inklusive Store-Apps (Rechner, Fotos …), alphabetisch oder nach Nutzung sortiert
- Rechtsklick: als Administrator ausführen, anheften, Dateispeicherort öffnen, deinstallieren

**Dateien**
- Alle Laufwerke und Ordner, Listen- oder Kachelansicht mit Vorschaubildern
- Vorschau-Leiste für Bilder, Videos, Musik, PDFs und Textdateien
- Neuer Ordner, Umbenennen, Kopieren, Ausschneiden, Einfügen, Löschen in den Papierkorb
- Alle Dateien nach Typ sortiert (Dokumente, Bilder, Videos …), durchsucht im Hintergrund
- Ordner an den Schnellzugriff anheften

**Suche** (einfach lostippen oder `Strg + K`)
- Apps (häufig genutzte zuerst), Dateien und Ordner, Windows-Einstellungen („wlan“, „drucker“ …), Befehle („herunterfahren“, „papierkorb leeren“ …)
- Taschenrechner: `12*7`, `200*19%`, `2^10`
- Internetsuche oder Adresse direkt öffnen

**Einstellungen**
- Dunkles oder helles Design (oder wie Windows), Akzentfarbe, Hintergrundbild (wie Windows oder ein eigenes)
- Autostart, Ausblenden nach App-Start, Wetter-Ort, zusätzliche Ordner für die Dateiübersicht
- Automatische Updates, „Diagnose kopieren“, Protokolle

## Notausgang zu Windows

| Was | Wie |
|---|---|
| Zu Windows wechseln / zurück zu Cockpit | `Strg + Alt + D`, Menü **Windows** oben links oder Klick auf das Cockpit-Symbol im Infobereich |
| Cockpit komplett beenden | `Strg + Alt + Q` oder **Windows → Cockpit beenden** |
| Notfall | Task-Manager (`Strg + Umschalt + Esc`) → Cockpit beenden |
| Zwischen Programmen wechseln | Dock unten oder `Alt + Tab` |

Windows selbst bleibt unverändert und läuft im Hintergrund weiter. Cockpit legt sich nur darüber.

## Tastenkürzel

| Taste | Wirkung |
|---|---|
| Einfach tippen, `Strg + K` | Suche |
| `Alt + 1` … `Alt + 5` | Start, Apps, Dateien, Internet, Einstellungen |
| Pfeiltasten, `Enter` | In Suche und Dateiliste bewegen, öffnen |
| `Rücktaste`, `Alt + ←/→` | Dateien: Ordner hoch, zurück/vor |
| `F2`, `Entf`, `F5` | Dateien: umbenennen, löschen, aktualisieren |
| `Strg + C/X/V/A` | Dateien: kopieren, ausschneiden, einfügen, alles auswählen |
| `Strg + Umschalt + N` | Dateien: neuer Ordner |

## Installieren

1. [Cockpit-Setup.exe](https://github.com/vP-Store/zutatenflow/releases/latest/download/Cockpit-Setup.exe) herunterladen und starten.
2. Windows warnt eventuell („Der Computer wurde durch Windows geschützt“), weil das Programm nicht signiert ist. Dann auf **Weitere Informationen** und danach **Trotzdem ausführen** klicken.
3. Nach der Installation führt ein kurzer Assistent durch die Einrichtung. Ab jetzt startet Cockpit bei jeder Anmeldung automatisch. Abschalten lässt sich das unter **Einstellungen → Mit Windows starten**.

Updates werden automatisch geladen und beim nächsten Neustart von Cockpit installiert.

## Entwicklung

```bash
npm install
npm start          # App starten
npm run check      # Syntax aller Dateien prüfen
npm test           # Unit-Tests
npm run e2e        # Ende-zu-Ende-Test (startet die echte App)
npm run dist       # Windows-Installer bauen (unter Windows)
```

`src/renderer/index.html` lässt sich auch direkt im Browser öffnen. Dann zeigt die Oberfläche Beispieldaten aus `mock-api.js`. Mit `?theme=light` oder `?onboarding=1` lassen sich das helle Design und der Assistent ansehen.

Aufbau:

- `src/main/`: Hauptprozess (Fenster, Tastenkombinationen, Autostart, Updates, Apps, Dateien, Datei-Index im Hintergrund-Thread, Fenstersteuerung über die Windows-API)
- `src/main/preload.js`: sichere Brücke zwischen Oberfläche und Hauptprozess
- `src/renderer/`: Oberfläche (`js/core.js` Grundbausteine, `js/views/*` die Bereiche, `js/search.js`, `js/dock.js`, `js/onboarding.js`)
- `src/shared/`: Helfer für Hauptprozess und Tests
- `.github/workflows/build-windows.yml`: baut bei jedem Push den Installer, testet ihn auf Windows und veröffentlicht Releases

Ein Release entsteht, wenn die Commit-Nachricht `[release]` enthält, ein Tag `v*` gepusht wird oder der Workflow manuell mit „Als Release veröffentlichen“ gestartet wird. Vorher muss die Version in `package.json` erhöht werden.
