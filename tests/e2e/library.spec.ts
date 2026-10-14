import { test, expect, type BrowserContext } from '@playwright/test';
import { readFileSync } from 'node:fs';
const taxonomy = JSON.parse(readFileSync('data/source/taxonomy/stand-der-technik.json', 'utf8'));
const baseline = JSON.parse(readFileSync('public/generated/taxonomy-map.json', 'utf8'));
const props = [1, 2, 3, 4].map((level) => ({
  name: `Taxonomy-L${level}`,
  value: taxonomy.entries[0][`Taxonomy-L${level}`],
}));
const firstPath = 'control_layer/New/Live-catalog.json';
const componentPath = 'implementation_layer/New/Live-component_definition.json';
const sha = (letter: string) => letter.repeat(40);
function catalog(title: string) {
  return {
    catalog: {
      uuid: 'live-catalog',
      metadata: { title: 'Live Catalog' },
      controls: [{ id: 'live-control', title, props }],
    },
  };
}
function component() {
  return {
    'component-definition': {
      uuid: 'live-definition',
      metadata: { title: 'Live Components' },
      components: [{ uuid: 'live-component', title: 'Live component', props }],
    },
  };
}
async function library(context: BrowserContext, withSupplements = false) {
  if (!withSupplements)
    await context.route('**/generated/supplemental-catalogs.json', (route) =>
      route.fulfill({ json: { schema_version: '1.0.0', catalogs: [] } }),
    );
  const state = {
    revision: sha('a'),
    files: { [firstPath]: { sha: sha('c'), body: catalog('First published control') } } as Record<
      string,
      { sha: string; body: unknown }
    >,
    failure: 0,
    broken: false,
    raw: [] as string[],
    api: 0,
  };
  await context.route('https://api.github.com/**', async (route) => {
    state.api++;
    if (state.failure) return route.fulfill({ status: state.failure, body: 'Unavailable' });
    const url = route.request().url();
    const body = url.includes('/commits?')
      ? {
          sha: state.revision,
          commit: { committer: { date: '2026-10-14T12:00:00Z' }, tree: { sha: sha('b') } },
        }
      : {
          truncated: false,
          tree: [
            { path: 'control_layer', type: 'tree' },
            { path: 'implementation_layer', type: 'tree' },
            ...Object.entries(state.files).map(([path, file]) => ({
              path,
              sha: file.sha,
              type: 'blob',
              size: JSON.stringify(file.body).length,
            })),
          ],
        };
    await route.fulfill({ json: url.includes('/commits?') ? [body] : body });
  });
  await context.route('https://raw.githubusercontent.com/**', async (route) => {
    const url = route.request().url();
    state.raw.push(url);
    if (state.broken) return route.fulfill({ status: 503, body: 'Broken file' });
    const path = decodeURIComponent(url.split(`/${state.revision}/`)[1]);
    const file = state.files[path];
    await route.fulfill(file ? { json: file.body } : { status: 404, body: 'Not found' });
  });
  return state;
}
test('Viewer link uses the complete name and correct community address', async ({
  page,
  context,
}) => {
  await library(context);
  await page.goto('./');
  await expect(
    page.getByRole('link', { name: 'Zum Stand der Technik-Viewer ↗', exact: true }),
  ).toHaveAttribute('href', 'https://bsi-community.github.io/Stand-der-Technik-Viewer/');
});
test('loads fresh public contents, keeps them cached and only fetches changes on reopening', async ({
  page,
  context,
}) => {
  const state = await library(context);
  await page.goto('./');
  await expect(page.getByRole('status')).toContainText('Mit öffentlicher Bibliothek abgeglichen');
  await expect(page.locator('#radar-details')).toContainText('First published control');
  expect(state.raw).toHaveLength(1);
  expect(state.raw[0]).toContain(`/${sha('a')}/`);
  await page.reload();
  await expect(page.getByRole('status')).toContainText('Mit öffentlicher Bibliothek abgeglichen');
  expect(state.raw).toHaveLength(1);
  expect(state.api).toBe(3);
  state.revision = sha('d');
  state.files[componentPath] = { sha: sha('e'), body: component() };
  await page.reload();
  await expect(page.getByRole('status')).toContainText('Quellstand ddddddd');
  await expect(page.locator('#radar-details')).toContainText('Live component');
  expect(state.raw).toHaveLength(2);
  state.revision = sha('f');
  state.files[firstPath] = { sha: sha('f'), body: catalog('Updated published control') };
  delete state.files[componentPath];
  await page.reload();
  await expect(page.getByRole('status')).toContainText('Quellstand fffffff');
  await expect(page.locator('#radar-details')).toContainText('Updated published control');
  await expect(page.locator('#radar-details')).not.toContainText('Live component');
  expect(state.raw).toHaveLength(3);
});
test('network errors retain the latest complete cache with a visible status and successful retry', async ({
  page,
  context,
}) => {
  const state = await library(context);
  await page.goto('./');
  await expect(page.getByRole('status')).toContainText('Mit öffentlicher Bibliothek abgeglichen');
  state.failure = 403;
  await page.reload();
  await expect(page.getByRole('status')).toContainText('Aktualisierung nicht möglich');
  await expect(page.getByRole('status')).toContainText('zuletzt erfolgreich geladene Stand');
  await expect(page.locator('#radar-details')).toContainText('First published control');
  state.failure = 0;
  await page.getByRole('button', { name: 'Erneut prüfen' }).click();
  await expect(page.getByRole('status')).toContainText('Mit öffentlicher Bibliothek abgeglichen');
});
test('partial downloads and invalid taxonomy never replace a complete snapshot', async ({
  page,
  context,
}) => {
  const state = await library(context);
  await page.goto('./');
  await expect(page.getByRole('status')).toContainText('Mit öffentlicher Bibliothek abgeglichen');
  state.revision = sha('d');
  state.files[firstPath].sha = sha('d');
  state.broken = true;
  await page.reload();
  await expect(page.getByRole('status')).toContainText('Aktualisierung nicht möglich');
  await expect(page.locator('#radar-details')).toContainText('First published control');
  state.broken = false;
  state.files[firstPath].body = {
    catalog: { controls: [{ id: 'invalid', props: props.slice(1) }] },
  };
  await page.getByRole('button', { name: 'Erneut prüfen' }).click();
  await expect(page.getByRole('status')).toContainText('Ungültige Taxonomie');
  await expect(page.locator('#radar-details')).toContainText('First published control');
});
test('empty published mappings replace older results, and trend data never triggers a library update', async ({
  page,
  context,
}) => {
  const state = await library(context);
  await page.goto('./#trendmapping-2025');
  await expect(page.locator('.trend-svg')).toBeVisible();
  expect(state.api).toBe(0);
  expect(state.raw).toHaveLength(0);
  await page.getByRole('link', { name: 'Radar', exact: true }).click();
  await expect(page.getByRole('status')).toContainText('Mit öffentlicher Bibliothek abgeglichen');
  state.revision = sha('d');
  state.files = {};
  await page.getByRole('button', { name: 'Erneut prüfen' }).click();
  await expect(page.getByRole('status')).toContainText('Quellstand ddddddd');
  await expect(page.locator('.stat').first()).toContainText('0');
  await expect(page.locator('#radar-details')).not.toContainText('First published control');
});
test('all overview outer-ring selections keep the diagram scroll position', async ({
  page,
  context,
}) => {
  await context.route('https://api.github.com/**', (route) =>
    route.fulfill({ status: 503, body: 'offline fixture' }),
  );
  await page.setViewportSize({ width: 1600, height: 1000 });
  await page.goto('./');
  await expect(page.locator('.library-status')).toContainText('Aktualisierung nicht möglich');
  const nodes = baseline.views.overview.children.flatMap(
    (node: { children: unknown[] }) => node.children,
  );
  for (const node of nodes) {
    await page.getByRole('link', { name: 'Zur Radarübersicht' }).click();
    await expect(page.locator('.core-title')).toContainText('SdT');
    const target = page
      .locator('.slice')
      .filter({
        has: page.locator(`path > title`, {
          hasText: new RegExp(`^${node.label.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}$`),
        }),
      })
      .first();
    await target.scrollIntoViewIfNeeded();
    let before = await page.evaluate(() => scrollY);
    const point = await target.locator('path').evaluate((element) => {
      const path = element as SVGPathElement;
      const box = path.getBBox();
      const matrix = path.getScreenCTM()!;
      // Pick a filled point inside this actual ring segment, not its bounding-box hole.
      for (let column = 1; column < 20; column++)
        for (let row = 1; row < 20; row++) {
          const point = new DOMPoint(
            box.x + (box.width * column) / 20,
            box.y + (box.height * row) / 20,
          );
          if (!path.isPointInFill(point)) continue;
          const screen = point.matrixTransform(matrix);
          const x = Math.round(screen.x);
          const y = Math.round(screen.y);
          const target = path.closest('.slice');
          if (
            y > 5 &&
            y < innerHeight - 5 &&
            [-1, 0, 1].every((dx) =>
              [-1, 0, 1].every(
                (dy) => document.elementFromPoint(x + dx, y + dy)?.closest('.slice') === target,
              ),
            )
          )
            return { x, y };
        }
      return null; // Subpixel empty segments remain keyboard-accessible.
    });
    if (point) await page.mouse.click(point.x, point.y);
    else {
      await target.focus();
      before = await page.evaluate(() => scrollY);
      await page.keyboard.press('Enter');
    }
    await expect(page).toHaveURL(new RegExp(encodeURIComponent(node.view_ref)));
    await page.evaluate(
      () => new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(resolve))),
    );
    expect(Math.abs((await page.evaluate(() => scrollY)) - before), node.label).toBeLessThanOrEqual(
      2,
    );
    await expect(page.locator('.core-title')).toContainText(node.label.split(' ')[0]);
  }
});

test('a damaged browser cache is discarded and rebuilt from the public source', async ({
  page,
  context,
}) => {
  const state = await library(context);
  await page.goto('./');
  await expect(page.getByRole('status')).toContainText('Mit öffentlicher Bibliothek abgeglichen');
  await page.evaluate(
    () =>
      new Promise<void>((resolve, reject) => {
        const request = indexedDB.open('sdt-radar-library-v1', 1);
        request.onsuccess = () => {
          const db = request.result;
          const tx = db.transaction('snapshot', 'readwrite');
          tx.objectStore('snapshot').put(
            {
              version: 1,
              revision: 'a'.repeat(40),
              data: { schema_version: '2.0.0', mappings: [] },
              sources: [],
            },
            'current',
          );
          tx.oncomplete = () => {
            db.close();
            resolve();
          };
          tx.onerror = () => reject(tx.error);
        };
        request.onerror = () => reject(request.error);
      }),
  );
  await page.reload();
  await expect(page.getByRole('status')).toContainText('Mit öffentlicher Bibliothek abgeglichen');
  await expect(page.locator('#radar-details')).toContainText('First published control');
  expect(state.raw).toHaveLength(2);
});

test('Kernel overlay survives refresh and disappears after removal without contaminating the public cache', async ({
  page,
  context,
}) => {
  const state = await library(context, true);
  await page.goto('./');
  await expect(page.getByRole('status')).toContainText('Mit öffentlicher Bibliothek abgeglichen');
  await expect(page.locator('.stat').first()).toContainText('902');
  await page.locator('.detail-section').first().getByRole('combobox').selectOption('manual');
  await expect(page.locator('.detail-section').first()).toContainText('Zusatzkatalog');
  await page.reload();
  await expect(page.getByRole('status')).toContainText('Mit öffentlicher Bibliothek abgeglichen');
  await expect(page.locator('.stat').first()).toContainText('902');
  expect(state.raw).toHaveLength(1);
  await context.route('**/generated/supplemental-catalogs.json', (route) =>
    route.fulfill({ json: { schema_version: '1.0.0', catalogs: [] } }),
  );
  await page.reload();
  await expect(page.getByRole('status')).toContainText('Mit öffentlicher Bibliothek abgeglichen');
  await expect(page.locator('.stat').first().locator('strong')).toHaveText('1');
  expect(state.raw).toHaveLength(1);
});

test('zoom uses the full panel width while retaining height, scale and circular proportions', async ({
  page,
  context,
}) => {
  await context.route('https://api.github.com/**', (route) =>
    route.fulfill({ status: 503, body: 'offline fixture' }),
  );
  await page.setViewportSize({ width: 1920, height: 1100 });
  await page.goto('./');
  await expect(page.locator('.library-status')).toContainText('Aktualisierung nicht möglich');
  const geometry = () =>
    page.locator('.chart-wrap').evaluate((element) => {
      const rect = element.getBoundingClientRect();
      const panel = element.parentElement!;
      const style = getComputedStyle(panel);
      const available =
        panel.clientWidth - parseFloat(style.paddingLeft) - parseFloat(style.paddingRight);
      const svg = element.querySelector('svg')!;
      const circle = svg.querySelector('circle')!.getBoundingClientRect();
      return {
        width: rect.width,
        height: rect.height,
        available,
        viewWidth: svg.viewBox.baseVal.width,
        viewHeight: svg.viewBox.baseVal.height,
        circleWidth: circle.width,
        circleHeight: circle.height,
      };
    });
  const before = await geometry();
  expect(before.width).toBeGreaterThan(1000);
  expect(Math.abs(before.width - before.available)).toBeLessThan(2);
  expect(before.height).toBe(860);
  await page.getByRole('button', { name: 'Hineinzoomen' }).click();
  await page.getByRole('button', { name: 'Hineinzoomen' }).click();
  const after = await geometry();
  expect(after.height).toBe(before.height);
  expect(after.width).toBe(before.width);
  expect(after.viewWidth / after.viewHeight).toBeCloseTo(after.width / after.height, 3);
  expect(after.circleWidth / after.circleHeight).toBeCloseTo(1, 3);
  expect(after.circleWidth / before.circleWidth).toBeCloseTo(1.36, 2);
  await page
    .locator('.map-panel')
    .screenshot({ path: `artifacts/${test.info().project.name}-wide-zoom.png` });
});
