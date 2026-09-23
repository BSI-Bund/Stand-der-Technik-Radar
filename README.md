# Stand der Technik-Radar

Das Radar erstellt eine statische HTML-Ansicht der vierstufigen Stand-der-Technik-Taxonomie und ein separates Trendmapping für die BSI-Trendanalysen 2024 und 2025.

## Datenquellen und Zählweise

Die primäre und einzige automatisch synchronisierte Quelle ist die öffentliche [Stand-der-Technik-Bibliothek](https://github.com/BSI-Bund/Stand-der-Technik-Bibliothek). Der Import untersucht rekursiv OSCAL Catalogs unter `control_layer/**` (einschließlich `sources/**`) sowie Component Definitions unter `implementation_layer/**`. Profiles, Dokumentation und andere JSON-Formate werden ignoriert. Weitere einzelne OSCAL Catalogs können beim Build mit `--extra-catalog` angegeben werden.

Für die Taxonomie werden ausschließlich die vier expliziten OSCAL-Properties `Taxonomy-L1` bis `Taxonomy-L4` des jeweiligen Controls oder der jeweiligen Component gelesen. Der Pfad muss exakt einem Eintrag in `data/source/taxonomy/stand-der-technik.json` entsprechen. Objekte ohne Taxonomie-Properties werden ausgelassen und gezählt; unvollständige, doppelte oder unbekannte Zuordnungen führen zu einem Build-Fehler. Es gibt kein KI-basiertes oder heuristisches Taxonomie-Mapping mehr.

Das Radar zählt **Vorkommen pro OSCAL-Quelldatei**. Derselbe Control-`alt-identifier` kann in mehreren Katalogkontexten vorkommen und unterschiedliche Taxonomiepfade haben; beide Vorkommen werden gezeigt. Die Kennzahl „Eindeutige Identitäten“ weist zusätzlich die deduplizierte Anzahl aus. Eine manuell übergebene bearbeitete Kopie ersetzt einen öffentlichen Katalog bei gleicher Catalog-UUID oder bei gleichem Titel und mindestens 80 % Überlappung der Control-Identitäten. Gibt es mehrere ähnliche Varianten, wird über den Dateinamen genau eine passende Quelle ausgewählt; bei nicht auflösbarer Mehrdeutigkeit stoppt der Build. Manuell gelieferte lokale Dateipfade werden nicht in die HTML-Ausgabe geschrieben.

Das Trendmapping bleibt ein separater, bestehender TF-IDF-/Schlüsselwort-/Facetten-Prozess. Seine Bewertungslogik wurde nicht geändert; lediglich die OSCAL-Eingabe stammt jetzt aus demselben öffentlichen Repository und optionalen Zusatzkatalogen. Die Taxonomie-Properties werden hierfür nicht als Trend-Zuordnung interpretiert.

## Voraussetzungen

- Python 3.11+ und Pakete aus `requirements.txt`
- Node.js und npm sowie Pakete aus `app/package.json`
- Git für das Synchronisieren des öffentlichen Repositories

## Neue Version erstellen

```sh
python3 -m pip install -r requirements.txt
cd app && npm ci && cd ..
python3 scripts/sync_repo.py
python3 scripts/build_all.py
cd app && npm run build:standalone
```

Mit einem zusätzlichen taxonomisierten Kernel-Catalog:

```sh
python3 scripts/build_all.py --extra-catalog "/absoluter/Pfad/Kernel-mit-Taxonomie.json"
cd app && npm run build:standalone
```

Mehrere `--extra-catalog`-Argumente sind möglich. Für einen bereits vorhandenen Checkout kann stattdessen `python3 scripts/build_all.py --repo-root "/Pfad/zur/Stand-der-Technik-Bibliothek"` verwendet werden. `sync_repo.py` synchronisiert ausschließlich die öffentliche Bibliothek und überschreibt keinen fremden Nicht-Git-Ordner.

Der statische Vite-Build liegt unter `app/dist/`, die einzelne transportable HTML-Datei unter `app/dist/Stand der Technik-Radar.html`. Vorberechnete Daten werden in `data/build/` und `app/public/generated/` abgelegt. Die öffentliche Commit-ID sowie Herkunft, relative Pfade und SHA-256-Hashes der berücksichtigten OSCAL-Dateien stehen in `taxonomy-map.json`.

## Bedienung

Das Kreisdiagramm und die Trend-Bubbles sind per Tastatur bedienbar. Eine hierarchische Listenansicht bietet dieselben Taxonomiethemen ohne SVG; auf schmalen Bildschirmen ist sie die primäre Navigation. Detailtabellen lassen sich nach Text und Quellenart filtern und sind seitenweise begrenzt. Radar-Auswahl und Ansicht sind über die URL-Hash-Navigation verlinkbar; Zurück/Vorwärts funktioniert im Browser. Bewegungen respektieren `prefers-reduced-motion`.

## Qualitätssicherung

```sh
python3 -m pytest -q
cd app && npm run build
```

Die Tests decken insbesondere kontextabhängige Mehrfachzuordnungen, die manuelle Katalogkopie, fehlende Taxonomie und ungültige Pfade ab.
