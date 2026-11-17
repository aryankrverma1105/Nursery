import { chromium } from '@playwright/test';
import { spawn } from 'child_process';
import fs from 'fs';
import path from 'path';
import http from 'http';

function checkUrl(url: string): Promise<boolean> {
  return new Promise((resolve) => {
    const req = http.get(url, (res) => {
      resolve(res.statusCode !== undefined && res.statusCode < 400);
    });
    req.on('error', () => resolve(false));
    req.setTimeout(1000, () => {
      req.destroy();
      resolve(false);
    });
  });
}

async function waitForServer(url: string, timeoutMs: number = 20000): Promise<boolean> {
  const start = Date.now();
  while (Date.now() - start < timeoutMs) {
    if (await checkUrl(url)) return true;
    await new Promise((r) => setTimeout(r, 500));
  }
  return false;
}

async function main() {
  console.log('[SCREENSHOTS] Starting local servers for screenshot capture...');

  const screenshotsDir = path.resolve(process.cwd(), 'screenshots');
  if (!fs.existsSync(screenshotsDir)) {
    fs.mkdirSync(screenshotsDir, { recursive: true });
  }

  // 1. Start backend server
  const serverProc = spawn('node', ['server/dist/index.js'], {
    env: { ...process.env, PORT: '5000', CLIENT_ORIGIN: 'http://127.0.0.1:5173', DEV_SAMPLE_DATA: 'true' },
    shell: true,
    stdio: 'inherit',
  });

  // 2. Start client preview server
  const clientProc = spawn('npx', ['vite', 'preview', '--host', '127.0.0.1', '--port', '5173'], {
    cwd: path.resolve(process.cwd(), 'client'),
    shell: true,
    stdio: 'inherit',
  });

  console.log('[SCREENSHOTS] Waiting for backend (http://127.0.0.1:5000/api/health)...');
  const backendReady = await waitForServer('http://127.0.0.1:5000/api/health', 15000);
  console.log('[SCREENSHOTS] Backend ready:', backendReady);

  console.log('[SCREENSHOTS] Waiting for client (http://127.0.0.1:5173/)...');
  const clientReady = await waitForServer('http://127.0.0.1:5173/', 15000);
  console.log('[SCREENSHOTS] Client ready:', clientReady);

  if (!backendReady || !clientReady) {
    console.error('[SCREENSHOTS] Failed to start servers within timeout.');
    serverProc.kill();
    clientProc.kill();
    process.exit(1);
  }

  console.log('[SCREENSHOTS] Launching Chromium browser...');
  const browser = await chromium.launch({ headless: true });

  const viewports = [
    { name: 'mobile_390px', width: 390, height: 844 },
    { name: 'desktop_1440px', width: 1440, height: 900 },
  ];

  const themes = ['light', 'dark'];

  try {
    for (const vp of viewports) {
      for (const th of themes) {
        console.log(`[SCREENSHOTS] Capturing: Viewport=${vp.name}, Theme=${th}...`);
        const context = await browser.newContext({
          viewport: { width: vp.width, height: vp.height },
          colorScheme: th as 'light' | 'dark',
        });

        const page = await context.newPage();

        // Setup theme preference in localStorage before first page load
        await page.addInitScript((currentTheme) => {
          localStorage.setItem('nurcery_theme', currentTheme);
          if (currentTheme === 'dark') {
            document.documentElement.classList.add('dark');
          } else {
            document.documentElement.classList.remove('dark');
          }
        }, th);

        // A. Public Homepage
        await page.goto('http://127.0.0.1:5173/', { waitUntil: 'networkidle' });
        await page.screenshot({
          path: path.join(screenshotsDir, `01_public_home_${vp.name}_${th}.png`),
          fullPage: false,
        });

        // B. Public Products Catalogue
        await page.goto('http://127.0.0.1:5173/products', { waitUntil: 'networkidle' });
        await page.screenshot({
          path: path.join(screenshotsDir, `02_public_products_${vp.name}_${th}.png`),
          fullPage: false,
        });

        // C. Public Product Details
        await page.goto('http://127.0.0.1:5173/products/gir-kesar-mango-grafted-sapling', {
          waitUntil: 'networkidle',
        });
        await page.screenshot({
          path: path.join(screenshotsDir, `03_public_product_detail_${vp.name}_${th}.png`),
          fullPage: false,
        });

        // D. Staff Login Page
        await page.goto('http://127.0.0.1:5173/login', { waitUntil: 'networkidle' });
        await page.screenshot({
          path: path.join(screenshotsDir, `04_staff_login_${vp.name}_${th}.png`),
          fullPage: false,
        });

        // Login as Admin to capture private app screens
        await page.fill('input[type="email"]', 'admin@nursery.local');
        await page.fill('input[type="password"]', 'Admin@12345');
        await page.click('button[type="submit"]');
        await page.waitForURL('**/app**', { timeout: 10000 });

        // E. Private Dashboard
        await page.screenshot({
          path: path.join(screenshotsDir, `05_private_dashboard_${vp.name}_${th}.png`),
          fullPage: false,
        });

        // F. Stock Inventory
        await page.goto('http://127.0.0.1:5173/app/stock', { waitUntil: 'networkidle' });
        await page.screenshot({
          path: path.join(screenshotsDir, `06_private_stock_${vp.name}_${th}.png`),
          fullPage: false,
        });

        // G. Grafting Wizard
        await page.goto('http://127.0.0.1:5173/app/wizard/grafting', { waitUntil: 'networkidle' });
        await page.screenshot({
          path: path.join(screenshotsDir, `07_wizard_grafting_${vp.name}_${th}.png`),
          fullPage: false,
        });

        // H. Traceability View with Pedigree Graph
        await page.goto('http://127.0.0.1:5173/app/trace?code=GR-2026-00001', {
          waitUntil: 'networkidle',
        });
        await page.screenshot({
          path: path.join(screenshotsDir, `08_private_traceability_${vp.name}_${th}.png`),
          fullPage: false,
        });

        await context.close();
      }
    }

    console.log('[SCREENSHOTS] All screenshots captured successfully in /screenshots!');
  } catch (err) {
    console.error('[SCREENSHOTS ERROR]', err);
  } finally {
    await browser.close();
    serverProc.kill();
    clientProc.kill();
  }
}

main().catch(console.error);
