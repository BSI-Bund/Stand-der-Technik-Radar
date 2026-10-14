import { Button } from '../../shared/ui/Button';
import { useEffect, useState } from 'react';
import type { TaxonomyNode } from '../../domain/types';

export type NavigatorAction =
  | { type: 'select'; node: TaxonomyNode; contextDomain?: string; serial: number }
  | { type: 'reset'; serial: number };

function pathsToSelection(
  root: TaxonomyNode,
  selected: TaxonomyNode,
  contextDomain?: string,
): string[][] {
  const exact: string[][] = [];
  const contextual: string[][] = [];

  const visit = (node: TaxonomyNode, path: TaxonomyNode[]) => {
    const nextPath = [...path, node];
    const ids = nextPath.map((part) => part.id);
    if (node.id === selected.id) {
      exact.push(ids);
    } else if (node.kind === selected.kind && node.label === selected.label) {
      const domainMatches =
        !contextDomain ||
        nextPath.some((part) => part.kind === 'technology_domain' && part.label === contextDomain);
      if (domainMatches) contextual.push(ids);
    }
    node.children?.forEach((child) => visit(child, nextPath));
  };

  root.children?.forEach((child) => visit(child, []));
  return exact.length ? exact : contextual;
}

function Branch({
  node,
  viewId,
  selectedId,
  expandedIds,
  onToggle,
  onSelect,
}: {
  node: TaxonomyNode;
  viewId: string;
  selectedId: string;
  expandedIds: Set<string>;
  onToggle: (id: string) => void;
  onSelect: (node: TaxonomyNode, viewId: string) => void;
}) {
  const expanded = expandedIds.has(node.id);
  const hasChildren = Boolean(node.children?.length);
  return (
    <li>
      <div className="tree-row">
        <Button
          type="button"
          className="tree-node"
          aria-current={selectedId === node.id ? 'location' : undefined}
          aria-label={`${node.label}, ${node.counts.total} Inhalte`}
          onClick={() => onSelect(node, viewId)}
        >
          <span>{node.label}</span>
          <small>{node.counts.total} Inhalte</small>
        </Button>
        {hasChildren ? (
          <Button
            type="button"
            className="tree-expander"
            aria-expanded={expanded}
            aria-label={`${node.label}: Unterthemen ${expanded ? 'schließen' : 'öffnen'}`}
            onClick={() => onToggle(node.id)}
          >
            {expanded ? '−' : '+'}
          </Button>
        ) : null}
      </div>
      {hasChildren && expanded ? (
        <ul>
          {node.children?.map((child) => (
            <Branch
              key={child.id}
              node={child}
              viewId={viewId}
              selectedId={selectedId}
              expandedIds={expandedIds}
              onToggle={onToggle}
              onSelect={onSelect}
            />
          ))}
        </ul>
      ) : null}
    </li>
  );
}

export function TaxonomyNavigator({
  root,
  selectedId,
  action,
  onSelect,
}: {
  root: TaxonomyNode;
  selectedId: string;
  action: NavigatorAction | null;
  onSelect: (node: TaxonomyNode, viewId: string) => void;
}) {
  const [expandedIds, setExpandedIds] = useState<Set<string>>(() => new Set());

  useEffect(() => {
    if (!action) return;
    if (action.type === 'reset') {
      setExpandedIds(new Set());
      return;
    }
    const paths = pathsToSelection(root, action.node, action.contextDomain);
    setExpandedIds((current) => {
      const next = new Set(current);
      paths.forEach((path) => path.forEach((id) => next.add(id)));
      return next;
    });
  }, [action, root]);

  useEffect(() => {
    if (selectedId === 'root') {
      setExpandedIds(new Set());
      return;
    }
    const find = (node: TaxonomyNode): TaxonomyNode | undefined =>
      node.id === selectedId ? node : node.children?.map(find).find(Boolean);
    const selected = find(root);
    if (!selected) return;
    const paths = pathsToSelection(root, selected);
    setExpandedIds((current) => new Set([...current, ...paths.flat()]));
  }, [root, selectedId]);

  const toggle = (id: string) =>
    setExpandedIds((current) => {
      const next = new Set(current);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });

  return (
    <section className="taxonomy-navigator" aria-labelledby="taxonomy-navigator-title">
      <div className="navigator-heading">
        <h2 id="taxonomy-navigator-title">Taxonomie als Liste</h2>
        <p>Jedes Thema ist auch ohne Kreisdiagramm auswählbar. Mit + öffnen Sie Unterthemen.</p>
      </div>
      <nav aria-label="Taxonomie-Themen">
        <ul>
          {root.children?.map((child) => (
            <Branch
              key={child.id}
              node={child}
              viewId={child.id}
              selectedId={selectedId}
              expandedIds={expandedIds}
              onToggle={toggle}
              onSelect={onSelect}
            />
          ))}
        </ul>
      </nav>
    </section>
  );
}
