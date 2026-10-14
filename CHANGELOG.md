# Änderungen

## 2026-10-14 – Breiter Zoom und vorübergehender Kernel

- Indirekte Build-Abhängigkeiten auf korrigierte Versionen aktualisiert; npm Audit ohne gemeldete Schwachstellen.
- Der Radar-Ausschnitt nutzt die volle Panelbreite bei unveränderter Höhe und unverzerrten Kreisen.
- Lokalen taxonomisierten Kernel als getrennt konfigurierbaren Zusatzkatalog wieder aufgenommen; öffentliche Daten werden weiterhin automatisch aktualisiert.
- Öffentlicher Cache und Zusatzkatalog bleiben getrennt; Deaktivierung ohne Browser-Cache-Löschung möglich.
- README und Migrationscheckliste für das öffentliche Entwicklungsrepository aktualisiert; Export umfasst alle erforderlichen Konfigurations- und Projektionsdateien.

## 2026-10-14 – Öffentliche Bibliothek beim Öffnen aktualisieren

- Viewer-Link auf `bsi-community` korrigiert und vollständig benannt.
- Radar-Auswahl erhält die Scrollposition, einschließlich Außenring-Drilldown.
- Öffentliche Catalogs/Component Definitions per Worker und Revisions-/Dateicache automatisch abgleichen; atomare Übernahme, sichtbarer Rückfallstatus und Wiederholung.
- Mitgelieferten Radar-Rückfallstand auf den geprüften öffentlichen Stand aktualisiert; Trenddateien unverändert.
- Dokumentation und Tests für Aktualisierung, Cache, neue/geänderte/entfernte Dateien und Fehlerfälle ergänzt.

## 1.0.0 – vorbereitet am 14. Oktober 2026

- KERN UX 2.8.2 und lokale Fira Sans; Gestaltung an den Viewer angeglichen.
- Gemeinsamer Kopfbereich, klare Navigation und responsive Arbeitsbereiche.
- Getrennt nachgeladene Radar-/Trendansichten, zwischengespeicherte Daten und weniger wiederholte Diagrammberechnungen.
- Vollständig paginierte Trendtreffer und native Themenauswahl als Diagrammalternative.
- Projektstruktur am Repository-Einstieg, strikt typisierte UI, getrennte Fachansichten und Stylesheets.
- Geprüfte öffentliche Datenprojektion, Python-/Frontend-/Browserprüfungen und GitHub-Pages-Workflow.
- Dokumentation für Bedienung, Datenpflege, Entwicklung und Veröffentlichung erneuert.
- Einzel-HTML-Export entfernt. Fachliche Ausgangsdaten unverändert übernommen.

Noch nicht aus dieser lokalen Migration veröffentlicht. Der nachfolgende Transfer und die Pages-Umstellung sind in `docs/deployment.md` beschrieben.
