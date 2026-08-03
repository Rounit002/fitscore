import { mkdir } from 'node:fs/promises';
import { join } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { createServer } from 'vite';

const playwrightRoot = process.env.TRAILFORGE_PLAYWRIGHT;
const browserPath = process.env.TRAILFORGE_BROWSER;
const baseUrl = process.env.TRAILFORGE_URL ?? 'http://127.0.0.1:4175';
if (!playwrightRoot || !browserPath) throw new Error('TRAILFORGE_PLAYWRIGHT and TRAILFORGE_BROWSER are required.');

const { chromium } = await import(pathToFileURL(join(playwrightRoot, 'index.mjs')).href);
const artifacts = new URL('../artifacts/', import.meta.url);
await mkdir(artifacts, { recursive: true });
const artifactPath = fileURLToPath(artifacts);
const projectRoot = fileURLToPath(new URL('../', import.meta.url));
const errors = [];
const vite = await createServer({ root: projectRoot, logLevel: 'silent', server: { host: '127.0.0.1', port: 4175, strictPort: true } });
await vite.listen();
const browser = await chromium.launch({ headless: true, executablePath: browserPath, args: ['--no-sandbox'] });

try {
  const page = await browser.newPage({ viewport: { width: 1440, height: 900 }, deviceScaleFactor: 1 });
  page.on('pageerror', (error) => errors.push(`pageerror: ${error.message}`));
  page.on('console', (message) => { if (message.type() === 'error') errors.push(`console: ${message.text()}`); });
  await page.goto(baseUrl, { waitUntil: 'networkidle' });
  await page.getByRole('heading', { name: /Build momentum/i }).waitFor();
  await page.screenshot({ path: join(artifactPath, 'menu-desktop.png') });
  await page.getByRole('button', { name: /START RUN/i }).click();
  await page.locator('#hud-distance').waitFor();
  await page.keyboard.down('KeyD');
  await page.waitForTimeout(3200);
  await page.keyboard.up('KeyD');
  await page.screenshot({ path: join(artifactPath, 'gameplay-acceleration.png') });
  const distance = Number((await page.locator('#hud-distance').textContent())?.replaceAll(',', '') ?? '0');
  if (distance <= 0) throw new Error(`Expected vehicle to travel forward, distance was ${distance}.`);
  await page.locator('.pause-button').click();
  await page.getByText('RUN PAUSED').waitFor();
  await page.getByRole('button', { name: /RESUME/i }).click();
  await page.screenshot({ path: join(artifactPath, 'gameplay-desktop.png') });
  const desktopLayout = await page.evaluate(() => ({ scrollWidth: document.body.scrollWidth, width: innerWidth, canvas: Boolean(document.querySelector('canvas')) }));
  if (!desktopLayout.canvas || desktopLayout.scrollWidth > desktopLayout.width) throw new Error(`Desktop layout overflow: ${JSON.stringify(desktopLayout)}`);
  await page.close();

  const mobile = await browser.newPage({ viewport: { width: 844, height: 390 }, isMobile: true, hasTouch: true, deviceScaleFactor: 1 });
  mobile.on('pageerror', (error) => errors.push(`mobile pageerror: ${error.message}`));
  mobile.on('console', (message) => { if (message.type() === 'error') errors.push(`mobile console: ${message.text()}`); });
  await mobile.goto(baseUrl, { waitUntil: 'networkidle' });
  await mobile.getByRole('button', { name: /START RUN/i }).click();
  await mobile.locator('#gas-control').waitFor();
  const controls = await mobile.evaluate(() => {
    const gas = document.querySelector('#gas-control');
    const brake = document.querySelector('#brake-control');
    if (!(gas instanceof HTMLElement) || !(brake instanceof HTMLElement)) return null;
    const gasRect = gas.getBoundingClientRect();
    const brakeRect = brake.getBoundingClientRect();
    return { gasWidth: gasRect.width, gasHeight: gasRect.height, gasX: gasRect.x + gasRect.width / 2, gasY: gasRect.y + gasRect.height / 2, brakeWidth: brakeRect.width, brakeHeight: brakeRect.height, brakeX: brakeRect.x + brakeRect.width / 2, brakeY: brakeRect.y + brakeRect.height / 2, touchAction: getComputedStyle(document.body).touchAction, overflow: document.body.scrollWidth - innerWidth };
  });
  if (!controls || controls.gasWidth < 44 || controls.gasHeight < 44 || controls.brakeWidth < 44 || controls.brakeHeight < 44) throw new Error(`Touch targets too small: ${JSON.stringify(controls)}`);
  if (controls.touchAction !== 'none' || controls.overflow > 0) throw new Error(`Mobile interaction/layout failure: ${JSON.stringify(controls)}`);
  const cdp = await mobile.context().newCDPSession(mobile);
  await cdp.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [{ x: controls.brakeX, y: controls.brakeY, id: 1, radiusX: 8, radiusY: 8, force: 1 }, { x: controls.gasX, y: controls.gasY, id: 2, radiusX: 8, radiusY: 8, force: 1 }] });
  await mobile.waitForTimeout(100);
  const simultaneous = await mobile.evaluate(() => ({ gas: document.querySelector('#gas-control')?.classList.contains('pressed'), brake: document.querySelector('#brake-control')?.classList.contains('pressed') }));
  await cdp.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] });
  if (!simultaneous.gas || !simultaneous.brake) throw new Error(`Simultaneous multi-touch failed: ${JSON.stringify(simultaneous)}`);
  await mobile.screenshot({ path: join(artifactPath, 'gameplay-mobile.png') });
  await mobile.close();

  if (errors.length) throw new Error(`Browser console errors:\n${errors.join('\n')}`);
  process.stdout.write(`Browser smoke passed. Desktop distance: ${distance}m. No console errors.\n`);
} finally {
  await browser.close();
  await vite.close();
}
