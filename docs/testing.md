# Prüfstrategie

## Automatisch

- TypeScript prüft den gesamten `src/`-Baum strikt und ohne explizites `any`.
- ESLint und Prettier prüfen JavaScript/TypeScript und formatierbare Projektdateien; Ruff prüft und formatiert Python.
- Vitest schützt Hash-Navigation, Unterpfad-Auflösung und die deterministische Diagrammanordnung.
- Python-Tests prüfen Taxonomiepfade, Mehrfachvorkommen, Zusatzkatalog-Ersetzung, Trendberechnung, Schemas und die öffentliche Projektion. Berechnungen in Tests verwenden isolierte Verzeichnisse.
- Der Build prüft Referenzen zwischen Daten, erlaubte öffentliche Dateien, lokale Pfade, Asset-Links, lokale Schriften und ein JavaScript-Größenbudget.
- Playwright lädt den **Produktionsbuild** unter `/Stand-der-Technik-Radar/` in Chromium, Firefox und WebKit: Datenabruf, KERN/Schrift, Tastaturauswahl, Filter, Deep Links, History, Farbschema, Trendjahre, Fehlerbehandlung und mobile Breiten.

Ausführung siehe `CONTRIBUTING.md`. Browser-Screenshots, Traces und HTML-Reports sind lokale, ignorierte Prüfergebnisse, keine versionierten Nutzdaten. Datenaktualisierung und Veröffentlichung sind getrennte Schritte.

## Manuell

Bei UI-Änderungen Screenshots mindestens bei 320, 375 und 1440 CSS-Pixeln sichten. Reale Diagrammbeschriftungen, lange Inhalte, Fokus und Kontraste prüfen. Bei größeren Datenständen Interaktion und Speicherprofil erneut messen. KERN-Nutzung und automatisierte Tests sind keine Zertifizierung der Barrierefreiheit; die Screenreader-Abnahme bleibt ein eigener Schritt.

## Automatische Bibliotheksaktualisierung

Unit-Tests prüfen OSCAL-Extraktion, stabile Taxonomie-IDs, commitgebundene Abrufe, unveränderte/geänderte/entfernte Dateien, ungültige Taxonomie, leere gültige Bestände, unvollständige Bäume und Abruflimits. Browserprüfungen simulieren GitHub unabhängig vom Netz und prüfen Worker, IndexedDB, Wiederöffnung, atomaren Rückfall und Wiederholung in Chromium, Firefox und WebKit. Die Scrollregression prüft alle Außenringsegmente: ausreichend breite Segmente per echtem Mausklick, extrem schmale leere Segmente über ihre Tastaturbedienung. Trendtests verwenden unveränderte lokale Daten.

Der reale öffentliche Stand wurde ergänzend am 14.10.2026 abgerufen und vollständig mit der Python-Pipeline verglichen: Zuordnungen, Taxonomiebäume und SHA-256 stimmen überein. Diese Live-Prüfung ist kein CI-Test, damit externe Änderungen und GitHub-Limits den reproduzierbaren Testlauf nicht beeinflussen.

## Vergleichsbasis

Die Migration wurde mit dem zuvor veröffentlichten lokalen HTML-Datenstand verglichen. Radar-Zuordnungen und sichtbare Trendwerte werden erhalten; lediglich interne/doppelte Felder werden aus den öffentlichen Trenddateien entfernt. Die datierten lokalen Messergebnisse stehen im Migrationsbericht. Keine universelle Laufzeitgarantie aus lokalen Timingmessungen ableiten.

Zusätzliche Regressionen prüfen die volle Panelbreite bei konstanter Zoomhöhe, unverzerrte Kreise, Kernel-Ergänzung nach Live-Abgleich und Reload, Ausschluss exakt der konfigurierten G0-Quelle sowie die spätere Entfernung ohne Cache-Löschung. Ein Python-Test stellt sicher, dass die Deaktivierung den unveränderten öffentlichen Basisstand wiederherstellt.
