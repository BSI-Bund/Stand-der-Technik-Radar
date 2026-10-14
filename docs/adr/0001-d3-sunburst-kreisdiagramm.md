# ADR 0001: D3-Sunburst fuer IT-Produkt-Mapping und Trendmapping

> Historische Fachentscheidung. Aktueller Aufbau und Pages-Betrieb: [ADR 0003](0003-kern-pages.md). Frühere Pfade und Exportangaben sind überholt.

## Status

Akzeptiert

## Datum

2026-06-26

## Kontext

Das Stand der Technik-Radar soll als statische HTML-Datei ausgeliefert werden koennen und ohne Backend lauffaehig sein. Die zentrale Visualisierung im IT-Produkt-Mapping ist ein dreistufiges Kreisdiagramm:

- Level 1: CSF Funktion
- Level 2: IT-Domaene
- Level 3: Produkt-/Servicegruppe

Die zugrunde liegenden Daten werden vor dem Frontend-Build aus der Excel-Taxonomie und den lokalen OSCAL Catalogs / OSCAL Component Definitions erzeugt. Das Frontend darf keine fachliche Mapping-Logik zur Laufzeit nachholen, sondern zeigt nur die vorberechneten Artefakte aus `app/public/generated/` bzw. aus der eingebetteten Standalone-HTML an.

Das Diagramm ist fuer externe Stakeholder und Leitungsebene gedacht. Es muss daher fachlich nachvollziehbar, visuell ruhig, interaktiv bedienbar und in der Standalone-Datei stabil sein.

## Entscheidung

Das Kreisdiagramm wird als D3-basierter Sunburst/Ring-Renderer in React umgesetzt. Fuer die Geometrie werden `d3-hierarchy` und `d3-shape` verwendet. Das Datenmodell bleibt eine hierarchische Taxonomie mit vorberechneten Counts und Mapping-IDs. Es erfolgt keine Umstellung auf Plotly, Recharts, Nivo oder ein anderes Chart-Framework.

Die Label-Platzierung wird nicht an D3-Defaults delegiert. Stattdessen gibt es eine zentrale deterministische SVG-Layout-Funktion fuer Segmentlabels. Diese prueft fuer jedes Segment, ob ein sichtbares Label vollstaendig in sein eigenes Ringsegment passt. Passt es nicht, wird es verkleinert, umgebrochen, mit `...` gekuerzt oder ausgeblendet. Ein sichtbares Label darf nicht in benachbarte Segmente oder ueber Ringgrenzen hinausragen.

## Begruendung

D3 liefert die passende Kontrolle ueber die exakte Segmentgeometrie eines mehrschichtigen Ringdiagramms. Diese Kontrolle ist fuer das Stand der Technik-Radar wichtiger als eine fertige High-Level-Chart-Komponente, weil:

- Die Taxonomie hat drei fachliche Ebenen, die als echte konzentrische Ringe sichtbar bleiben muessen.
- Level-3-Segmente koennen sehr unterschiedlich gross sein, weil die Groesse von gemappten Controls und Components abhaengt.
- Auch Taxonomie-Themen ohne Mapping muessen sichtbar bleiben, damit Luecken in der Bibliothek erkennbar sind.
- Die statische HTML muss ohne Server, externe Datenabfrage und fragile Runtime-Abhaengigkeiten funktionieren.
- Die Beschriftung ist fachlich relevant. Abgeschnittene, kopfstehende oder ueberlappende Labels wuerden die Aussage des Diagramms verfaelschen.

High-Level-Chart-Bibliotheken bieten zwar automatische Labels, aber zu wenig Kontrolle ueber die finale SVG-Geometrie, ueber Annular-Sector-Containment und ueber das exakte Fallback-Verhalten bei langen Taxonomietiteln.

## Vorgaben fuer das Diagramm

Das Diagramm muss folgende Anforderungen erfuellen:

- Es gibt genau drei fachliche Ringe fuer Level 1, Level 2 und Level 3.
- Die Segmentgroesse richtet sich nach der Menge der akzeptierten Mappings.
- Level-3-Taxonomieknoten ohne Mapping bleiben als sichtbare, helle Segmente erhalten.
- Klick auf ein Segment setzt die Auswahl und aktualisiert die Detailansicht.
- Hover zeigt einen Tooltip mit Titel, Level und Mapping-Zahlen.
- Die Detailansicht listet Controls und Components getrennt auf.
- Bei Components wird keine separate ID-Spalte angezeigt, wenn diese nur die UUID wiederholen wuerde.
- Es gibt eine Diagrammsteuerung mit:
  - Auswahl zuruecksetzen
  - Segmentsuche
  - Zoom hinein
  - Zoom heraus
- Das Diagramm wird gross genug gerendert, damit die Ringstruktur und die Detailinformationen lesbar sind.
- Die Standalone-HTML enthaelt die noetigen Assets und JSON-Daten inline.

## Vorgaben fuer Labels

Jedes sichtbare Label muss vollstaendig innerhalb seines eigenen Ringsegments liegen. Die Label-Logik folgt diesen Regeln:

- D3 `arc.centroid()` bzw. die Segmentmitte darf nur Ausgangspunkt sein, nicht die Fit-Pruefung.
- Es gibt keine pauschalen Guards nur auf Basis von Mindestwinkel, Zeichenanzahl oder fester Schriftgroesse.
- Die zentrale Funktion prueft jedes Segment anhand von:
  - startAngle
  - endAngle
  - innerRadius
  - outerRadius
  - Labeltext
  - Font-Family, Font-Weight und Text-Styling
- Die Position liegt bei `r = (innerRadius + outerRadius) / 2`.
- Die bevorzugte Orientierung ist tangential zum Kreisbogen.
- Wenn tangential zu wenig Platz bietet, darf eine radial lesbare Orientierung verwendet werden.
- Text darf nie kopfstehend sein; Rotationen werden in einen lesbaren Bereich geklappt.
- Fontgroessen werden von 14 px bis 8 px in 0,5-px-Schritten getestet.
- Zuerst wird der vollstaendige einzeilige Text getestet.
- Danach wird der vollstaendige Text mit maximal zwei Zeilen an Wortgrenzen getestet.
- Zweizeilige Labels sind nur erlaubt, wenn beide Zeilen inklusive Line-Height in die Ringbreite passen.
- Wenn der vollstaendige Text nicht passt, wird mit exakt drei Punkten gekuerzt: `...`.
- Gekuerzte Labels werden per Binary Search bestimmt und muessen die laengste vollstaendig passende Variante verwenden.
- Unicode-Grapheme werden beruecksichtigt, damit nicht innerhalb zusammengesetzter Zeichen geschnitten wird.
- Ein Label wie `Software Composition Analysis Inventory` darf nicht unnoetig zu `S...` werden, wenn `Software...` oder eine laengere Variante in dasselbe Segment passt.
- Ist selbst `...` bei 8 px nicht vollstaendig darstellbar, wird das SVG-Label ausgeblendet.
- Ausgeblendete und gekuerzte Labels behalten den vollstaendigen Titel ueber `title` bzw. Tooltip zugaenglich.

## Geometrische Pruefung

Die Label-Pruefung erfolgt zweistufig:

1. Vorpruefung mit Canvas `measureText()`
   - Es wird die reale Textbreite mit der gleichen Font-Konfiguration gemessen.
   - Bei mehrzeiligen Labels wird jede Zeile gemessen.
   - Die Textblockhoehe beruecksichtigt Line-Height.
   - Die verfuegbare radiale und tangentiale Flaeche wird konservativ berechnet.
   - Visual Padding beruecksichtigt Abstand zu Segmentgrenzen, Stroke und Textkontur.

2. Finale SVG-Pruefung
   - Der Kandidat wird unsichtbar im gleichen SVG-Kontext gerendert.
   - `getBBox()` wird nur als lokale Box verwendet.
   - Die vier Box-Ecken werden in das Diagrammkoordinatensystem transformiert.
   - Jede Ecke muss:
     - ausserhalb von `innerRadius + visualPadding` liegen
     - innerhalb von `outerRadius - visualPadding` liegen
     - zwischen `startAngle` und `endAngle` mit Angular Padding liegen
   - Ein Kandidat gilt nur als valide, wenn diese Pruefung vollstaendig erfolgreich ist.

ClipPaths duerfen hoechstens als zusaetzliche Sicherheitsbarriere dienen. Sie ersetzen nicht die Layout-Pruefung. Ein geclipptes oder abgeschnittenes Label gilt als Fehler.

## Fallback-Reihenfolge

Die verbindliche Fallback-Reihenfolge lautet:

1. Vollstaendiger Text, einzeilig, groesste passende Fontgroesse
2. Vollstaendiger Text, einzeilig, kleinere Fontgroessen bis 8 px
3. Vollstaendiger Text, maximal zwei Zeilen, groesste passende Fontgroesse
4. Vollstaendiger Text, maximal zwei Zeilen, kleinere Fontgroessen bis 8 px
5. Gekuerzter einzeiliger Text mit `...`
6. Laengste vollstaendig passende gekuerzte Variante ueber alle erlaubten Fontgroessen und Orientierungen
7. Label ausblenden, vollstaendigen Titel per Tooltip bzw. `title` behalten

Ein gekuerztes sichtbares Label ist dem vollstaendigen Ausblenden vorzuziehen, sofern es die finale Geometriepruefung besteht.

## Debugbarkeit

Jedes Label erhaelt Debug-Attribute:

- `data-label-state="visible"` fuer sichtbare Labels
- `data-label-state="hidden"` fuer ausgeblendete Labels
- `data-label-truncated="true"` fuer gekuerzte Labels
- `data-label-hidden-reason` fuer ausgeblendete Labels

Typische Hidden-Reasons:

- `insufficient-arc-width`
- `insufficient-ring-height`
- `failed-final-containment-check`
- `ellipsis-does-not-fit`

## Resize und Stabilitaet

Das Label-Layout wird neu berechnet, wenn sich die Groesse des Diagrammcontainers aendert. Dafuer wird ein `ResizeObserver` verwendet. Zusaetzlich wird nach `document.fonts.ready` neu gelayoutet, damit Textmessungen nach dem Laden der Fonts stabil sind.

Zoom veraendert den SVG-ViewBox-Ausschnitt. Die Label-Layout-Logik bleibt deterministisch und wird bei relevanten Aenderungen erneut ausgefuehrt.

## Konsequenzen

Positive Konsequenzen:

- Die Visualisierung bleibt als statische HTML auslieferbar.
- Das Diagramm bleibt fachlich direkt an der dreistufigen Taxonomie orientiert.
- Labels werden nachvollziehbar und reproduzierbar platziert.
- Zu kleine Segmente bleiben sichtbar, ohne durch fehlerhafte Labels unlesbar zu werden.
- Die Detailansicht kann konsistent aus den gleichen Mapping-IDs gespeist werden.

Negative Konsequenzen:

- Der eigene Label-Renderer ist komplexer als ein Chart-Framework-Default.
- Aenderungen an Schrift, Stroke, Schatten oder Ringbreiten muessen gegen die Label-Pruefung getestet werden.
- Browser-Unterschiede bei SVG-Bounding-Boxes und Font-Rendering bleiben ein Restrisiko und muessen visuell geprueft werden.

## Alternativen

### Plotly Sunburst

Plotly bietet schnelle Sunburst-Diagramme mit responsivem Layout. Es wurde verworfen, weil die Kontrolle ueber SVG-Label-Containment, Tooltip-Integration, Debug-Attribute und Standalone-Bundle-Verhalten geringer waere.

### Recharts oder Nivo

Recharts und Nivo sind fuer React-Anwendungen komfortabel. Sie wurden verworfen, weil die benoetigte dreistufige Ringgeometrie mit strenger Label-Fit-Pruefung und finaler Annular-Sector-Validierung direkter mit D3 kontrolliert werden kann.

### Canvas-only Rendering

Canvas koennte fuer Performance vorteilhaft sein. Es wurde verworfen, weil SVG bessere Barrierefreiheit, native `title`-Elemente, DOM-Debugbarkeit, CSS-Styling und gezielte Interaktion pro Segment bietet.

## Akzeptanzkriterien

- Kein sichtbares Label ueberschreitet Segmentraender.
- Kein sichtbares Label ist kopfstehend.
- Labels werden nicht nur wegen pauschaler Winkel- oder Zeichenlimits versteckt.
- Jedes Label, das bei mindestens 8 px ein- oder zweizeilig vollstaendig passt, wird angezeigt.
- Passt der vollstaendige Text nicht, wird automatisch die laengste passende Variante mit `...` angezeigt.
- Ein Label wird nur ausgeblendet, wenn selbst die gekuerzte Variante inklusive `...` nicht valide passt.
- Tooltip bzw. `title` enthaelt immer den vollstaendigen Originaltitel.
- Suche, Auswahl, Reset und Zoom funktionieren ohne Backend.
- `npm run build`, `npm run build:standalone` und die vorhandenen Tests laufen erfolgreich.
