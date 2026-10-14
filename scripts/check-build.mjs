import assert from 'node:assert/strict';
import { readFile, readdir, stat } from 'node:fs/promises';
import { execFileSync } from 'node:child_process';
execFileSync(process.execPath, ['scripts/check-data.mjs', 'dist/generated'], { stdio: 'inherit' });
const html = await readFile('dist/index.html', 'utf8');
assert.ok(!html.includes('__SDT_GENERATED__'));
assert.ok(!html.includes('blob:'));
const urls = [...html.matchAll(/(?:src|href)="(\/Stand-der-Technik-Radar\/[^"#]+)"/g)].map(
  (m) => m[1],
);
assert.ok(urls.some((url) => url.endsWith('.js')));
for (const url of urls)
  assert.ok((await stat(`dist/${url.replace('/Stand-der-Technik-Radar/', '')}`)).size);
const assets = await readdir('dist/assets');
assert.ok(
  assets.some((name) => name.endsWith('.woff2')),
  'Lokale Fira-Sans-Dateien fehlen.',
);
let jsBytes = 0;
for (const file of assets) {
  const info = await stat(`dist/assets/${file}`);
  if (file.endsWith('.js')) jsBytes += info.size;
  if (file.endsWith('.css')) {
    const css = await readFile(`dist/assets/${file}`, 'utf8');
    assert.ok(
      !/(?:url\(\s*['"]?|@import\s*['"])https?:\/\//.test(css.replace(/\/\*[\s\S]*?\*\//g, '')),
      'Externe CSS-Abhängigkeit.',
    );
    assert.ok(css.includes('kern-btn'), 'Native KERN-Styles fehlen.');
  }
}
assert.ok(jsBytes < 550_000, `JavaScript-Budget überschritten: ${jsBytes}`);
assert.ok(!(await readdir('dist')).includes('Stand der Technik-Radar.html'));
console.log(
  `Pages-Artefakt geprüft; JavaScript insgesamt ${(jsBytes / 1024).toFixed(1)} KiB (Budget 537 KiB).`,
);
