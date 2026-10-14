import { useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { MappingDetails } from './MappingDetails';
import { StatStrip } from './StatStrip';
import { SunburstChart } from './SunburstChart';
import { TaxonomyNavigator, type NavigatorAction } from './TaxonomyNavigator';
import { watchRadar, refreshRadar, type RadarState } from '../../infrastructure/library/client';
import { radarHash, type Route } from '../../app/routing';
import type { TaxonomyNode } from '../../domain/types';
import { Button } from '../../shared/ui/Button';
import supplementalConfig from '../../../data/configs/radar-supplements.json';

export default function RadarView({ route }: { route: Extract<Route, { tab: 'radar' }> }) {
  const [state, setState] = useState<RadarState>({ status: 'checking' });
  const { data } = state;
  const [navigatorAction, setNavigatorAction] = useState<NavigatorAction | null>(null);
  const scrollPosition = useRef<{ x: number; y: number } | null>(null);
  useEffect(() => watchRadar(setState), []);
  useLayoutEffect(() => {
    const position = scrollPosition.current;
    if (!position) return;
    const restore = () =>
      window.scrollTo({ left: position.x, top: position.y, behavior: 'instant' });
    restore();
    const frame = requestAnimationFrame(() => {
      restore();
      scrollPosition.current = null;
    });
    return () => cancelAnimationFrame(frame);
  }, [route.view, route.node]);
  const navigateChart = (hash: string) => {
    if (window.location.hash !== hash) {
      scrollPosition.current = { x: window.scrollX, y: window.scrollY };
      // pushState changes the shareable URL without native fragment scrolling.
      window.history.pushState(null, '', hash);
      window.dispatchEvent(new PopStateEvent('popstate'));
    }
  };
  const navigatorRoot = useMemo(
    () =>
      data ? { ...data.hierarchy, children: Object.values(data.views?.functions ?? {}) } : null,
    [data],
  );
  if (!data || !navigatorRoot)
    return (
      <div role={state.status === 'fallback' ? 'alert' : 'status'}>
        <p>{state.status === 'fallback' ? state.message : 'Radar-Daten werden geladen …'}</p>
        {state.status === 'fallback' && <Button onClick={refreshRadar}>Erneut prüfen</Button>}
      </div>
    );
  const chartRoot =
    route.view === 'overview'
      ? (data.views?.overview ?? data.hierarchy)
      : (data.views?.domains[route.view] ?? data.views?.functions[route.view] ?? data.hierarchy);
  const selectNode = (node: TaxonomyNode) => {
    setNavigatorAction((current) => ({
      type: 'select',
      node,
      contextDomain: chartRoot.kind === 'technology_domain' ? chartRoot.label : undefined,
      serial: (current?.serial ?? 0) + 1,
    }));
    const next =
      route.view === 'overview' && node.view_ref
        ? (data.views?.domains[node.view_ref] ?? data.views?.functions[node.view_ref])
        : null;
    navigateChart(
      next && node.view_ref ? radarHash(node.view_ref, next.id) : radarHash(route.view, node.id),
    );
  };
  const reset = () => {
    setNavigatorAction((current) => ({ type: 'reset', serial: (current?.serial ?? 0) + 1 }));
    navigateChart('#radar');
  };
  return (
    <>
      <div className="page-heading">
        <div>
          <h2>Taxonomie erkunden</h2>
          <p>Controls und Components entlang der vier Taxonomieebenen entdecken.</p>
        </div>
        <span className="data-date">
          Datenstand: {new Date(data.generated_at).toLocaleDateString('de-DE')}
        </span>
      </div>
      <div className="library-status" role="status" aria-live="polite">
        <div>
          {state.status === 'checking'
            ? 'Öffentliche Bibliothek wird auf Aktualisierungen geprüft …'
            : state.status === 'fresh'
              ? `Mit öffentlicher Bibliothek abgeglichen · Geprüft: ${new Date(state.checkedAt!).toLocaleString('de-DE')}`
              : `Aktualisierung nicht möglich. ${state.message} Angezeigt wird ${state.revision ? 'der zuletzt erfolgreich geladene Stand' : 'der mitgelieferte Stand'}.`}
          {state.revision && (
            <span>
              {' '}
              ·{' '}
              <a
                href={`https://github.com/BSI-Bund/Stand-der-Technik-Bibliothek/commit/${state.revision}`}
              >
                Quellstand {state.revision.slice(0, 7)}
              </a>
            </span>
          )}
        </div>
        <Button onClick={refreshRadar} disabled={state.status === 'checking'}>
          Erneut prüfen
        </Button>
      </div>
      {supplementalConfig.catalogs.some((catalog) => catalog.enabled) && (
        <p className="supplement-note">
          Vorübergehend ergänzt um den lokal erstellten Kernel mit Taxonomiezuordnungen. Diese
          Einträge sind in den Tabellen als „Zusatzkatalog“ gekennzeichnet.
        </p>
      )}
      <StatStrip data={data} />
      <div className="radar-workspace">
        <TaxonomyNavigator
          root={navigatorRoot}
          selectedId={route.node}
          action={navigatorAction}
          onSelect={(node, view) => {
            window.location.hash = radarHash(
              data.views?.functions[view] ? view : 'overview',
              node.id,
            );
          }}
        />
        <SunburstChart
          root={chartRoot}
          selectedId={route.node}
          onSelect={selectNode}
          onReset={reset}
          onClearSelection={() => {
            navigateChart(radarHash(route.view, chartRoot.id));
          }}
        />
      </div>
      <MappingDetails root={chartRoot} selectedId={route.node} mappings={data.mappings} />
    </>
  );
}
