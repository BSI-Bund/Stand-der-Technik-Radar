# Vorübergehender Kernel-Zusatzkatalog

## Zweck und Herkunft

Der lokal erstellte Kernel mit vollständigen Taxonomiezuordnungen ergänzt vorübergehend die öffentliche Bibliothek. Seine 901 Control-Vorkommen erscheinen als „Zusatzkatalog“. Die Quelldatei ist dieselbe wie im früheren Radar; ihre SHA-256 lautet `a386560e32cfce13d1e14ad88e453752f8b8e20e4fee0799716503b9819dbb33`. Die Freigabe zur Wiederaufnahme erfolgte am 14.10.2026.

Die vollständige OSCAL-Datei wird nicht zusätzlich als Website-Asset kopiert. Versioniert wird die für das Radar erforderliche Projektion: Identitäten, Titel, Herkunft und Taxonomiepfade. Damit bleibt das neue Repository eigenständig lauffähig und kopierbar, ohne lokale Dateipfade oder nicht benötigte Katalogbestandteile zu übernehmen.

## Verantwortlichkeiten

| Datei                                         | Zweck                                                        |
| --------------------------------------------- | ------------------------------------------------------------ |
| `data/configs/radar-supplements.json`         | Aktivierung und ausdrücklich ersetzte öffentliche Quellpfade |
| `data/supplements/kernel-g0.json`             | Freigegebene Kernel-Projektion mit Herkunft und SHA-256      |
| `data/snapshots/public-radar.json`            | Rein öffentlicher Basisstand für den Rückfallbuild           |
| `public/generated/supplemental-catalogs.json` | Aktive Zusatzprojektionen für den Web Worker                 |
| `public/generated/taxonomy-map.json`          | Kombinierter Rückfallstand bei nicht verfügbarem Live-Abruf  |
| `scripts/build_supplements.py`                | Reproduzierbare Erzeugung beider Anzeigedateien              |

Der Kernel ersetzt ausschließlich `control_layer/Grundschutz++/sources/catalogs/Kernel/BSI-Stand-der-Technik-Kernel-G0-catalog.json`. Andere Katalogvarianten und neue öffentliche Inhalte bleiben erhalten. Es gibt keinen unscharfen Titelabgleich und kein automatisches Entfernen des Zusatzkatalogs bei mehr öffentlichen Treffern. Über dessen Entfernung entscheidet die Redaktion.

## Im Browser

Der Worker lädt den freigegebenen Zusatzbestand von derselben Website mit HTTP-Revalidierung, damit Änderungen beim nächsten Öffnen wirksam werden. Er ergänzt sowohl gespeicherte als auch frisch geladene öffentliche Daten und berechnet konsistente Zähler und Taxonomieansichten. Der IndexedDB-Cache bleibt rein öffentlich. Die Oberfläche kennzeichnet die Ergänzung; öffentliche Revisions- und Prüfzeitpunkte beziehen sich auf den Bibliotheksabgleich. Ein Fehler beim Laden der Ergänzung führt zum gekennzeichneten Rückfallstand, nicht zu einer unbemerkt unvollständigen Anzeige.

## Später entfernen

```sh
python scripts/build_supplements.py --disable-kernel
npm run check
```

Das deaktiviert den Kernel in der Konfiguration, erzeugt einen leeren aktiven Zusatzbestand und baut den Rückfallstand aus der öffentlichen Basis neu. `docs/data-snapshot.json` wird mitgeführt. Nach Veröffentlichung und Neuladen verschwindet die Ergänzung auch bei unverändertem öffentlichem Commit und bestehendem Browser-Cache. Die deaktivierte Quelldatei kann als dokumentierte Historie im Repository bleiben oder im selben Review entfernt werden; sie wird bei deaktivierter Konfiguration nicht in die Website eingebunden.

Für einen aktuelleren öffentlichen Rückfallstand zuvor die Bibliothek synchronisieren und `python scripts/build_taxonomy_map.py` ausführen. Dieses Skript aktualisiert die öffentliche Basis und wendet die aktive Ergänzung anschließend an. Das Trendmapping wird dabei nicht geändert.

## Projektion aus einem aktualisierten Kernel erzeugen

Nur einen ausdrücklich zur Aufnahme freigegebenen Katalog verwenden:

```sh
python scripts/build_supplements.py --kernel-catalog /pfad/BSI-Stand-der-Technik-Kernel-G0-catalog-with-taxonomy.json
npm run check
```

Die Aktivierung erfolgt in der Konfiguration; ein zuvor deaktivierter Katalog wird durch den Import nicht stillschweigend wieder aktiviert. Die vollständige Rohdatei bleibt lokal. Taxonomiefehler verhindern den Import. Änderungen an dieser Projektion aktualisieren keine Trendzuordnungen. Importberichte bleiben ausschließlich in `data/build/`.
