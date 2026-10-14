# Zuordnungsmethoden

## Taxonomie: explizite Quelldaten

Jedes gemappte Control und jede gemappte Component benötigt genau je eine nichtleere Property `Taxonomy-L1`, `Taxonomy-L2`, `Taxonomy-L3` und `Taxonomy-L4`. Nur ein exakter Vierer-Pfad aus `data/source/taxonomy/stand-der-technik.json` ist gültig. Fehlende Properties führen zum Auslassen und einer Zählung im Importbericht; ein teilweiser, doppelter oder unbekannter Pfad bricht den Build mit Dateipfad und Objekt-ID ab. Es werden keine Taxonomie-Scores, Synonyme, KI-Vorschläge oder rückgewonnenen alten Mappings verwendet.

Die Zähleinheit ist das Vorkommen eines Controls beziehungsweise einer Component in einer OSCAL-Quelldatei. Identische `alt-identifier` in mehreren Katalogen dürfen unterschiedliche Pfade haben. Die Zahl eindeutiger Identitäten wird getrennt ausgewiesen.

## Trendmapping: bestehendes Scoring

Das Trendmapping in `scripts/map_trends.py` bleibt unabhängig von der Taxonomie. Es nutzt Wort- und Zeichen-n-Gramm-TF-IDF, direkte Trendbegriffe, lexikalische Ähnlichkeit und Facetten. Die aktuelle Scoreformel im Code lautet:

```text
0.30 × min(1, semantic × 1.7)
+ 0.34 × term
+ 0.12 × lexical
+ 0.14 × facet
+ 0.10 × title_hit
```

Anschließend können direkte Anker- und Titelbelege einen Mindestwert herstellen; negative Schlüsselwörter senken den Score. Ein Mapping wird nur bei mindestens 0,60 **und** ausreichender fachlicher Evidenz akzeptiert. Die Stufen aus `data/configs/mapping-thresholds.yaml` sind `strong` ab 0,82, `medium` ab 0,70 und `weak` ab 0,60. Pro Objekt werden höchstens drei Trends ausgegeben.

Hinweis: Der historische `weights`-Block in der Konfigurationsdatei wird von der aktuellen Scorefunktion nicht eingelesen; maßgeblich ist der Code. Er wurde im Rahmen der Taxonomie-Umstellung bewusst nicht verändert.
