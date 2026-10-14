# ADR 0003: KERN UX und statische Pages-Anwendung

Status: lokal umgesetzt, 14. Oktober 2026.

Die bestehende React-/TypeScript-/D3-Anwendung bleibt erhalten. KERN UX 2.8.2 ist die Grundlage der Oberfläche. Fira Sans, Kopfbereich, Navigation und kompakte Fachansichten folgen dem aktuellen Viewer. Eigene Diagramme behalten ihre fachliche Funktion und erhalten textliche Bedienalternativen.

Die Website wird als Vite-Artefakt auf GitHub Pages veröffentlicht. Der Einzel-HTML-Export entfällt. Eine erfolgreiche Prüf-Pipeline ist Voraussetzung für das Deployment. Öffentlicher Quellcode und lokale Importdiagnostik werden explizit getrennt.

Der Projektaufbau liegt direkt am Repository-Einstieg. Es wird kein gemeinsames Framework-Paket für Viewer und Radar eingeführt: Der Viewer nutzt DOM-Renderer, das Radar React. Die gemeinsame Designgrundlage wird über dieselbe KERN-Version und dokumentierte Konventionen gepflegt.

Diese Entscheidung ergänzt die fachlichen Diagrammentscheidungen in ADR 0001 und 0002; historische Export-/Pfadangaben darin sind keine aktuellen Betriebsanweisungen.
