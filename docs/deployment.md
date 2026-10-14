# Betrieb und GitHub Pages

Für die konkrete Übernahme siehe zuerst die [Migrationscheckliste](migration-checklist.md). Das öffentliche Repository ist das künftige Quellcode- und Entwicklungsrepository; es erhält die komplette bereinigte Quellkopie, nicht nur `dist/`.

## Hostingziel

`https://bsi-bund.github.io/Stand-der-Technik-Radar/`

Vite setzt `base: '/Stand-der-Technik-Radar/'`. Assets und JSON werden unter diesem Projektpfad geladen. Bei Änderung des Repositorynamens müssen Vite-Konfiguration, Browserprüfungen und Workflow gemeinsam angepasst werden. Eine Hash-Navigation benötigt keine 404-Weiterleitung.

## Automatisierter Ablauf

`.github/workflows/verify-and-deploy.yml` prüft bei Push, Pull Request und manuellem Start:

1. Python-Umgebung, Ruff und fachliche Tests.
2. `npm ci`, Lint, Format, Unit-Tests und vollständige TypeScript-Prüfung.
3. Öffentliche Daten, Vite-Build und Artefaktprüfung.
4. Chromium, Firefox und WebKit gegen den gebauten Unterpfad.
5. Upload ausschließlich von `dist/`, danach Pages-Deployment.

Eine Veröffentlichung erfolgt nur im Repository **BSI-Bund/Stand-der-Technik-Radar**, auf **main**, nach erfolgreicher Prüfung und nicht aus Pull Requests. Der Tools-Checkout und Forks können prüfen, aber nicht versehentlich dieses Deployment auslösen. Schreibrechte für Pages und OIDC besitzt nur der Deployment-Job. Prüfergebnisse und Traces werden bei Fehlern als kurzlebige Actions-Artefakte gespeichert.

## Einmalige Umstellung des öffentlichen Repositorys

1. Lokal `npm run check` sowie Python-Prüfungen ausführen.
2. `node scripts/export-source.mjs /absoluter/neuer/zielordner` erzeugt eine übertragbare Quellkopie ohne lokale Rohdateien, Diagnostik, Caches oder Git-Historie. Das Ziel darf noch nicht existieren. Nicht den gesamten privaten Arbeitsordner oder seine `.git`-Historie kopieren.
3. Diese Kopie in einem Branch des öffentlichen Repositorys übernehmen. Dort die bisherige eigenständige `Stand der Technik-Radar.html` und `.nojekyll` entfernen; `index.html` wird zum Vite-Einstieg. Lizenz und Repository-Einstellungen erhalten.
4. Unter **Settings → Pages → Build and deployment → Source** auf **GitHub Actions** umstellen. Actions/Pages müssen für das Repository erlaubt sein; eine mögliche Environment-Freigabe bleibt wirksam.
5. PR prüfen, anschließend nach `main` übernehmen. Der Workflow baut und veröffentlicht das geprüfte Artefakt.
6. Erfolgreichen Actions-Lauf und echte Pages-URL kontrollieren: Radar, beide Trendjahre, gekennzeichneten Kernel-Zusatzkatalog, breiten Zoom, Reload eines Hash-Links sowie Assets und JSON ohne 404.

Die lokale Prüfung belegt den Build und die Unterpfadfunktion. Erst ein erfolgreicher Deployment-Lauf und die anschließende Live-Prüfung belegen die Veröffentlichung. Die lokale Migration selbst verändert weder Pages-Einstellungen noch das öffentliche Repository.

## Wiederherstellung

Bei Fehlern bleibt ein bereits veröffentlichtes Pages-Artefakt bestehen, solange kein neues erfolgreich veröffentlicht wurde. Für einen fachlichen oder visuellen Rückschritt einen bekannten Quellstand per Revert-PR wiederherstellen und die vollständige Pipeline erneut ausführen. Daten und Frontend gemeinsam versionieren.

## Laufzeitabruf

Der automatische Radar-Abgleich läuft auch auf GitHub Pages direkt im Browser. Es sind kein Token, kein Secret und kein zusätzlicher Hostingdienst erforderlich. `api.github.com` und `raw.githubusercontent.com` müssen vom Browser erreichbar sein. Worker und lokale Assets werden unter dem Pages-Unterpfad ausgeliefert. Nach der Umstellung zusätzlich Status, Quellrevision, Reload mit Cache und Offline-Rückfall prüfen; siehe [live-library.md](live-library.md).

## Lokale Vorschau

`npm run build && npm run preview` liefert die Website über HTTP. `vite preview` dient der lokalen Prüfung, nicht als Produktionsserver. Ein direktes Öffnen von `dist/index.html` als `file://` und der frühere Einzel-HTML-Export sind nicht vorgesehen.

Referenz: [Vite: GitHub Pages](https://vite.dev/guide/static-deploy.html#github-pages).
