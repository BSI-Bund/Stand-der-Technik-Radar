# Arbeitsregeln für das Stand der Technik-Radar

- KERN UX ist die verbindliche Oberflächengrundlage. Die aktuellen Konventionen des Viewers dienen als gestalterische Referenz; React bleibt für Radar-DOM und Zustand verantwortlich.
- Vor Änderungen Branch und Arbeitsstand prüfen. Nutzeränderungen erhalten. Kein Commit, Push oder Deployment ohne gesonderten Auftrag.
- Dokumentation und Changelog gehören zur Änderung. `CONTRIBUTING.md`, `docs/testing.md`, `docs/deployment.md` beachten.
- Nur `dist/` wird über GitHub Pages veröffentlicht. Keine Einzel-HTML-Datei mehr erzeugen; diese Entscheidung ersetzt die frühere Exportvorgabe.
- Importdiagnostik bleibt lokal in `data/build/`; keine internen Berichte oder Ausschlusszahlen in Website oder öffentlichen Quellcodeexport aufnehmen.
- Nach jeder beauftragten neuen Radarversion den vollständigen Importbericht im Arbeitschat ausgeben: Datenstand/öffentliche Revision, Zahlen mit/ohne Zuordnung, je Quelle Objektzahlen und SHA-256, ersetzte/übersprungene Dateien. Bei reinen UI-Builds den unveränderten Datenstand benennen.
- Keine nicht ausgeführten Tests, Live-Veröffentlichungen oder Barrierefreiheitszertifizierungen behaupten. Manuelle Screenreader-Abnahme getrennt behandeln.
