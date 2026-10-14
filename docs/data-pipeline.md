# Datenaufbereitung und Herkunft

## Getrennte Datenstände

Die Radar-Ansicht synchronisiert sich beim Öffnen mit der öffentlichen Bibliothek; siehe [Automatischer Bibliotheksabruf](live-library.md). Der mitgelieferte Rückfallstand wurde am 14.10.2026 gegen die öffentliche Revision geprüft. Er kombiniert den öffentlichen Basisstand mit den ausdrücklich aktivierten Zusatzkatalogen. Das Trendmapping behält seine bisherigen, manuell freigegebenen Dateien. `docs/data-snapshot.json` dokumentiert beide Herkünfte getrennt sowie die Prüfsummen.

Die historische Trendberechnung enthält bereits veröffentlichte Eingaben eines Zusatzkatalogs. Der öffentliche Abruf selbst bleibt unvermischt; für die Radar-Anzeige wird die freigegebene Kernel-Projektion ergänzend angewendet. Ein vollständiger neuer Trendlauf aus der öffentlichen Bibliothek allein kann deshalb andere Ergebnisse liefern. Für einen reproduzierbaren Web-Build werden die freigegebenen Trenddateien unverändert mitgeliefert.

## Nur den Radar-Rückfallstand aktualisieren

```sh
python scripts/sync_repo.py --revision OEFFENTLICHE_COMMIT_ID
python scripts/build_taxonomy_map.py
node scripts/check-data.mjs
```

Die automatische Browser-Aktualisierung benötigt keinen Radar-Build und ändert diese Dateien nicht. Beim redaktionellen Update Datum, Revision und Hash in `docs/data-snapshot.json` mitführen. Das Skript erzeugt auch den lokalen Importbericht.

## Trendmapping redaktionell aktualisieren

```sh
python scripts/sync_repo.py --revision OEFFENTLICHE_COMMIT_ID
python scripts/build_all.py
node scripts/check-data.mjs
npm run check
```

Ohne `--revision` aktualisiert `sync_repo.py` ausdrücklich auf den öffentlichen `main`-Stand. Der normale Frontend-Build ruft dieses Skript nicht auf. `build_all.py` berechnet auch die Trendjahre neu und wird deshalb nur bei einem ausdrücklich beauftragten fachlichen Trendupdate ausgeführt. Es werden rekursiv OSCAL Catalogs aus `control_layer/` und Component Definitions aus `implementation_layer/` gelesen. Fremde JSON-Typen werden ausgeschlossen.

Radar-Zusatzkataloge werden über `data/configs/radar-supplements.json` verwaltet und mit `scripts/build_supplements.py` erzeugt; siehe [Zusatzkataloge](supplemental-catalogs.md). `build_all.py` verwendet diese Konfiguration für das Radar. Sein explizites `--extra-catalog ... --publish-extra-catalogs` betrifft zusätzliche Eingaben der redaktionellen Trendberechnung und aktiviert keinen zusätzlichen Live-Radar-Katalog.

## Dateigrenzen

- Versioniert: Taxonomie-JSON, Trend-Packs, Konfiguration, Schemas, öffentliche Basisprojektion unter `data/snapshots/`, freigegebene Zusatzprojektionen unter `data/supplements/` und UI-Snapshots.
- Lokal: Bibliotheks-Checkout, Original-PDF/XLSX, normalisierte Zwischenstände, vollständige Mappingdaten und Importdiagnostik.
- Öffentlich: Taxonomieprojektion, Manifest und je Trendjahr Pack/Anzeigedaten. `public_data.py` entfernt doppelte interne Belege. Die ursprünglichen Zuordnungswerte bleiben erhalten.

Original-PDFs werden nicht mit dem Quellcodeexport übertragen. Wer PDF-Extraktion benötigt, stellt die in den Trend-Packs benannten Quellen lokal bereit und installiert `pdftotext` (Poppler). Der reguläre Datenbuild verwendet die bereits redaktionell gepflegten Trend-Packs.

## Neues Trendjahr

`python scripts/init_trend_pack.py --year YYYY` erzeugt eine Vorlage. Quellen, Themen, Facetten und Begriffe fachlich prüfen; anschließend `display.enabled: true` setzen. Der Build ermittelt aktivierte Jahre aus den Packs, ohne fest codierte Jahresliste. Bei entferntem Jahr alte öffentliche Jahresdateien ebenfalls bewusst entfernen; die Dateilistenprüfung meldet Überreste. Nach einem Datenupdate Prüfsummen in `docs/data-snapshot.json`, Dokumentation und Changelog aktualisieren.

## Interner Importbericht

`data/build/taxonomy-map.json` enthält den vollständigen Importbericht mit Revision, SHA-256 je Quelle, Zuordnungen und ausgeschlossenen/ersetzten Dateien. Dieser Bericht ist lokal zu prüfen und bei einer beauftragten neuen Version im Arbeitschat auszugeben; er gehört weder in die Website noch in den öffentlichen Quellcodeexport.
