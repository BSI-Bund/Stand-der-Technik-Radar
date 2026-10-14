# Architektur

## Systemgrenze

Das Radar ist eine statische React-/TypeScript-Anwendung mit Vite. Das Radar prüft die öffentliche Bibliothek beim Öffnen und bereitet geänderte OSCAL-Dateien in einem Web Worker auf. IndexedDB speichert vollständige geprüfte Radardaten und kompakte Dateiergebnisse. Python berechnet weiterhin redaktionelle Trendzuordnungen und den mitgelieferten Radar-Rückfallstand. Es gibt keinen eigenen Serverprozess oder serverseitige Datenbank.

## Verantwortlichkeiten

| Verzeichnis           | Verantwortung                                                         |
| --------------------- | --------------------------------------------------------------------- |
| `src/app`             | Anwendungseinstieg, Hash-Navigation, Farbschema, gemeinsame Kopfzeile |
| `src/features/radar`  | Taxonomie, Kreisdiagramm, Textnavigation, Ergebnistabellen            |
| `src/features/trends` | Trendjahre, Blasenanordnung, Profil und Treffer                       |
| `src/domain`          | Gemeinsame typisierte Datenverträge                                   |
| `src/infrastructure`  | Pages-kompatibler Datenzugriff, Sitzungscache, Fehlerbehandlung       |
| `src/shared/ui`       | Zustandsarme KERN-Bausteine und Fehlergrenze                          |
| `src/styles`          | KERN-Import, Foundation, Shell und fachliche Stylesheets              |
| `scripts`             | Python-Datenpipeline, öffentliche Projektion und Buildprüfungen       |

React rendert native KERN-Strukturen. Die imperativen DOM-Helfer des Viewers werden deshalb nicht kopiert. Gemeinsam sind Design-System, Schrift, Farben, Abstands- und Bedienkonventionen. KERN-Styles und Produktregeln liegen in expliziten CSS-Layern. Die Farbschema-Schaltung setzt das native `data-kern-theme`-Attribut; fachliche Diagrammfarben bleiben davon unabhängig und werden separat geprüft.

## Datenfluss

Radar: `main`-Revision → unveränderlicher Git-Dateibaum → neue/geänderte OSCAL-Dateien → Worker-Validierung und Taxonomiebaum → atomarer IndexedDB-Stand → React. Für die Darstellung wird eine separat versionierte Zusatzkatalog-Projektion auf den öffentlichen Stand angewendet. Der öffentliche Cache enthält keine Zusatzkatalog-Daten. Bei unveränderter Revision wird der Cache übernommen; bei Fehlern der letzte vollständige Stand angezeigt. Details und Grenzen siehe [live-library.md](live-library.md).

Der separate redaktionelle Datenfluss bleibt:

```text
Öffentlicher Bibliotheks-Checkout + Taxonomie + Trend-Packs
  → Python: validierte Taxonomie / eigenständige Trendbewertung
  → interne Ergebnisse unter data/build und data/mappings
  → ausdrücklich ausgewählte öffentliche UI-Projektion
  → public/generated → Vite dist/generated
  → Datenladefunktionen → React-Fachansicht
```

Die Taxonomie wird ausschließlich aus vollständigen `Taxonomy-L1` bis `Taxonomy-L4`-Properties übernommen. Das Trendmapping verwendet seine eigene TF-IDF-/Term-/Facetten-Bewertung. Ein Datenpunkt ist ein Objektvorkommen pro Quelldatei; gleiche fachliche Identitäten in unterschiedlichen Katalogkontexten bleiben erhalten.

## Navigation und Performance

Diagrammauswahl verwendet `history.pushState` ohne Fragment-Scrollen und erhält die Scrollposition. Dynamische Themenlisten und Tabellen dienen nicht als Scrollanker. Hash-Links funktionieren ohne serverseitige Umschreibungsregeln, auch nach Reload unter dem Pages-Unterpfad. Frühere Links wie `#trendmapping-2025` bleiben nutzbar. Radar und Trendmapping liegen in getrennten, bedarfsgeladenen JavaScript-Modulen. JSON-Abrufe werden für die Sitzung geteilt; fehlgeschlagene Abrufe werden nicht gecacht. Späte Antworten dürfen unmontierte Ansichten nicht verändern.

Die Blasenanordnung wird nur bei geänderten Aggregaten berechnet. SVG-Labelmessungen bleiben von Tooltip-Bewegungen getrennt; Zoomen ändert lediglich den SVG-Ausschnitt. Ein ResizeObserver stimmt dessen Seitenverhältnis auf das breite Panel ab; die Höhe bleibt bei höchstens 860 Pixeln und der Kreis unverzerrt. Tabellen zeigen begrenzte Seiten statt aller Zeilen. Doppelte interne Trendbelege werden nicht mit dem UI-Datensatz ausgeliefert. Die Listen-/Formularalternativen bleiben auch auf schmalen Geräten nutzbar.

## Veröffentlichungsgrenze

`dist/` ist das einzige Pages-Artefakt. `public/generated/` besitzt eine strikt geprüfte Dateiliste. Interne Importberichte, vollständige Mapping-Rohdaten und Originalquellen werden nicht pauschal in die Website kopiert. Der Quellcodeexport verwendet ebenfalls eine ausdrückliche Auswahl. Interne Dateien werden nicht durch bloße Git-Ignore-Regeln aus einer vorhandenen Git-Historie entfernt; für die spätere Übertragung siehe `deployment.md`.
