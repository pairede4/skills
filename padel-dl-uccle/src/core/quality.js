/**
 * Contrôles automatiques de qualité des données.
 * Chaque anomalie : { code, gravite: 'bloquant'|'attention'|'info', categorie, message, feuille, ligne_id }
 * « bloquant » = un calcul ne peut pas être produit correctement tant que ce n'est pas corrigé.
 */
(function (root, factory) {
  var isNode = typeof require === 'function' && typeof module === 'object';
  var u = isNode ? require('./util.js') : root.Padel.util;
  var calc = isNode ? require('./calc.js') : root.Padel.calc;
  var mod = factory(u, calc);
  if (typeof module === 'object' && module.exports) module.exports = mod;
  root.Padel = root.Padel || {};
  root.Padel.quality = mod;
})(typeof globalThis !== 'undefined' ? globalThis : this, function (u, calc) {
  'use strict';

  var CATS = {
    parametres: 'Paramètres manquants', tarifs: 'Tarifs manquants', seances: 'Séances', presences: 'Présences',
    heures: 'Heures des coachs', paiements: 'Paiements', depenses: 'Dépenses', doublons: 'Doublons',
    terrains: 'Terrains', coherence: 'Incohérences', periodes: 'Périodes sans données', references: 'Références cassées'
  };

  function run(ctx, opts) {
    opts = opts || {};
    var today = ctx.today, D = ctx.db, out = [];
    function add(code, gravite, categorie, message, feuille, id) { out.push({ code: code, gravite: gravite, categorie: categorie, message: message, feuille: feuille || '', ligne_id: id || '' }); }

    // --- Paramètres structurants
    if (!calc.param(ctx, 'date_ouverture_indoor')) add('P01', 'bloquant', 'parametres', 'Date exacte d\'ouverture des terrains indoor non renseignée : l\'historique n\'a pas de point de départ.', 'Paramètres');
    if (!ctx.params.some(function (p) { return p.categorie === 'heures_pointe'; })) add('P02', 'attention', 'parametres', 'Heures de pointe / creuses non définies : l\'occupation pointe/creuse est indisponible.', 'Paramètres');
    if (!ctx.params.some(function (p) { return p.categorie === 'vacances'; })) add('P03', 'info', 'parametres', 'Périodes de vacances scolaires (Fédération Wallonie-Bruxelles) non encodées.', 'Paramètres');
    if (!calc.param(ctx, 'montants_tva')) add('P04', 'info', 'parametres', 'Convention HTVA / TVAC non confirmée pour les montants.', 'Paramètres');
    ctx.params.filter(function (p) { return p.categorie === 'taux_coach'; }).forEach(function (p) {
      if (!ctx.users[String(p.reference).trim()]) add('P05', 'attention', 'parametres', 'Taux horaire « ' + (p.libelle || p.valeur) + ' » rattaché à un coach inconnu (référence « ' + p.reference + ' »).', 'Paramètres', p.id);
      if (!u.parseDate(p.date_effet)) add('P06', 'attention', 'parametres', 'Taux horaire « ' + (p.libelle || p.reference) + ' » sans date d\'effet.', 'Paramètres', p.id);
    });

    // --- Offres et tarifs
    D.offres.forEach(function (o) {
      if (o.statut === 'archive') return;
      if (u.num(o.tarif_seance) === null && u.num(o.prix_cycle) === null) add('T01', 'bloquant', 'tarifs', 'Offre « ' + o.nom + ' » sans tarif : revenu non calculable.', 'Offres', o.id);
      if (u.num(o.nb_seances) === null) add('T02', 'bloquant', 'tarifs', 'Offre « ' + o.nom + ' » sans nombre de séances.', 'Offres', o.id);
      if (!u.parseDate(o.date_effet)) add('T03', 'attention', 'tarifs', 'Offre « ' + o.nom + ' » sans date d\'effet.', 'Offres', o.id);
      var t = u.num(o.tarif_seance), pc = u.num(o.prix_cycle), n = u.num(o.nb_seances);
      if (t !== null && pc !== null && n !== null && Math.abs(t * n - pc) > 0.01) add('T04', 'attention', 'tarifs', 'Offre « ' + o.nom + ' » : prix du cycle (' + u.fmtEUR(pc, 2) + ') ≠ prix par séance × séances (' + u.fmtEUR(t * n, 2) + ').', 'Offres', o.id);
    });
    D.inscriptions.forEach(function (i) {
      if (!i.cycle_id || i.statut !== 'inscrit') return;
      var st = calc.inscriptionState(ctx, i, today);
      if (st.attendu === null) add('T05', 'bloquant', 'tarifs', 'Inscription du membre ' + i.membre_id + ' : montant attendu non calculable (' + st.gaps.join(' ; ') + ').', 'Inscriptions', i.id);
    });

    // --- Coachs sans taux à la date de leurs heures
    var seen = {};
    D.heures.forEach(function (h) {
      var d = u.parseDate(h.date); if (!d) return;
      var r = calc.coachRate(ctx, h.coach_id, d);
      if (r.v === null && !seen[h.coach_id]) { seen[h.coach_id] = 1; add('H01', 'bloquant', 'heures', r.gaps[0] + ' : coût non calculable.', 'Heures_Coachs', h.id); }
    });
    var waiting = D.heures.filter(function (h) { return h.statut === 'soumis'; });
    if (waiting.length) add('H02', 'attention', 'heures', waiting.length + ' ligne(s) d\'heures soumises en attente de validation.', 'Heures_Coachs');
    var drafts = D.heures.filter(function (h) { return h.statut === 'brouillon' && u.parseDate(h.date) && u.daysBetween(u.parseDate(h.date), today) > 7; });
    if (drafts.length) add('H03', 'info', 'heures', drafts.length + ' brouillon(s) d\'heures de plus de 7 jours non soumis.', 'Heures_Coachs');
    D.heures.filter(function (h) { return h.statut === 'a_corriger'; }).forEach(function (h) { add('H04', 'attention', 'heures', 'Heures du ' + u.fmtDate(u.parseDate(h.date)) + ' (' + calc.coachName(ctx, h.coach_id) + ') renvoyées en correction : ' + (h.motif_correction || 'motif non précisé'), 'Heures_Coachs', h.id); });
    D.heures.filter(function (h) { return !u.isBlank(h.demande_correction) && (h.statut === 'valide' || h.statut === 'paye'); }).forEach(function (h) { add('H05', 'attention', 'heures', 'Demande de correction du coach ' + calc.coachName(ctx, h.coach_id) + ' : « ' + h.demande_correction + ' »', 'Heures_Coachs', h.id); });
    D.heures.forEach(function (h) { if (calc.heureDuree(h) === null) add('H06', 'bloquant', 'heures', 'Heures sans début/fin valides (' + calc.coachName(ctx, h.coach_id) + ', ' + (h.date || '?') + ').', 'Heures_Coachs', h.id); });

    // --- Séances
    D.seances.forEach(function (s) {
      var d = u.parseDate(s.date); var lbl = calc.typeLabel(ctx, s.type_activite) + ' du ' + u.fmtDate(d);
      if (s.statut === 'planifiee' && d && d < today) add('S01', 'attention', 'seances', lbl + ' encore « planifiée » : indiquer réalisée ou annulée.', 'Séances', s.id);
      if (!u.splitList(s.terrains).length) add('S02', 'attention', 'terrains', lbl + ' sans terrain.', 'Séances', s.id);
      var c = calc.seanceCounts(ctx, s);
      if (c.capacite === null) add('S03', 'attention', 'seances', lbl + ' sans capacité : remplissage non calculable.', 'Séances', s.id);
      if (s.statut === 'realisee' && (c.mode === 'inconnu' || c.mode === 'inscriptions')) add('S04', 'attention', 'presences', lbl + ' réalisée sans présences encodées.', 'Séances', s.id);
      if (c.presents !== null && c.inscrits !== null && c.presents > c.inscrits) add('C01', 'attention', 'coherence', lbl + ' : plus de présents (' + c.presents + ') que d\'inscrits (' + c.inscrits + ').', 'Séances', s.id);
      if (c.inscrits !== null && c.capacite !== null && c.inscrits > c.capacite) add('C02', 'info', 'coherence', lbl + ' : inscrits (' + c.inscrits + ') au-delà de la capacité (' + c.capacite + ').', 'Séances', s.id);
      if (c.mode === 'declare' && c.inscrits !== null && c.presents !== null && c.absents !== null && c.noShows !== null && c.presents + c.absents + c.noShows !== c.inscrits)
        add('C03', 'attention', 'coherence', lbl + ' : présents + absents + no-shows ≠ inscrits.', 'Séances', s.id);
      u.splitList(s.terrains).forEach(function (t) { if (!ctx.terrains[t]) add('R01', 'attention', 'references', lbl + ' : terrain « ' + t + ' » inconnu.', 'Séances', s.id); });
      if (s.cycle_id && !ctx.cycles[s.cycle_id]) add('R02', 'attention', 'references', lbl + ' : cycle « ' + s.cycle_id + ' » inconnu.', 'Séances', s.id);
    });
    D.cycles.forEach(function (cy) { if (!ctx.offres[cy.offre_id]) add('R03', 'bloquant', 'references', 'Cycle « ' + cy.nom + ' » rattaché à une offre inconnue.', 'Cycles', cy.id); });

    // --- Terrains
    D.terrains.forEach(function (t) {
      if (t.statut === 'archive') return;
      var missing = ['horaires_lun', 'horaires_mar', 'horaires_mer', 'horaires_jeu', 'horaires_ven', 'horaires_sam', 'horaires_dim']
        .filter(function (k) { return calc.parseRanges(t[k]) === null; });
      if (missing.length) add('TE1', 'bloquant', 'terrains', (t.nom || 'Terrain ' + t.numero) + ' : horaires d\'ouverture manquants ou illisibles (' + missing.map(function (k) { return k.slice(9); }).join(', ') + ') → occupation indisponible.', 'Terrains', t.id);
      if (t.lieu === 'indoor' && !u.parseDate(t.date_mise_en_service)) add('TE2', 'attention', 'terrains', (t.nom || 'Terrain ' + t.numero) + ' (indoor) sans date de mise en service.', 'Terrains', t.id);
    });
    if (D.terrains.filter(function (t) { return t.statut !== 'archive'; }).length !== 6) add('TE3', 'info', 'terrains', D.terrains.length + ' terrain(s) actif(s) renseigné(s) ; le club en compte six.', 'Terrains');

    // --- Paiements
    var memberIds = u.indexBy(D.membres, 'id');
    D.paiements.forEach(function (p) {
      var t = calc.paymentTarget(ctx, p);
      if (t.kind === 'orphelin' && p.statut !== 'annule') add('PA1', 'attention', 'paiements', 'Paiement de ' + u.fmtEUR(u.num(p.montant), 2) + ' du ' + u.fmtDate(u.parseDate(p.date_paiement)) + ' sans inscription, séance ni événement.', 'Paiements', p.id);
      if (p.statut === 'a_verifier') add('PA2', 'info', 'paiements', 'Paiement à vérifier (' + (p.reference || p.id) + ').', 'Paiements', p.id);
      if (p.membre_id && !memberIds[p.membre_id]) add('R04', 'attention', 'references', 'Paiement rattaché au membre inconnu « ' + p.membre_id + ' ».', 'Paiements', p.id);
      if (u.num(p.montant) === null || u.num(p.montant) <= 0) add('PA3', 'attention', 'paiements', 'Paiement sans montant valide.', 'Paiements', p.id);
    });
    D.inscriptions.forEach(function (i) {
      if (!i.cycle_id || i.statut !== 'inscrit') return;
      var cy = ctx.cycles[i.cycle_id]; if (!cy) return;
      var st = calc.inscriptionState(ctx, i, today);
      if (st.attendu !== null && st.solde > 0.009 && u.parseDate(cy.date_debut) <= today)
        add('PA4', 'attention', 'paiements', 'Paiement manquant : membre ' + i.membre_id + ' (' + cy.nom + ') – solde ' + u.fmtEUR(st.solde, 2) + '.', 'Inscriptions', i.id);
      if (!memberIds[i.membre_id]) add('R05', 'attention', 'references', 'Inscription d\'un membre inconnu « ' + i.membre_id + ' ».', 'Inscriptions', i.id);
    });

    // --- Dépenses
    D.depenses.forEach(function (x) {
      if (x.statut === 'annulee') return;
      if (u.isBlank(x.justificatif)) add('D01', 'attention', 'depenses', 'Dépense « ' + (x.fournisseur || x.categorie) + ' » de ' + u.fmtEUR(u.num(x.montant), 2) + ' sans justificatif.', 'Dépenses', x.id);
    });

    // --- Doublons
    function dup(rows, keyFn, code, feuille, label) {
      var map = {};
      rows.forEach(function (r) { var k = keyFn(r); if (!k) return; (map[k] = map[k] || []).push(r); });
      Object.keys(map).forEach(function (k) { if (map[k].length > 1) add(code, 'attention', 'doublons', label(map[k][0]) + ' : ' + map[k].length + ' lignes identiques.', feuille, map[k].map(function (r) { return r.id; }).join(', ')); });
    }
    dup(D.membres, function (r) { return r.id; }, 'DB1', 'Membres', function (r) { return 'Membre ' + r.id + ' dupliqué'; });
    dup(D.presences, function (r) { return r.seance_id + '|' + r.membre_id; }, 'DB2', 'Présences', function (r) { return 'Présence du membre ' + r.membre_id + ' en double'; });
    dup(D.paiements.filter(function (p) { return p.statut !== 'annule'; }), function (r) { return [u.parseDate(r.date_paiement), r.membre_id, u.num(r.montant), r.reference].join('|'); }, 'DB3', 'Paiements', function (r) { return 'Paiement ' + (r.reference || '') + ' du ' + u.fmtDate(u.parseDate(r.date_paiement)) + ' en double'; });
    dup(D.heures, function (r) { return [r.coach_id, u.parseDate(r.date), r.heure_debut].join('|'); }, 'DB4', 'Heures_Coachs', function (r) { return 'Heures de ' + calc.coachName(ctx, r.coach_id) + ' du ' + u.fmtDate(u.parseDate(r.date)) + ' en double'; });
    dup(D.inscriptions.filter(function (i) { return i.statut === 'inscrit'; }), function (r) { return [r.membre_id, r.cycle_id, r.seance_id, r.evenement_id].join('|'); }, 'DB5', 'Inscriptions', function (r) { return 'Inscription du membre ' + r.membre_id + ' en double'; });
    dup(D.seances, function (r) { return [u.parseDate(r.date), r.heure_debut, r.type_activite, u.splitList(r.terrains).sort().join('+')].join('|'); }, 'DB6', 'Séances', function (r) { return 'Séance ' + calc.typeLabel(ctx, r.type_activite) + ' du ' + u.fmtDate(u.parseDate(r.date)) + ' en double'; });

    // --- Périodes sans données (semaines depuis l'ouverture sans aucune séance ni réservation)
    if (ctx.histStart) {
      var weeks = {};
      D.seances.forEach(function (s) { var d = u.parseDate(s.date); if (d) weeks[u.startOfWeek(d)] = 1; });
      D.occupation.forEach(function (o) { var d = u.parseDate(o.date); if (d) weeks[u.startOfWeek(d)] = 1; });
      var empty = [];
      for (var w = u.startOfWeek(ctx.histStart); w <= today; w = u.addDays(w, 7)) if (!weeks[w]) empty.push(w);
      if (empty.length) add('PE1', 'attention', 'periodes', empty.length + ' semaine(s) sans aucune séance ni réservation depuis l\'ouverture : ' + empty.slice(0, 6).map(function (w) { return 'sem. du ' + u.fmtDate(w); }).join(', ') + (empty.length > 6 ? '…' : '') + '.', 'Séances');
      var noOcc = D.occupation.length === 0;
      if (noOcc) add('PE2', 'attention', 'periodes', 'Aucune réservation libre importée (exports ABS / application) : l\'occupation ne reflète que les activités encadrées.', 'Occupation_Terrains');
    }
    if (!D.satisfaction.length) add('PE3', 'info', 'periodes', 'Aucun avis membre : satisfaction et NPS indisponibles.', 'Satisfaction');

    var order = { bloquant: 0, attention: 1, info: 2 };
    out.sort(function (a, b) { return order[a.gravite] - order[b.gravite]; });
    return out;
  }

  return { run: run, CATS: CATS };
});
