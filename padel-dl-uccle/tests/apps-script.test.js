/**
 * Test du serveur Apps Script (apps-script/Code.gs + Shared.gs) contre une SIMULATION
 * en mémoire de SpreadsheetApp, Session, CacheService, etc.
 *
 * Ce test vérifie la logique serveur (droits, validation, écriture, audit, import).
 * Il NE PROUVE PAS que la connexion au vrai Google Sheets fonctionne : cela ne peut
 * être vérifié qu'après déploiement (voir docs/GUIDE_CONNEXION_GOOGLE_SHEETS.md).
 */
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');
const vm = require('vm');
const crypto = require('crypto');

const ROOT = path.join(__dirname, '..');

function makeEnv(owner) {
  const sheets = {};
  const props = {};
  const cache = {};
  let active = owner;
  function Range(sh, r, c, nr, nc) {
    return {
      getValues() { const out = []; for (let i = 0; i < nr; i++) { const row = []; for (let j = 0; j < nc; j++) row.push(((sh.data[r - 1 + i] || [])[c - 1 + j]) ?? ''); out.push(row); } return out; },
      getDisplayValues() { return this.getValues().map((row) => row.map((v) => (v === true ? 'TRUE' : v === false ? 'FALSE' : String(v)))); },
      setValues(vals) { vals.forEach((row, i) => { sh.data[r - 1 + i] = sh.data[r - 1 + i] || []; row.forEach((v, j) => { sh.data[r - 1 + i][c - 1 + j] = v; }); }); return this; },
      setValue(v) { sh.data[r - 1] = sh.data[r - 1] || []; sh.data[r - 1][c - 1] = v; return this; },
      setNumberFormat() { return this; }, setDataValidation() { return this; }, setFontWeight() { return this; }, setBackground() { return this; }, setFontColor() { return this; }, setNote() { return this; }
    };
  }
  function Sheet(name) {
    const sh = { name, data: [] };
    Object.assign(sh, {
      getName: () => name,
      getLastRow: () => sh.data.filter((r) => r && r.some((v) => v !== '' && v !== undefined)).length,
      getLastColumn: () => Math.max(0, ...sh.data.map((r) => (r ? r.length : 0))),
      getMaxRows: () => 1000,
      getRange: (r, c, nr, nc) => Range(sh, r, c, nr || 1, nc || 1),
      getDataRange: () => Range(sh, 1, 1, Math.max(sh.getLastRow(), 0), sh.getLastColumn()),
      appendRow: (row) => { sh.data[sh.getLastRow()] = row.slice(); },
      setFrozenRows() {}, getProtections: () => [], protect: () => ({ setDescription() { return this; }, setWarningOnly() { return this; } })
    });
    return sh;
  }
  const ss = {
    getSheetByName: (n) => sheets[n] || null,
    insertSheet: (n) => (sheets[n] = Sheet(n)),
    getSheets: () => Object.values(sheets), deleteSheet() {}, getId: () => 'ss', getName: () => 'Padel', getSpreadsheetTimeZone: () => 'Europe/Brussels'
  };
  const ctx = {
    console,
    SpreadsheetApp: { getActiveSpreadsheet: () => ss, openById: () => ss, newDataValidation: () => { const b = { requireValueInList: () => b, setAllowInvalid: () => b, requireCheckbox: () => b, requireNumberBetween: () => b, build: () => ({}) }; return b; }, ProtectionType: { SHEET: 'SHEET' } },
    Session: { getActiveUser: () => ({ getEmail: () => active }), getEffectiveUser: () => ({ getEmail: () => owner }) },
    PropertiesService: { getScriptProperties: () => ({ getProperty: (k) => (k in props ? props[k] : null), setProperty: (k, v) => { props[k] = v; } }) },
    CacheService: { getScriptCache: () => ({ get: (k) => cache[k] ?? null, put: (k, v) => { cache[k] = v; }, remove: (k) => { delete cache[k]; } }) },
    LockService: { getScriptLock: () => ({ tryLock: () => true, releaseLock() {} }) },
    Utilities: {
      getUuid: () => crypto.randomUUID(),
      computeDigest: (_a, s) => [...crypto.createHash('sha256').update(s, 'utf8').digest()].map((b) => (b > 127 ? b - 256 : b)),
      DigestAlgorithm: { SHA_256: 'sha' }, Charset: { UTF_8: 'utf8' }, formatDate: () => '2026-11-01_00-00'
    },
    HtmlService: { createHtmlOutputFromFile: () => ({ setTitle() { return this; }, addMetaTag() { return this; }, setXFrameOptionsMode() { return this; } }), XFrameOptionsMode: { DEFAULT: 1 } }
  };
  ctx.globalThis = ctx;
  vm.createContext(ctx);
  vm.runInContext(fs.readFileSync(path.join(ROOT, 'dist/apps-script/Shared.gs'), 'utf8'), ctx);
  vm.runInContext(fs.readFileSync(path.join(ROOT, 'dist/apps-script/Code.gs'), 'utf8'), ctx);
  return { ctx, sheets, props, setActive: (e) => { active = e; } };
}

test('serveur : installation, droits, verrouillage des heures, archivage, import, audit', () => {
  const env = makeEnv('anthony@exemple.invalid');
  const G = env.ctx;
  assert.match(G.setupSpreadsheet(), /17 onglets/);
  assert.ok(env.sheets['Paramètres'] && env.sheets['Journal_Audit'] && env.sheets['Occupation_Terrains']);

  let boot = G.api_bootstrap(null);
  assert.equal(boot.error, undefined, boot.error);
  assert.equal(boot.user.role, 'admin');
  assert.equal(boot.db.terrains.length, 6);
  assert.equal(boot.db.parametres.find((p) => p.cle === 'date_ouverture_indoor').valeur, '2026-08-31');
  assert.ok(boot.db.terrains.every((t) => t.horaires_lun === '08:00-21:00' && t.horaires_dim === '08:00-21:00'));
  assert.equal(boot.db.terrains.filter((t) => t.date_mise_en_service === '2026-08-31').length, 3);
  assert.equal(JSON.stringify(boot.db.offres.map((o) => o.tarif_seance)), '[25,35,25,35]');
  const gilles = boot.db.utilisateurs.find((u) => u.id === 'USR-GILLES');
  assert.equal(gilles.role, 'coach'); assert.equal(gilles.actif, false, 'inactif tant que son e-mail n\'est pas saisi');
  assert.equal(boot.db.parametres.find((p) => p.categorie === 'taux_coach').reference, 'USR-GILLES');

  // L'admin crée un coach et son taux.
  let r = G.api_save(null, 'utilisateurs', [{ email: 'coach@exemple.invalid', nom_affiche: 'Coach test', role: 'coach', actif: true }], '');
  assert.equal(r.error, undefined, r.error);
  const coachId = r.rows[0].id;
  r = G.api_save(null, 'parametres', [{ categorie: 'taux_coach', cle: 'taux_horaire', reference: coachId, valeur: '35', date_effet: '2026-08-01', statut: 'actif' }], '');
  assert.equal(r.error, undefined, r.error);

  // Le coach encode et soumet ses heures.
  env.setActive('coach@exemple.invalid');
  boot = G.api_bootstrap(null);
  assert.equal(boot.user.role, 'coach');
  assert.equal(boot.db.paiements.length, 0, 'le coach ne reçoit pas les paiements');
  assert.ok(boot.db.utilisateurs.every((u) => u.email === undefined), 'pas d\'e-mails des autres utilisateurs');
  r = G.api_save(null, 'heures', [{ coach_id: coachId, date: '2026-10-28', heure_debut: '18:00', heure_fin: '19:30', type_activite: 'padel_taster', statut: 'soumis' }], '');
  assert.equal(r.error, undefined, r.error);
  const h = r.rows[0];
  assert.equal(h.duree_h, 1.5);
  assert.match(G.api_save(null, 'heures', [{ coach_id: 'USR-ADMIN', date: '2026-10-28', heure_debut: '10:00', heure_fin: '11:00', type_activite: 'padel_taster', statut: 'soumis' }], '').error, /propres heures/);
  assert.match(G.api_save(null, 'parametres', [{ categorie: 'general', cle: 'x', valeur: '1', statut: 'actif' }], '').error, /ne permet pas/);

  // Anthony valide.
  env.setActive('anthony@exemple.invalid');
  r = G.api_save(null, 'heures', [Object.assign({}, h, { statut: 'valide' })], 'Validation');
  assert.equal(r.error, undefined, r.error);
  assert.equal(r.rows[0].valide_par, 'anthony@exemple.invalid');

  // Le coach ne peut plus modifier, mais peut demander une correction.
  env.setActive('coach@exemple.invalid');
  const stored = G.api_bootstrap(null).db.heures.find((x) => x.id === h.id);
  assert.equal(stored.heure_debut, '18:00', 'heure relue en HH:MM');
  assert.match(G.api_save(null, 'heures', [Object.assign({}, stored, { heure_fin: '20:00' })], '').error, /déjà validées/);
  r = G.api_save(null, 'heures', [Object.assign({}, stored, { demande_correction: 'Fin à 19:45' })], '');
  assert.equal(r.error, undefined, r.error);
  assert.equal(r.rows[0].statut, 'valide');

  // Utilisateur inconnu refusé.
  env.setActive('intrus@exemple.invalid');
  assert.match(G.api_bootstrap(null).error, /Accès non autorisé/);
  assert.throws(() => G.setupSpreadsheet(), /propriétaire/);
  assert.throws(() => G.setAccessCode('coach@exemple.invalid', '12345678'), /propriétaire/);

  // Import puis annulation.
  env.setActive('anthony@exemple.invalid');
  r = G.api_import(null, 'occupation', [
    { terrain_id: 'TER-1', date: '2026-10-01', heure_debut: '09:00', heure_fin: '10:30', type: 'reservation_libre', statut: 'realise', reference_externe: 'A1' },
    { terrain_id: 'TER-1', date: '2026-10-01', heure_debut: '09:00', heure_fin: '10:30', type: 'reservation_libre', statut: 'realise', reference_externe: 'A1' }
  ], { source: 'Test', fichier: 't.csv', report: { lues: 2, doublons: 0, erreurs: 0 } });
  assert.equal(r.error, undefined, r.error);
  assert.equal(r.import.nb_importees, 1, 'doublon revérifié côté serveur');
  const impId = r.import.id;
  r = G.api_undoImport(null, impId);
  assert.equal(r.import.statut, 'annule');
  const occ = G.api_bootstrap(null).db.occupation;
  assert.ok(occ.every((o) => o.archive === true));

  // Archivage plutôt que suppression.
  const seance = G.api_save(null, 'seances', [{ date: '2026-10-02', heure_debut: '11:00', heure_fin: '12:00', type_activite: 'padel_taster', terrains: 'TER-2', statut: 'realisee' }], '').rows[0];
  r = G.api_archive(null, 'seances', seance.id, 'Erreur d\'encodage');
  assert.equal(r.error, undefined, r.error);
  assert.equal(G.api_bootstrap(null).db.seances.find((s) => s.id === seance.id).archive, true);

  const actions = new Set(G.api_bootstrap(null).db.audit.map((a) => a.action));
  ['installation', 'connexion', 'creation', 'modification', 'import', 'annulation_import', 'archivage', 'acces_refuse'].forEach((a) => assert.ok(actions.has(a), 'audit ' + a));
});

test('serveur : mode « code » (comptes hors domaine)', () => {
  const env = makeEnv('anthony@exemple.invalid');
  const G = env.ctx;
  G.setupSpreadsheet();
  G.api_save(null, 'utilisateurs', [{ email: 'recep@exemple.invalid', nom_affiche: 'Réception', role: 'reception', actif: true }], '');
  // Le propriétaire (Anthony) est reconnu par son compte Google, sans code.
  assert.equal(G.api_bootstrap(null).user.role, 'admin');
  // L'administrateur définit un code depuis l'application.
  const recepId = G.api_bootstrap(null).db.utilisateurs.find((u) => u.role === 'reception').id;
  assert.equal(G.api_setAccessCode(null, recepId, 'court').error, 'Le code doit contenir au moins 8 caractères.');
  assert.ok(G.api_setAccessCode(null, recepId, 'code-tres-secret').ok);
  env.setActive('');
  assert.equal(G.api_bootstrap(null).needLogin, true);
  assert.match(G.api_login('recep@exemple.invalid', 'mauvais').error, /incorrect/);
  const ok = G.api_login('recep@exemple.invalid', 'code-tres-secret');
  assert.ok(ok.token);
  const boot = G.api_bootstrap(ok.token);
  assert.equal(boot.user.role, 'reception');
  assert.ok(!JSON.stringify(boot).includes(G.Padel.util.isBlank ? 'code-tres-secret' : ''), 'le code n\'est jamais renvoyé');
  for (let i = 0; i < 5; i++) G.api_login('recep@exemple.invalid', 'x');
  assert.match(G.api_login('recep@exemple.invalid', 'code-tres-secret').error, /Trop de tentatives/);
});
