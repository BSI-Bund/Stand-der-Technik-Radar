import type { Snapshot } from './sync';
const NAME = 'sdt-radar-library-v1';
function open(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(NAME, 1);
    const timer = setTimeout(() => reject(new Error('Cache nicht verfügbar.')), 2000);
    request.onupgradeneeded = () => request.result.createObjectStore('snapshot');
    request.onsuccess = () => {
      clearTimeout(timer);
      resolve(request.result);
    };
    request.onerror = () => {
      clearTimeout(timer);
      reject(request.error);
    };
    request.onblocked = () => {
      clearTimeout(timer);
      reject(new Error('Cache gesperrt.'));
    };
  });
}
export async function readSnapshot(): Promise<Snapshot | undefined> {
  let db: IDBDatabase | undefined;
  try {
    db = await open();
    const value: Snapshot | undefined = await new Promise((resolve, reject) => {
      const request = db!.transaction('snapshot').objectStore('snapshot').get('current');
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
    if (
      value?.version === 1 &&
      /^[a-f0-9]{40}$/.test(value.revision) &&
      value.data?.schema_version === '2.0.0' &&
      Array.isArray(value.data.mappings) &&
      value.data.hierarchy?.id === 'root' &&
      Boolean(
        value.data.views?.overview && value.data.views.functions && value.data.views.domains,
      ) &&
      Number.isFinite(value.data.stats?.mapped_total) &&
      Number.isFinite(Date.parse(value.checkedAt)) &&
      Array.isArray(value.sources) &&
      value.sources.every(
        (source) =>
          typeof source.path === 'string' &&
          /^[a-f0-9]{40}$/.test(source.sha) &&
          Array.isArray(source.mappings),
      )
    )
      return value;
  } catch {
    /* The cache is optional, including private browsing/quota failures. */
  } finally {
    db?.close();
  }
}
export async function writeSnapshot(value: Snapshot): Promise<void> {
  let db: IDBDatabase | undefined;
  try {
    db = await open();
    await new Promise<void>((resolve, reject) => {
      const transaction = db!.transaction('snapshot', 'readwrite');
      transaction.objectStore('snapshot').put(value, 'current');
      transaction.oncomplete = () => resolve();
      transaction.onerror = transaction.onabort = () => reject(transaction.error);
    });
  } catch {
    /* Data remains usable when persistent storage is unavailable. */
  } finally {
    db?.close();
  }
}
