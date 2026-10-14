# Migrationsprüfung vom 14. Oktober 2026

Dieser Bericht beschreibt die erste KERN-Migration. Die anschließende automatische Radar-Aktualisierung und ihr öffentlicher Rückfallstand sind in [live-library.md](live-library.md) dokumentiert. Die Aussagen zur bytegleichen Radar-Datei beziehen sich auf den ersten Migrationsschritt.

## Ergebnis

Die Oberfläche verwendet KERN UX Native 2.8.2 und lokale Fira Sans. Navigation, Formulare, Tabellen, Fokusdarstellung und Hell-/Dunkelmodus folgen den Konventionen des Stand der Technik-Viewers. Radar und Trendmapping sind getrennte, bedarfsgeladene Fachmodule. Quellcode, Datenaufbereitung, Datenverträge, Tests und Dokumentation liegen in eigenen Verzeichnissen auf Repository-Ebene.

Die bisherige Einzel-HTML-Erzeugung entfällt. Der Produktionsbuild enthält lokale Assets und freigegebene JSON-Daten. Eine gesonderte Exportfunktion erstellt den für die Übernahme geeigneten Quellstand ohne lokale Diagnostik, Rohdaten und Git-Historie.

## Nachweise

Ein frisch exportierter Quellstand wurde mit separat installierten Abhängigkeiten geprüft:

- ESLint, Prettier und strikte TypeScript-Prüfung erfolgreich.
- 7 Vitest-Tests erfolgreich.
- Ruff-Prüfung und Python-Formatprüfung erfolgreich; 16 Python-Tests erfolgreich.
- Produktionsbuild, öffentliche Datenprüfung und Artefaktprüfung erfolgreich.
- 36 Playwright-Prüfungen erfolgreich: je 12 in Chromium, Firefox und WebKit. Getestet wurden unter anderem beide Trendjahre, Unterpfad, Deep Links, History, Tastaturbedienung, Suche, Seitennavigation, Fehler/Wiederholung, Farbschema und Breiten von 320 bis 1440 CSS-Pixeln.
- Desktop-, Mobil- und Dunkelmodus-Screenshots visuell kontrolliert.

Der übernommene öffentliche Datenstand wurde mit der bisherigen veröffentlichten HTML-Version verglichen. Die Radar-Taxonomiedatei bleibt bytegleich; Trendwerte und Zuordnungen bleiben nach Entfernung interner und doppelter Felder inhaltlich gleich. Es wurde kein neuer fachlicher Datenimport ausgeführt. Der Datenstand ist in `data-snapshot.json` dokumentiert.

## Performance

Die öffentlichen JSON-Dateien wurden von 4.949.187 auf 1.729.209 Byte reduziert (65,1 %). Die erzeugten JavaScript-Dateien umfassen zusammen rund 252,4 KiB vor Kompression. Diagrammlayouts werden bei unveränderten Daten wiederverwendet, erfolgreiche Datenabrufe zwischengespeichert und Tabellen in Seiten mit 30 Einträgen angezeigt. Trendjahre werden bei Bedarf geladen. Das sind überprüfbare strukturelle Verbesserungen; sie ersetzen keine Lastmessung mit wesentlich größeren zukünftigen Datenbeständen.

## Grenzen und Veröffentlichung

Die Tests prüfen den gebauten Projektpfad `/Stand-der-Technik-Radar/` lokal. Es erfolgte kein Commit, Push oder Deployment. Die einmalige Umstellung auf GitHub Actions und die anschließende Live-Prüfung sind in [deployment.md](deployment.md) beschrieben. Eine manuelle Screenreader-Abnahme und eine formale Barrierefreiheitsbewertung wurden nicht durchgeführt.
