import { cp, mkdir, readdir } from 'node:fs/promises';
import path from 'node:path';
const output = process.argv[2];
if (!output || path.resolve(output).startsWith(process.cwd() + path.sep))
  throw new Error('Zielverzeichnis außerhalb des Projekts angeben.');
await mkdir(output, { recursive: false });
const folders = ['src', 'public', 'scripts', 'schemas', 'tests', 'docs', '.github'];
for (const folder of folders)
  await cp(folder, path.join(output, folder), {
    recursive: true,
    filter: (source) => !source.includes('__pycache__'),
  });
for (const folder of ['configs', 'trend-packs', 'supplements', 'snapshots'])
  await cp(`data/${folder}`, path.join(output, 'data', folder), { recursive: true });
await mkdir(path.join(output, 'data/source/taxonomy'), { recursive: true });
await cp(
  'data/source/taxonomy/stand-der-technik.json',
  path.join(output, 'data/source/taxonomy/stand-der-technik.json'),
);
for (const file of await readdir('.'))
  if (
    /^(README\.md|CONTRIBUTING\.md|CHANGELOG\.md|LICENSE\.md|NOTICE\.md|AGENTS\.md|SECURITY\.md|index\.html|package(?:-lock)?\.json|requirements(?:-dev)?\.(?:txt|in)|pyproject\.toml|.*config\.(?:js|ts|json)|\.nvmrc|\.python-version|\.editorconfig|\.gitignore|\.prettierignore|\.prettierrc\.json)$/.test(
      file,
    )
  )
    await cp(file, path.join(output, file));
console.log(`Öffentlicher Quellstand vorbereitet: ${output}`);
