import type {
  TaxonomyMapData,
  TrendAggregates,
  TrendManifest,
  TrendManifestYear,
  TrendPack,
} from '../domain/types';
const cache = new Map<string, Promise<unknown>>();
/** Resolve data within the Pages project path, never at github.io/generated/. */
export function dataUrl(path: string): string {
  const relative = path.replace(/^\//, '');
  if (!/^generated\/[a-z0-9-]+\.json$/.test(relative)) throw new Error('Ungültiger Datenpfad.');
  return `${import.meta.env.BASE_URL}${relative}`;
}
async function load<T>(path: string, validate: (data: T) => boolean): Promise<T> {
  const url = dataUrl(path);
  if (!cache.has(url)) {
    const request = fetch(url)
      .then(async (response) => {
        if (!response.ok)
          throw new Error('Daten konnten nicht geladen werden. Bitte versuchen Sie es erneut.');
        const data = (await response.json()) as T;
        if (!data || !validate(data))
          throw new Error(
            'Die Daten sind unvollständig oder haben ein nicht unterstütztes Format.',
          );
        return data;
      })
      .catch((error) => {
        cache.delete(url);
        throw error;
      });
    cache.set(url, request);
  }
  return cache.get(url) as Promise<T>;
}
export function loadTaxonomyMap() {
  return load<TaxonomyMapData>(
    'generated/taxonomy-map.json',
    (data) =>
      data.schema_version === '2.0.0' &&
      Array.isArray(data.mappings) &&
      Boolean(data.hierarchy && data.stats),
  );
}
export function loadTrendManifest() {
  return load<TrendManifest>(
    'generated/ui-manifest.json',
    (data) => data.schema_version === '1.0.0' && Array.isArray(data.available_years),
  );
}
export async function loadTrendBundle(
  year: TrendManifestYear,
): Promise<{ pack: TrendPack; aggregates: TrendAggregates }> {
  const [pack, aggregates] = await Promise.all([
    load<TrendPack>(
      year.trend_pack,
      (data) => data.year === year.year && Array.isArray(data.themes),
    ),
    load<TrendAggregates>(
      year.aggregates,
      (data) => data.year === year.year && Array.isArray(data.themes) && Array.isArray(data.kpis),
    ),
  ]);
  return { pack, aggregates };
}
