import type { TaxonomyMapData } from '../../domain/types';
import type { LibraryMessage } from './sync';
import { loadTaxonomyMap } from '../load';
export type RadarState = {
  data?: TaxonomyMapData;
  status: 'checking' | 'fresh' | 'fallback';
  revision?: string;
  checkedAt?: string;
  message?: string;
};
let state: RadarState = { status: 'checking' };
const listeners = new Set<(state: RadarState) => void>();
let running = false;
function publish(next: RadarState) {
  state = next;
  listeners.forEach((listener) => listener(state));
}
/** One update per radar opening; React StrictMode shares the pending request. */
export function watchRadar(listener: (state: RadarState) => void) {
  listeners.add(listener);
  listener(state);
  refreshRadar();
  return () => {
    listeners.delete(listener);
  };
}
export function refreshRadar() {
  if (running) return;
  running = true;
  publish({ ...state, status: 'checking', message: undefined });
  let worker: Worker | undefined;
  let timer: ReturnType<typeof setTimeout> | undefined;
  const finish = () => {
    running = false;
    clearTimeout(timer);
    worker?.terminate();
  };
  const fail = (message: string) => {
    publish({ ...state, status: 'fallback', message });
    finish();
  };
  void loadTaxonomyMap()
    .then((data) => {
      if (!state.data) publish({ ...state, data });
    })
    .catch(() => {
      /* A successful live load can still replace a missing bundled fallback. */
    });
  try {
    worker = new Worker(new URL('./library.worker.ts', import.meta.url), { type: 'module' });
    timer = setTimeout(
      () => fail('Die Aktualisierung dauert zu lange. Bitte erneut prüfen.'),
      90000,
    );
    worker.onmessage = (event: MessageEvent<LibraryMessage>) => {
      const result = event.data;
      if (result.type === 'error') {
        fail(result.message);
        return;
      }
      const { data, revision, checkedAt } = result.snapshot;
      publish({
        data,
        revision,
        checkedAt,
        status: result.type === 'fresh' ? 'fresh' : 'checking',
      });
      if (result.type === 'fresh') finish();
    };
    worker.onerror = (event) => {
      event.preventDefault();
      fail('Die automatische Aktualisierung ist derzeit nicht verfügbar.');
    };
    worker.postMessage({ type: 'refresh' });
  } catch {
    fail('Die automatische Aktualisierung wird von diesem Browser nicht unterstützt.');
  }
}
