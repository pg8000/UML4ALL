const { test, expect } = require('@playwright/test');
const fs = require('node:fs/promises');
const engine = require('../../engine.js');
const examples = require('../../examples.js');

async function ready(page, title) {
  await expect(page.locator('#render-status')).toHaveText('Aggiornato');
  const image = page.getByRole('img', { name: title, exact: true });
  await expect(image).toBeVisible();
  await expect.poll(() => image.evaluate(el => el.complete && el.naturalWidth > 0)).toBe(true);
}
async function attachScreen(page, testInfo, name) {
  await testInfo.attach(name, { body: await page.screenshot({ fullPage: true, animations: 'disabled', caret: 'hide' }), contentType: 'image/png' });
}

test('examples, layout and visual regression', async ({ page }, testInfo) => {
  const errors = [];
  page.on('pageerror', error => errors.push(error.message));
  await page.goto('/');
  for (const [value, title] of [['network', 'Architettura di rete'], ['workflow', 'Richiesta di accesso'], ['logic', 'Architettura logica']]) {
    await page.locator('#example').selectOption(value);
    await ready(page, title);
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= document.documentElement.clientWidth)).toBe(true);
    await expect(page).toHaveScreenshot(value + '.png', { fullPage: true });
    await attachScreen(page, testInfo, value);
  }
  if (test.info().project.name === 'mobile') {
    const widths = await page.locator('.panels').evaluate(el => ({ panel: el.clientWidth, children: [...el.children].filter(child => child.id !== "panel-resizer").map(child => child.getBoundingClientRect().width) }));
    for (const width of widths.children) expect(Math.abs(width - widths.panel)).toBeLessThanOrEqual(1);
  }
  const initialZoom = await page.locator('#zoom-value').textContent();
  await page.locator('#zoom-in').click();
  await expect(page.locator('#zoom-value')).not.toHaveText(initialZoom);
  await page.locator('#fit').click();
  await expect(page.locator('#zoom-value')).toHaveText(initialZoom);
  await page.locator('#help-button').click();
  await expect(page.getByRole('dialog', { name: 'Guida all’uso di UML4ALL' })).toBeVisible();
  await expect(page).toHaveScreenshot('guide.png', { fullPage: true });
  await attachScreen(page, testInfo, 'guide');
  await page.locator('#close-help').click();
  expect(errors).toEqual([]);
});

test('live rendering, errors, safe export and input security', async ({ page }) => {
  const errors = [];
  page.on('pageerror', error => errors.push(error.message));
  page.on('dialog', async dialog => { errors.push('Unexpected dialog: ' + dialog.type()); await dialog.dismiss(); });
  await page.goto('/');
  await ready(page, 'Architettura di rete');
  await expect(page.locator('input[type=file],#import-button')).toHaveCount(0);
  expect(await page.locator('meta[http-equiv="Content-Security-Policy"]').getAttribute('content')).toContain("connect-src 'none'");
  await expect(page.locator('#source')).toHaveAttribute('maxlength', '100000');

  await page.locator('#source').fill('diagram "Errore" {\n node a\n a -> mancante\n}');
  await expect(page.locator('#message')).toContainText('Riga 3: Elemento non dichiarato: mancante');
  await expect(page.locator('#export-button')).toBeDisabled();
  await expect(page.getByRole('img', { name: 'Architettura di rete', exact: true })).toBeVisible();
  const payload = '</text><script>alert(1)</script><image href="https://attacker.invalid/x" onload="alert(1)"/>';
  const source = 'diagram "Test sicurezza cloud" {\n node a ' + JSON.stringify(payload) + '\n}';
  await page.locator('#source').fill(source);
  await ready(page, 'Test sicurezza cloud');
  await expect(page.locator('#preview svg,#preview script,#preview iframe,#preview object')).toHaveCount(0);

  const svgDownloadEvent = page.waitForEvent('download');
  await page.locator('#export-button').click();
  const svgDownload = await svgDownloadEvent;
  const svg = await fs.readFile(await svgDownload.path(), 'utf8');
  const svgSafety = await page.evaluate(value => {
    UML4ALLSafeSVG.validate(value);
    const doc = new DOMParser().parseFromString(value, 'image/svg+xml');
    return {
      activeElements: doc.querySelectorAll('script,image,foreignObject,iframe').length,
      unsafeAttributes: [...doc.querySelectorAll('*')].some(el => [...el.attributes].some(a => /^on/i.test(a.name) || ['href', 'xlink:href', 'style'].includes(a.name)))
    };
  }, svg);
  expect(svgSafety).toEqual({ activeElements: 0, unsafeAttributes: false });
  expect(svg).toContain('&lt;script&gt;');
  const retDownloadEvent = page.waitForEvent('download');
  await page.locator('#save-button').click();
  const ret = await fs.readFile(await (await retDownloadEvent).path(), 'utf8');
  expect(ret).toBe(source);
  expect(engine.parse(ret).nodes.length).toBe(1);

  const malformed = [
    '<svg xmlns="http://www.w3.org/2000/svg"><script>alert(1)</script></svg>',
    '<svg xmlns="http://www.w3.org/2000/svg"><rect onload="alert(1)"/></svg>',
    '<svg xmlns="http://www.w3.org/2000/svg"><image href="https://attacker.invalid"/></svg>',
    '<svg xmlns="http://www.w3.org/2000/svg"><rect fill="url(https://attacker.invalid)"/></svg>',
    '<!DOCTYPE svg><svg xmlns="http://www.w3.org/2000/svg"/>'
  ];
  expect(await page.evaluate(fixtures => fixtures.every(svg => { try { UML4ALLSafeSVG.validate(svg); return false; } catch { return true; } }), malformed)).toBe(true);
  await page.locator('#source').fill('diagram "Limite" {\n node a ' + JSON.stringify('x'.repeat(301)) + '\n}');
  await expect(page.locator('#message')).toContainText('massimo 300 caratteri');
  await page.locator('#live').uncheck();
  await page.locator('#source').fill(examples.blank);
  await expect(page.locator('#render-status')).toHaveText('Da generare');
  await page.locator('#render-button').click();
  await ready(page, 'Il mio schema');
  expect(errors).toEqual([]);
});

test('published GitHub Pages is operational', async ({ browser }, testInfo) => {
  const context = await browser.newContext({ viewport: testInfo.project.use.viewport, locale: 'it-IT', timezoneId: 'Europe/Rome' });
  try {
    const page = await context.newPage();
    const errors = [];
    page.on('pageerror', error => errors.push(error.message));
    const response = await page.goto('https://pg8000.github.io/UML4ALL/');
    expect(response.status()).toBe(200);
    await ready(page, 'Architettura di rete');
    await expect(page.locator('input[type=file],#import-button')).toHaveCount(0);
    await page.locator('#example').selectOption('workflow');
    await ready(page, 'Richiesta di accesso');
    await attachScreen(page, testInfo, 'published-workflow');
    expect(errors).toEqual([]);
  } finally { await context.close(); }
});

test('diagram grows with page and manual zoom survives layout changes', async ({ page }, testInfo) => {
  await page.goto('/');
  await page.locator('#source').fill('diagram "Diagramma verticale" {\n direction down\n' +
    Array.from({ length: 12 }, (_, i) => `node n${i} "Passo ${i + 1}"`).join('\n') + '\n' +
    Array.from({ length: 11 }, (_, i) => `n${i} -> n${i + 1}`).join('\n') + '\n}');
  await ready(page, 'Diagramma verticale');
  const canvas = page.locator('#preview');
  const height = await canvas.evaluate(el => el.clientHeight);
  await page.locator('#zoom-in').click();
  const zoom = await page.locator('#zoom-value').textContent();
  await expect.poll(() => canvas.evaluate(el => el.clientHeight)).toBeGreaterThan(height);
  // The page grows vertically; only horizontal overflow remains inside the canvas.
  expect(await canvas.evaluate(el => el.scrollHeight - el.clientHeight)).toBeLessThanOrEqual(1);
  await page.locator('#diagram-view').click();
  await expect(page.locator('.code-panel')).toBeHidden();
  await expect(page.locator('#diagram-view')).toHaveAttribute('aria-pressed', 'true');
  await expect(page.locator('#zoom-value')).toHaveText(zoom);
  await page.setViewportSize({ width: 600, height: 800 });
  await expect(page.locator('#zoom-value')).toHaveText(zoom);
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= document.documentElement.clientWidth)).toBe(true);
  await page.locator('#fit').click();
  expect(await canvas.evaluate(el => el.scrollWidth - el.clientWidth)).toBeLessThanOrEqual(1);
  await attachScreen(page, testInfo, 'expanded-diagram');
  await page.locator('#diagram-view').click();
  await expect(page.locator('.code-panel')).toBeVisible();
  await expect(page.locator('#source')).toHaveValue(/Diagramma verticale/);
});


test('ready blocks insert unique code and update the diagram with live paused', async ({ page }, testInfo) => {
  await page.goto('/');
  await ready(page, 'Architettura di rete');
  await page.locator('#live').uncheck();
  const original = await page.locator('#source').inputValue();
  await page.getByRole('button', { name: 'Aggiungi Server', exact: true }).click();
  await ready(page, 'Architettura di rete');
  await expect(page.locator('#source')).toHaveValue(/server server1 "Server"/);
  await expect(page.locator('#diagram-info')).toHaveText('7 elementi · 5 collegamenti');
  await page.getByRole('button', { name: 'Aggiungi Server', exact: true }).click();
  await ready(page, 'Architettura di rete');
  await expect(page.locator('#source')).toHaveValue(/server server2 "Server"/);
  await expect(page.locator('#diagram-info')).toHaveText('8 elementi · 5 collegamenti');
  expect((await page.locator('#source').inputValue()).includes(original.slice(0, original.lastIndexOf('}')))).toBe(true);
  await attachScreen(page, testInfo, 'ready-blocks');
  await page.locator('#source').fill('diagram "Errore" {\n a -> mancante\n}');
  const invalid = await page.locator('#source').inputValue();
  await page.getByRole('button', { name: 'Aggiungi Database', exact: true }).click();
  await expect(page.locator('#message')).toContainText('Blocco non inserito');
  await expect(page.locator('#source')).toHaveValue(invalid);
});

test('splitter resizes editor and refits diagram by keyboard and pointer', async ({ page }, testInfo) => {
  test.skip(testInfo.project.name === 'mobile', 'Stacked panels on narrow screens');
  await page.goto('/');
  await ready(page, 'Architettura di rete');
  const separator = page.getByRole('separator', { name: 'Larghezza del codice' });
  const editor = page.locator('.code-panel');
  const before = await editor.boundingBox();
  const zoom = await page.locator('#zoom-value').textContent();
  await separator.focus();
  await separator.press('ArrowRight');
  await expect.poll(async () => (await editor.boundingBox()).width).toBeGreaterThan(before.width);
  await expect(page.locator('#zoom-value')).not.toHaveText(zoom);
  const handle = await separator.boundingBox();
  await page.mouse.move(handle.x + handle.width / 2, handle.y + 100);
  await page.mouse.down();
  await page.mouse.move(handle.x - 120, handle.y + 100, { steps: 8 });
  await page.mouse.up();
  expect((await editor.boundingBox()).width).toBeLessThan(before.width);
  expect(await page.locator('body').evaluate(el => el.classList.contains('resizing'))).toBe(false);
  await attachScreen(page, testInfo, 'resized-panels');
});
