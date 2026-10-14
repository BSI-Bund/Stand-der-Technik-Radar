# Stand der Technik-Radar

Das Stand der Technik-Radar ist eine interaktive Übersicht über Inhalte der [Stand-der-Technik-Bibliothek](https://github.com/BSI-Bund/Stand-der-Technik-Bibliothek). Es verbindet zwei unterschiedliche Perspektiven: Das **Radar** ordnet Controls und Components in eine vierstufige Taxonomie ein. Das **Trendmapping** zeigt, welche Inhalte thematisch zu ausgewerteten BSI-Trendanalysen passen.

Öffnen Sie das [Radar](https://bsi-bund.github.io/Stand-der-Technik-Radar/) in einem aktuellen Browser. Wechseln Sie oben zwischen „Radar“ und „Trendmapping“. Die Ansichten lassen sich auch mit der Tastatur bedienen.

## Das Radar verstehen

Die Taxonomie umfasst vier Ebenen:

1. NIST-Funktion
2. Technologiedomäne
3. Produktkategorie
4. Produkt- oder Servicegruppe

Die Zuordnung stammt aus den Taxonomieangaben der jeweiligen Controls und Components; das Radar ermittelt sie nicht selbst. Ein **Control** beschreibt eine Anforderung oder Maßnahme. Eine **Component** beschreibt ein Umsetzungsobjekt in einer Component Definition.

In der Gesamtansicht sehen Sie zunächst NIST-Funktionen und Technologiedomänen. Wählen Sie ein Segment aus, um in die tieferen Ebenen zu wechseln und die Unterthemen zu erkunden. Die Diagrammauswahl hält die aktuelle Scrollposition; sie springt nicht zur Ergebnisliste. Unterhalb des Arbeitsbereichs erscheinen die zugeordneten Controls und Components mit Titel, Herkunft und vollständigem Taxonomiepfad. Die seitliche „Taxonomie als Liste“ bietet dieselben Themen ohne Kreisdiagramm und ist besonders auf schmalen Bildschirmen hilfreich.

Mit der Segmentsuche finden Sie Themen im Kreisdiagramm. Die Schaltflächen „+“ und „−“ verändern die Ansicht. Beim Heranzoomen nutzt das Diagramm die gesamte verfügbare Panelbreite; seine Höhe und Kreisproportionen bleiben erhalten. „Zur Übersicht“ führt zur Gesamtansicht zurück. In den Detailtabellen können Sie nach ID, Titel, Quelle oder Taxonomie suchen und nach Herkunft filtern. Bei öffentlich verfügbaren Quelldateien führt ein Link direkt zur Quelle. Die Browser-Navigation „Zurück“ und „Vorwärts“ funktioniert auch nach einer Themenauswahl.

### Was die Zahlen bedeuten

Die drei Übersichtskarten zeigen die Anzahl der **Controls**, der **Components** und der **Produkt- und Servicegruppen mit Treffern** im Radar. Gezählt werden Treffer pro Quelldatei: Derselbe Control kann in mehreren Katalogen stehen und je nach Kontext unterschiedlichen Themen zugeordnet sein. Solche Treffer bleiben getrennt sichtbar.

Die angezeigten Mengen beschreiben die im Radar dargestellten Inhalte. Sie sind weder eine Bewertung ihrer Qualität noch ein Nachweis vollständiger Abdeckung eines Themengebiets.

## Das Trendmapping verstehen

Das Trendmapping ist eine **separate, automatisierte thematische Zuordnung** von Controls und Components zu Themen der ausgewerteten BSI-Trendanalysen. Es übernimmt die Taxonomiezuordnung des Radars nicht als Trendzuordnung. Thematische Übereinstimmungen sind Anhaltspunkte für die weitere fachliche Prüfung, keine verbindliche Aussage über Relevanz, Wirksamkeit oder Konformität.

Wählen Sie oben einen verfügbaren Jahrgang und anschließend eine Themenblase oder einen Eintrag unter „Thema auswählen“. Größere Blasen stehen für mehr zugeordnete Inhalte. Rechts erscheinen eine Kurzbeschreibung, die Anzahl der zugeordneten Controls und Components sowie das **Trendprofil**:

- **Präsenz:** Wie viele und wie stark passende Inhalte zugeordnet sind.
- **Tiefe:** Wie belastbar und fachlich tief die Zuordnungen sind.
- **Breite:** Wie viele Teilaspekte des Trends durch Inhalte gestützt werden.
- **Abdeckung:** Zusammenfassende Sicht auf Präsenz, Tiefe und Breite.

Unter „Gemappte Inhalte“ sehen Sie die einzelnen Treffer mit Zuordnungswerten. Die Kennzahlen „Strong“, „Medium“ und „Weak“ fassen die Stärke der automatischen Zuordnungen zusammen. Ein Prozentwert in der Treffertabelle ist ein **Zuordnungswert**, keine Wahrscheinlichkeit und keine Compliance-Bewertung. Die Tabelle zeigt pro Seite 30 Treffer; mit „Weiter“ und „Zurück“ erreichen Sie alle Treffer. Die Kennzahlen beziehen sich auf alle zugeordneten Inhalte.

## Datenstand und Herkunft

Der Datenstand steht oben in der Radar-Ansicht. In den Detailtabellen sehen Sie die Herkunft jedes Treffers; bei öffentlich verfügbaren Quelldateien können Sie die Quelle direkt öffnen. Beim Öffnen wird die öffentliche Bibliothek geprüft. Der Aktualisierungsstatus zeigt, ob der Abgleich erfolgreich war. „Quellstand“ verlinkt die verwendete Revision; „Geprüft“ nennt den letzten erfolgreichen Abgleich. „Datenstand“ bezeichnet den Zeitpunkt der Quellrevision, nicht den heutigen Abruf. Der automatische Abruf verarbeitet öffentliche Catalogs und Component Definitions mit vollständiger gültiger Taxonomie. Vorübergehend ergänzt der lokal erstellte Kernel diesen Bestand; seine Einträge erscheinen als „Zusatzkatalog“ und lassen sich über „Herkunft“ filtern. Der Abgleichzeitpunkt bezieht sich auf die öffentliche Bibliothek. Das Trendmapping behält seinen separat gepflegten Datenstand.

Das Radar ist eine Orientierungshilfe für die Recherche. Für die fachliche Bewertung eines Controls oder einer Component sollten Sie den vollständigen Inhalt und seine Quellen im jeweiligen Katalog beziehungsweise in der Component Definition lesen.

## Bedienung und Darstellung

Alle Aktionen sind über native Schaltflächen, Links und Auswahlfelder erreichbar. Die Themenliste bietet einen textlichen Zugang zum Radar, das Auswahlfeld „Thema auswählen“ eine Alternative zu den Trendblasen. Enter und Leertaste aktivieren fokussierte Diagrammsegmente. „Zum Inhalt springen“ überspringt den Kopfbereich. Auf schmalen Bildschirmen steht die Themenliste unter dem Diagramm; breite Tabellen lassen sich horizontal verschieben.

Mit „Dunkle Ansicht“ bzw. „Helle Ansicht“ wechseln Sie das Farbschema. Die Präferenz wird, soweit möglich, lokal im Browser gespeichert. Quellenlinks führen zur jeweiligen öffentlichen Quelldatei. „Zum Stand der Technik-Viewer“ öffnet das verwandte Werkzeug zur detaillierten OSCAL-Recherche.

Bei einem Netzfehler oder einem GitHub-Abruflimit bleibt der letzte vollständige Stand sichtbar. Ohne gespeicherten Stand wird der mitgelieferte Rückfallstand angezeigt. Die Oberfläche kennzeichnet dies ausdrücklich; der Stand wird dann nicht als aktuell bestätigt. „Erneut prüfen“, erneutes Öffnen der Radar-Ansicht oder Neuladen prüft wieder auf Veröffentlichungen. Während einer längeren geöffneten Ansicht findet kein periodischer Abruf statt. Der Browser speichert aufbereitete öffentliche Daten lokal; es gibt keine Anmeldung oder Telemetrie.
