import taxonomy from '../../../data/source/taxonomy/stand-der-technik.json';
import type { TaxonomyMapData, TaxonomyMapping, TaxonomyNode } from '../../domain/types';

export const REPOSITORY = 'BSI-Bund/Stand-der-Technik-Bibliothek';
const LEVELS = ['Taxonomy-L1', 'Taxonomy-L2', 'Taxonomy-L3', 'Taxonomy-L4'] as const;
const PALETTE = ['#265DFF', '#0E8F8E', '#7654C8', '#B86500', '#BB3241', '#4262A6'];
type ObjectValue = Record<string, unknown>;
export type Source = {
  path: string;
  sha: string;
  sha256: string;
  kind: 'control' | 'component' | null;
  objects: number;
  withoutTaxonomy: number;
  mappings: TaxonomyMapping[];
};
export function object(value: unknown): ObjectValue {
  if (!value || typeof value !== 'object' || Array.isArray(value))
    throw new Error('Ungültige OSCAL-Struktur.');
  return value as ObjectValue;
}
function list(value: unknown): unknown[] {
  if (value === undefined) return [];
  if (!Array.isArray(value)) throw new Error('Ungültige OSCAL-Liste.');
  return value;
}
const text = (value: unknown) => (typeof value === 'string' ? value : '');
const pathKey = (values: string[]) => values.join('\x1f');
const valid = new Set(taxonomy.entries.map((row) => pathKey(LEVELS.map((level) => row[level]))));
export async function digest(value: string, algorithm = 'SHA-1'): Promise<string> {
  const bytes = await crypto.subtle.digest(algorithm, new TextEncoder().encode(value));
  return Array.from(new Uint8Array(bytes), (byte) => byte.toString(16).padStart(2, '0')).join('');
}
const slugs = new Map<string, Promise<string>>();
function slug(...parts: string[]) {
  const key = pathKey(parts);
  if (!slugs.has(key))
    slugs.set(
      key,
      digest(key).then((hash) => hash.slice(0, 14)),
    );
  return slugs.get(key)!;
}
function* controls(node: ObjectValue): Generator<ObjectValue> {
  for (const entry of list(node.controls)) {
    const control = object(entry);
    yield control;
    yield* controls(control);
  }
  for (const group of list(node.groups)) yield* controls(object(group));
}
export function eligiblePath(path: string): boolean {
  const parts = path.split('/');
  return (
    /^(control_layer|implementation_layer)\/.+\.json$/i.test(path) &&
    !parts.some((part) => ['archiv', 'beispiel'].includes(part.toLowerCase())) &&
    !parts.some((part) => ['.', '..', ''].includes(part))
  );
}
/** Only explicit, complete canonical taxonomy properties produce radar mappings. */
export async function parseSource(path: string, sha: string, raw: string): Promise<Source> {
  const document = object(JSON.parse(raw.replace(/^\uFEFF/, '')));
  const kind =
    path.startsWith('control_layer/') && document.catalog
      ? 'control'
      : path.startsWith('implementation_layer/') && document['component-definition']
        ? 'component'
        : null;
  const result: Source = {
    path,
    sha,
    sha256: await digest(raw, 'SHA-256'),
    kind,
    objects: 0,
    withoutTaxonomy: 0,
    mappings: [],
  };
  if (!kind) return result; // Profiles and mapping collections are not Catalogs/Components.
  const body = object(document[kind === 'control' ? 'catalog' : 'component-definition']);
  const metadata = body.metadata ? object(body.metadata) : {};
  const items = kind === 'control' ? [...controls(body)] : list(body.components).map(object);
  result.objects = items.length;
  result.mappings = (
    await Promise.all(
      items.map(async (item, index): Promise<TaxonomyMapping | null> => {
        const props = list(item.props).map(object);
        const found = LEVELS.map((level) =>
          props.filter((prop) => prop.name === level).map((prop) => text(prop.value).trim()),
        );
        if (found.every((values) => !values.length)) {
          result.withoutTaxonomy++;
          return null;
        }
        if (
          found.some((values) => values.length !== 1 || !values[0]) ||
          !valid.has(pathKey(found.map((values) => values[0])))
        )
          throw new Error(`Ungültige Taxonomie in ${path}. Der bisherige Stand bleibt erhalten.`);
        const [l1, l2, l3, l4] = found.map((values) => values[0]);
        const id = text(item.id) || text(item.uuid) || `position-${index}`;
        return {
          mapping_key: `${kind}:${await slug(path, id, String(index))}`,
          item_type: kind,
          id,
          identity:
            text(props.find((prop) => prop.name === 'alt-identifier')?.value) ||
            text(item.uuid) ||
            `${text(body.uuid) || path}:${id}`,
          title: text(item.title) || id,
          uuid: text(item.uuid),
          source_title:
            text(metadata.title) ||
            path
              .split('/')
              .at(-1)!
              .replace(/\.json$/, ''),
          source_uuid: text(body.uuid),
          source_path: path,
          source_origin: 'public',
          source_url: null,
          taxonomy: {
            leaf_id: `leaf:${await slug(l1, l2, l3, l4)}`,
            level1: l1,
            level2: l2,
            product_category: l3,
            product_group: l4,
            level3: l4,
          },
        };
      }),
    )
  ).filter((item): item is TaxonomyMapping => item !== null);
  // Do not retain every historical item's hash in a long-lived worker.
  slugs.clear();
  return result;
}
export async function buildRadar(
  sources: Source[],
  revision: string,
  publishedAt: string,
): Promise<TaxonomyMapData> {
  const mappings = sources.flatMap((source) =>
    source.mappings.map((mapping) => ({
      ...mapping,
      source_url:
        mapping.source_origin === 'manual'
          ? null
          : `https://github.com/${REPOSITORY}/blob/${revision}/${mapping.source_path.split('/').map(encodeURIComponent).join('/')}`,
    })),
  );
  const byNode = new Map<string, TaxonomyMapping[]>();
  for (const mapping of mappings) {
    const t = mapping.taxonomy;
    const [f, fd, fc, d, dc] = await Promise.all([
      slug(t.level1),
      slug(t.level1, t.level2),
      slug(t.level1, t.level2, t.product_category!),
      slug(t.level2),
      slug(t.level2, t.product_category!),
    ]);
    for (const key of [
      'root',
      `function:${f}`,
      `function-domain:${fd}`,
      `function-domain-category:${fc}`,
      `domain:${d}`,
      `domain-category:${dc}`,
      t.leaf_id,
    ]) {
      if (!byNode.has(key)) byNode.set(key, []);
      byNode.get(key)!.push(mapping);
    }
  }
  const node = (
    id: string,
    label: string,
    level: number,
    kind: TaxonomyNode['kind'],
    color?: string,
    details?: string,
  ): TaxonomyNode => {
    const items = byNode.get(id) ?? [];
    const controls = items.filter((item) => item.item_type === 'control').length;
    return {
      id,
      label,
      level,
      kind,
      ...(color ? { color } : {}),
      ...(details ? { details } : {}),
      counts: { controls, components: items.length - controls, total: items.length },
      mapping_ids: items.map((item) => item.mapping_key),
      children: [],
    };
  };
  const overview = node('root', 'SdT Taxonomie', 0, 'overview');
  const functions: Record<string, TaxonomyNode> = {};
  const domains: Record<string, TaxonomyNode> = {};
  const overviewFunctions = new Map<string, TaxonomyNode>();
  const functionDomains = new Map<string, TaxonomyNode>();
  const functionCategories = new Map<string, TaxonomyNode>();
  const domainCategories = new Map<string, TaxonomyNode>();
  for (const row of taxonomy.entries) {
    const [l1, l2, l3, l4] = LEVELS.map((level) => row[level]);
    const [f, fd, fc, d, dc, leaf] = await Promise.all([
      slug(l1),
      slug(l1, l2),
      slug(l1, l2, l3),
      slug(l2),
      slug(l2, l3),
      slug(l1, l2, l3, l4),
    ]);
    const [fk, fdk, fck, dk, dck, lk] = [
      `function:${f}`,
      `function-domain:${fd}`,
      `function-domain-category:${fc}`,
      `domain:${d}`,
      `domain-category:${dc}`,
      `leaf:${leaf}`,
    ];
    if (!overviewFunctions.has(fk)) {
      const n = node(fk, l1, 1, 'function', PALETTE[overviewFunctions.size % PALETTE.length]);
      n.view_ref = fk;
      overviewFunctions.set(fk, n);
      overview.children!.push(n);
      functions[fk] = node(fk, l1, 0, 'function');
    }
    const color = overviewFunctions.get(fk)!.color;
    if (!functionDomains.has(fdk)) {
      const n = node(fdk, l2, 2, 'technology_domain', color);
      n.view_ref = dk;
      n.display_weight = Math.max(0.36, n.counts.total);
      overviewFunctions.get(fk)!.children!.push(n);
      const branch = node(fdk, l2, 1, 'technology_domain', color);
      functionDomains.set(fdk, branch);
      functions[fk].children!.push(branch);
    }
    if (!functionCategories.has(fck)) {
      const n = node(fck, l3, 2, 'product_category', color);
      functionCategories.set(fck, n);
      functionDomains.get(fdk)!.children!.push(n);
    }
    functionCategories
      .get(fck)!
      .children!.push(node(lk, l4, 3, 'product_group', color, row.details));
    domains[dk] ??= node(dk, l2, 0, 'technology_domain');
    if (!domainCategories.has(dck)) {
      const n = node(
        dck,
        l3,
        1,
        'product_category',
        PALETTE[domains[dk].children!.length % PALETTE.length],
      );
      domainCategories.set(dck, n);
      domains[dk].children!.push(n);
    }
    const category = domainCategories.get(dck)!;
    category.children!.push(node(lk, l4, 2, 'product_group', category.color, row.details));
  }
  slugs.clear();
  const mappedControls = mappings.filter((item) => item.item_type === 'control').length;
  return {
    schema_version: '2.0.0',
    generated_at: publishedAt,
    stats: {
      mapped_total: mappings.length,
      mapped_controls: mappedControls,
      mapped_components: mappings.length - mappedControls,
    },
    hierarchy: overview,
    views: { overview, functions, domains },
    mappings,
  };
}
