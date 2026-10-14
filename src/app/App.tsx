import { lazy, Suspense, useEffect, useState } from 'react';
import { parseRoute } from './routing';
import { Button } from '../shared/ui/Button';
import mark from '../assets/radar.svg';
import '../styles/index.css';
const RadarView = lazy(() => import('../features/radar/RadarView'));
const TrendMappingView = lazy(() => import('../features/trends/TrendMappingView'));

export default function App() {
  const [hash, setHash] = useState(() => window.location.hash);
  const [theme, setTheme] = useState(() => {
    try {
      return localStorage.getItem('sdt-theme') === 'dark' ? 'dark' : 'light';
    } catch {
      return 'light';
    }
  });
  const route = parseRoute(hash);
  useEffect(() => {
    const restore = () => setHash(window.location.hash);
    window.addEventListener('hashchange', restore);
    window.addEventListener('popstate', restore);
    return () => {
      window.removeEventListener('hashchange', restore);
      window.removeEventListener('popstate', restore);
    };
  }, []);
  useEffect(() => {
    document.documentElement.dataset.theme = theme;
    document.documentElement.dataset.kernTheme = theme;
    try {
      localStorage.setItem('sdt-theme', theme);
    } catch {
      /* Storage is optional. */
    }
  }, [theme]);
  return (
    <>
      <a
        className="skip-link"
        href="#main-content"
        onClick={(event) => {
          event.preventDefault();
          document.getElementById('main-content')?.focus();
        }}
      >
        Zum Inhalt springen
      </a>
      <header className="app-header">
        <div className="header-brand">
          <a className="home-link" href="#radar" aria-label="Zur Radarübersicht">
            <svg viewBox="0 0 24 24" aria-hidden="true">
              <path d="m3 11 9-8 9 8M5 10v11h5v-7h4v7h5V10" />
            </svg>
          </a>
          <img src={mark} width="40" height="40" alt="" />
          <div className="brand-copy">
            <h1>Stand der Technik-Radar</h1>
            <p>Stand der Technik-Bibliothek · Taxonomie und Trends</p>
          </div>
          <Button
            className="theme-toggle"
            aria-pressed={theme === 'dark'}
            onClick={() => setTheme(theme === 'light' ? 'dark' : 'light')}
          >
            {theme === 'dark' ? 'Helle Ansicht' : 'Dunkle Ansicht'}
          </Button>
        </div>
        <nav className="primary-nav" aria-label="Ansichten">
          <a href="#radar" aria-current={route.tab === 'radar' ? 'page' : undefined}>
            Radar
          </a>
          <a href="#trendmapping" aria-current={route.tab === 'trends' ? 'page' : undefined}>
            Trendmapping
          </a>
          <a
            className="viewer-link"
            href="https://bsi-community.github.io/Stand-der-Technik-Viewer/"
          >
            Zum Stand der Technik-Viewer ↗
          </a>
        </nav>
      </header>
      <main id="main-content" className="shell" tabIndex={-1}>
        <Suspense
          fallback={
            <p role="status" className="loading">
              Ansicht wird geladen …
            </p>
          }
        >
          {route.tab === 'radar' ? <RadarView route={route} /> : <TrendMappingView />}
        </Suspense>
      </main>
      <footer className="app-footer">
        <span>Orientierung für die Recherche · Keine Konformitätsbewertung</span>
        <a href="https://github.com/BSI-Bund/Stand-der-Technik-Radar#readme">
          Anleitung und Quellcode
        </a>
      </footer>
    </>
  );
}
