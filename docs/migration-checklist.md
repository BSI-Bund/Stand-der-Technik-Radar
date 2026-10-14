# Übernahme in BSI-Bund/Stand-der-Technik-Radar

Zielrepository: [BSI-Bund/Stand-der-Technik-Radar](https://github.com/BSI-Bund/Stand-der-Technik-Radar). Die bisherige Website liegt bereits auf demselben Pages-Projektpfad. Das Repository wird nach der Migration auch für die Weiterentwicklung verwendet.

## Einmalige Übernahme

1. **Bereinigte Quellkopie verwenden.** Die vorbereitete Exportkopie enthält den vollständigen neuen Quellstand einschließlich Dokumentation, Datenprojektionen, Tests, Lockfile und `.github/workflows/verify-and-deploy.yml`. Bei eigenen Folgeänderungen neu erzeugen:

   ```sh
   node scripts/export-source.mjs /absoluter/neuer/exportordner
   ```

2. **In den Checkout des öffentlichen Zielrepositorys kopieren.** Dessen `.git/` erhalten; die Git-Historie des bisherigen Tools-Repositorys nicht übertragen. Auch versteckte Dateien und `.github/` müssen mitkommen. Beispielsweise:

   ```sh
   rsync -a --exclude=.git /pfad/exportordner/ /pfad/Stand-der-Technik-Radar/
   ```

   Im Ziel die alte `Stand der Technik-Radar.html` und `.nojekyll` entfernen. Die alte `index.html` wird durch den neuen Vite-Einstieg ersetzt. Die vorhandene GPL-Lizenz bleibt erhalten. Keine lokalen Sicherungen, `node_modules/`, `dist/` oder Importberichte kopieren.

3. **Pages einmalig umstellen.** Im Zielrepository unter **Settings → Pages → Build and deployment → Source** **GitHub Actions** wählen. Die Repository-/Organisationsrichtlinien müssen Actions und Pages erlauben. Diese Einstellung ist kein Bestandteil kopierbarer Dateien und kann nicht durch Kopieren allein ersetzt werden.

4. **Änderung prüfen und nach `main` übernehmen.** Nach Commit/Push oder PR-Merge startet der enthaltene Workflow automatisch. Er prüft Python, TypeScript, Datenverträge und drei Browser, baut die Website und veröffentlicht ausschließlich `dist/`. Für spätere Änderungen genügt dieser normale Entwicklungsablauf im öffentlichen Repository.

## Kontrolle der ersten Veröffentlichung

Den erfolgreichen Workflow einschließlich Deployment abwarten und anschließend [die Pages-URL](https://bsi-bund.github.io/Stand-der-Technik-Radar/) prüfen:

- Neuer KERN-Kopfbereich und korrekter Viewer-Link.
- Bibliotheksabgleich mit erkennbarem Status; Kernel als Zusatzkatalog verfügbar.
- Radar-Zoom nutzt die verfügbare Breite; Auswahl springt nicht zur Control-Liste.
- Beide unveränderten Trendjahrgänge, Detailseiten und Reload eines gespeicherten Hash-Links funktionieren.
- Keine fehlenden Worker-, Schrift-, JSON- oder JavaScript-Dateien.

Die lokale Prüfung bestätigt den Build und den Pages-Unterpfad. Erst der erfolgreiche Lauf im Zielrepository mit anschließender Live-Prüfung bestätigt die öffentliche Bereitstellung. Weitere Betriebsdetails und Wiederherstellung: [deployment.md](deployment.md).
