const { defineConfig } = require('@playwright/test');
const path = require('node:path');
module.exports = defineConfig({
  testDir: './e2e',
  timeout: 30000,
  expect: { timeout: 10000, toHaveScreenshot: { maxDiffPixelRatio: 0.002, animations: 'disabled', caret: 'hide' } },
  retries: 1,
  workers: 2,
  reporter: [['list'], ['html', { open: 'never', outputFolder: 'report' }], ['json', { outputFile: 'results.json' }]],
  snapshotPathTemplate: '{testDir}/../snapshots/{projectName}/{arg}{ext}',
  use: { baseURL: 'http://127.0.0.1:4173', browserName: 'chromium', locale: 'it-IT', timezoneId: 'Europe/Rome', trace: 'retain-on-failure', screenshot: 'only-on-failure' },
  projects: [
    { name: 'desktop', use: { viewport: { width: 1280, height: 900 }, deviceScaleFactor: 1 } },
    { name: 'mobile', use: { viewport: { width: 390, height: 844 }, deviceScaleFactor: 1, isMobile: true, hasTouch: true } }
  ],
  webServer: { command: 'node serve.cjs', cwd: path.resolve(__dirname, '..'), url: 'http://127.0.0.1:4173', reuseExistingServer: false, timeout: 15000 }
});
