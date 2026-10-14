import { test, expect } from '@playwright/test';
import { readFileSync } from 'node:fs';
test.beforeEach(async ({ context }) => {
  await context.route('https://api.github.com/**', (route) =>
    route.fulfill({ status: 503, body: 'offline fixture' }),
  );
});
const taxonomy = JSON.parse(readFileSync('public/generated/taxonomy-map.json', 'utf8'));
test('Pages serves the complete KERN app and local assets', async ({ page }) => {
  const errors: string[] = [];
  const bad: string[] = [];
  page.on('pageerror', (e) => errors.push(e.message));
  page.on('response', (r) => {
    if (r.status() >= 400 && r.url().startsWith('http://127.0.0.1')) bad.push(r.url());
  });
  await page.goto('./');
  await expect(page.getByRole('heading', { name: 'Taxonomie erkunden' })).toBeVisible();
  await expect(page.locator('.stat').first()).toContainText(
    taxonomy.stats.mapped_controls.toLocaleString('de-DE'),
  );
  await expect(page.locator('.sunburst .slice').first()).toBeVisible();
  await expect(page.locator('.kern-btn').first()).toBeVisible();
  await page.evaluate(() => document.fonts.ready);
  expect(await page.locator('body').evaluate((el) => getComputedStyle(el).fontFamily)).toContain(
    'Fira Sans',
  );
  expect(await page.evaluate(() => document.fonts.check('16px "Fira Sans"'))).toBeTruthy();
  expect(errors).toEqual([]);
  expect(bad).toEqual([]);
});
test('taxonomy selection, filtering, history and theme work', async ({ page }) => {
  await page.goto('./');
  const segment = page.locator('.slice').first();
  await expect(segment).toBeVisible();
  await segment.focus();
  await page.keyboard.press('Enter');
  await expect(page).toHaveURL(/view=/);
  const chosen = page.url();
  await page.reload();
  await expect(page.locator('#radar-details')).toBeVisible();
  expect(page.url()).toBe(chosen);
  const search = page.getByRole('searchbox', { name: 'Inhalte durchsuchen' }).first();
  await search.fill('does-not-exist-xyz');
  await expect(page.locator('.detail-section').first()).toContainText('Keine Einträge');
  await search.fill('');
  await page.getByRole('link', { name: 'Zur Radarübersicht' }).click();
  await expect(page).toHaveURL(/#radar$/);
  await page.goBack();
  expect(page.url()).toBe(chosen);
  await page.getByRole('button', { name: 'Dunkle Ansicht' }).click();
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark');
  await page.reload();
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark');
});
test('both trend years retain every theme and score', async ({ page }) => {
  await page.goto('./#trendmapping-2025');
  for (const year of [2025, 2024]) {
    const data = JSON.parse(readFileSync(`public/generated/trend-aggregates-${year}.json`, 'utf8'));
    await page.getByRole('button', { name: `Trendanalyse ${year}` }).click();
    await expect(page.locator('.trend-node')).toHaveCount(data.themes.length);
    const selected = data.themes.at(-1);
    await page.getByLabel('Thema auswählen').selectOption(selected.trend_theme_id);
    await expect(page.locator('.trend-summary-panel h3')).toHaveText(selected.label);
    await expect(page.locator('.score-line').last()).toContainText(
      selected.display.coverage_pct === null ? '-' : `${selected.display.coverage_pct}%`,
    );
  }
  await page.goBack();
  await expect(page.getByRole('button', { name: 'Trendanalyse 2025' })).toHaveAttribute(
    'aria-pressed',
    'true',
  );
});
for (const width of [320, 375, 768, 1440])
  test(`responsive layout at ${width}px`, async ({ page }) => {
    await page.setViewportSize({ width, height: 1000 });
    for (const hash of ['#radar', '#trendmapping-2025']) {
      await page.goto(`./${hash}`);
      await expect(page.locator(hash === '#radar' ? '.sunburst' : '.trend-svg')).toBeVisible();
      expect(
        await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1),
      ).toBeTruthy();
      await page.screenshot({
        path: `artifacts/${test.info().project.name}-${width}-${hash === '#radar' ? 'radar' : 'trends'}.png`,
        fullPage: false,
      });
    }
  });
test('load failure provides recoverable feedback', async ({ page }) => {
  let fail = true;
  await page.route('**/generated/taxonomy-map.json', (route) =>
    fail ? route.fulfill({ status: 503, body: 'unavailable' }) : route.continue(),
  );
  await page.goto('./');
  await expect(page.getByRole('alert')).toContainText('nicht vollständig erreichbar');
  fail = false;
  await page.getByRole('button', { name: 'Erneut prüfen' }).click();
  await expect(page.locator('.sunburst')).toBeVisible();
});

test('all NIST views and a deep taxonomy link remain navigable', async ({ page }) => {
  for (const [view, root] of Object.entries(taxonomy.views.functions) as [
    string,
    { id: string; label: string },
  ][]) {
    await page.goto(`./#radar?${new URLSearchParams({ view, node: root.id })}`);
    await expect(page.locator('#radar-details h2')).toHaveText(root.label);
    await expect(page.locator('.slice').first()).toBeVisible();
  }
});

test('trend pagination reaches results beyond the former 80-row limit', async ({ page }) => {
  const data = JSON.parse(readFileSync('public/generated/trend-aggregates-2024.json', 'utf8'));
  const theme = [...data.themes].sort((a, b) => b.requirements.length - a.requirements.length)[0];
  await page.goto('./#trendmapping-2024');
  await page.getByLabel('Thema auswählen').selectOption(theme.trend_theme_id);
  const section = page.getByRole('region', { name: 'Controls: Trendtreffer', exact: true });
  const rows = [...theme.requirements].sort((a, b) => (b.score ?? 0) - (a.score ?? 0));
  const targetPage = Math.min(4, Math.ceil(rows.length / 30));
  for (let i = 1; i < targetPage; i++)
    await section.getByRole('button', { name: 'Weiter' }).click();
  await expect(section.locator('tbody tr').first()).toContainText(
    rows[(targetPage - 1) * 30].requirement_id,
  );
  await expect(section.getByRole('status')).toContainText(`Seite ${targetPage}`);
});

test('skip link retains the active view and cached navigation avoids repeated data requests', async ({
  page,
  browserName,
}) => {
  const requests: string[] = [];
  page.on('request', (request) => {
    if (request.url().includes('/generated/')) requests.push(request.url());
  });
  await page.goto('./#trendmapping-2025');
  await expect(page.locator('.trend-svg')).toBeVisible();
  await page.keyboard.press(browserName === 'webkit' ? 'Alt+Tab' : 'Tab');
  await expect(page.getByRole('link', { name: 'Zum Inhalt springen' })).toBeFocused();
  await page.keyboard.press('Enter');
  await expect(page.locator('main')).toBeFocused();
  await expect(page).toHaveURL(/#trendmapping-2025$/);
  await page.getByRole('link', { name: 'Radar', exact: true }).click();
  await expect(page.locator('.sunburst')).toBeVisible();
  await page.getByRole('link', { name: 'Trendmapping', exact: true }).click();
  await page.getByRole('button', { name: 'Trendanalyse 2025' }).click();
  await expect(page.locator('.trend-svg')).toBeVisible();
  expect(requests.filter((url) => url.endsWith('trend-aggregates-2025.json'))).toHaveLength(1);
});

test('explicit KERN theme works independently of OS preference', async ({ page }) => {
  await page.emulateMedia({ colorScheme: 'dark', reducedMotion: 'reduce' });
  await page.goto('./');
  await expect(page.locator('.sunburst')).toBeVisible();
  await expect(page.locator('html')).toHaveAttribute('data-kern-theme', 'light');
  const backgroundPixel = () =>
    page.evaluate(() => {
      const context = document.createElement('canvas').getContext('2d')!;
      context.fillStyle = getComputedStyle(document.body).backgroundColor;
      context.fillRect(0, 0, 1, 1);
      return Array.from(context.getImageData(0, 0, 1, 1).data);
    });
  expect(await backgroundPixel()).toEqual([255, 255, 255, 255]);
  await page.getByRole('button', { name: 'Dunkle Ansicht' }).click();
  await expect(page.locator('html')).toHaveAttribute('data-kern-theme', 'dark');
  expect(await backgroundPixel()).not.toEqual([255, 255, 255, 255]);
  await page.screenshot({ path: `artifacts/${test.info().project.name}-dark-radar.png` });
});
