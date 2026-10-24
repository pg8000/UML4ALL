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
