import type { TaxonomyMapping } from '../../domain/types';
import { buildRadar, object, type Source } from './oscal';
import type { Snapshot } from './sync';

export type SupplementalCatalog = {
  id: string;
  title: string;
  source_path: string;
  source_sha256: string;
  replaces: string[];
  mappings: TaxonomyMapping[];
};

/** The deployed overlay is separate from the revision-based public library cache. */
export function readSupplements(value: unknown): SupplementalCatalog[] {
  const data = object(value);
  if (data.schema_version !== '1.0.0' || !Array.isArray(data.catalogs))
    throw new Error('Die Zusatzkataloge sind unvollständig.');
  const ids = new Set<string>();
  return data.catalogs.map((value) => {
    const catalog = object(value);
    if (
      typeof catalog.id !== 'string' ||
      ids.has(catalog.id) ||
      typeof catalog.title !== 'string' ||
      typeof catalog.source_path !== 'string' ||
      !catalog.source_path.startsWith('Zusatzkatalog/') ||
      typeof catalog.source_sha256 !== 'string' ||
      !/^[a-f0-9]{64}$/.test(catalog.source_sha256) ||
      !Array.isArray(catalog.replaces) ||
      !catalog.replaces.every(
        (path) => typeof path === 'string' && path.startsWith('control_layer/'),
      ) ||
      !Array.isArray(catalog.mappings)
    )
      throw new Error('Ungültiger Zusatzkatalog.');
    ids.add(catalog.id);
    for (const value of catalog.mappings) {
      const mapping = object(value);
      if (
        mapping.source_origin !== 'manual' ||
        mapping.source_path !== catalog.source_path ||
        mapping.source_url !== null ||
        typeof mapping.mapping_key !== 'string' ||
        mapping.item_type !== 'control' ||
        typeof mapping.title !== 'string' ||
        typeof mapping.identity !== 'string' ||
        typeof mapping.id !== 'string'
      )
        throw new Error('Ungültige Zusatzkatalog-Zuordnung.');
      const taxonomy = object(mapping.taxonomy);
      if (
        !['leaf_id', 'level1', 'level2', 'product_category', 'product_group', 'level3'].every(
          (key) => typeof taxonomy[key] === 'string' && taxonomy[key],
        )
      )
        throw new Error('Unvollständige Zusatzkatalog-Taxonomie.');
    }
    return catalog as SupplementalCatalog;
  });
}

export async function applySupplements(snapshot: Snapshot, catalogs: SupplementalCatalog[]) {
  if (!catalogs.length) return snapshot;
  const replaced = new Set(catalogs.flatMap((catalog) => catalog.replaces));
  const publicSources = snapshot.sources.filter((source) => !replaced.has(source.path));
  const manualSources: Source[] = catalogs.map((catalog) => ({
    path: catalog.source_path,
    sha: catalog.source_sha256,
    sha256: catalog.source_sha256,
    kind: 'control',
    objects: catalog.mappings.length,
    withoutTaxonomy: 0,
    mappings: catalog.mappings,
  }));
  const data = await buildRadar(
    [...publicSources, ...manualSources],
    snapshot.revision,
    snapshot.data.generated_at,
  );
  if (new Set(data.mappings.map((mapping) => mapping.mapping_key)).size !== data.mappings.length)
    throw new Error('Doppelte Zusatzkatalog-Zuordnungen.');
  // Deliberately retain public-only sources: the augmented result is never persisted to IndexedDB.
  return { ...snapshot, data };
}
