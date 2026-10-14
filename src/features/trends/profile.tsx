import type { TrendThemeAggregate } from '../../domain/types';
import { clamp } from './layout';
const trendProfileAxes = [
  {
    key: 'presence',
    pctKey: 'presence_pct',
    label: 'Präsenz',
    definition:
      'Gewichtete Menge der gemappten Inhalte zu diesem Trend. Viele und fachlich starke Treffer erhöhen den Wert.',
  },
  {
    key: 'depth',
    pctKey: 'depth_pct',
    label: 'Tiefe',
    definition:
      'Fachliche Tiefe der Abdeckung. Berücksichtigt Facettenunterstützung und den Anteil starker Zuordnungen.',
  },
  {
    key: 'breadth',
    pctKey: 'breadth_pct',
    label: 'Breite',
    definition:
      'Anteil der Trendfacetten, die durch gemappte Inhalte mindestens belastbar abgedeckt sind.',
  },
  {
    key: 'coverage',
    pctKey: 'coverage_pct',
    label: 'Abdeckung',
    definition:
      'Gesamtwirkung aus Präsenz, Tiefe und Breite. Dieser Wert beschreibt die zusammenfassende Trendabdeckung.',
  },
] as const;
type TrendProfileAxis = (typeof trendProfileAxes)[number];

function profileValue(theme: TrendThemeAggregate, axis: TrendProfileAxis): number {
  return clamp(theme.display[axis.pctKey] ?? 0, 0, 100);
}

function TrendDefinitionLabel({ axis }: { axis: TrendProfileAxis }) {
  return <span>{axis.label}</span>;
}

export function TrendProfile({ theme }: { theme: TrendThemeAggregate | null }) {
  const center = 130;
  const maxRadius = 86;
  const axisPoint = (axisIndex: number, valuePct: number) => {
    const angle = -Math.PI / 2 + axisIndex * ((Math.PI * 2) / trendProfileAxes.length);
    const distance = maxRadius * (valuePct / 100);
    return {
      x: center + Math.cos(angle) * distance,
      y: center + Math.sin(angle) * distance,
    };
  };
  const outerPoints = trendProfileAxes.map((_, index) => axisPoint(index, 100));
  const values = theme
    ? trendProfileAxes.map((axis) => profileValue(theme, axis))
    : trendProfileAxes.map(() => 0);
  const polygonPoints = values
    .map((value, index) => axisPoint(index, value))
    .map((point) => `${point.x},${point.y}`)
    .join(' ');
  const graphColor = 'var(--accent)';

  return (
    <div className="trend-side-panel trend-radar-panel">
      <h3>Trendprofil</h3>
      <details className="kern-details">
        <summary className="kern-details__header">Kennzahlen verstehen</summary>
        <dl className="profile-definitions">
          {trendProfileAxes.map((axis) => (
            <div key={axis.key}>
              <dt>{axis.label}</dt>
              <dd>{axis.definition}</dd>
            </div>
          ))}
        </dl>
      </details>
      {!theme ? (
        <div className="empty-cell">Kein Trend ausgewählt.</div>
      ) : (
        <>
          <div className="trend-radar-graph" aria-label="Grafisches Trendprofil">
            <svg viewBox="0 0 260 260" role="img" aria-label="Radaransicht der Trendprofilwerte">
              {[0.25, 0.5, 0.75, 1].map((ring) => (
                <polygon
                  key={ring}
                  points={outerPoints
                    .map((_, index) => {
                      const point = axisPoint(index, ring * 100);
                      return `${point.x},${point.y}`;
                    })
                    .join(' ')}
                  className="trend-radar-ring"
                />
              ))}
              {outerPoints.map((point, index) => (
                <line
                  key={trendProfileAxes[index].key}
                  x1={center}
                  y1={center}
                  x2={point.x}
                  y2={point.y}
                  className="trend-radar-axis"
                />
              ))}
              <polygon
                points={polygonPoints}
                className="trend-radar-area"
                style={{ fill: graphColor, stroke: graphColor }}
              />
              {values.map((value, index) => {
                const point = axisPoint(index, value);
                return (
                  <circle
                    key={trendProfileAxes[index].key}
                    cx={point.x}
                    cy={point.y}
                    r="4.2"
                    className="trend-radar-dot"
                    style={{ fill: graphColor }}
                  />
                );
              })}
            </svg>
            <span className="trend-radar-label top">
              <TrendDefinitionLabel axis={trendProfileAxes[0]} />
            </span>
            <span className="trend-radar-label right">
              <TrendDefinitionLabel axis={trendProfileAxes[1]} />
            </span>
            <span className="trend-radar-label bottom">
              <TrendDefinitionLabel axis={trendProfileAxes[2]} />
            </span>
            <span className="trend-radar-label left">
              <TrendDefinitionLabel axis={trendProfileAxes[3]} />
            </span>
          </div>
          <div className="score-list">
            {trendProfileAxes.map((axis) => {
              const value = theme.display[axis.pctKey];
              const barValue = profileValue(theme, axis);
              return (
                <div className="score-line" key={axis.key}>
                  <TrendDefinitionLabel axis={axis} />
                  <div>
                    <i style={{ width: `${barValue}%`, background: graphColor }} />
                  </div>
                  <strong>{value === null ? '-' : `${value}%`}</strong>
                </div>
              );
            })}
          </div>
        </>
      )}
    </div>
  );
}
