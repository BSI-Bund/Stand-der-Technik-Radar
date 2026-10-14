import assert from 'node:assert/strict';
import { readFile, readdir } from 'node:fs/promises';
const root = process.argv[2] || 'public/generated';
const read = async (name) => JSON.parse(await readFile(`${root}/${name}`, 'utf8'));
const manifest = await read('ui-manifest.json');
assert.equal(manifest.schema_version, '1.0.0');
assert.ok(manifest.available_years.length > 0);
const expected = new Set(['taxonomy-map.json', 'ui-manifest.json', 'supplemental-catalogs.json']);
const years = new Set();
for (const entry of manifest.available_years) {
  assert.ok(Number.isInteger(entry.year) && !years.has(entry.year));
  years.add(entry.year);
  for (const [key, kind] of [
    ['trend_pack', 'pack'],
    ['aggregates', 'aggregates'],
  ]) {
    assert.equal(entry[key], `generated/trend-${kind}-${entry.year}.json`);
    expected.add(`trend-${kind}-${entry.year}.json`);
  }
  assert.equal(entry.mappings, undefined);
  const pack = await read(`trend-pack-${entry.year}.json`);
  const agg = await read(`trend-aggregates-${entry.year}.json`);
  assert.equal(pack.year, entry.year);
  assert.equal(agg.year, entry.year);
  const enabled = pack.themes.filter((t) => t.enabled !== false);
  assert.deepEqual(agg.themes.map((t) => t.trend_theme_id).sort(), enabled.map((t) => t.id).sort());
  assert.equal(new Set(agg.themes.map((t) => t.trend_theme_id)).size, agg.themes.length);
  assert.equal(agg.reproducibility, undefined);
  for (const theme of agg.themes) {
    assert.equal(theme.items, undefined);
    assert.equal(theme.counts.controls_total, theme.requirements.length);
    assert.equal(theme.counts.components_total, theme.components.length);
    assert.equal(theme.counts.items_total, theme.requirements.length + theme.components.length);
    for (const field of ['presence_pct', 'depth_pct', 'breadth_pct', 'coverage_pct']) {
      const value = theme.display[field];
      assert.ok(value === null || (Number.isFinite(value) && value >= 0 && value <= 100));
    }
    for (const item of [...theme.requirements, ...theme.components])
      assert.ok(Number.isFinite(item.score) && item.score >= 0 && item.score <= 1);
  }
}
assert.deepEqual(
  (await readdir(root)).sort(),
  [...expected].sort(),
  'Nur freigegebene UI-Dateien dürfen veröffentlicht werden.',
);
const taxonomy = await read('taxonomy-map.json');
assert.equal(taxonomy.schema_version, '2.0.0');
assert.deepEqual(
  Object.keys(taxonomy).sort(),
  ['schema_version', 'generated_at', 'stats', 'hierarchy', 'views', 'mappings'].sort(),
);
assert.deepEqual(
  Object.keys(taxonomy.stats).sort(),
  ['mapped_total', 'mapped_controls', 'mapped_components'].sort(),
);
assert.equal(taxonomy.stats.mapped_total, taxonomy.mappings.length);
assert.equal(
  taxonomy.stats.mapped_controls,
  taxonomy.mappings.filter((m) => m.item_type === 'control').length,
);
assert.equal(
  taxonomy.stats.mapped_components,
  taxonomy.mappings.filter((m) => m.item_type === 'component').length,
);
const ids = new Set(taxonomy.mappings.map((m) => m.mapping_key));
assert.equal(ids.size, taxonomy.mappings.length);
function walk(node) {
  const entries = node.mapping_ids || [];
  assert.ok(
    entries.every((id) => ids.has(id)),
    `Unbekannte Zuordnung in ${node.id}`,
  );
  assert.equal(node.counts.total, node.counts.controls + node.counts.components);
  for (const child of node.children || []) walk(child);
}
walk(taxonomy.hierarchy);
for (const root of [
  ...Object.values(taxonomy.views.domains),
  ...Object.values(taxonomy.views.functions),
])
  walk(root);
for (const mapping of taxonomy.mappings) {
  if (mapping.source_url)
    assert.ok(
      mapping.source_url.startsWith(
        'https://github.com/BSI-Bund/Stand-der-Technik-Bibliothek/blob/',
      ),
    );
}
for (const name of expected) {
  const content = await readFile(`${root}/${name}`, 'utf8');
  assert.ok(
    !/(?:\/Users\/|\/private\/|\/home\/|[A-Z]:\\Users\\)/.test(content),
    `Lokaler Pfad in ${name}`,
  );
}
console.log(
  `Öffentliche Daten geprüft: ${taxonomy.mappings.length} Radar-Vorkommen, ${years.size} Trendjahre.`,
);

const supplements = await read('supplemental-catalogs.json');
assert.equal(supplements.schema_version, '1.0.0');
const config = JSON.parse(await readFile('data/configs/radar-supplements.json', 'utf8'));
const configured = [];
for (const entry of config.catalogs.filter((entry) => entry.enabled)) {
  assert.match(entry.file, /^[a-z0-9-]+\.json$/);
  const projection = JSON.parse(await readFile(`data/supplements/${entry.file}`, 'utf8'));
  assert.equal(projection.id, entry.id);
  configured.push({ ...projection, replaces: entry.replaces });
}
assert.deepEqual(
  supplements.catalogs,
  configured,
  'Zusatzkataloge neu erzeugen: python scripts/build_supplements.py',
);
const replaced = new Set(configured.flatMap((catalog) => catalog.replaces));
const base = JSON.parse(await readFile('data/snapshots/public-radar.json', 'utf8'));
const expectedMappings = [
  ...base.mappings.filter((mapping) => !replaced.has(mapping.source_path)),
  ...configured.flatMap((catalog) => catalog.mappings),
];
assert.deepEqual(
  taxonomy.mappings,
  expectedMappings,
  'Radar-Rückfallstand passt nicht zur Zusatzkatalog-Konfiguration.',
);
const canonical = JSON.parse(await readFile('data/source/taxonomy/stand-der-technik.json', 'utf8'));
const paths = new Set(
  canonical.entries.map((row) =>
    [1, 2, 3, 4].map((level) => row[`Taxonomy-L${level}`]).join('\x1f'),
  ),
);
for (const catalog of configured) {
  assert.match(catalog.source_sha256, /^[a-f0-9]{64}$/);
  for (const mapping of catalog.mappings) {
    assert.equal(mapping.source_origin, 'manual');
    assert.equal(mapping.source_url, null);
    assert.equal(mapping.source_path, catalog.source_path);
    const tax = mapping.taxonomy;
    assert.ok(
      paths.has([tax.level1, tax.level2, tax.product_category, tax.product_group].join('\x1f')),
    );
  }
}
