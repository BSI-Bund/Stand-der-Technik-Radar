# Stand der Technik-Viewer

## Installation und Start

Der Viewer muss nicht installiert werden und benötigt keinen lokalen Server. Für die Nutzung werden lediglich die Viewer-HTML-Datei, die D3-Bibliothek und das Logo gemeinsam in einem Ordner gespeichert.

### Schritt-für-Schritt-Anleitung

1. Einen neuen Ordner auf dem eigenen Computer anlegen, zum Beispiel:

   ```text
   Stand-der-Technik-Viewer
   ```

2. Die Viewer-Datei aus diesem Repository herunterladen:

   - `Stand der Technik-Viewer.html` für die deutsche Version
   - `State-of-the-art-OSCAL-Viewer-EN.html` für die englische Version

   Auf GitHub dazu die jeweilige Datei öffnen und über den Download-Button herunterladen. Alternativ kann das gesamte Repository über `Code` > `Download ZIP` heruntergeladen und anschließend entpackt werden.

3. Die Datei `d3.v7.min.js` herunterladen. Sie wird für die Graph-, Sunburst- und Balkendiagramme benötigt.

4. Die Datei `viewer_logo.png` herunterladen. Sie wird als Logo im linken Menüband angezeigt.

5. Die drei heruntergeladenen Dateien in denselben Ordner legen. Für die deutsche Version muss der Ordner danach beispielsweise so aussehen:

   ```text
   Stand-der-Technik-Viewer/
   |-- Stand der Technik-Viewer.html
   |-- d3.v7.min.js
   |-- viewer_logo.png
   ```

   Für die englische Version wird stattdessen `State-of-the-art-OSCAL-Viewer-EN.html` verwendet. Die Dateinamen von `d3.v7.min.js` und `viewer_logo.png` dürfen nicht geändert werden, da die HTML-Datei genau diese Namen erwartet.

6. Die HTML-Datei per Doppelklick öffnen. Sie startet im Standardbrowser. Alternativ kann sie über das Kontextmenü mit einem aktuellen Browser wie Chrome, Edge oder Firefox geöffnet werden.

7. Im Viewer ein OSCAL-Dokument laden:

   - über die Dateiauswahl eine lokale OSCAL-JSON-Datei auswählen oder
   - eine URL zu einem OSCAL-JSON-Dokument eingeben und laden.

8. Nach dem Laden können die Katalog-, Komponenten- oder Mappingansicht sowie Suche, Filter, Diagramme, JSON-Ansicht und PDF-Export verwendet werden.

> **Wichtig:** Wenn das Logo fehlt, bleibt der Logo-Bereich leer. Wenn `d3.v7.min.js` fehlt oder nicht im selben Ordner liegt, funktioniert der Viewer grundsätzlich weiterhin, die Diagrammansichten können jedoch nicht dargestellt werden.

Der Viewer verarbeitet aktuell:

- OSCAL Catalogs
- OSCAL Component Definitions
- OSCAL Control Mapping Collections

Die gesamte Verarbeitung erfolgt clientseitig im Browser. Es gibt keinen Serveranteil und keinen Upload an einen externen Dienst.

## Enthaltene Dateien

- `Stand der Technik-Viewer.html`
  Viewer mit eingebettetem CSS und JavaScript.
- `d3.v7.min.js`
  Lokal eingebundene D3-Bibliothek für Graph-, Sunburst- und Balkendiagramm-Ansichten.
- `viewer_logo.png`
  Optionales Logo im linken Menüband.

## Was der Viewer aktuell kann

### Allgemein

- drei getrennte Datenmodi in einer Datei
  - `Katalog`
  - `Komponenten`
  - `Mappings`
- paralleles Laden aller drei Dokumenttypen
  - Catalog per Datei oder URL
  - Component Definition per Datei oder URL
  - Control Mapping Collection per Datei oder URL
- automatische Umschaltung des linken Panels passend zum aktiven Haupt-Tab
- dynamische Summary-Box oberhalb des Inhalts
  - `Kataloganalyse` im Katalogmodus
  - `Komponentenanalyse` im Komponentenmodus
  - `Mappinganalyse` im Mappingmodus
- GitHub-`blob`-Links werden automatisch auf `raw` umgeschrieben
- geladene OSCAL-Dokumente werden in Quellen- und Repository-Auswahlen über `metadata.title` statt über den JSON-Dateinamen bezeichnet
- vollständig lokale Darstellung im Browser

### Haupt-Tabs

- `Katalog`
- `Komponenten`
- `Mappings`
- `Graph`
- `Sunburst`
- `Balkendiagramm`
- `JSON`

Der Tab `JSON` zeigt immer den aktuell aktiven Datenmodus. `Graph`, `Sunburst` und `Balkendiagramm` visualisieren Catalogs und Component Definitions; für Control Mappings bleibt die Crosswalk-Tabelle die primäre Ansicht.

## Mappingansicht

- Laden einer OSCAL Control Mapping Collection
  - per Datei-Upload
  - per URL-Import via `fetch`
- strukturierte Anzeige von Metadata, Provenance, Ressourcen und Control-Referenzen
- sieben Spalten umfassende Crosswalk-Tabelle:
  - Source: `Prose`, `Titel`, `ID`
  - Mitte: `Relationship`
  - Target: `ID`, `Titel`, `Prose`
- Titel und Statement-Prose werden aus parallel geladenen Catalogs ergänzt
- Source- und Target-Katalogtitel stehen einmalig in den Tabellen-Gruppenüberschriften
- Filter nach Volltext, Zielpraktik, Relationship, Source-/Target-Katalog, Matching-Art und Status
- Unterstützung der OSCAL-Relationship-Typen wie `equivalent-to`, `equal-to`, `subset-of`, `superset-of`, `intersects-with` und `no-relationship`
- optionale Anzeige von Control-Titeln, wenn die referenzierten Catalogs parallel geladen sind

## Katalogansicht

### Laden und Navigation

- Laden eines OSCAL Catalog JSON
  - per Datei-Upload
  - per URL-Import via `fetch`
- hierarchische Darstellung mit:
  - Praktiken
  - Themen
  - Gruppen
  - Anforderungen
- Sprunglogik zwischen:
  - Beziehungsboxen und Zielanforderung
  - Graph und Listenansicht

### Informationen pro Anforderung

- Titel und ID
- UUID
- Quellkatalog
- Sicherheitsniveau
- Aufwand inkl. Tooltip
- Thema
- Zielobjektkategorie
- Dokumentationsempfehlung
- Tags
- JSON-Button pro Anforderung

### Detaildarstellung pro Anforderung

- `Statement`
- `Guidance`
- `Remarks`
- weitere `parts`
- Beziehungen:
  - `required`
  - `related`

### Kataloginformationen

Oberhalb der Anforderungen werden strukturierte Informationen aus dem Catalog angezeigt:

- `Metadaten`
- `Backmatter`

Die Anzeige ist bewusst als strukturierte Name/Wert-Darstellung umgesetzt und nicht als Roh-JSON.

### Suche und Filter im Katalog-Modus

- Volltextsuche
- Praktiken
- Quellkataloge
- Sicherheitsniveaus
- Zielobjektkategorien
- Tags
- Aufwände
- Modalverben
- Dokumentationsempfehlungen
- Handlungswörter

Die Filter sind AND-verknüpft. `Filter zurücksetzen` leert das Suchfeld, setzt alle Dropdowns zurück und schließt geöffnete Filter-Dropdowns.

## Komponentenansicht

### Laden und Navigation

- Laden einer OSCAL Component Definition
  - per Datei-Upload
  - per URL-Import via `fetch`
- strukturierte Darstellung für:
  - Metadaten
  - Import Component Definitions
  - Back Matter
  - Capabilities
  - Components
  - Control Implementations
  - Implemented Requirements
  - Statements

### Informationen pro Komponente

- Titel
- Typ als lesbare Kennzeichnung, z. B. `Typ: policy`
- UUID
- Description
- optional:
  - Purpose
  - Remarks
  - Links & Dokumentationen
  - Props
  - Protocols
  - Responsible Roles
  - weitere optionale Felder aus der Component Definition

### Links & Dokumentationen in Komponenten

Komponenten-Links werden nicht als rohe Objektliste dargestellt, sondern in einem eigenen aufklappbaren Abschnitt:

- `Links & Dokumentationen`

Jeder Link wird menschenlesbar als eigener Block gerendert:

- Linktext bzw. Dokumenttitel
- aufgelöste URL
- Metadaten-Chips für:
  - `href`
  - `rel`

Wenn ein Link über Back Matter aufgelöst wird, verwendet der Viewer bevorzugt dessen Resource-Informationen.

### Capabilities

Capabilities werden als eigene Einträge angezeigt. Wenn sie Komponenten referenzieren, erscheint eine strukturierte Referenzliste mit:

- Component-Titel
- Component-UUID
- Button `Zum Eintrag`

Der Button springt direkt zur passenden Komponente in der Komponentenansicht und öffnet den zugehörigen Block.

### Control Implementations

Unter Komponenten und optional auch unter Capabilities werden `Control Implementations` mit Quelle und zugeordneten Anforderungen angezeigt.

Das aufklappbare Feld `Implementierungsbeschreibungen` zeigt die zugeordneten Anforderungen unmittelbar in einer Tabelle:

- linke Spalte `Anforderung`: fett hervorgehobene Control-ID, Control-Titel und Prose-Text aus einem parallel geladenen Catalog
- rechte Spalte `Implementierungsbeschreibung`: Description des `Implemented Requirement` und, falls vorhanden, die Descriptions seiner `Statements`

Die Description der jeweiligen `Control Implementation` steht direkt unter der Quellenangabe und vor der Tabelle. Unterhalb der Tabelle erscheint nur dann ein aufklappbares Feld `Remarks`, wenn mindestens ein `Implemented Requirement` einen Remarks-Text enthält.

Ist kein passender Catalog geladen, weist die linke Spalte darauf hin. Die Implementierungsbeschreibungen aus der Component Definition bleiben trotzdem sichtbar.

### Implemented Requirements und Cross-Navigation

Wenn ein passender Catalog geladen ist, führt der Button `Im Katalog öffnen` direkt zur referenzierten Anforderung im Katalog-Tab.

Der Viewer merkt sich dabei die exakte Position in der Komponentenansicht. Beim Zurückwechseln zum Tab `Komponenten` wird wieder zu genau der Requirement in der ursprünglichen Komponente gesprungen.

Der Button `JSON` in jeder Tabellenzeile zeigt weiterhin die vollständigen Rohdaten des jeweiligen `Implemented Requirement`.

### Suche und Filter im Komponenten-Modus

- Volltextsuche
- Komponententypen
- Quellen
- Komponenten
- Capabilities

Auch hier setzt `Filter zurücksetzen` alle Filter auf den Ausgangszustand zurück.

## Diagramme

D3 wird lokal eingebunden:

```html
<script src="./d3.v7.min.js"></script>
```

Die Diagramme werden lazy gerendert, also nur dann neu aufgebaut, wenn der jeweilige Tab sichtbar ist.

### Graph

Im Katalog-Modus:

- Force-Directed Graph für Anforderungen und Beziehungen
- `required`-Beziehungen mit Richtung
- Klick auf Knoten springt zur passenden Anforderung im Katalog

Im Komponenten-Modus:

- Graph für:
  - Capabilities
  - Components
  - Implemented Requirements
- Beziehungen zwischen:
  - Capability und Komponente
  - Owner und Requirement
- Klick auf Requirement-Knoten kann direkt in den Katalog springen oder innerhalb der Komponentenansicht navigieren

### Sunburst

Im Katalog-Modus:

- Verteilung der Anforderungen nach Praktiken bzw. Gruppen

Im Komponenten-Modus:

- Verteilung der Einträge nach Komponententypen
- zusätzliche Zusammenfassung von Capabilities

### Balkendiagramm

Im Katalog-Modus:

- Anzahl der Anforderungen pro Praktik bzw. Gruppe

Im Komponenten-Modus:

- Anzahl der referenzierten Anforderungen pro Quelle (`source`)

## JSON-Funktionen

- `JSON`-Tab
  - zeigt immer das aktuell aktive Dokument als formatiertes JSON
  - also entweder den geladenen Catalog oder die geladene Component Definition
- JSON-Button in einzelnen Karten
  - öffnet ein Modal mit dem JSON genau dieses Eintrags
  - z. B. Anforderung, Komponente oder Implemented Requirement

## Markdown- und Markup-Unterstützung

Markup-fähige Textfelder werden leichtgewichtig direkt im Viewer gerendert. Das betrifft unter anderem:

- `metadata.remarks`
- `control.remarks`
- `statement`
- `guidance`
- `part.prose`
- `component.description`
- `component.purpose`
- `component.remarks`
- `implemented-requirement.description`
- `statement.description`

Unterstützt werden aktuell:

- Absatzdarstellung
- Überschriften mit `#`
- Listen
- Blockquotes
- Inline-Code mit `` `...` ``
- Fett mit `**...**`
- Markdown-Links
- Tabellen im Markdown-Stil
- Bilder per Markdown-Bildsyntax
- Code-Blocks mit ``` ``` `

Die Implementierung ist absichtlich leichtgewichtig und ohne externe Markdown-Library gehalten.

## Bilder und relative Links

Zuverlässig unterstützt:

- absolute `https://...`- oder `http://...`-URLs
- `data:image/...`-URIs
- relative Pfade, wenn das Dokument selbst per URL geladen wurde

Der Viewer merkt sich bei URL-Importen die Basis-URL des geladenen Dokuments und löst relative Pfade dagegen auf.

Bei lokalem Datei-Upload sind relative lokale Pfade in der Regel nicht verlässlich auflösbar. In diesem Fall sind sinnvoll:

- Dokument ebenfalls per URL bereitstellen
- Ressourcen über `https://...` referenzieren
- kleine Bilder direkt als `data:image/...` einbetten

## Parameterdarstellung

OSCAL-Parameterersetzungen wie:

```text
{{ insert: param, gc.1.1-prm1 }}
```

werden vor dem Rendern ersetzt. Anschliessend werden:

- Parameter-Label farblich hervorgehoben
- Parameter-Values farblich hervorgehoben

Das gilt für markup-fähige Textfelder in Catalogs.

## PDF-Export

Beide Datenmodi können über den Browser-Druckdialog als PDF exportiert werden:

- `Als PDF exportieren` im Katalog-Panel
- `Als PDF exportieren` im Komponenten-Panel

Vor dem Druck öffnet der Viewer die relevante Listenansicht, klappt Details auf und schaltet auf ein druckoptimiertes Layout um.

## Technischer Aufbau

Der Viewer ist eine einzelne HTML-Datei mit eingebettetem CSS und JavaScript.

Grober Aufbau:

- Parser für Catalogs
- Parser für Component Definitions
- separater Laufzeitstatus für beide Datenmodi
- DOM-basierte Renderer für:
  - Katalogansicht
  - Komponentenansicht
  - Metadaten
  - Back Matter
  - Diagramme
- Interaktionslogik für:
  - Multi-Select-Dropdowns
  - debounced Suche
  - JSON-Modal
  - Cross-Navigation zwischen Katalog und Komponenten

## Performance-Aspekte

Der Viewer ist auf größere OSCAL-Dokumente ausgelegt. Wichtige Maßnahmen:

- debounced Volltextsuche
- lazy Rendering der Diagramme
- Caching für markup-fähige Texte
- direkte DOM-Erzeugung ohne Framework
- Lazy-Loading für Bilder
- getrennte States für Katalog- und Komponenten-Daten

## Fehlerbehebung

- Es wird nichts angezeigt
  - JSON-Struktur ist nicht kompatibel oder es gibt einen Parsing-Fehler
  - Fehlermeldung im Viewer prüfen
- Diagramme bleiben leer
  - `d3.v7.min.js` fehlt oder wurde nicht geladen
- URL-Laden schlägt fehl
  - URL prüfen
  - Raw-URL verwenden
  - CORS des Zielservers prüfen
- Sprung in den Katalog funktioniert nicht
  - passender Catalog ist nicht geladen
  - `control-id` der Component Definition passt nicht zu einer Anforderung im geladenen Catalog
- Bilder oder Dokumentlinks werden nicht angezeigt
  - Ziel-URL prüfen
  - bei lokalem Datei-Upload keine relativen lokalen Pfade verwenden
  - bei URL-Dokumenten prüfen, ob relative Pfade korrekt zur Dokument-URL passen
- Keine Treffer in Suche oder Filtern
  - Filter zurücksetzen
  - prüfen, ob der gesuchte Begriff in den geladenen Daten wirklich vorkommt

## Sicherheit und Datenschutz

- Verarbeitung erfolgt vollständig lokal im Browser
- keine Telemetrie oder externe Tracking-Integration im Viewer
- beim Laden per URL sendet der Browser eine HTTP-Anfrage an die angegebene Adresse
- für externe Bilder oder Links gelten die Sicherheits- und Verfügbarkeitsbedingungen der jeweiligen Quelle

## Scope dieser README

Diese README beschreibt den aktuellen Implementierungsstand des `Stand der Technik-Viewers` im Ordner, einschließlich:

- Katalogansicht
- Komponentenansicht
- Metadaten- und Backmatter-Anzeige
- JSON-Tab und JSON-Modal
- Such- und Filterlogik in beiden Datenmodi
- Diagrammansichten auf Basis von D3
- Cross-Navigation zwischen Komponenten und Katalog
- PDF-Export
- Markdown-/Markup-Unterstützung inklusive Tabellen, Bilder und Links
