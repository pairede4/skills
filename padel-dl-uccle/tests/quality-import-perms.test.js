const test = require('node:test');
const assert = require('node:assert/strict');
const calc = require('../src/core/calc.js');
const quality = require('../src/core/quality.js');
const importer = require('../src/core/importer.js');
const perms = require('../src/core/permissions.js');
const reports = require('../src/core/reports.js');
const schema = require('../src/core/schema.js');
const { build } = require('./fixtures.js');

const TODAY = '2026-10-31';

test('qualité : anomalies attendues détectées', () => {
  const q = quality.run(calc.context(build(), TODAY));
  const codes = new Set(q.map((a) => a.code));
  for (const c of ['T01', 'T05', 'H01', 'S03', 'S04', 'PA1', 'D01', 'TE1']) assert.ok(codes.has(c), 'anomalie ' + c + ' attendue');
  assert.equal(q[0].gravite, 'bloquant', 'les anomalies bloquantes sont en tête');
});

test('qualité : doublons et incohérences inscrits/présents', () => {
  const db = build();
  db.presences.push(Object.assign({}, db.presences[0], { id: 'DUP' }));
  db.seances.push({ id: 'SX', date: '2026-09-09', heure_debut: '10:00', heure_fin: '11:00', type_activite: 'padel_taster', terrains: 'T1', capacite: 4, nb_inscrits: 2, nb_presents: 3, statut: 'realisee' });
  const codes = new Set(quality.run(calc.context(db, TODAY)).map((a) => a.code));
  assert.ok(codes.has('DB2'));
  assert.ok(codes.has('C01'));
});

test('import CSV : séparateur, guillemets, BOM', () => {
  const r = importer.parseCSV('﻿Date;Terrain;Début;Fin;Ref\n07/09/2026;Indoor 1;18h;19:30;"A;1"\n');
  assert.deepEqual(r.headers, ['Date', 'Terrain', 'Début', 'Fin', 'Ref']);
  assert.equal(r.rows[0].Ref, 'A;1');
  assert.equal(r.separator, ';');
});

test('import : association auto, conversion, références, doublons et lignes incomplètes', () => {
  const db = build();
  const csv = importer.parseCSV([
    'Date,Court,Start,End,Booking ID',
    '07/09/2026,Indoor 1,11:00,12:30,B1',
    '07/09/2026,Indoor 1,11:00,12:30,B1',
    '08/09/2026,Indoor 1,,12:30,B2',
    '32/09/2026,Indoor 1,10:00,11:00,B3'
  ].join('\n'));
  const map = importer.guessMapping(csv.headers, 'occupation');
  assert.equal(map.date, 'Date');
  assert.equal(map.terrain_id, 'Court');
  assert.equal(map.heure_debut, 'Start');
  const prep = importer.prepare(db, 'occupation', csv.rows, map, { type: 'reservation_libre', statut: 'reserve' });
  assert.equal(prep.ok.length, 1);
  assert.equal(prep.ok[0].terrain_id, 'T1', 'nom de terrain résolu en ID');
  assert.equal(prep.duplicates.length, 1);
  assert.equal(prep.errors.length, 2);
  const rep = importer.report(prep, { source: 'ABS', fichier: 'x.csv', feuille: 'occupation' });
  assert.equal(rep.importees, 1);
  assert.equal(rep.erreurs, 2);
});

test('import : doublon d\'une ligne déjà présente en base', () => {
  const db = build();
  const prep = importer.prepare(db, 'occupation', [{ d: '2026-09-07', t: 'T1', a: '11:00', b: '12:30', k: 'reservation_libre', s: 'reserve' }],
    { date: 'd', terrain_id: 't', heure_debut: 'a', heure_fin: 'b', type: 'k', statut: 's' }, {});
  assert.equal(prep.duplicates.length, 1);
});

test('permissions : matrice par défaut et surcharge par Paramètres', () => {
  const coach = perms.permissionsFor('coach', []);
  assert.ok(coach['heures.own']);
  assert.ok(!coach['pnl.view']);
  assert.ok(!coach['heures.validate']);
  const reception = perms.permissionsFor('reception', []);
  assert.ok(reception['paiements.edit']);
  assert.ok(!reception['parametres.view'], 'pas d\'accès aux paramètres financiers');
  const manager = perms.permissionsFor('manager', []);
  assert.ok(manager['rapports.export']);
  assert.ok(!perms.canWrite(manager, 'seances'), 'manager en lecture seule');
  const over = perms.permissionsFor('reception', [{ categorie: 'permission', reference: 'reception', cle: 'pnl.view', valeur: 'oui', statut: 'actif' }]);
  assert.ok(over['pnl.view']);
  assert.ok(perms.permissionsFor('admin', [])['utilisateurs.edit']);
});

test('rapports : les quatre modèles se construisent et distinguent faits / manquants / constats / recommandations', () => {
  const ctx = calc.context(build(), TODAY);
  for (const id of Object.keys(reports.TEMPLATES)) {
    const f = id === 'trimestre' ? { from: '2026-07-01', to: '2026-09-30' } : id === 'hebdo' ? { from: '2026-09-07', to: '2026-09-13' } : { from: '2026-09-01', to: '2026-09-30' };
    const r = reports.build(ctx, id, f);
    const kinds = new Set(r.sections.map((s) => s.kind));
    assert.ok(kinds.has('faits') && kinds.has('manquants') && kinds.has('constats') && kinds.has('recommandations'), id);
    assert.ok(reports.toRows(r).length > 5);
  }
});

test('schéma : chaque feuille a un ID, des colonnes uniques et des références valides', () => {
  const keys = new Set(schema.SHEETS.map((s) => s.key));
  for (const s of schema.SHEETS) {
    assert.equal(s.cols[0].n, 'id', s.key);
    const names = s.cols.map((c) => c.n);
    assert.equal(new Set(names).size, names.length, 'colonnes uniques ' + s.key);
    for (const c of s.cols) if (c.ref) assert.ok(keys.has(c.ref), s.key + '.' + c.n + ' -> ' + c.ref);
    for (const c of s.cols) if (c.enumName) assert.ok(schema.ENUMS[c.enumName], c.enumName);
  }
  const tabs = schema.SHEETS.map((s) => s.tab);
  for (const t of ['Paramètres', 'Utilisateurs', 'Terrains', 'Membres', 'Offres', 'Cycles', 'Séances', 'Inscriptions', 'Présences', 'Heures_Coachs', 'Paiements', 'Dépenses', 'Événements', 'Satisfaction', 'Imports', 'Journal_Audit'])
    assert.ok(tabs.includes(t), t);
});

test('paramètres initiaux : aucun tarif ni date inventés', () => {
  // Valeurs confirmées par Anthony le 01/11/2026 ; rien d'autre n'est rempli.
  const ouverture = schema.INITIAL_PARAMETRES.find((p) => p.cle === 'date_ouverture_indoor');
  assert.equal(ouverture.valeur, '2026-08-31');
  const gilles = schema.INITIAL_PARAMETRES.filter((p) => p.categorie === 'taux_coach');
  assert.equal(gilles.length, 1);
  assert.deepEqual([gilles[0].reference, gilles[0].valeur, gilles[0].date_effet], ['USR-GILLES', '35', '2026-08-31']);
  assert.deepEqual(schema.INITIAL_OFFRES.map((o) => [o.public, o.duree_seance_min, o.tarif_seance]),
    [['adulte', 60, 25], ['adulte', 90, 35], ['junior', 60, 25], ['junior', 90, 35]]);
  assert.ok(schema.INITIAL_OFFRES.every((o) => o.nb_seances === ''), 'séances fixées par cycle');
  assert.equal(schema.INITIAL_PARAMETRES.find((p) => p.cle === 'montants_tva').valeur, 'TVAC');
  const pointe = schema.INITIAL_PARAMETRES.filter((p) => p.categorie === 'heures_pointe');
  assert.equal(pointe.length, 5, 'lundi à vendredi uniquement');
  assert.ok(pointe.every((p) => p.valeur === '17:00-21:00' && /Power BI/.test(p.source)), 'définition reprise de l\'export Power BI');
  assert.equal(schema.INITIAL_PARAMETRES.find((p) => p.cle === 'cout_horaire_terrain').valeur, '');
});
