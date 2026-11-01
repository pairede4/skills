const test = require('node:test');
const assert = require('node:assert/strict');
const u = require('../src/core/util.js');
const calc = require('../src/core/calc.js');
const { build } = require('./fixtures.js');

const TODAY = '2026-10-31';
const ctx = (db) => calc.context(db || build(), TODAY);
const close = (a, b, msg) => assert.ok(Math.abs(a - b) < 1e-6, (msg || '') + ` attendu ${b}, obtenu ${a}`);

test('mesures : une donnée inconnue ne devient jamais zéro', () => {
  assert.equal(u.ratio(u.missing('x'), 10).v, null);
  assert.equal(u.ratio(5, 0).v, null);
  const s = u.sum([u.known(10), u.missing('inconnu')]);
  assert.equal(s.v, 10);
  assert.deepEqual(s.gaps, ['inconnu']);
  assert.equal(u.sum([u.missing('a')]).v, null);
  assert.equal(u.num(''), null);
  assert.equal(u.num('1 234,50 €'), 1234.5);
  assert.equal(u.fmtPct(null), 'donnée indisponible');
});

test('dates et périodes', () => {
  assert.equal(u.parseDate('07/09/2026'), '2026-09-07');
  assert.equal(u.parseDate('31/02/2026'), null);
  assert.equal(u.weekday('2026-09-07'), 1);
  assert.deepEqual(u.periodRange('semaine', '2026-09-10'), { kind: 'semaine', from: '2026-09-07', to: '2026-09-13' });
  assert.deepEqual(u.periodRange('trimestre', '2026-11-15'), { kind: 'trimestre', from: '2026-10-01', to: '2026-12-31' });
  assert.deepEqual(u.previousPeriod(u.periodRange('mois', '2026-03-31')), { kind: 'mois', from: '2026-02-01', to: '2026-02-28' });
  assert.equal(u.parseTime('9h30'), '09:30');
});

test('occupation : heures utilisées ÷ heures disponibles, maintenance déduite, union des chevauchements', () => {
  const o = calc.occupancy(ctx(), { from: '2026-09-07', to: '2026-09-07', terrains: ['T1'] });
  close(o.available.v, 12, 'disponible (14 h − 2 h de maintenance)');
  close(o.used.v, 2.5, 'utilisé (taster 10:00-11:30 ∪ libre 11:00-12:30)');
  close(o.rate.v, 2.5 / 12);
  close(o.organised.v, 1.5);
  close(o.libre.v, 1.0, 'libre hors chevauchement');
  close(o.peak.available.v, 3);
  close(o.peak.used.v, 0);
  close(o.offpeak.rate.v, 2.5 / 9);
});

test('occupation : jamais de taux sans heures disponibles', () => {
  // Le dimanche, T2 n'a pas d'horaires : le taux global est indisponible.
  const o = calc.occupancy(ctx(), { from: '2026-09-13', to: '2026-09-13' });
  assert.equal(o.available.v, null);
  assert.equal(o.rate.v, null);
  assert.match(o.rate.gaps.join(), /horaires d'ouverture manquants/);
  // Le terrain indoor reste calculable seul.
  assert.notEqual(o.byLieu.indoor.rate.v, null);
  assert.equal(o.byLieu.outdoor.rate.v, null);
});

test('occupation : heures de pointe non définies -> indisponible', () => {
  const db = build();
  db.parametres = db.parametres.filter((p) => p.categorie !== 'heures_pointe');
  const o = calc.occupancy(ctx(db), { from: '2026-09-07', to: '2026-09-07', terrains: ['T1'] });
  assert.equal(o.peak.rate.v, null);
  assert.notEqual(o.rate.v, null);
});

test('séance : remplissage, présence, no-show (compteurs déclarés)', () => {
  const c = ctx();
  const counts = calc.seanceCounts(c, c.seancesById.S6);
  const r = calc.seanceRates(counts);
  close(r.fill.v, 1);
  close(r.presence.v, 0.75);
  close(r.noShow.v, 0.25);
  close(r.cancel.v, 0);
});

test('séance sans capacité : remplissage indisponible', () => {
  const c = ctx();
  const r = calc.seanceRates(calc.seanceCounts(c, c.seancesById.S7));
  assert.equal(r.fill.v, null);
});

test('académie : reconnaissance au fil des séances, absence consommée, annulation club reportée', () => {
  const c = ctx();
  const st1 = calc.inscriptionState(c, c.inscriptionsById.I1, '2026-09-30');
  assert.equal(st1.prevues, 4);
  assert.equal(st1.attendu, 100);
  assert.equal(st1.realisees, 4, 'S1, S2, S4, S5 (S3 annulée club non consommée)');
  assert.equal(st1.absences, 1, 'absence en S2 consommée');
  close(st1.reconnu, 100);
  close(st1.aDelivrer, 0);
  const mid = calc.inscriptionState(c, c.inscriptionsById.I1, '2026-09-10');
  close(mid.reconnu, 50);
  close(mid.aDelivrer, 50);
  close(mid.valeurRestante, 50);
});

test('académie : entrée en cours de cycle = séances restantes seulement', () => {
  const c = ctx();
  const st = calc.inscriptionState(c, c.inscriptionsById.I2, '2026-09-30');
  assert.equal(st.attendu, 75);
  assert.equal(st.realisees, 3);
  close(st.reconnu, 75);
});

test('académie : tarif manquant -> calcul bloqué et signalé', () => {
  const c = ctx();
  const st = calc.inscriptionState(c, c.inscriptionsById.I3, '2026-09-30');
  assert.equal(st.attendu, null);
  assert.equal(st.reconnu, null);
  assert.match(st.gaps.join(), /Tarif manquant/);
});

test('revenus : encaissé, reconnu et restant à délivrer sont distincts', () => {
  const c = ctx();
  const sept = calc.pnl(c, { from: '2026-09-01', to: '2026-09-30' });
  close(sept.encaissements.v, 95, 'PA2 75 + PA3 20 (non rattaché)');
  close(sept.revenusReconnus.v, 175, 'I1 100 + I2 75 ; I3 inconnu');
  assert.ok(sept.revenusReconnus.gaps.some((g) => /Tarif manquant/.test(g)), 'le revenu est marqué incomplet');
  const aug = calc.pnl(c, { from: '2026-08-01', to: '2026-08-31' });
  close(aug.encaissements.v, 100);
  close(aug.revenusReconnus.v, 0);
  close(aug.aDelivrer.v, 100);
  const d = calc.deferredAt(c, '2026-09-10');
  close(d.value.v, 100, 'I1 : 100 − 50 ; I2 : 75 − 25');
});

test('coûts coachs : taux historisé par date d\'effet, seuls validé/payé dans la marge', () => {
  const c = ctx();
  assert.equal(calc.coachRate(c, 'U-C1', '2026-09-28').v, 35);
  assert.equal(calc.coachRate(c, 'U-C1', '2026-10-05').v, 40);
  assert.equal(calc.coachRate(c, 'U-C1', '2026-07-01').v, null);
  const sept = calc.pnl(c, { from: '2026-09-01', to: '2026-09-30' });
  // H1 1,5 h × 35 = 52,5 ; H4 coach sans taux -> lacune ; H3 soumis -> provisoire.
  close(sept.coutsCoachs.v, 52.5);
  assert.ok(sept.coutsCoachs.gaps.some((g) => /Taux horaire absent/.test(g)));
  close(sept.coutsCoachsProvisoires.v, 35);
  const oct = calc.pnl(c, { from: '2026-10-01', to: '2026-10-31' });
  close(oct.coutsCoachs.v, 40);
});

test('P&L : marge brute = reconnu − coûts coachs − coûts directs, traçable', () => {
  const c = ctx();
  const p = calc.pnl(c, { from: '2026-09-01', to: '2026-09-30' });
  close(p.coutsDirects.v, 42.5);
  close(p.margeBrute.v, 175 - 52.5 - 42.5);
  assert.ok(p.margeBrute.gaps.length > 0, 'marge marquée incomplète');
  assert.ok(p.lines.recognized.every((l) => l.source && l.id), 'chaque ligne a sa source');
  const academy = p.byActivity.find((a) => a.type === 'collectif_adulte');
  close(academy.revenue.v, 175);
  close(academy.direct.v, 30);
});

test('P&L : cours privés exclus par défaut', () => {
  const db = build();
  db.parametres.push(p2('categorie_revenu', 'cours_prive'));
  db.paiements.push({ id: 'PX', date_paiement: '2026-09-20', categorie_revenu: 'cours_prive', montant: 65, statut: 'encaisse' });
  const p = calc.pnl(calc.context(db, TODAY), { from: '2026-09-01', to: '2026-09-30' });
  close(p.encaissements.v, 95);
  db.parametres.push(p2('general', 'inclure_cours_prives', 'oui'));
  const q = calc.pnl(calc.context(db, TODAY), { from: '2026-09-01', to: '2026-09-30' });
  close(q.encaissements.v, 160);
  function p2(categorie, cle, valeur) { return { id: 'x' + cle, categorie, cle, valeur: valeur || cle, statut: 'actif' }; }
});

test('NPS : promoteurs − détracteurs, avec taille d\'échantillon', () => {
  const r = calc.nps([10, 9, 8, 7, 6, 0, 10].map((s) => ({ recommandation: s })));
  assert.equal(r.n, 7);
  assert.equal(r.promoteurs, 3);
  assert.equal(r.detracteurs, 2);
  assert.equal(r.passifs, 2);
  close(r.score.v, 14.3);
  assert.equal(calc.nps([]).score.v, null);
});

test('engagement : conversion Taster sous 14 jours', () => {
  const c = ctx();
  const e = calc.engagement(c, { from: '2026-09-01', to: '2026-09-30' });
  // M3 : Taster le 10/09 puis junior le 02/09 (avant) -> non converti.
  assert.equal(e.tasters, 1);
  assert.equal(e.convertis, 0);
});

test('archivage : une ligne archivée est exclue des calculs', () => {
  const db = build();
  db.paiements[1].archive = true;
  const p = calc.pnl(calc.context(db, TODAY), { from: '2026-09-01', to: '2026-09-30' });
  close(p.encaissements.v, 20);
});

test('coachSummary : heures par statut et coût par participant', () => {
  const c = ctx();
  const s = calc.coachSummary(c, { from: '2026-09-01', to: '2026-10-31' });
  const c1 = s.coaches.find((x) => x.id === 'U-C1');
  close(c1.heures.valide, 1.5);
  close(c1.heures.paye, 1);
  close(c1.coutValide.v, 92.5);
  close(c1.coutValideNonPaye.v, 52.5);
});

test('P&L : une activité dont tous les revenus sont inconnus est indisponible, pas 0', () => {
  const p = calc.pnl(calc.context(build(), TODAY), { from: '2026-09-01', to: '2026-09-30' });
  const junior = p.byActivity.find((a) => a.type === 'collectif_junior');
  assert.equal(junior.revenue.v, null);
  assert.equal(junior.margin.v, null);
});
