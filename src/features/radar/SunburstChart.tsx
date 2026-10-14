import { Button } from '../../shared/ui/Button';
import { hierarchy, partition, type HierarchyRectangularNode } from 'd3-hierarchy';
import { arc } from 'd3-shape';
import { useEffect, useId, useMemo, useRef, useState } from 'react';
import type { TaxonomyNode } from '../../domain/types';
import {
  tau,
  normalizeSearch,
  mixWithWhite,
  fillForNode,
  withLayoutValue,
  layoutSunburstLabel,
  type ChartNode,
  type LabelState,
  type LabelContext,
} from './labels';

type HoverState = {
  x: number;
  y: number;
  label: string;
  level: number;
  counts: TaxonomyNode['counts'];
};

function nodeMatchesSearch(node: TaxonomyNode, query: string): boolean {
  if (!query) return false;
  return [
    node.label,
    node.product_category ?? '',
    node.nist_code ?? '',
    node.nist_category ?? '',
    node.row_id ?? '',
  ].some((value) => normalizeSearch(value).includes(query));
}

function centerLines(root: TaxonomyNode): string[] {
  if (root.kind === 'overview' || root.id === 'root') return ['SdT', 'Taxonomie'];
  const words = root.label.split(/\s+/).filter(Boolean);
  const lines: string[] = [];
  for (const word of words) {
    const last = lines.length ? lines[lines.length - 1] : undefined;
    if (last && `${last} ${word}`.length <= 22) {
      lines[lines.length - 1] = `${last} ${word}`;
    } else {
      lines.push(word);
    }
  }
  return lines.slice(0, 3);
}

function ringLegend(root: TaxonomyNode): Array<{ ring: string; label: string }> {
  if (root.kind === 'function') {
    return [
      { ring: 'Mitte', label: 'NIST-Funktion' },
      { ring: 'Innenring', label: 'Technologiedomänen' },
      { ring: 'Mittelring', label: 'Produktkategorien' },
      { ring: 'Außenring', label: 'Produktgruppen' },
    ];
  }
  if (root.kind === 'technology_domain') {
    return [
      { ring: 'Mitte', label: 'Technologiedomäne' },
      { ring: 'Innenring', label: 'Produktkategorien' },
      { ring: 'Außenring', label: 'Produktgruppen' },
    ];
  }
  return [
    { ring: 'Innenring', label: 'NIST-Funktionen' },
    { ring: 'Außenring', label: 'Technologiedomänen' },
  ];
}

export function SunburstChart({
  root,
  selectedId,
  onSelect,
  onReset,
  onClearSelection,
}: {
  root: TaxonomyNode;
  selectedId: string;
  onSelect: (node: TaxonomyNode) => void;
  onReset: () => void;
  onClearSelection: () => void;
}) {
  const [hover, setHover] = useState<HoverState | null>(null);
  const [query, setQuery] = useState('');
  const [zoom, setZoom] = useState(1);
  const [labelLayoutVersion, setLabelLayoutVersion] = useState(0);
  const [labelStates, setLabelStates] = useState<Record<string, LabelState>>({});
  const viewportRef = useRef<HTMLDivElement | null>(null);
  const [viewportRatio, setViewportRatio] = useState(1);
  const svgRef = useRef<SVGSVGElement | null>(null);
  const reactId = useId().replace(/:/g, '');
  const size = 980;
  const radius = size / 2;
  const isFunctionDrilldown = root.kind === 'function';
  const coreRadius = radius * (isFunctionDrilldown ? 0.13 : 0.19);
  const viewSize = size / zoom;
  const viewWidth = viewSize * viewportRatio;
  useEffect(() => {
    const viewport = viewportRef.current;
    if (!viewport) return;
    const resize = () => {
      const { width, height } = viewport.getBoundingClientRect();
      if (width && height) setViewportRatio(width / height);
    };
    resize();
    const observer = new ResizeObserver(resize);
    observer.observe(viewport);
    return () => observer.disconnect();
  }, []);
  const normalizedQuery = normalizeSearch(query);
  const coreLines = centerLines(root);
  const coreSubtitle =
    root.kind === 'function'
      ? 'NIST-Funktion'
      : root.kind === 'technology_domain'
        ? 'Technologiedomäne'
        : '';
  const legendRows = ringLegend(root);

  const nodes = useMemo(() => {
    const prepared = withLayoutValue(root);
    const h = hierarchy<ChartNode>(prepared)
      .sum((d) => d.valueForLayout ?? 0)
      .sort((a, b) => (b.value ?? 0) - (a.value ?? 0));
    const descendants = partition<ChartNode>()
      .size([tau, radius])(h)
      .descendants()
      .filter((d) => d.depth > 0);
    if (root.kind === 'function') {
      const maxDepth = Math.max(1, ...descendants.map((node) => node.depth));
      const innerRadius = radius * 0.145;
      const ringWidth = (radius - innerRadius) / maxDepth;
      descendants.forEach((node) => {
        node.y0 = innerRadius + (node.depth - 1) * ringWidth;
        node.y1 = innerRadius + node.depth * ringWidth;
      });
    }
    return descendants;
  }, [root, radius]);

  const matchedIds = useMemo(() => {
    if (!normalizedQuery) return new Set<string>();
    const ids = new Set<string>();
    for (const node of nodes) {
      if (nodeMatchesSearch(node.data, normalizedQuery)) {
        ids.add(node.data.id);
        node.ancestors().forEach((ancestor) => ids.add(ancestor.data.id));
      }
    }
    return ids;
  }, [nodes, normalizedQuery]);

  const drawArc = arc<HierarchyRectangularNode<ChartNode>>()
    .startAngle((d) => d.x0)
    .endAngle((d) => d.x1)
    .innerRadius((d) => d.y0 + 4)
    .outerRadius((d) => Math.max(d.y0 + 5, d.y1 - 4))
    .padAngle(0.002)
    .padRadius(radius);

  const resetView = () => {
    setQuery('');
    setZoom(1);
    onReset();
  };

  useEffect(() => {
    let active = true;
    void document.fonts.ready.then(() => {
      if (active) setLabelLayoutVersion((version) => version + 1);
    });
    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    const svg = svgRef.current;
    if (!svg) return;
    const canvas = document.createElement('canvas').getContext('2d');
    if (!canvas) return;
    const computedStyle = getComputedStyle(svg);
    const context: LabelContext = {
      svg,
      canvas,
      fontFamily: computedStyle.fontFamily || 'Fira Sans, sans-serif',
      fontWeight: '600',
      visualPadding: 7,
    };
    const nextStates: Record<string, LabelState> = {};
    for (const node of nodes) {
      nextStates[node.data.id] = layoutSunburstLabel(node, node.data.label, context);
    }
    setLabelStates(nextStates);
  }, [nodes, labelLayoutVersion]);

  return (
    <section className="map-panel" aria-label="Taxonomie erkunden">
      <div
        className="chart-tools"
        aria-label="Diagrammsteuerung"
        onClick={(event) => event.stopPropagation()}
      >
        <Button type="button" className="reset-button" onClick={resetView}>
          {root.kind === 'overview' || root.id === 'root'
            ? 'Auswahl zurücksetzen'
            : 'Zur Übersicht'}
        </Button>
        <label className="search-label" htmlFor={`${reactId}-segment-search`}>
          Segmentsuche
        </label>
        <input
          id={`${reactId}-segment-search`}
          className="kern-form-input__input segment-search"
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder="z.B. Cloud"
          type="search"
        />
        <div className="zoom-controls" aria-label="Zoom">
          <Button
            type="button"
            onClick={() => setZoom((value) => Math.min(2.2, Number((value + 0.18).toFixed(2))))}
            aria-label="Hineinzoomen"
          >
            +
          </Button>
          <Button
            type="button"
            onClick={() => setZoom((value) => Math.max(0.82, Number((value - 0.18).toFixed(2))))}
            aria-label="Herauszoomen"
          >
            -
          </Button>
        </div>
      </div>
      <div
        className="ring-legend"
        aria-label="Ringlegende"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="ring-legend-title">Legende</div>
        {legendRows.map((row) => (
          <div className="ring-legend-row" key={`${root.id}-${row.ring}`}>
            <span>{row.ring}</span>
            <strong>{row.label}</strong>
          </div>
        ))}
      </div>
      <div ref={viewportRef} className="chart-wrap" onClick={onClearSelection}>
        <svg
          ref={svgRef}
          viewBox={`${-viewWidth / 2} ${-viewSize / 2} ${viewWidth} ${viewSize}`}
          className="sunburst"
          role="group"
          aria-label={`Taxonomie-Kreisdiagramm mit ${isFunctionDrilldown ? 'drei' : 'zwei'} Ringen`}
        >
          <circle r={coreRadius} className="sunburst-core" />
          <text className="core-title" textAnchor="middle">
            {coreLines.map((line, index) => (
              <tspan
                key={`${root.id}-core-${index}`}
                x="0"
                y={(index - (coreLines.length - 1) / 2) * 22 - (coreSubtitle ? 8 : 0)}
              >
                {line}
              </tspan>
            ))}
          </text>
          {coreSubtitle ? (
            <text className="core-subtitle" textAnchor="middle" y={coreLines.length > 1 ? 34 : 24}>
              {coreSubtitle}
            </text>
          ) : null}
          {nodes.map((node) => {
            const d = node;
            const selected = selectedId === node.data.id;
            const inSelection =
              selected ||
              node.ancestors().some((a) => a.data.id === selectedId) ||
              node.descendants().some((a) => a.data.id === selectedId);
            const inSearch = !normalizedQuery || matchedIds.has(node.data.id);
            const dimmed = (selectedId !== 'root' && !inSelection) || !inSearch;
            const matched = Boolean(normalizedQuery && matchedIds.has(node.data.id));
            const empty =
              (node.data.kind === 'product_group' || node.data.level >= 3) &&
              node.data.counts.total === 0;
            const fill = fillForNode(node);
            const visibleFill = dimmed ? mixWithWhite(fill, 0.66) : fill;
            const label = labelStates[node.data.id];
            return (
              <g
                key={node.data.id}
                role="button"
                tabIndex={0}
                aria-label={`${node.data.label}, ${node.data.counts.total} Vorkommen, ${node.data.counts.controls} Controls, ${node.data.counts.components} Components`}
                aria-pressed={selected}
                className={[
                  'slice',
                  selected ? 'selected' : '',
                  dimmed ? 'dimmed' : '',
                  matched ? 'matched' : '',
                  empty ? 'empty-slice' : '',
                ]
                  .filter(Boolean)
                  .join(' ')}
                onMouseDown={(event) => event.preventDefault()}
                onClick={(event) => {
                  event.stopPropagation();
                  onSelect(node.data);
                }}
                onKeyDown={(event) => {
                  if (event.key === 'Enter' || event.key === ' ') {
                    event.preventDefault();
                    event.stopPropagation();
                    onSelect(node.data);
                  }
                }}
                onFocus={() => setHover(null)}
                onMouseMove={(event) =>
                  setHover({
                    x: event.clientX,
                    y: event.clientY,
                    label: node.data.label,
                    level: node.data.level,
                    counts: node.data.counts,
                  })
                }
                onMouseLeave={() => setHover(null)}
              >
                <path d={drawArc(d) ?? undefined} fill={visibleFill}>
                  <title>{node.data.label}</title>
                </path>
                {label?.state === 'visible' ? (
                  <text
                    className="slice-label"
                    style={{ fontSize: label.fontSize }}
                    transform={`translate(${label.x},${label.y}) rotate(${label.rotate})`}
                    data-label-state="visible"
                    data-label-truncated={label.truncated ? 'true' : undefined}
                    textAnchor="middle"
                    dominantBaseline="middle"
                  >
                    {label.truncated ? <title>{node.data.label}</title> : null}
                    {label.lines.map((line, index) => (
                      <tspan
                        key={`${node.data.id}-line-${index}`}
                        x="0"
                        y={(index - (label.lines.length - 1) / 2) * label.lineHeight}
                      >
                        {line}
                      </tspan>
                    ))}
                  </text>
                ) : label?.state === 'hidden' ? (
                  <g
                    data-label-state="hidden"
                    data-label-hidden-reason={label.hiddenReason}
                    data-label-truncated="false"
                  >
                    <title>{node.data.label}</title>
                  </g>
                ) : null}
              </g>
            );
          })}
        </svg>
        {hover ? (
          <div
            className="tooltip"
            style={{
              left: Math.max(12, Math.min(hover.x + 14, window.innerWidth - 340)),
              top: Math.min(hover.y + 14, window.innerHeight - 140),
            }}
          >
            <div className="tooltip-title">{hover.label}</div>
            <div>Level {hover.level}</div>
            <div>
              {hover.counts.total} Inhalte · {hover.counts.controls} Controls ·{' '}
              {hover.counts.components} Components
            </div>
          </div>
        ) : null}
      </div>
    </section>
  );
}
