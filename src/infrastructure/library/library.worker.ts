import { synchronize, type LibraryMessage } from './sync';
import { readSnapshot, writeSnapshot } from './storage';
import { applySupplements, readSupplements } from './supplements';
import { dataUrl } from '../load';
function send(message: LibraryMessage) {
  if (message.type === 'error') self.postMessage(message);
  else {
    const { data, revision, checkedAt } = message.snapshot;
    self.postMessage({ type: message.type, snapshot: { data, revision, checkedAt } });
  }
}
self.onmessage = async () => {
  const previous = await readSnapshot();
  try {
    const response = await fetch(dataUrl('generated/supplemental-catalogs.json'), {
      cache: 'no-cache',
      signal: AbortSignal.timeout(15000),
    });
    if (!response.ok) throw new Error('Die lokalen Zusatzkataloge konnten nicht geladen werden.');
    const supplements = readSupplements(await response.json());
    if (previous) send({ type: 'cached', snapshot: await applySupplements(previous, supplements) });
    const snapshot = await synchronize(previous);
    await writeSnapshot(snapshot);
    send({ type: 'fresh', snapshot: await applySupplements(snapshot, supplements) });
  } catch (error) {
    send({
      type: 'error',
      message:
        error instanceof TypeError
          ? 'Die öffentliche Bibliothek ist derzeit nicht erreichbar.'
          : error instanceof SyntaxError
            ? 'Eine Quelldatei enthält kein gültiges JSON. Der bisherige Stand bleibt erhalten.'
            : error instanceof Error
              ? error.message
              : 'Die Bibliothek konnte nicht aktualisiert werden.',
    });
  }
};
