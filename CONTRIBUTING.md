# Entwicklung

## Einrichtung

Node.js 24 LTS und npm installieren; `.nvmrc` dokumentiert die Hauptversion. Abhängigkeiten ausschließlich über `npm ci` aus der Lockdatei installieren. Änderungen erfolgen auf einem eigenen Branch.

```sh
npm ci
npm run dev
```

Für Datenaufbereitung und Python-Prüfungen ist Python 3.14 vorgesehen:

```sh
python3 -m venv .venv
. .venv/bin/activate
python -m pip install -r requirements-dev.txt
```

`requirements.txt` enthält festgelegte direkte und transitive Datenabhängigkeiten, `requirements-dev.txt` zusätzlich Test- und Formatwerkzeuge. Bei Aktualisierung beide Umgebungen neu prüfen. Die Oberflächeninstallation benötigt Python nicht.

## Vor einem Pull Request

```sh
npm run check
python -m ruff check scripts tests/python
python -m ruff format --check scripts tests/python
python -m pytest
```

Vor dem ersten Browserlauf `npx playwright install chromium firefox webkit` ausführen (Linux-CI: `--with-deps`). `npm run format` und `python -m ruff format scripts tests/python` formatieren Dateien. Tests schreiben ausschließlich temporäre Daten bzw. ignorierte Berichte. Keine Datenaktualisierung beim normalen Web-Build.

## Regeln

- KERN UX ist die verbindliche Grundlage. Native Klassen und `shared/ui/Button` verwenden, fachliche Layouts in den jeweiligen Stylesheets halten.
- React verwaltet die Oberfläche; keine nachträgliche DOM-Umschreibung durch Viewer-Helfer. Diagramm-Messungen sind lokal gekapselte Ausnahmen.
- Fachliche Werte und Datenherkunft dürfen durch eine UI-Änderung nicht verändert werden. `scripts/check-data.mjs` und Verhaltenstests schützen den Datenvertrag.
- Neue Interaktionen auf Tastatur, Mobilansicht, Lade-/Fehlerzustände und beide Farbschemata prüfen. Automatische Tests ersetzen keine Screenreader-Abnahme.
- Quelltexte, Rohimporte, interne Diagnostik und veröffentlichte Daten haben getrennte Aufgaben. Nur die freigegebene Projektion gehört nach `public/generated/`.
- Keine externen Schriften, Laufzeit-CDNs, Telemetrie oder neuen Backend-Dienste ohne begründete Architekturentscheidung.

## Dokumentation gehört zur Änderung

| Änderung                        | Mitführen                                                                    |
| ------------------------------- | ---------------------------------------------------------------------------- |
| Bedienung oder neue Ansicht     | `docs/user-guide.md`, `README.md`                                            |
| Modulstruktur oder Datenvertrag | `docs/architecture.md`, `schemas/`, gegebenenfalls `docs/adr/`               |
| Datenaufbereitung/Trendjahr     | `docs/data-pipeline.md`, `docs/mapping-method.md`, `docs/data-snapshot.json` |
| Build, CI oder Hosting          | `docs/deployment.md`, `docs/testing.md`                                      |
| Sichtbare/fachliche Änderung    | `CHANGELOG.md`                                                               |

Datierte Prüfberichte beschreiben einen konkreten Stand. Keine nicht ausgeführten Prüfungen, Live-Veröffentlichungen oder Zertifizierungen behaupten.
