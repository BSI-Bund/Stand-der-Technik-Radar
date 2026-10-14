import { useMemo, useState } from 'react';
import type { TrendThemeAggregate } from '../../domain/types';
import { Button } from '../../shared/ui/Button';
type Row = { id: string; title: string; uuid: string; score?: number };
const PAGE_SIZE = 30;
function ResultTable({ title, rows }: { title: string; rows: Row[] }) {
  const [page, setPage] = useState(1);
  const sorted = useMemo(() => [...rows].sort((a, b) => (b.score ?? 0) - (a.score ?? 0)), [rows]);
  const pages = Math.max(1, Math.ceil(sorted.length / PAGE_SIZE));
  const current = Math.min(page, pages);
  return (
    <section className="trend-table-section" aria-label={`${title}: Trendtreffer`}>
      <h4>
        {title} <span>{rows.length} Treffer</span>
      </h4>
      {rows.length ? (
        <>
          <div
            className="table-wrap"
            tabIndex={0}
            role="region"
            aria-label={`${title}: Treffertabelle`}
          >
            <table className="kern-table trend-detail-table">
              <thead>
                <tr>
                  <th scope="col">ID</th>
                  <th scope="col">Titel</th>
                  <th scope="col">Identität</th>
                  <th scope="col">Zuordnungswert</th>
                </tr>
              </thead>
              <tbody>
                {sorted.slice((current - 1) * PAGE_SIZE, current * PAGE_SIZE).map((row, index) => (
                  <tr key={`${row.id}-${row.uuid}-${index}`}>
                    <td>{row.id}</td>
                    <td>{row.title}</td>
                    <td className="uuid-cell">{row.uuid}</td>
                    <td>{row.score === undefined ? '–' : `${Math.round(row.score * 100)} %`}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {pages > 1 && (
            <nav className="table-pages" aria-label={`${title}: Trendseiten`}>
              <Button disabled={current === 1} onClick={() => setPage(current - 1)}>
                Zurück
              </Button>
              <span role="status">
                Seite {current} von {pages}
              </span>
              <Button disabled={current === pages} onClick={() => setPage(current + 1)}>
                Weiter
              </Button>
            </nav>
          )}
        </>
      ) : (
        <p className="empty-cell">Keine {title} zugeordnet.</p>
      )}
    </section>
  );
}
export function TrendDetailTable({ selected }: { selected: TrendThemeAggregate | null }) {
  const controls = useMemo(
    () => selected?.requirements?.map((row) => ({ ...row, id: row.requirement_id })) ?? [],
    [selected],
  );
  const components = useMemo(
    () => selected?.components?.map((row) => ({ ...row, id: row.component_id })) ?? [],
    [selected],
  );
  if (!selected) return <p>Kein Trend ausgewählt.</p>;
  return (
    <section className="trend-side-panel trend-table-panel">
      <h3>Gemappte Inhalte</h3>
      <p className="table-note">
        Zuordnungswerte beschreiben die thematische Übereinstimmung. Alle Treffer sind über die
        Seitennavigation erreichbar.
      </p>
      <ResultTable key={`${selected.trend_theme_id}-controls`} title="Controls" rows={controls} />
      <ResultTable
        key={`${selected.trend_theme_id}-components`}
        title="Components"
        rows={components}
      />
    </section>
  );
}
