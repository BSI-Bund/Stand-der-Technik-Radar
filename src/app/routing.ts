export type Route = { tab: 'radar'; view: string; node: string } | { tab: 'trends'; year?: number };
export function parseRoute(hash: string): Route {
  if (hash.startsWith('#trendmapping')) {
    const match = /^#trendmapping-(\d{4})$/.exec(hash);
    return { tab: 'trends', year: match ? Number(match[1]) : undefined };
  }
  const params = new URLSearchParams(hash.startsWith('#radar?') ? hash.slice(7) : '');
  return {
    tab: 'radar',
    view: params.get('view') || 'overview',
    node: params.get('node') || 'root',
  };
}
export function radarHash(view: string, node: string) {
  return `#radar?${new URLSearchParams({ view, node })}`;
}
