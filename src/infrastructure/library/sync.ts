import { buildRadar, eligiblePath, object, parseSource, REPOSITORY, type Source } from './oscal';
import type { TaxonomyMapData } from '../../domain/types';

export type Snapshot = {
  version: 1;
  revision: string;
  checkedAt: string;
  data: TaxonomyMapData;
  sources: Source[];
};
export type LibraryMessage =
  | { type: 'cached' | 'fresh'; snapshot: Pick<Snapshot, 'data' | 'revision' | 'checkedAt'> }
  | { type: 'error'; message: string };
type Entry = { path: string; sha: string; size: number };
const API = `https://api.github.com/repos/${REPOSITORY}`;
const isSha = (value: unknown): value is string =>
  typeof value === 'string' && /^[a-f0-9]{40}$/.test(value);
async function request(url: string, timeout = 15000): Promise<Response> {
  const response = await fetch(url, {
    cache: 'no-store',
    credentials: 'omit',
    signal: AbortSignal.timeout(timeout),
  });
  if (!response.ok) {
    if (response.status === 403 || response.status === 429)
      throw new Error('GitHub begrenzt derzeit die Abrufe. Bitte später erneut prüfen.');
    throw new Error('Die öffentliche Bibliothek ist derzeit nicht vollständig erreichbar.');
  }
  return response;
}
/** A single commit pins tree, files and source links; publish only complete snapshots. */
export async function synchronize(previous?: Snapshot): Promise<Snapshot> {
  // The one-entry list omits the large file diffs returned by /commits/{ref}.
  const commits: unknown = await (await request(`${API}/commits?sha=main&per_page=1`)).json();
  if (!Array.isArray(commits) || commits.length !== 1)
    throw new Error('Ungültige Bibliotheksrevision.');
  const commit = object(commits[0]);
  if (!isSha(commit.sha)) throw new Error('Ungültige Bibliotheksrevision.');
  const revision = commit.sha;
  const checkedAt = new Date().toISOString();
  if (previous?.revision === revision) return { ...previous, checkedAt };
  const metadata = object(commit.commit);
  const publishedAt = object(metadata.committer).date;
  if (typeof publishedAt !== 'string' || !Number.isFinite(Date.parse(publishedAt)))
    throw new Error('Ungültiger Veröffentlichungszeitpunkt.');
  const treeId = object(metadata.tree).sha;
  if (!isSha(treeId)) throw new Error('Ungültiger Dateibaum.');
  const tree = object(await (await request(`${API}/git/trees/${treeId}?recursive=1`)).json());
  if (tree.truncated !== false || !Array.isArray(tree.tree))
    throw new Error(
      'GitHub liefert keinen vollständigen Dateibaum. Der bisherige Stand bleibt erhalten.',
    );
  const entries: Entry[] = [];
  const paths = new Set<string>();
  for (const value of tree.tree) {
    const entry = object(value);
    if (entry.type !== 'blob' || typeof entry.path !== 'string' || !eligiblePath(entry.path))
      continue;
    if (
      !isSha(entry.sha) ||
      typeof entry.size !== 'number' ||
      entry.size < 0 ||
      entry.size > 64 * 1024 * 1024 ||
      paths.has(entry.path)
    )
      throw new Error('Die Bibliotheksdateien können nicht vollständig verarbeitet werden.');
    paths.add(entry.path);
    entries.push({ path: entry.path, sha: entry.sha, size: entry.size });
  }
  if (
    entries.length > 4000 ||
    entries.reduce((total, entry) => total + entry.size, 0) > 200 * 1024 * 1024
  )
    throw new Error('Die Bibliothek überschreitet die unterstützte Browser-Datenmenge.');
  // Missing layer directories signal a repository/layout problem, not an empty library.
  for (const layer of ['control_layer', 'implementation_layer'])
    if (
      !tree.tree.some((value) => {
        const entry = object(value);
        return entry.type === 'tree' && entry.path === layer;
      })
    )
      throw new Error('Die erwarteten Bibliotheksordner fehlen.');
  entries.sort((a, b) => (a.path < b.path ? -1 : a.path > b.path ? 1 : 0));
  const old = new Map(previous?.sources.map((source) => [source.path, source]) ?? []);
  const sources = new Array<Source>(entries.length);
  let cursor = 0;
  const controller = new AbortController();
  // Bounded parallel fetches; raw OSCAL never crosses the worker boundary or enters the cache.
  await Promise.all(
    Array.from({ length: Math.min(4, entries.length) }, async () => {
      while (cursor < entries.length && !controller.signal.aborted) {
        const index = cursor++;
        const entry = entries[index];
        const cached = old.get(entry.path);
        if (cached?.sha === entry.sha) {
          sources[index] = cached;
          continue;
        }
        try {
          const url = `https://raw.githubusercontent.com/${REPOSITORY}/${revision}/${entry.path.split('/').map(encodeURIComponent).join('/')}`;
          const response = await request(url, 30000);
          sources[index] = await parseSource(entry.path, entry.sha, await response.text());
        } catch (error) {
          controller.abort();
          throw error;
        }
      }
    }),
  );
  const data = await buildRadar(sources, revision, publishedAt);
  return { version: 1, revision, checkedAt, data, sources };
}
