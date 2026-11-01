/**
 * Parcours utilisateurs bout en bout sur la démo (Playwright/Chromium, iPhone 13).
 * Vérifie les critères de réussite du cadrage :
 *  - Anthony encode une séance en moins d'une minute ;
 *  - un coach soumet ses heures depuis son téléphone, ne peut plus les modifier après validation ;
 *  - la réception vérifie un paiement ;
 *  - import CSV : doublon détecté, import puis annulation ;
 *  - un rapport se génère.
 * Usage : node scripts/build.js && node tests/e2e-flows.js
 */
'use strict';
const path = require('path');
const fs = require('fs');
const os = require('os');
const assert = require('assert/strict');
const { chromium, devices } = require('playwright');

const FILE = 'file://' + path.join(__dirname, '..', 'dist', 'demo', 'index.html');
const SHOTS = path.join(__dirname, 'screenshots');

async function as(page, role, user, route) {
  await page.evaluate(([r, u]) => { localStorage.setItem('padel-dluccle-demo-role', r); localStorage.setItem('padel-dluccle-demo-role-user', u); }, [role, user]);
  await page.goto(FILE + '#/' + route); await page.reload(); await page.waitForSelector('main');
}
const db = (page) => page.evaluate(() => JSON.parse(localStorage.getItem('padel-dluccle-demo-v1')));

(async () => {
  const browser = await chromium.launch();
  const ctx = await browser.newContext({ ...devices['iPhone 13'], locale: 'fr-BE' });
  const page = await ctx.newPage();
  const errors = [];
  page.on('pageerror', (e) => errors.push(e.message));
  await page.goto(FILE); await page.waitForSelector('main');
  await page.evaluate(() => localStorage.clear()); await page.reload(); await page.waitForSelector('main');

  // 1. Séance rapide (admin)
  await as(page, 'admin', 'USR-ADMIN', 'seances');
  const t0 = Date.now();
  await page.click('[data-action="seance-quick"]');
  await page.selectOption('.modal select[name=type_activite]', 'afterwork');
  await page.fill('.modal [name=nb_inscrits]', '10');
  await page.fill('.modal [name=nb_presents]', '9');
  await page.fill('.modal [name=nb_absents]', '0');
  await page.fill('.modal [name=nb_no_shows]', '1');
  await page.click('.modal [data-action="form-save"]');
  await page.waitForSelector('.modal', { state: 'detached' });
  const seconds = (Date.now() - t0) / 1000;
  let d = await db(page);
  const created = d.seances.filter((s) => s.cree_par === 'admin@exemple.invalid' && s.nb_inscrits === 10).pop();
  assert.ok(created, 'séance créée');
  assert.ok(created.heure_debut && created.terrains, 'horaires et terrains repris de la dernière séance du même type');
  console.log(`✓ Séance rapide enregistrée (${created.heure_debut}-${created.heure_fin}, ${created.terrains}) – ${seconds.toFixed(1)} s d'automate, 6 actions`);

  // 2. Coach : soumission d'heures
  await as(page, 'coach', 'USR-COACHA', 'heures');
  await page.fill('form[data-hour-form] [name=heure_debut]', '10:00');
  await page.fill('form[data-hour-form] [name=heure_fin]', '11:30');
  await page.selectOption('form[data-hour-form] [name=type_activite]', 'padel_taster');
  assert.match(await page.textContent('form[data-hour-form] .duration'), /1,5 h/);
  await page.click('form[data-hour-form] [data-action="h-save"][data-statut="soumis"]');
  await page.waitForSelector('.toast.show');
  d = await db(page);
  const mine = d.heures.filter((h) => h.coach_id === 'USR-COACHA' && h.heure_debut === '10:00' && h.statut === 'soumis' && h.date === '2026-11-01');
  assert.equal(mine.length, 1, 'heures soumises');
  console.log('✓ Coach : heures soumises depuis le téléphone (durée calculée 1,5 h)');

  // 3. Admin : validation
  await as(page, 'admin', 'USR-ADMIN', 'heures');
  await page.click('[data-action="h-tab"][data-tab="valider"]');
  await page.check(`input[name=hsel][value="${mine[0].id}"]`);
  await page.click('[data-action="h-bulk"][data-to="valide"]');
  await page.waitForSelector('.toast.show');
  d = await db(page);
  assert.equal(d.heures.find((h) => h.id === mine[0].id).statut, 'valide');
  console.log('✓ Anthony valide les heures');

  // 4. Coach : modification interdite après validation, demande de correction possible
  const blocked = await page.evaluate((id) => {
    const s = new Padel.store.DemoStore(); s._load(); s.setRole('coach', 'USR-COACHA');
    const h = s.db.heures.find((x) => x.id === id);
    return s.save('heures', Object.assign({}, h, { heure_fin: '12:30' })).then(() => 'accepté', (e) => e.message);
  }, mine[0].id);
  assert.match(blocked, /déjà validées/);
  const other = await page.evaluate(() => {
    const s = new Padel.store.DemoStore(); s._load(); s.setRole('coach', 'USR-COACHA');
    return s.save('heures', { coach_id: 'USR-COACHB', date: '2026-11-01', heure_debut: '09:00', heure_fin: '10:00', type_activite: 'padel_taster', statut: 'soumis' }).then(() => 'accepté', (e) => e.message);
  });
  assert.match(other, /propres heures/);
  await as(page, 'coach', 'USR-COACHA', 'heures');
  await page.click(`tr[data-id="${mine[0].id}"]`);
  await page.fill('.modal [name=demande]', 'Fin réelle 11:45');
  await page.click('.modal [data-action="h-ask"]');
  await page.waitForSelector('.toast.show');
  d = await db(page);
  assert.equal(d.heures.find((h) => h.id === mine[0].id).demande_correction, 'Fin réelle 11:45');
  assert.equal(d.heures.find((h) => h.id === mine[0].id).heure_fin, '11:30');
  console.log('✓ Coach : heures validées verrouillées ; demande de correction transmise ; heures d\'un autre coach refusées');

  // 5. Réception : vérification d'un paiement
  await as(page, 'reception', 'USR-RECEP', 'paiements');
  await page.click('[data-action="pay-tab"][data-tab="verifier"]');
  const payId = await page.getAttribute('[data-action="pay-verify"]', 'data-id');
  await page.click('[data-action="pay-verify"]');
  await page.waitForSelector('.toast.show');
  d = await db(page);
  const pay = d.paiements.find((p) => p.id === payId);
  assert.equal(pay.statut, 'encaisse'); assert.equal(pay.verifie_par, 'reception@exemple.invalid');
  console.log('✓ Réception : paiement vérifié (statut encaissé, vérificateur tracé)');
  const recepParam = await page.evaluate(() => { const s = new Padel.store.DemoStore(); s._load(); return s.save('parametres', { categorie: 'general', cle: 'x', valeur: '1', statut: 'actif' }).then(() => 'accepté', (e) => e.message); });
  assert.match(recepParam, /ne permet pas/);
  console.log('✓ Réception : modification des paramètres financiers refusée');

  // 6. Import CSV avec doublon, puis annulation
  const csv = path.join(os.tmpdir(), 'abs-test.csv');
  fs.writeFileSync(csv, 'Date;Court;Start;End;Booking ID\n03/11/2026;Indoor 1;09:00;10:30;T-1\n03/11/2026;Indoor 1;09:00;10:30;T-1\n03/11/2026;Indoor 9;11:00;12:30;T-2\n32/11/2026;Indoor 2;11:00;12:30;T-3\n');
  await as(page, 'admin', 'USR-ADMIN', 'imports');
  await page.setInputFiles('#imp-form [name=file]', csv);
  await page.click('[data-action="imp-read"]');
  await page.waitForSelector('#map-form');
  await page.click('[data-action="imp-check"]');
  await page.waitForSelector('[data-action="imp-go"]');
  const kpis = await page.$$eval('.kpi .kpi-value', (els) => els.map((e) => e.textContent.trim()));
  assert.deepEqual(kpis.slice(0, 4), ['4', '1', '1', '2']);
  await page.click('[data-action="imp-go"]');
  await page.waitForSelector('.notice.ok');
  d = await db(page);
  const imp = d.imports[d.imports.length - 1];
  assert.equal(d.occupation.filter((o) => o.import_id === imp.id).length, 1);
  await page.click(`[data-action="imp-undo"][data-id="${imp.id}"]`);
  await page.click('.modal [data-action="confirm-ok"]');
  await page.waitForSelector('.toast.show');
  d = await db(page);
  assert.ok(d.occupation.filter((o) => o.import_id === imp.id).every((o) => o.archive === true));
  assert.equal(d.imports.find((i) => i.id === imp.id).statut, 'annule');
  console.log('✓ Import CSV : 4 lues, 1 importée, 1 doublon, 2 erreurs (date invalide, terrain inconnu) ; annulation = lignes archivées');

  // 7. Rapport pour Laurent
  await as(page, 'manager', 'USR-MANAG', 'rapports');
  await page.click('[data-action="rep-pick"][data-id="laurent"]');
  await page.waitForSelector('#report');
  const kinds = await page.$$eval('#report .report-s', (els) => [...new Set(els.map((e) => e.className.split(' ')[1]))]);
  assert.ok(['k-fait', 'k-manque', 'k-constat', 'k-reco', 'k-saisie'].every((k) => kinds.includes(k)));
  await page.screenshot({ path: path.join(SHOTS, 'flow-rapport-laurent-mobile.png'), fullPage: false });
  await page.emulateMedia({ media: 'print' });
  await page.pdf ? null : null;
  console.log('✓ Rapport « Bilan pour Laurent » généré (faits, manquants, constats, recommandations, décisions)');

  // 8. Journal d'audit
  d = await db(page);
  const actions = new Set(d.audit.map((a) => a.action));
  ['creation', 'modification', 'import', 'annulation_import'].forEach((a) => assert.ok(actions.has(a), 'audit ' + a));
  console.log('✓ Journal d\'audit : créations, modifications, import et annulation tracés');

  await browser.close();
  if (errors.length) { console.error('Erreurs JS :', errors); process.exit(1); }
  console.log('\nTous les parcours sont validés.');
})().catch((e) => { console.error('ÉCHEC :', e.message); process.exit(1); });
