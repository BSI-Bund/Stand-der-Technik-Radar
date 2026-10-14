import { describe, expect, it, vi, afterEach } from 'vitest';
import { parseRoute, radarHash } from '../../src/app/routing';
import { dataUrl } from '../../src/infrastructure/load';
describe('Pages routing', () => {
  afterEach(() => vi.unstubAllEnvs());
  it('round-trips taxonomy names with reserved characters', () => {
    expect(parseRoute(radarHash('Cloud & Netze', 'a/b + c'))).toEqual({
      tab: 'radar',
      view: 'Cloud & Netze',
      node: 'a/b + c',
    });
  });
  it('restores old published trend links', () => {
    expect(parseRoute('#trendmapping-2025')).toEqual({ tab: 'trends', year: 2025 });
  });
  it('defaults to overview', () => {
    expect(parseRoute('')).toEqual({ tab: 'radar', view: 'overview', node: 'root' });
  });
  it('keeps data below the Pages project', () => {
    vi.stubEnv('BASE_URL', '/Stand-der-Technik-Radar/');
    expect(dataUrl('/generated/taxonomy-map.json')).toBe(
      '/Stand-der-Technik-Radar/generated/taxonomy-map.json',
    );
  });
  it('rejects external and traversing data paths', () => {
    for (const p of [
      'https://example.com/x.json',
      'generated/../secret.json',
      '//example.com/x.json',
    ])
      expect(() => dataUrl(p)).toThrow();
  });
});
