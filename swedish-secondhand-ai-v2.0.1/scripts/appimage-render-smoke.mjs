import { mkdtemp, readFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import process from 'node:process';
import { spawn } from 'node:child_process';
import { chromium } from '@playwright/test';

const [artifact] = process.argv.slice(2);
if (!artifact) throw new Error('Usage: appimage-render-smoke.mjs <path-to-AppImage>');

const profile = await mkdtemp(path.join(tmpdir(), 'swedish-secondhand-ai-render-smoke-'));
const stderr = [];
const childEnvironment = { ...process.env };
delete childEnvironment.ELECTRON_RUN_AS_NODE;
const child = spawn(
  path.resolve(artifact),
  ['--no-sandbox', '--disable-gpu', '--remote-debugging-port=0', `--user-data-dir=${profile}`],
  { detached: true, env: childEnvironment, stdio: ['ignore', 'ignore', 'pipe'] },
);
child.stderr.setEncoding('utf8');
child.stderr.on('data', (chunk) => stderr.push(chunk));

const delay = (milliseconds) => new Promise((resolve) => setTimeout(resolve, milliseconds));

async function readDebugPort() {
  const deadline = Date.now() + 20_000;
  while (Date.now() < deadline) {
    if (child.exitCode !== null) {
      throw new Error(`AppImage exited before renderer inspection (code ${child.exitCode})`);
    }
    try {
      const contents = await readFile(path.join(profile, 'DevToolsActivePort'), 'utf8');
      const port = Number.parseInt(contents.split('\n', 1)[0], 10);
      if (Number.isInteger(port) && port > 0) return port;
    } catch {
      // Chromium creates DevToolsActivePort after the browser process is ready.
    }
    await delay(100);
  }
  throw new Error('Timed out waiting for the Electron debugging endpoint');
}

let browser;
try {
  const port = await readDebugPort();
  browser = await chromium.connectOverCDP(`http://127.0.0.1:${port}`);
  const page = browser.contexts().flatMap((context) => context.pages())[0];
  if (!page) throw new Error('Electron exposed no renderer page');

  await page.locator('#root > *').first().waitFor({ state: 'visible', timeout: 15_000 });
  const text = (await page.locator('#root').innerText()).trim();
  if (!text) throw new Error('Electron renderer root is visible but contains no text');

  console.log(`AppImage renderer smoke passed: ${page.url()} (${text.length} text characters)`);
} catch (error) {
  if (stderr.length > 0) console.error(stderr.join('').slice(-8_000));
  throw error;
} finally {
  if (browser) {
    const session = await browser.newBrowserCDPSession().catch(() => undefined);
    await session?.send('Browser.close').catch(() => undefined);
    await browser.close().catch(() => undefined);
  }
  if (child.pid) {
    try {
      process.kill(-child.pid, 'SIGTERM');
    } catch {
      // The process may already have exited after a startup failure.
    }
  }
  for (let attempt = 0; attempt < 20; attempt += 1) {
    try {
      await rm(profile, { recursive: true, force: true });
      break;
    } catch (error) {
      if (attempt === 19) throw error;
      await delay(100);
    }
  }
}
