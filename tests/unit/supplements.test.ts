import { expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { applySupplements, readSupplements } from '../../src/infrastructure/library/supplements';
import { buildRadar, parseSource } from '../../src/infrastructure/library/oscal';
import type { Snapshot } from '../../src/infrastructure/library/sync';
const payload = JSON.parse(readFileSync('public/generated/supplemental-catalogs.json', 'utf8'));
const catalogs = readSupplements(payload);
const base = JSON.parse(readFileSync('data/snapshots/public-radar.json', 'utf8'));
const revision = 'a'.repeat(40);
it('reproduces the approved Python fallback and marks all Kernel records as manual', async () => {
  const sources = [
    ...new Set<string>(base.mappings.map((item: { source_path: string }) => item.source_path)),
  ].map((path) => ({
    path,
    sha: revision,
    sha256: '',
    kind: 'control' as const,
    objects: 0,
    withoutTaxonomy: 0,
    mappings: base.mappings.filter((item: { source_path: string }) => item.source_path === path),
  }));
  const snapshot: Snapshot = {
    version: 1,
    revision,
    checkedAt: base.generated_at,
    data: base,
    sources,
  };
  const result = await applySupplements(snapshot, catalogs);
  const expected = JSON.parse(readFileSync('public/generated/taxonomy-map.json', 'utf8'));
  expect(result.data.views).toEqual(expected.views);
  expect(result.data.stats).toEqual(expected.stats);
  expect(result.data.mappings.filter((item) => item.source_origin === 'manual')).toHaveLength(901);
  expect(
    result.data.mappings
      .filter((item) => item.source_origin === 'manual')
      .every((item) => item.source_url === null),
  ).toBe(true);
  expect(snapshot.data).toBe(base);
  expect(snapshot.sources).toEqual(sources);
  expect(await applySupplements(snapshot, [])).toBe(snapshot);
});
it('replaces only the explicitly configured public Kernel variant', async () => {
  const row = catalogs[0].mappings[0].taxonomy;
  const props = [row.level1, row.level2, row.product_category, row.product_group].map(
    (value, index) => ({ name: `Taxonomy-L${index + 1}`, value }),
  );
  const raw = JSON.stringify({
    catalog: { controls: [{ id: 'public', title: 'Public Kernel', props }] },
  });
  const replaced = await parseSource(catalogs[0].replaces[0], revision, raw);
  const retained = await parseSource('control_layer/Other/catalog.json', revision, raw);
  const sources = [replaced, retained];
  const data = await buildRadar(sources, revision, base.generated_at);
  const result = await applySupplements(
    { version: 1, revision, checkedAt: base.generated_at, data, sources },
    catalogs,
  );
  expect(result.data.mappings.filter((item) => item.source_origin === 'public')).toHaveLength(1);
  expect(result.data.mappings.some((item) => item.source_path === replaced.path)).toBe(false);
  expect(result.data.stats.mapped_controls).toBe(902);
});
it('rejects malformed and duplicate supplemental definitions', () => {
  expect(() => readSupplements({ schema_version: 'other', catalogs: [] })).toThrow();
  expect(() => readSupplements({ ...payload, catalogs: [...catalogs, ...catalogs] })).toThrow();
  expect(() =>
    readSupplements({ ...payload, catalogs: [{ ...catalogs[0], source_sha256: 'bad' }] }),
  ).toThrow();
});
