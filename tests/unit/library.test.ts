import { afterEach, describe, expect, it, vi } from 'vitest';
import { readFileSync } from 'node:fs';
import { buildRadar, parseSource, eligiblePath } from '../../src/infrastructure/library/oscal';
import { synchronize, type Snapshot } from '../../src/infrastructure/library/sync';
const taxonomy = JSON.parse(readFileSync('data/source/taxonomy/stand-der-technik.json', 'utf8'));
const row = taxonomy.entries[0];
const props = [1, 2, 3, 4].map((level) => ({
  name: `Taxonomy-L${level}`,
  value: row[`Taxonomy-L${level}`],
}));
const sourcePath = 'control_layer/Cloud/Cloud-catalog.json';
const revision = 'a'.repeat(40);
const tree = 'b'.repeat(40);
const blob = 'c'.repeat(40);
const publishedAt = '2026-10-14T12:00:00Z';
function catalog(title = 'Fresh Control') {
  return {
    catalog: {
      uuid: 'catalog-id',
      metadata: { title: 'Cloud' },
      groups: [
        {
          controls: [
            { id: 'AC.1', title, props, controls: [{ id: 'AC.1.a', title: 'Nested', props }] },
          ],
        },
      ],
    },
  };
}
function mockNetwork(files: Record<string, unknown>, head = revision, truncated = false) {
  const calls: string[] = [];
  vi.stubGlobal(
    'fetch',
    vi.fn(async (url: string) => {
      calls.push(url);
      const body = url.includes('/commits?')
        ? { sha: head, commit: { committer: { date: publishedAt }, tree: { sha: tree } } }
        : url.includes('/git/trees/')
          ? {
              truncated,
              tree: [
                { path: 'control_layer', type: 'tree' },
                { path: 'implementation_layer', type: 'tree' },
                ...Object.entries(files).map(([path, value]) => ({
                  path,
                  sha: blob,
                  type: 'blob',
                  size: new TextEncoder().encode(JSON.stringify(value)).length,
                })),
              ],
            }
          : files[decodeURIComponent(url.split(`/${head}/`)[1])];
      if (body === undefined) return new Response('', { status: 404 });
      return new Response(JSON.stringify(url.includes('/commits?') ? [body] : body));
    }),
  );
  return calls;
}
afterEach(() => vi.unstubAllGlobals());
describe('OSCAL public radar import', () => {
  it('walks nested controls and components, preserving identities and four taxonomy levels', async () => {
    const source = await parseSource(sourcePath, blob, JSON.stringify(catalog()));
    const component = await parseSource(
      'implementation_layer/cloud.json',
      blob,
      JSON.stringify({
        'component-definition': { components: [{ uuid: 'comp', title: 'Cloud component', props }] },
      }),
    );
    const data = await buildRadar([source, component], revision, publishedAt);
    expect(data.stats).toEqual({ mapped_total: 3, mapped_controls: 2, mapped_components: 1 });
    expect(data.mappings[0].source_url).toContain(`/blob/${revision}/control_layer/Cloud/`);
    expect(data.mappings[0].taxonomy.product_group).toBe(row['Taxonomy-L4']);
    expect(data.views?.overview.counts.total).toBe(3);
    expect(Object.values(data.views!.functions).reduce((n, node) => n + node.counts.total, 0)).toBe(
      3,
    );
    expect(Object.values(data.views!.domains).reduce((n, node) => n + node.counts.total, 0)).toBe(
      3,
    );
  });
  it('accepts missing taxonomy but rejects incomplete, duplicate and unknown taxonomy', async () => {
    const missing = await parseSource(
      sourcePath,
      blob,
      JSON.stringify({ catalog: { controls: [{ id: 'x' }] } }),
    );
    expect(missing.withoutTaxonomy).toBe(1);
    expect(missing.mappings).toHaveLength(0);
    for (const invalid of [
      props.slice(1),
      [...props, props[0]],
      props.map((p) => ({ ...p, value: 'Unknown' })),
    ])
      await expect(
        parseSource(
          sourcePath,
          blob,
          JSON.stringify({ catalog: { controls: [{ props: invalid }] } }),
        ),
      ).rejects.toThrow('Taxonomie');
  });
  it('ignores other OSCAL models and wrong layers, retaining established archive policy', async () => {
    expect((await parseSource(sourcePath, blob, '{"profile":{}}')).kind).toBeNull();
    expect(
      (await parseSource('implementation_layer/wrong.json', blob, JSON.stringify(catalog()))).kind,
    ).toBeNull();
    expect(eligiblePath('control_layer/Archiv/a.json')).toBe(false);
    expect(eligiblePath('control_layer/Beispiel/a.json')).toBe(false);
    expect(eligiblePath('implementation_layer/AWS Beispiel-Components/a.json')).toBe(true);
    expect(eligiblePath('control_layer/../secret.json')).toBe(false);
  });
  it('keeps Python-generated stable node IDs and all views for the bundled canonical taxonomy', async () => {
    const baseline = JSON.parse(readFileSync('public/generated/taxonomy-map.json', 'utf8'));
    const data = await buildRadar([], revision, publishedAt);
    function ids(node: { id: string; children?: unknown[] }): string[] {
      return [node.id, ...(node.children ?? []).flatMap((child) => ids(child as typeof node))];
    }
    expect(ids(data.hierarchy)).toEqual(ids(baseline.hierarchy));
    for (const kind of ['functions', 'domains'] as const)
      for (const [key, value] of Object.entries(data.views![kind]))
        expect(ids(value)).toEqual(ids(baseline.views[kind][key]));
  });
});
describe('atomic fresh revision synchronization', () => {
  it('pins requests and source links to a commit and rechecks only HEAD when unchanged', async () => {
    const calls = mockNetwork({ [sourcePath]: catalog() });
    const first = await synchronize();
    expect(first.data.stats.mapped_total).toBe(2);
    expect(calls).toHaveLength(3);
    expect(calls[2]).toContain(`/${revision}/`);
    const next = await synchronize(first);
    expect(calls).toHaveLength(4);
    expect(next.data).toBe(first.data);
    expect(fetch).toHaveBeenCalledWith(
      expect.any(String),
      expect.objectContaining({ cache: 'no-store', credentials: 'omit' }),
    );
  });
  it('reuses unchanged blobs, drops deleted files, accepts a valid empty latest snapshot', async () => {
    mockNetwork({ [sourcePath]: catalog() });
    const first = await synchronize();
    const calls = mockNetwork({ [sourcePath]: catalog() }, 'd'.repeat(40));
    const second = await synchronize(first);
    expect(calls).toHaveLength(2);
    expect(second.data.mappings[0].source_url).toContain('d'.repeat(40));
    mockNetwork({}, 'e'.repeat(40));
    const empty = await synchronize(second);
    expect(empty.sources).toHaveLength(0);
    expect(empty.data.stats.mapped_total).toBe(0);
  });
  it('rejects partial trees and failed files instead of passing off partial results as current', async () => {
    mockNetwork({ [sourcePath]: catalog() }, revision, true);
    await expect(synchronize()).rejects.toThrow('vollständigen Dateibaum');
    const calls = mockNetwork({ [sourcePath]: catalog() });
    const wrapped = fetch;
    vi.stubGlobal(
      'fetch',
      vi.fn((url: string, options: RequestInit) =>
        url.includes('raw.githubusercontent.com')
          ? Promise.resolve(new Response('', { status: 503 }))
          : wrapped(url, options),
      ),
    );
    await expect(synchronize()).rejects.toThrow('nicht vollständig erreichbar');
    expect(calls).toHaveLength(2);
  });
  it('reports rate limits while leaving a previous snapshot untouched', async () => {
    mockNetwork({ [sourcePath]: catalog() });
    const previous = await synchronize();
    const before = JSON.stringify(previous);
    vi.stubGlobal(
      'fetch',
      vi.fn(async () => new Response('', { status: 403 })),
    );
    await expect(synchronize(previous)).rejects.toThrow('begrenzt');
    expect(JSON.stringify(previous)).toBe(before);
  });
  it('adds and changes sources without merging old or manual data', async () => {
    mockNetwork({ [sourcePath]: catalog() });
    const previous: Snapshot = await synchronize();
    previous.sources[0].sha = '0'.repeat(40);
    mockNetwork(
      {
        [sourcePath]: catalog('Updated'),
        'implementation_layer/New/component.json': {
          'component-definition': { components: [{ uuid: 'new', props }] },
        },
      },
      'd'.repeat(40),
    );
    const next = await synchronize(previous);
    expect(next.data.mappings[0].title).toBe('Updated');
    expect(next.data.stats.mapped_components).toBe(1);
    expect(next.data.mappings.every((item) => item.source_origin === 'public')).toBe(true);
  });
});
