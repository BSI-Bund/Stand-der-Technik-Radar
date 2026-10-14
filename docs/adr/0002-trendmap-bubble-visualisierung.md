# ADR 0002: Bubble-Trendmap fuer BSI-Trendmapping

> Historische Fachentscheidung. Aktueller Aufbau und Pages-Betrieb: [ADR 0003](0003-kern-pages.md). Frühere Pfade und Exportangaben sind überholt.

## Status

Akzeptiert

## Datum

2026-06-26

## Kontext

Das Stand der Technik-Radar enthaelt neben dem IT-Produkt-Mapping ein Trendmapping auf Basis der BSI-Trendanalysen 2024 und 2025. Die Trendmap soll sichtbar machen, zu welchen vom BSI identifizierten Trends bereits Inhalte in der Stand-der-Technik-Bibliothek vorhanden sind.

Die relevanten Bibliotheksinhalte sind:

- OSCAL Controls aus den Quellkatalogen der Bibliothek.
- OSCAL Components aus den Component Definitions der Bibliothek.
- Prose-, Statement-, Guidance- und Property-Texte, soweit sie fuer die fachliche Einordnung relevant sind.

Das Mapping muss vor dem Frontend-Build erzeugt werden. Das Frontend selbst darf keine fachliche Zuordnung zur Laufzeit nachholen, sondern visualisiert nur vorberechnete JSON-Artefakte. Die finale Ausgabe muss weiterhin als statische Standalone-HTML funktionieren.

Die Trendmap ist fuer externe Stakeholder und Leitungsebene gedacht. Daher muessen sowohl Mapping-Prozess als auch Darstellung nachvollziehbar, ruhig, lesbar und robust sein.

## Entscheidung

Die Trendmap wird als Bubble-Map umgesetzt. Jeder BSI-Trend wird als ein eigenstaendiger Kreis dargestellt. Die Kreisgroesse richtet sich nach der Anzahl der auf diesen Trend gemappten Inhalte aus Controls und Components.

Es werden keine zusaetzlichen visuellen Cluster wie "Governance", "Threats" oder aehnliche Obergruppen angezeigt. Die Trends bleiben direkt sichtbar und werden nicht erneut fachlich gruppiert. Damit entspricht die Darstellung dem Charakter der frueheren Darstellung des Stand der Technik-Radars, bleibt aber farblich und visuell an das neue IT-Produkt-Mapping angepasst.

Die Bubble-Map wird in React/SVG gerendert. Die Rohpositionen aus den Trenddaten dienen nur als Ausgangspunkt. Vor dem Rendering wird eine deterministische Layout-Stufe ausgefuehrt, die:

- die Trendpositionen in eine sichere SVG-Innenflaeche skaliert,
- die Verteilung optisch zentriert,
- jeden Kreis inklusive Radius innerhalb des sichtbaren Bereichs haelt,
- Ueberschneidungen zwischen Kreisen radiusbewusst aufloest,
- einen konstanten Mindestabstand zwischen Bubbles einhaelt.

Die Trendmap erhaelt keine Zoom-, Such- oder Reset-Steuerung wie das IT-Produkt-Sunburst. Diese Bedienelemente werden bewusst nicht uebernommen, weil die Bubble-Map nur wenige Trends pro Jahr zeigt und dadurch ohne zusaetzliche Navigationswerkzeuge direkt erfassbar sein soll.

## Begruendung

Eine Bubble-Map ist fuer Trendmapping geeigneter als ein Sunburst oder eine weitere hierarchische Visualisierung, weil die BSI-Trends keine stabile dreistufige Taxonomie bilden. Die fachliche Aussage ist nicht "Welche Unterkategorie liegt in welchem Ring?", sondern "Welche Trends sind wie stark durch Bibliotheksinhalte abgedeckt?".

Die Bubble-Darstellung unterstuetzt diese Aussage direkt:

- Groessere Bubbles zeigen Trends mit mehr gemappten Inhalten.
- Kleine oder leere Bubbles zeigen geringe Abdeckung oder Luecken.
- Die Trends koennen pro Jahr verglichen werden, ohne eine kuenstliche Oberstruktur zu erzeugen.
- Die Darstellung bleibt visuell nahe an der frueheren Darstellung des Stand der Technik-Radars, aber ruhiger und konsistenter mit dem neuen Design.

Die Entfernung der Cluster ist fachlich wichtig. Eine zusaetzliche Cluster-Ebene wuerde eine neue Interpretation einfuehren, die nicht zwingend aus den BSI-Trendanalysen selbst stammt und dadurch die Aussage der Karte verfaelschen koennte.

## Mapping-Prozess

Die Trenddaten werden aus den lokalen BSI-Trendanalyse-PDFs extrahiert und in strukturierte Trendpacks ueberfuehrt. Fuer jedes Jahr entstehen eigene Artefakte, insbesondere:

- `trend-pack-2024`
- `trend-pack-2025`
- `trend-aggregates-2024`
- `trend-aggregates-2025`
- `auto-trend-mappings-2024`
- `auto-trend-mappings-2025`

Das Mapping der Bibliotheksinhalte auf Trends erfolgt vor dem UI-Build. Es kombiniert fachliche Keyword-, Facetten- und semantische Aehnlichkeitslogik. Ein Mapping darf ab einer fachlich plausiblen Uebereinstimmung von etwa 60 Prozent akzeptiert werden. Inhalte duerfen aber nicht erzwungen gemappt werden, wenn die fachliche Zuordnung nicht tragfaehig ist.

Fuer jedes akzeptierte Mapping werden mindestens folgende Informationen fuer die Detailansicht bereitgestellt:

- Typ des Inhalts: Control oder Component.
- ID bzw. Titel.
- UUID.
- Score bzw. Zuordnungsstaerke.
- Zieltrend und Jahr.

Controls und Components werden in der Detailansicht getrennt angezeigt, damit erkennbar bleibt, ob ein Trend eher durch Anforderungen oder durch konkrete Implementierungsbeschreibungen abgedeckt ist.

## Visuelles Design

Die Trendmap verwendet ein helles, reduziertes Layout analog zum IT-Produkt-Mapping:

- weisser Kartenhintergrund,
- feine Rahmen,
- dezente Schatten,
- klare Typografie,
- ruhige Akzentfarben aus derselben Farbwelt wie das IT-Produkt-Mapping.

Die alte blaue Trendmap-Farbwelt wird nicht uebernommen. Die neue Darstellung soll als Teil desselben Stand der Technik-Radars wahrgenommen werden und nicht wie ein Fremdmodul aussehen.

Jeder Bubble enthaelt:

- eine kurze Trendbezeichnung,
- die Anzahl gemappter Inhalte,
- einen Tooltip mit vollstaendigem Trendnamen und Mapping-Zahlen.

Bei Klick auf einen Bubble wird der Trend ausgewaehlt. Die Seiten- bzw. Detailbereiche zeigen danach Trendprofil, Zusammenfassung und gemappte Controls / Components.

## Bubble-Layout-Regeln

Die Bubble-Positionierung darf nicht roh aus den Quellkoordinaten gerendert werden. Rohpositionen koennen fuer einzelne Jahre zu Randverletzungen fuehren, insbesondere wenn grosse Bubbles nahe am Rand liegen.

Stattdessen gilt folgende Layout-Pipeline:

1. Fuer jeden Trend wird der Radius aus der Anzahl gemappter Inhalte berechnet.
2. Die Rohkoordinaten werden inklusive Radius betrachtet.
3. Die gesamte Bubble-Verteilung wird in eine sichere SVG-Innenflaeche skaliert.
4. Die Verteilung wird innerhalb der Zeichenflaeche zentriert.
5. Jeder Bubble wird gegen die sichere Innenflaeche geclamped.
6. Eine deterministische Kollisionsauflösung schiebt ueberlappende Bubbles auseinander.
7. Nach jeder Verschiebung wird erneut gegen die sichere Innenflaeche geclamped.
8. Das Ergebnis muss fuer jedes Jahr 0 Randverletzungen und 0 Ueberschneidungen liefern.

Die Layoutfunktion darf die fachliche Groesseninformation nicht veraendern. Sie darf Positionen anpassen, aber nicht die Radiusrelationen zwischen Trends verfaelschen.

## Interaktion

Die Trendmap bietet folgende Interaktionen:

- Jahrumschaltung zwischen 2024 und 2025.
- Klick auf Bubble zur Auswahl eines Trends.
- Hover-Tooltip mit vollstaendigem Trendtitel und Mapping-Zahlen.
- Detailtabellen fuer Controls und Components.

Es gibt bewusst kein Zoom-Menue, keine Segmentsuche und keine Auswahl-zuruecksetzen-Steuerung. Diese Werkzeuge sind fuer das groessere Sunburst-Diagramm sinnvoll, wuerden die Trendmap mit wenigen Bubbles aber unnoetig schwer wirken lassen.

## Standalone-HTML

Die Trendmap muss in der statischen HTML-Ausgabe vollstaendig funktionieren. Deshalb werden die generierten Daten vor dem Export in die App-Build-Artefakte uebernommen und anschliessend in die Standalone-HTML eingebettet.

Die Standalone-HTML darf beim Oeffnen keine Quelltexte anzeigen und keine externen Backend-Abfragen benoetigen. Sie muss direkt aus dem Dateisystem oder aus einem statischen Kontext lauffaehig sein.

## Qualitaetssicherung

Fuer die Trendmap gelten folgende Akzeptanzkriterien:

- Fuer 2024 und 2025 werden Trends aus den BSI-Trendanalysen angezeigt.
- Die Trends werden nicht in neue Obercluster einsortiert.
- Jeder Bubble ist vollstaendig sichtbar.
- Bubbles ueberschneiden sich nicht.
- Die Bubble-Groesse korreliert mit der Anzahl gemappter Inhalte.
- Die Detailansicht zeigt die zugeordneten Controls und Components getrennt.
- Die Darstellung funktioniert in der normalen App und in der Standalone-HTML.
- Build und vorhandene Tests laufen erfolgreich.

Zusaetzlich sollte die Bubble-Layoutfunktion rechnerisch pruefbar bleiben:

- `edgeViolations = 0`
- `overlaps = 0`

Diese Pruefung ist wichtig, weil visuelle Randfehler bei SVG-Layouts sonst erst im Browser auffallen.

## Konsequenzen

Die Trendmap bleibt fachlich flacher als das IT-Produkt-Mapping. Das ist beabsichtigt, weil Trends keine Taxonomieebenen darstellen.

Der Mapping-Prozess ist aufwendiger als eine reine Keyword-Suche, liefert aber belastbarere Ergebnisse. Gleichzeitig bleibt ein Restrisiko bei Grenzfaellen: Inhalte mit nur schwacher fachlicher Naehe duerfen nicht automatisch in Trendabdeckung umgedeutet werden. Deshalb ist die Schwelle von etwa 60 Prozent als Mindestplausibilitaet zu verstehen, nicht als Zwang zum Mapping.

Die Bubble-Layoutlogik erhoeht den Frontend-Codeumfang, verhindert aber abgeschnittene oder ueberlappende Bubbles und macht die Darstellung fuer externe Nutzung stabiler.

## Betroffene Dateien

Die Entscheidung betrifft insbesondere:

- `scripts/extract_trend_pdfs.py`
- `scripts/map_trends.py`
- `scripts/aggregate_ui.py`
- `app/src/components/TrendMappingView.tsx`
- `app/src/App.tsx`
- `app/public/generated/trend-*.json`
- `app/dist/Stand der Technik-Radar.html`
