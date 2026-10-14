import { Button } from '../../shared/ui/Button';
import { useDeferredValue, useMemo, useState } from 'react';
import type { TaxonomyMapping, TaxonomyNode } from '../../domain/types';

const PAGE_SIZE = 30;

function findNode(node: TaxonomyNode, id: string): TaxonomyNode | null {
  if (node.id === id) return node;
  for (const child of node.children ?? []) {
    const found = findNode(child, id);
    if (found) return found;
  }
  return null;
}

function MappingTable({
  title,
  rows,
  allMappings,
}: {
  title: string;
  rows: TaxonomyMapping[];
  allMappings: TaxonomyMapping[];
}) {
  const [query, setQuery] = useState('');
  const [origin, setOrigin] = useState('all');
  const [page, setPage] = useState(1);
  const deferredQuery = useDeferredValue(query.trim().toLocaleLowerCase('de'));
  const filtered = useMemo(
    () =>
      rows.filter((row) => {
        if (origin !== 'all' && row.source_origin !== origin) return false;
        return (
          !deferredQuery ||
          [
            row.id,
            row.identity,
            row.title,
            row.source_title,
            row.source_path,
            row.taxonomy.product_group,
          ].some((value) => (value ?? '').toLocaleLowerCase('de').includes(deferredQuery))
        );
      }),
    [rows, origin, deferredQuery],
  );
  const pageCount = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const currentPage = Math.min(page, pageCount);
  const visible = filtered.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE);
  const otherPaths = useMemo(() => {
    const paths = new Map<string, Set<string>>();
    for (const mapping of allMappings) {
      const set = paths.get(mapping.identity) ?? new Set<string>();
      set.add(
        [
          mapping.taxonomy.level1,
          mapping.taxonomy.level2,
          mapping.taxonomy.product_category,
          mapping.taxonomy.product_group,
        ].join(' › '),
      );
      paths.set(mapping.identity, set);
    }
    return paths;
  }, [allMappings]);

  return (
    <section className="detail-section">
      <div className="detail-heading">
        <h3>{title}</h3>
        <span>
          {filtered.length} von {rows.length} Vorkommen
        </span>
      </div>
      <div className="mapping-filters">
        <label>
          Inhalte durchsuchen{' '}
          <input
            className="kern-form-input__input"
            type="search"
            value={query}
            onChange={(event) => {
              setQuery(event.target.value);
              setPage(1);
            }}
            placeholder="ID, Titel, Quelle oder Taxonomie"
          />
        </label>
        <label>
          Herkunft{' '}
          <select
            className="kern-form-input__select"
            value={origin}
            onChange={(event) => {
              setOrigin(event.target.value);
              setPage(1);
            }}
          >
            <option value="all">Alle Quellen</option>
            <option value="public">Öffentliches Repository</option>
            <option value="manual">Zusatzkatalog</option>
          </select>
        </label>
      </div>
      <div
        className="table-wrap"
        tabIndex={0}
        role="region"
        aria-label={`${title}: Treffertabelle`}
      >
        <table className="kern-table">
          <thead>
            <tr>
              <th scope="col">ID / Titel</th>
              <th scope="col">Katalog oder Definition</th>
              <th scope="col">Taxonomiepfad</th>
              <th scope="col">Identität</th>
            </tr>
          </thead>
          <tbody>
            {visible.length ? (
              visible.map((row) => {
                const path = [
                  row.taxonomy.level1,
                  row.taxonomy.level2,
                  row.taxonomy.product_category,
                  row.taxonomy.product_group,
                ].join(' › ');
                const multiple = (otherPaths.get(row.identity)?.size ?? 0) > 1;
                return (
                  <tr key={row.mapping_key}>
                    <td>
                      <strong>{row.id}</strong>
                      <br />
                      {row.title}
                    </td>
                    <td>
                      <strong>{row.source_title}</strong>
                      <br />
                      <span className="source-kind">
                        {row.source_origin === 'manual'
                          ? 'Zusatzkatalog'
                          : 'Öffentliches Repository'}
                      </span>
                      <br />
                      {row.source_url ? (
                        <a href={row.source_url} target="_blank" rel="noopener noreferrer">
                          Quelldatei öffnen ↗
                        </a>
                      ) : (
                        <span className="source-path">{row.source_path}</span>
                      )}
                    </td>
                    <td>
                      {path}
                      {multiple ? (
                        <div className="multi-path-note">
                          Dieselbe Identität erscheint auch in anderen Taxonomiepfaden.
                        </div>
                      ) : null}
                    </td>
                    <td className="uuid-cell">{row.identity}</td>
                  </tr>
                );
              })
            ) : (
              <tr>
                <td colSpan={4} className="empty-cell">
                  Keine Einträge für diese Filter.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
      {pageCount > 1 ? (
        <nav className="table-pages" aria-label={`${title}: Seiten`}>
          <Button
            type="button"
            disabled={currentPage === 1}
            onClick={() => setPage(currentPage - 1)}
          >
            Zurück
          </Button>
          <span>
            Seite {currentPage} von {pageCount}
          </span>
          <Button
            type="button"
            disabled={currentPage === pageCount}
            onClick={() => setPage(currentPage + 1)}
          >
            Weiter
          </Button>
        </nav>
      ) : null}
    </section>
  );
}

export function MappingDetails({
  root,
  selectedId,
  mappings,
}: {
  root: TaxonomyNode;
  selectedId: string;
  mappings: TaxonomyMapping[];
}) {
  const selected = findNode(root, selectedId) ?? root;
  const idSet = useMemo(() => new Set(selected.mapping_ids ?? []), [selected]);
  const rows = useMemo(
    () => mappings.filter((mapping) => idSet.has(mapping.mapping_key)),
    [mappings, idSet],
  );
  const controls = rows.filter((row) => row.item_type === 'control');
  const components = rows.filter((row) => row.item_type === 'component');
  return (
    <section className="details-panel" id="radar-details">
      <div className="selected-summary">
        <div>
          <div className="eyebrow-small">Auswahl</div>
          <h2>{selected.label}</h2>
          <p>
            Gezählt werden Vorkommen pro Quelldatei. Dieselbe Control-Identität kann kontextabhängig
            mehreren Themen zugeordnet sein.
          </p>
        </div>
        <div className="summary-counts">
          <span>{selected.counts.total} Vorkommen</span>
          <span>{selected.counts.controls} Controls</span>
          <span>{selected.counts.components} Components</span>
        </div>
      </div>
      <MappingTable
        key={`${selected.id}-controls`}
        title="Controls"
        rows={controls}
        allMappings={mappings}
      />
      <MappingTable
        key={`${selected.id}-components`}
        title="Components"
        rows={components}
        allMappings={mappings}
      />
    </section>
  );
}
