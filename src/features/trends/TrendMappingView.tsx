import { Button } from '../../shared/ui/Button';
import { useEffect, useMemo, useState } from 'react';
import { TrendDetailTable } from './TrendDetailTable';
import { TrendProfile } from './profile';
import { bubbleLabelLines, layoutTrendBubbles, totalForTheme, trendViewBox } from './layout';
import { scaleLinear } from 'd3-scale';
import type {
  TrendAggregates,
  TrendManifestYear,
  TrendPack,
  TrendThemeAggregate,
} from '../../domain/types';
import { loadTrendBundle, loadTrendManifest } from '../../infrastructure/load';

type TrendHover = {
  x: number;
  y: number;
  theme: TrendThemeAggregate;
};

export default function TrendMappingView() {
  const [attempt, setAttempt] = useState(0);
  const [years, setYears] = useState<TrendManifestYear[]>([]);
  const [activeYear, setActiveYear] = useState<TrendManifestYear | null>(null);
  const [pack, setPack] = useState<TrendPack | null>(null);
  const [aggregates, setAggregates] = useState<TrendAggregates | null>(null);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [hover, setHover] = useState<TrendHover | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    setError(null);
    loadTrendManifest()
      .then((manifest) => {
        if (!active) return;
        const enabled = manifest.available_years.filter((year) => year.enabled);
        if (!enabled.length) throw new Error('Noch keine Trendjahre verfügbar.');
        const hashYear = Number(window.location.hash.match(/20\d{2}/)?.[0]);
        setYears(enabled);
        setActiveYear(enabled.find((year) => year.year === hashYear) ?? enabled[0] ?? null);
      })
      .catch((err) => {
        if (active) setError(err instanceof Error ? err.message : 'Unbekannter Fehler');
      });
    return () => {
      active = false;
    };
  }, [attempt]);

  useEffect(() => {
    const restoreYear = () => {
      const hashYear = Number(window.location.hash.match(/20\d{2}/)?.[0]);
      const year = years.find((candidate) => candidate.year === hashYear);
      if (year) setActiveYear(year);
    };
    window.addEventListener('popstate', restoreYear);
    window.addEventListener('hashchange', restoreYear);
    return () => {
      window.removeEventListener('popstate', restoreYear);
      window.removeEventListener('hashchange', restoreYear);
    };
  }, [years]);

  useEffect(() => {
    if (!activeYear) return;
    let cancelled = false;
    setError(null);
    setHover(null);
    setPack(null);
    setAggregates(null);
    loadTrendBundle(activeYear)
      .then(({ pack, aggregates }) => {
        if (cancelled) return;
        setPack(pack);
        setAggregates(aggregates);
        const firstMapped = aggregates.themes.find((theme) => totalForTheme(theme) > 0);
        setSelectedId(firstMapped?.trend_theme_id ?? aggregates.themes[0]?.trend_theme_id ?? null);
      })
      .catch((err) => {
        if (!cancelled) setError(err instanceof Error ? err.message : 'Unbekannter Fehler');
      });
    return () => {
      cancelled = true;
    };
  }, [activeYear]);

  const selected = useMemo(
    () => aggregates?.themes.find((theme) => theme.trend_theme_id === selectedId) ?? null,
    [aggregates, selectedId],
  );

  const positionedThemes = useMemo(() => {
    if (!aggregates) return [];
    const maxTotal = Math.max(1, ...aggregates.themes.map(totalForTheme));
    const radius = scaleLinear().domain([0, maxTotal]).range([30, 78]);
    return layoutTrendBubbles(aggregates.themes, (theme) => radius(totalForTheme(theme)));
  }, [aggregates]);

  if (error)
    return (
      <div className="kern-alert kern-alert--danger" role="alert">
        <p>{error}</p>
        <Button
          onClick={() => {
            setAttempt((value) => value + 1);
            setActiveYear((year) => (year ? { ...year } : null));
          }}
        >
          Erneut versuchen
        </Button>
      </div>
    );
  if (!pack || !aggregates)
    return (
      <div className="loading" role="status">
        Lade Trendmapping...
      </div>
    );

  return (
    <section className="trend-view">
      <div className="trend-hero">
        <div>
          <p>Stand der Technik Bibliothek</p>
          <h2>Trendmapping</h2>
          <span>
            Automatische thematische Zuordnung zu den BSI-Trendanalysen. Zuordnungswerte sind keine
            Wahrscheinlichkeiten oder Konformitätsbewertungen.
          </span>
        </div>
        <div className="year-switcher trend-year-switcher">
          {years.map((year) => (
            <Button
              key={year.year}
              type="button"
              aria-pressed={year.year === activeYear?.year}
              className={year.year === activeYear?.year ? 'year-button active' : 'year-button'}
              onClick={() => {
                setActiveYear(year);
                window.location.hash = `#trendmapping-${year.year}`;
              }}
            >
              {year.label}
            </Button>
          ))}
        </div>
      </div>
      <div className="trend-kpis">
        {aggregates.kpis
          .filter((kpi) => !['mapped_requirements', 'clusters_total'].includes(kpi.id))
          .map((kpi) => (
            <span key={kpi.id}>
              {kpi.label}
              <strong>{kpi.value}</strong>
            </span>
          ))}
      </div>
      <label className="trend-select kern-label">
        Thema auswählen
        <select
          className="kern-form-input__select"
          value={selectedId ?? ''}
          onChange={(event) => setSelectedId(event.target.value)}
        >
          {aggregates.themes.map((theme) => (
            <option key={theme.trend_theme_id} value={theme.trend_theme_id}>
              {theme.label} ({totalForTheme(theme)} Inhalte)
            </option>
          ))}
        </select>
      </label>
      <div className="trend-layout">
        <section className="trend-map-panel">
          <svg
            viewBox={`0 0 ${trendViewBox.width} ${trendViewBox.height}`}
            className="trend-svg"
            role="group"
            aria-label="Trendmapping: Themen mit Tastatur auswählbar"
          >
            <defs>
              <filter id="trendGlow" x="-40%" y="-40%" width="180%" height="180%">
                <feDropShadow
                  dx="0"
                  dy="14"
                  stdDeviation="16"
                  floodColor="#0f172a"
                  floodOpacity="0.18"
                />
              </filter>
            </defs>
            {positionedThemes.map((theme) => {
              const active = theme.trend_theme_id === selectedId;
              const mappedTotal = totalForTheme(theme);
              const r = theme.bubbleRadius;
              const labelLines = bubbleLabelLines(theme.short_label ?? theme.label, r);
              return (
                <g
                  key={theme.trend_theme_id}
                  role="button"
                  tabIndex={0}
                  aria-pressed={active}
                  aria-label={`${theme.label}, ${mappedTotal} Inhalte`}
                  className={[
                    'trend-node',
                    active ? 'active' : '',
                    mappedTotal === 0 ? 'empty' : '',
                  ]
                    .filter(Boolean)
                    .join(' ')}
                  transform={`translate(${theme.bubblePosition.x}, ${theme.bubblePosition.y})`}
                  onClick={() => setSelectedId(theme.trend_theme_id)}
                  onKeyDown={(event) => {
                    if (event.key === 'Enter' || event.key === ' ') {
                      event.preventDefault();
                      setSelectedId(theme.trend_theme_id);
                    }
                  }}
                  onFocus={() => setHover(null)}
                  onMouseMove={(event) => setHover({ x: event.clientX, y: event.clientY, theme })}
                  onMouseLeave={() => setHover(null)}
                >
                  <circle
                    r={r}
                    fill={theme.bubbleColor}
                    filter={active ? 'url(#trendGlow)' : undefined}
                  >
                    <title>{theme.label}</title>
                  </circle>
                  {labelLines.slice(0, 2).map((line, index) => (
                    <text
                      key={`${theme.trend_theme_id}-${line}`}
                      textAnchor="middle"
                      y={labelLines.length === 1 ? -5 : -12 + index * 16}
                    >
                      {line}
                    </text>
                  ))}
                  <text
                    textAnchor="middle"
                    y={labelLines.length === 1 ? 17 : 28}
                    className="trend-node-count"
                  >
                    {mappedTotal}
                  </text>
                </g>
              );
            })}
          </svg>
          {hover ? (
            <div
              className="trend-tooltip"
              style={{
                left: Math.max(12, Math.min(hover.x + 14, window.innerWidth - 340)),
                top: Math.min(hover.y + 14, window.innerHeight - 140),
              }}
            >
              <strong>{hover.theme.label}</strong>
              <span>{totalForTheme(hover.theme)} Inhalte</span>
              <span>
                {hover.theme.counts.controls_total ?? 0} Controls,{' '}
                {hover.theme.counts.components_total ?? 0} Components
              </span>
            </div>
          ) : null}
        </section>
        <aside className="trend-details">
          <TrendProfile theme={selected} />
          <div className="trend-side-panel trend-summary-panel">
            <h3>{selected?.label ?? 'Details'}</h3>
            <p>{selected?.management_summary}</p>
            {selected ? (
              <div className="trend-detail-grid">
                <span>
                  Controls <strong>{selected.counts.controls_total ?? 0}</strong>
                </span>
                <span>
                  Components <strong>{selected.counts.components_total ?? 0}</strong>
                </span>
                <span>
                  Strong <strong>{selected.counts.requirements_strong}</strong>
                </span>
                <span>
                  Medium <strong>{selected.counts.requirements_medium}</strong>
                </span>
                <span>
                  Weak <strong>{selected.counts.requirements_weak}</strong>
                </span>
                <span>
                  Coverage <strong>{selected.display.coverage_pct ?? '-'}%</strong>
                </span>
              </div>
            ) : null}
          </div>
        </aside>
      </div>
      <TrendDetailTable selected={selected} />
    </section>
  );
}
