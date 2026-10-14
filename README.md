# Stand der Technik-Radar

Das Radar macht Controls und Components der [Stand der Technik-Bibliothek](https://github.com/BSI-Bund/Stand-der-Technik-Bibliothek) entlang ihrer Taxonomie und in Bezug auf BSI-Trendanalysen erkundbar.

**[Radar öffnen](https://bsi-bund.github.io/Stand-der-Technik-Radar/)** · [Bedienung](docs/user-guide.md) · [Entwicklung](CONTRIBUTING.md) · [Architektur](docs/architecture.md) · [Betrieb und GitHub Pages](docs/deployment.md)

Die Oberfläche basiert auf **KERN UX 2.8.2** mit lokal ausgelieferter Fira Sans. Kopfbereich, Navigation, Formulare, Tabellen und Fokusdarstellung orientieren sich am [Stand der Technik-Viewer](https://bsi-community.github.io/Stand-der-Technik-Viewer/).

## Ansichten

- **Radar:** Controls und Components entlang von NIST-Funktion, Technologiedomäne, Produktkategorie und Produkt-/Servicegruppe finden. Kreisdiagramm und Themenliste bieten alternative Zugänge; Detailtabellen enthalten Suchfelder, Herkunft und Quellenlinks.
- **Trendmapping:** Einen Jahrgang und ein Thema wählen, zugeordnete Inhalte und das Trendprofil mit Präsenz, Tiefe, Breite und Abdeckung ansehen. Die Themenauswahl funktioniert auch ohne Bedienung des Diagramms.

Beim Öffnen der Radar-Ansicht wird die öffentliche Bibliothek automatisch auf neue Veröffentlichungen geprüft. Neue und geänderte Quelldateien werden eingelesen; bei unverändertem Stand genügt eine Revisionsabfrage. Der Browser hält einen lokalen Cache vor. Aktualisierungsstatus und Quellstand sind sichtbar; bei einem Fehler bleibt der letzte verfügbare Stand ausdrücklich als Rückfallstand erkennbar. Das Trendmapping wird weiterhin redaktionell aktualisiert. Details: [Automatischer Bibliotheksabruf](docs/live-library.md).

Die Taxonomie stammt aus den OSCAL-Properties der Quellen. Das Trendmapping ist eine separate automatische thematische Zuordnung. Die Werte sind **keine Wahrscheinlichkeiten, Qualitätsurteile oder Konformitätsnachweise**. Ein Control kann in mehreren Quelldateien vorkommen; solche Vorkommen werden getrennt dargestellt.

## Inhalte richtig lesen

Ein Control beschreibt eine Anforderung oder Maßnahme, eine Component ein Umsetzungsobjekt. Gezählt werden Vorkommen je Quelldatei, nicht ausschließlich eindeutige fachliche Identitäten. Das Trendprofil unterscheidet Präsenz (Anzahl und Stärke der Treffer), Tiefe (fachliche Ausprägung), Breite (berührte Teilaspekte) und Abdeckung (zusammenfassender Wert). Diese Orientierung ersetzt keine Prüfung der vollständigen OSCAL-Quelle.

Die Anleitung führt die nützlichen fachlichen Erläuterungen der bisherigen öffentlichen README fort. Bedienung, Seitennavigation und Hosting wurden auf die neue Anwendung angepasst; die frühere Begrenzung auf 80 Trendtreffer entfällt.

## Vorübergehender Kernel-Zusatzkatalog

Bis die öffentliche Bibliothek ausreichend taxonomisierte Inhalte enthält, ergänzt der lokal erstellte Kernel die Radar-Ansicht. Seine Einträge sind als **Zusatzkatalog** gekennzeichnet und über den Herkunftsfilter auswählbar. Die öffentliche Bibliothek wird weiterhin automatisch aktualisiert. Der Zusatzkatalog wird getrennt versioniert und kann später gezielt deaktiviert werden; siehe [Zusatzkatalog pflegen oder entfernen](docs/supplemental-catalogs.md). Das Trendmapping bleibt separat gepflegt.

## Übernahme in das öffentliche Repository

Dieses Projekt ist für [BSI-Bund/Stand-der-Technik-Radar](https://github.com/BSI-Bund/Stand-der-Technik-Radar) vorbereitet und wird nach der Übernahme dort weiterentwickelt. Die [kurze Migrationscheckliste](docs/migration-checklist.md) beschreibt das Kopieren einschließlich `.github/`, das Entfernen der alten Einzel-HTML und die einmalige Pages-Einstellung **GitHub Actions**. Danach veröffentlicht jeder erfolgreich geprüfte Push nach `main` die neue Website automatisch. Das Kopieren allein ersetzt die Repository-Einstellung nicht.

## Lokal starten

Voraussetzung: Node.js 24 LTS (siehe `.nvmrc`) und npm.

```sh
npm ci
npm run dev
```

Die Konsole nennt die lokale URL unter `/Stand-der-Technik-Radar/`. Die versionierten öffentlichen Daten sind enthalten; Python und ein Bibliotheksabruf sind zum Starten der Oberfläche nicht erforderlich.

```sh
npm run build
npm run preview
```

`dist/` ist die fertige statische Website. Das Radar benötigt kein Backend, keine Datenbank und keine externen Laufzeit-CDNs. JavaScript muss im Browser aktiviert sein. Ein eigenständiger Einzel-HTML-Export wird nicht mehr erzeugt; die Website wird über HTTP(S) ausgeliefert.

## Projektaufbau

```text
src/             React-Oberfläche, Fachansichten, Datenzugriff und KERN-Styles
public/generated/ freigegebener Datenstand für die Website
scripts/         Datenaufbereitung und Build-/Veröffentlichungsprüfungen
data/            Taxonomie, Trend-Packs und Konfiguration
schemas/         Datenverträge
tests/           Unit-, Python- und Browserprüfungen
docs/            Bedienung, Architektur, Betrieb und Entscheidungen
.github/         Prüfung und GitHub-Pages-Veröffentlichung
```

Weitere Informationen: [Datenaktualisierung](docs/data-pipeline.md), [Teststrategie](docs/testing.md), [Änderungen](CHANGELOG.md), [Drittanbieter](NOTICE.md). Die bestehende Lizenz des öffentlichen Radar-Repositorys liegt in [LICENSE.md](LICENSE.md).
