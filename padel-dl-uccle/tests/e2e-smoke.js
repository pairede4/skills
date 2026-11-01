/**
 * Test de fumée navigateur (Playwright/Chromium) sur la démo construite :
 * chaque écran, chaque rôle, mobile (iPhone) et desktop. Échoue sur toute erreur JS
 * ou tout débordement horizontal de la page. Captures dans tests/screenshots/.
 * Usage : node scripts/build.js && node tests/e2e-smoke.js
 */
'use strict';
const path = require('path');
const fs = require('fs');
const { chromium, devices } = require('playwright');

const FILE = 'file://' + path.join(__dirname, '..', 'dist', 'demo', 'index.html');
const SHOTS = path.join(__dirname, 'screenshots');
fs.mkdirSync(SHOTS, { recursive: true });

const ROLES = [
  { role: 'admin', user: 'USR-ADMIN', routes: ['dashboard', 'communaute', 'seances', 'heures', 'paiements', 'terrains', 'academies', 'evenements', 'satisfaction', 'pnl', 'depenses', 'rapports', 'membres', 'imports', 'qualite', 'parametres', 'journal', 'aide'] },
  { role: 'coach', user: 'USR-COACHA', routes: ['heures', 'seances', 'evenements', 'satisfaction', 'membres', 'aide'], forbidden: ['pnl', 'parametres'] },
  { role: 'reception', user: 'USR-RECEP', routes: ['paiements', 'academies', 'seances', 'membres', 'aide'], forbidden: ['pnl', 'parametres', 'heures'] },
  { role: 'manager', user: 'USR-MANAG', routes: ['dashboard', 'communaute', 'terrains', 'pnl', 'rapports', 'qualite', 'satisfaction'], forbidden: ['imports', 'parametres'] }
];

(async () => {
  const browser = await chromium.launch();
  const failures = [];
  for (const [label, opts] of [['mobile', devices['iPhone 13']], ['desktop', { viewport: { width: 1366, height: 860 } }]]) {
    const context = await browser.newContext(opts);
    const page = await context.newPage();
    const errors = [];
    page.on('pageerror', (e) => errors.push(e.message));
    page.on('console', (m) => { if (m.type() === 'error') errors.push(m.text()); });
    await page.goto(FILE);
    await page.waitForSelector('main');
    for (const r of ROLES) {
      await page.evaluate(([role, user]) => { localStorage.setItem('padel-dluccle-demo-role', role); localStorage.setItem('padel-dluccle-demo-role-user', user); }, [r.role, r.user]);
      for (const route of r.routes) {
        await page.goto(FILE + '#/' + route);
        await page.reload();
        await page.waitForSelector('main');
        const info = await page.evaluate(() => ({
          title: document.querySelector('.topbar h1') && document.querySelector('.topbar h1').textContent,
          overflow: document.documentElement.scrollWidth - window.innerWidth,
          text: document.querySelector('main').innerText.slice(0, 120),
          errorBox: !!document.querySelector('main .notice.bad')
        }));
        if (info.overflow > 1) failures.push(`${label}/${r.role}/${route}: débordement horizontal ${info.overflow}px`);
        if (info.errorBox) failures.push(`${label}/${r.role}/${route}: erreur d'affichage ${info.text}`);
        if (r.role === 'admin' || route === r.routes[0]) await page.screenshot({ path: path.join(SHOTS, `${label}-${r.role}-${route}.png`), fullPage: label === 'desktop' });
      }
      for (const route of r.forbidden || []) {
        await page.goto(FILE + '#/' + route); await page.reload(); await page.waitForSelector('main');
        const h = await page.evaluate(() => location.hash);
        const title = await page.textContent('.topbar h1');
        if (/P&L|Paramètres|Imports|Heures/.test(title) && title.toLowerCase().indexOf(route.slice(0, 4)) >= 0) failures.push(`${label}/${r.role}: accès à ${route} non bloqué (${h})`);
      }
    }
    if (errors.length) failures.push(`${label}: erreurs JS : ${[...new Set(errors)].join(' | ')}`);
    await context.close();
  }
  await browser.close();
  if (failures.length) { console.error('ÉCHECS :\n- ' + failures.join('\n- ')); process.exit(1); }
  console.log('OK : tous les écrans s\'affichent sans erreur JS ni débordement, sur mobile et desktop, pour les 4 rôles.');
})().catch((e) => { console.error(e); process.exit(1); });
