const test = require('node:test');
const assert = require('node:assert/strict');
const calc = require('../src/core/calc.js');
const community = require('../src/core/community.js');
const schema = require('../src/core/schema.js');
const { build } = require('./fixtures.js');

const TODAY = '2026-10-31';
const SEPT = { from: '2026-09-01', to: '2026-09-30' };
function withCommunity() {
  const db = build();
  // Définitions d'indicateurs et objectifs tels que chargés à l'installation.
  schema.INITIAL_PARAMETRES.filter((p) => p.categorie === 'indicateur_club' || p.categorie === 'objectif')
    .forEach((p, i) => db.parametres.push(Object.assign({ id: 'X' + i }, p)));
  db.indicateurs = [
    { id: 'K1', date_debut: '2026-09-01', date_fin: '2026-09-30', indicateur: 'membres_club_total', segment: 'total', valeur: 2000 },
    { id: 'K2', date_debut: '2026-09-01', date_fin: '2026-09-30', indicateur: 'membres_padel_actifs', segment: 'total', valeur: 300 },
    { id: 'K3', date_debut: '2026-09-01', date_fin: '2026-09-15', indicateur: 'reservations_terrains', segment: 'total', valeur: 400 },
    { id: 'K4', date_debut: '2026-09-16', date_fin: '2026-09-30', indicateur: 'reservations_terrains', segment: 'total', valeur: 500 },
    { id: 'K5', date_debut: '2026-09-01', date_fin: '2026-09-30', indicateur: 'nouveaux_membres_club', segment: 'total', valeur: 40 },
    { id: 'K6', date_debut: '2026-09-01', date_fin: '2026-09-30', indicateur: 'nouveaux_membres_padel', segment: 'total', valeur: 10 }
  ];
  return calc.context(db, TODAY);
}

test('programme gratuit : séances réalisées comparées à l\'objectif hebdomadaire', () => {
  const fp = community.freeProgram(withCommunity(), SEPT);
  const taster = fp.rows.find((r) => r.type === 'padel_taster');
  assert.equal(taster.objectifSemaine, 4);
  assert.equal(taster.realisees, 2);
  assert.ok(Math.abs(taster.objectif.v - 4 * 30 / 7) < 0.1);
  assert.ok(Math.abs(taster.atteinte.v - 2 / (4 * 30 / 7)) < 0.01);
  assert.equal(taster.heuresTerrain.v, 2.5, '1 h 30 + 1 h sur un terrain');
  assert.equal(taster.nouveaux.v, 0, 'M3 avait déjà joué (junior le 02/09)');
});

test('programme gratuit : une période en cours n\'est pas pénalisée pour les jours futurs', () => {
  const c = withCommunity();
  const fp = community.freeProgram(c, { from: '2026-10-26', to: '2026-11-01' });
  assert.ok(Math.abs(fp.weeks - 6 / 7) < 0.1, 'du 26 au 31 octobre seulement');
});

test('taux de pénétration = membres actifs padel ÷ membres du club ; inconnu sans Power BI', () => {
  const c = withCommunity();
  const ci = community.clubIndicators(c, SEPT);
  assert.equal(ci.derived.penetration.v, 0.15);
  assert.equal(ci.values.reservations_terrains.v, 900, 'flux additionnés');
  assert.deepEqual(ci.values.reservations_terrains.gaps, []);
  assert.equal(ci.derived.penetrationNouveaux.v, 0.25);
  assert.equal(ci.derived.tauxReservants.v, null, 'membres réservants non transmis');
  const oct = community.clubIndicators(c, { from: '2026-10-01', to: '2026-10-31' });
  assert.equal(oct.derived.penetration.v, null);
  assert.match(oct.derived.penetration.gaps.join(), /aucune donnée Power BI/);
});

test('indicateur en flux partiellement couvert : signalé', () => {
  const c = withCommunity();
  c.db.indicateurs = c.db.indicateurs.filter((r) => r.id !== 'K4');
  const v = community.clubIndicators(c, SEPT).values.reservations_terrains;
  assert.equal(v.v, 400);
  assert.match(v.gaps[0], /couverte à 50 %/);
});

test('programme gratuit : l\'atteinte globale ne porte que sur les activités avec objectif', () => {
  const fp = community.freeProgram(withCommunity(), SEPT);
  assert.notEqual(fp.total.atteinte.v, null);
  // Objectifs : 4 Tasters + 2 Afterworks + 2 New to Padel par semaine ; seules 2 séances Taster réalisées.
  assert.ok(Math.abs(fp.total.atteinte.v - 2 / (8 * 30 / 7)) < 0.01);
  assert.deepEqual(fp.total.sansObjectif, [], 'Padel Squad absent du jeu de test');
});

test('indicateurs Power BI : occupation officielle et taux de no-show', () => {
  const c = withCommunity();
  c.db.indicateurs.push(
    { id: 'B1', date_debut: '2026-09-01', date_fin: '2026-09-30', indicateur: 'occupation_terrains_bi', segment: 'total', valeur: 42.5 },
    { id: 'B2', date_debut: '2026-09-01', date_fin: '2026-09-30', indicateur: 'participations_reservations', segment: 'total', valeur: 4000 },
    { id: 'B3', date_debut: '2026-09-01', date_fin: '2026-09-30', indicateur: 'no_shows', segment: 'total', valeur: 600 });
  const d = community.clubIndicators(c, SEPT).derived;
  assert.ok(Math.abs(d.occupationBI.v - 0.425) < 1e-9);
  assert.ok(Math.abs(d.noShowBI.v - 0.15) < 1e-9);
  assert.equal(d.occupationHeuresBI.v, null, 'heures non transmises : pas de recalcul');
});
