# Automatischer Bibliotheksabruf

## Verhalten

Beim Öffnen der Radar-Ansicht, beim Zurückwechseln aus dem Trendmapping und über „Erneut prüfen“ wird `main` von `BSI-Bund/Stand-der-Technik-Bibliothek` ohne Anmeldung geprüft. Der Start zeigt zunächst den verfügbaren lokalen Stand mit laufendem Prüfstatus. Neue öffentliche Veröffentlichungen benötigen keinen Neuaufbau der Radar-Website. Das Trendmapping lädt ausschließlich seine freigegebenen Jahresdateien; seine Zuordnungen werden nicht automatisch neu berechnet.

„Datenstand“ bezeichnet beim Live-Abruf den Commit-Zeitpunkt; beim mitgelieferten Rückfallstand das in der Datei dokumentierte Datum. „Geprüft“ bezeichnet den erfolgreichen Abgleich. Der verlinkte Quellstand und alle Quelldateien verwenden dieselbe unveränderliche Commit-ID. Änderungen während eines Abrufs werden damit nicht zwischen Revisionen vermischt; sie werden beim nächsten Abgleich berücksichtigt.

## Abruf und Cache

1. Ein Worker lädt die aktuelle Commit-ID ohne Browser-HTTP-Cache.
2. Bei gleicher Revision genügt dieser einzelne API-Aufruf; die bereits aufbereitete Darstellung wird wiederverwendet.
3. Bei neuer Revision wird der vollständige Git-Dateibaum geladen. JSON-Dateien unter `control_layer/` und `implementation_layer/` werden rekursiv ermittelt. Die bisherige Ausschlussregel für vollständige Ordnersegmente `Archiv` und `Beispiel` bleibt bestehen; Namen wie `AWS Beispiel-Components` sind davon nicht betroffen.
4. Neue oder geänderte Dateien werden mit maximal vier gleichzeitigen Raw-Abrufen geladen. Unveränderte Blob-IDs verwenden ihre bereits extrahierten Ergebnisse. Entfernte Dateien verschwinden aus dem neuen Stand.
5. Catalogs werden einschließlich geschachtelter Groups und Controls verarbeitet; Component Definitions liefern ihre Components. Andere OSCAL-Modelle wie Profiles und Mapping Collections werden ignoriert. Es werden keine externen Imports aufgelöst. Der öffentliche Abruf bleibt unabhängig vom konfigurierten lokalen Zusatzkatalog.
6. Nur vollständige `Taxonomy-L1` bis `Taxonomy-L4`-Properties aus der kanonischen Taxonomie erzeugen Zuordnungen. Fehlende Properties erzeugen keine geschätzten Zuordnungen. Unvollständige, doppelte oder unbekannte Taxonomiepfade verhindern die Übernahme des gesamten neuen Stands.
7. Die konfigurierte [Zusatzkatalog-Projektion](supplemental-catalogs.md) wird für die Anzeige auf den öffentlichen Stand angewendet. Der Kernel ersetzt dabei ausschließlich den ausdrücklich benannten öffentlichen G0-Quellpfad. Im IndexedDB-Cache verbleiben die öffentlichen Originalergebnisse, sodass eine spätere Deaktivierung ohne Cache-Löschung wirksam wird.
8. Erst nach erfolgreichem Gesamtabruf und Prüfung wird der neue Stand atomar als öffentlicher Basisstand in IndexedDB gespeichert und zusammen mit den aktiven Zusatzkatalogen dargestellt. Ein gültiger leerer Stand ersetzt auch ältere gefüllte Ergebnisse.

Der Cache enthält kompakte Extraktionsergebnisse und die fertige Taxonomie, keine vollständigen OSCAL-Rohdokumente. Ohne nutzbaren Browserspeicher funktioniert der Abruf weiterhin; der nächste Aufruf muss dann wieder mehr laden. Bei Änderungen an Parser oder kanonischer Taxonomie die Cacheversion in `storage.ts` und `sync.ts` anheben, damit alte Extraktionsergebnisse nicht weiterverwendet werden.

## Ausfälle und Betriebsgrenzen

Ein Netzfehler, Timeout, unvollständiger Git-Dateibaum oder ungültige Quelle überschreibt keinen funktionierenden Cache. Der letzte vollständige Stand bleibt sichtbar; ohne Cache dient die mitgelieferte `taxonomy-map.json` als Rückfallstand. Die Oberfläche zeigt ausdrücklich „Aktualisierung nicht möglich“. Offlinebetrieb kann keine Aktualität bestätigen. Es gibt keine periodischen Hintergrundabrufe und keine automatischen Wiederholungsschleifen.

GitHub begrenzt unangemeldete REST-Abrufe derzeit auf 60 pro Stunde je öffentlicher IP; mehrere Nutzer hinter demselben Netzwerk teilen dieses Kontingent. Eine unveränderte Revision benötigt einen, eine geänderte Revision zwei REST-Aufrufe; Quelldateien kommen über Raw-URLs. Ein API-Limit wird sichtbar gemeldet. Bei künftig hohem gemeinsamem Nutzungsaufkommen ist ein zentral bereitgestellter öffentlicher Datenindex sinnvoll; geheime Zugriffstokens gehören niemals in den Browser. [GitHub: Abruflimits](https://docs.github.com/en/rest/using-the-rest-api/rate-limits-for-the-rest-api).

Zum Schutz der Browserressourcen gelten höchstens 4.000 JSON-Dateien, 64 MiB je Datei und 200 MiB Gesamtquelldaten. Metadatenabrufe haben 15 Sekunden, Dateien 30 Sekunden und der gesamte Lauf 90 Sekunden Zeit. Ein abgeschnittener Baum wird nicht als vollständig akzeptiert. Bei Überschreitung bleibt der Rückfallstand gekennzeichnet sichtbar. [GitHub: Git Trees](https://docs.github.com/en/rest/git/trees#get-a-tree).

## Prüfung vom 14.10.2026

Die tatsächliche öffentliche Revision `a12831136f4122a4c43854622180a24f2576a41e` vom 01.10.2026 wurde abgerufen. Die Browser-Extraktion stimmt mit der Python-Pipeline hinsichtlich Zuordnungen, aller Ansichten und SHA-256 der Quelldateien überein. Der mitgelieferte öffentliche Basisstand wurde daraus aktualisiert; anschließend wurde der freigegebene Kernel wieder als getrennte Ergänzung aufgenommen. Die bestehenden Trenddateien sind bytegleich geblieben. Die öffentliche Quelle wird bereits angesprochen; die Veröffentlichung dieser Radar-Version über GitHub Pages wurde damit nicht durchgeführt.

Die lokale Prüfung umfasst 63 Browsertests, 19 TypeScript-Unit-Tests und 17 Python-Tests. Vor Wiederaufnahme des Zusatzkatalogs war in einem echten Chromium-Aufruf der öffentliche Abgleich nach etwa 2,3 Sekunden abgeschlossen; der erneute Aufruf benötigte etwa 0,8 Sekunden und lud keine OSCAL-Dateien erneut. Diese Einzelmessung ist netz- und geräteabhängig und keine allgemeine Zeitgarantie.
