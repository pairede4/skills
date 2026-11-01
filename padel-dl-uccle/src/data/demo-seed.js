/**
 * JEU DE DONNÉES FICTIF – MODE DÉMONSTRATION UNIQUEMENT.
 *
 * Toutes les valeurs ci-dessous sont inventées pour illustrer l'application :
 * membres (DEMO-…), coachs (« Coach A (démo) »…), horaires, tarifs, présences,
 * paiements, dépenses, avis. La date d'ouverture indoor (17/08/2026) est elle aussi
 * fictive. Rien de ceci ne doit être recopié dans le classeur réel.
 *
 * Génération déterministe (graine fixe) : les tests et captures sont reproductibles.
 */
(function (root, factory) {
  var isNode = typeof require === 'function' && typeof module === 'object';
  var u = isNode ? require('../core/util.js') : root.Padel.util;
  var schema = isNode ? require('../core/schema.js') : root.Padel.schema;
  var mod = factory(u, schema);
  if (typeof module === 'object' && module.exports) module.exports = mod;
  root.Padel = root.Padel || {};
  root.Padel.demoSeed = mod;
})(typeof globalThis !== 'undefined' ? globalThis : this, function (u, schema) {
  'use strict';

  var FICTIF = 'FICTIF – démo';

  function rng(seed) { return function () { seed = (seed * 1664525 + 1013904223) % 4294967296; return seed / 4294967296; }; }

  function generate(endDate) {
    var R = rng(20260817);
    function pick(a) { return a[Math.floor(R() * a.length)]; }
    function chance(p) { return R() < p; }
    function int(a, b) { return a + Math.floor(R() * (b - a + 1)); }
    var END = endDate || '2026-10-31';
    var OPEN = '2026-08-31';
    var stamp = OPEN + 'T08:00:00.000Z';
    var db = {}; schema.SHEETS.forEach(function (s) { db[s.key] = []; });
    var seq = {};
    function id(prefix) { seq[prefix] = (seq[prefix] || 0) + 1; return prefix + '-' + String(seq[prefix]).padStart(4, '0'); }
    function meta(r, by) { r.archive = false; r.import_id = r.import_id || ''; r.cree_le = stamp; r.cree_par = by || 'demo@exemple.invalid'; r.modifie_le = ''; r.modifie_par = ''; return r; }
    function add(sheet, r, by) { meta(r, by); db[sheet].push(r); return r; }

    // ---------------------------------------------------------- Paramètres
    schema.INITIAL_PARAMETRES.forEach(function (p) {
      var r = Object.assign({}, p, { id: id('PAR') });
      if (r.categorie === 'taux_coach' || (r.categorie === 'objectif' && r.cle === 'taux_penetration')) return;
      add('parametres', r);
    });
    [1, 2, 3, 4, 5].forEach(function (d) { add('parametres', { id: id('PAR'), categorie: 'heures_pointe', cle: 'soir', reference: String(d), valeur: '17:00-22:00', statut: 'actif', source: FICTIF, libelle: 'Soirée', date_effet: '', date_fin: '', attributs: '', description: '' }); });
    [6, 7].forEach(function (d) { add('parametres', { id: id('PAR'), categorie: 'heures_pointe', cle: 'matin_we', reference: String(d), valeur: '09:00-13:00', statut: 'actif', source: FICTIF, libelle: 'Matinée week-end', date_effet: '', date_fin: '', attributs: '', description: '' }); });
    add('parametres', { id: id('PAR'), categorie: 'vacances', cle: 'automne_2026', reference: '', valeur: 'Congé d\'automne (fictif)', libelle: 'Congé d\'automne', date_effet: '2026-10-19', date_fin: '2026-10-30', statut: 'actif', source: FICTIF, attributs: '', description: 'Dates fictives : encoder le calendrier officiel FWB.' });

    // ---------------------------------------------------------- Utilisateurs
    var U = {
      admin: add('utilisateurs', { id: 'USR-ADMIN', email: 'admin@exemple.invalid', nom_affiche: 'Administrateur (démo)', role: 'admin', actif: true, code_acces_hash: '', derniere_connexion: '' }),
      a: add('utilisateurs', { id: 'USR-COACHA', email: 'coach.a@exemple.invalid', nom_affiche: 'Coach A (démo)', role: 'coach', actif: true, code_acces_hash: '', derniere_connexion: '' }),
      b: add('utilisateurs', { id: 'USR-COACHB', email: 'coach.b@exemple.invalid', nom_affiche: 'Coach B (démo)', role: 'coach', actif: true, code_acces_hash: '', derniere_connexion: '' }),
      c: add('utilisateurs', { id: 'USR-COACHC', email: 'coach.c@exemple.invalid', nom_affiche: 'Coach C (démo)', role: 'coach', actif: true, code_acces_hash: '', derniere_connexion: '' }),
      rec: add('utilisateurs', { id: 'USR-RECEP', email: 'reception@exemple.invalid', nom_affiche: 'Réception (démo)', role: 'reception', actif: true, code_acces_hash: '', derniere_connexion: '' }),
      man: add('utilisateurs', { id: 'USR-MANAG', email: 'manager@exemple.invalid', nom_affiche: 'Manager (démo)', role: 'manager', actif: true, code_acces_hash: '', derniere_connexion: '' })
    };
    function rate(coach, v, from, extra) { add('parametres', Object.assign({ id: id('PAR'), categorie: 'taux_coach', cle: 'taux_horaire', reference: coach.id, valeur: String(v), libelle: coach.nom_affiche, date_effet: from, date_fin: '', statut: 'actif', source: FICTIF, attributs: '', description: '' }, extra || {})); }
    rate(U.a, 35, '2026-08-01');
    rate(U.b, 30, '2026-08-01'); rate(U.b, 32, '2026-10-01');
    rate(U.c, 28, '');
    [['2026-09', 'revenus_reconnus', 4200], ['2026-09', 'couts_coachs', 1300], ['2026-09', 'couts_directs', 600], ['2026-10', 'revenus_reconnus', 5200], ['2026-10', 'couts_coachs', 1500], ['2026-10', 'couts_directs', 700]]
      .forEach(function (b) { add('parametres', { id: id('PAR'), categorie: 'budget', cle: b[1], reference: b[0], valeur: String(b[2]), libelle: '', date_effet: '', date_fin: '', statut: 'actif', source: FICTIF, attributs: '', description: '' }); });

    // ---------------------------------------------------------- Terrains (horaires fictifs)
    var T = [];
    for (var n = 1; n <= 6; n++) {
      var indoor = n <= 3;
      T.push(add('terrains', { id: 'TER-' + n, numero: n, nom: (indoor ? 'Indoor ' : 'Outdoor ') + n, lieu: indoor ? 'indoor' : 'outdoor',
        date_mise_en_service: indoor ? OPEN : '', horaires_lun: schema.HORAIRES_TERRAINS, horaires_mar: schema.HORAIRES_TERRAINS,
        horaires_mer: schema.HORAIRES_TERRAINS, horaires_jeu: schema.HORAIRES_TERRAINS, horaires_ven: schema.HORAIRES_TERRAINS,
        horaires_sam: schema.HORAIRES_TERRAINS, horaires_dim: schema.HORAIRES_TERRAINS, statut: 'actif', commentaire: 'Horaires 8 h – 21 h (confirmés)' }));
    }

    // ---------------------------------------------------------- Membres
    var adults = [], juniors = [];
    for (var a = 1; a <= 90; a++) adults.push(add('membres', { id: 'DEMO-A' + String(a).padStart(3, '0'), alias: '', segment: 'adulte', categorie_abonnement: pick(['Platinum', 'Diamond']), niveau: pick([1, 1, 2, 2, 2, 3, 3, 4, 5, 6]), date_niveau: OPEN, motif_niveau: 'Autoévaluation (fictif)', statut: 'actif', commentaire: '' }).id);
    for (var j = 1; j <= 30; j++) juniors.push(add('membres', { id: 'DEMO-J' + String(j).padStart(3, '0'), alias: '', segment: 'junior', categorie_abonnement: 'Diamond', niveau: pick([1, 2, 2, 3]), date_niveau: OPEN, motif_niveau: '', statut: 'actif', commentaire: '' }).id);

    // ---------------------------------------------------------- Offres
    var O = {
      ad1: add('offres', { id: 'OFF-AD1H', nom: 'Collectif adulte 1 h (démo)', type_activite: 'collectif_adulte', public: 'adulte', duree_seance_min: 60, nb_seances: '', tarif_seance: 25, prix_cycle: '', taille_min: 2, taille_max: 4, date_effet: OPEN, date_fin: '', statut: 'actif', source: '25 €/séance/pers. (confirmé) ; séances fixées par cycle', commentaire: '' }),
      ad90: add('offres', { id: 'OFF-AD90', nom: 'Collectif adulte 1 h 30 (démo)', type_activite: 'collectif_adulte', public: 'adulte', duree_seance_min: 90, nb_seances: '', tarif_seance: 35, prix_cycle: '', taille_min: 2, taille_max: 4, date_effet: OPEN, date_fin: '', statut: 'actif', source: '35 €/séance de 1 h 30/pers. (confirmé)', commentaire: '' }),
      jr1: add('offres', { id: 'OFF-JR1H', nom: 'Collectif junior 1 h (démo)', type_activite: 'collectif_junior', public: 'junior', duree_seance_min: 60, nb_seances: '', tarif_seance: 25, prix_cycle: '', taille_min: 2, taille_max: 4, date_effet: OPEN, date_fin: '', statut: 'actif', source: '25 €/séance/pers. (confirmé)', commentaire: '' }),
      jr90: add('offres', { id: 'OFF-JR90', nom: 'Formule test sans tarif (anomalie de démo)', type_activite: 'collectif_junior', public: 'junior', duree_seance_min: 90, nb_seances: '', tarif_seance: '', prix_cycle: '', taille_min: 2, taille_max: 4, date_effet: OPEN, date_fin: '', statut: 'actif', source: 'Tarif manquant (anomalie volontaire de démonstration)', commentaire: '' })
    };

    // ---------------------------------------------------------- Cycles
    function holiday(d) { return d >= '2026-10-19' && d <= '2026-10-30'; }
    var cycles = [
      { id: 'CYC-0001', nom: 'Adultes niv. 2 – mardi 19 h', offre: O.ad1, coach: U.a, dow: 2, start: '2026-09-08', nb: 15, h: ['19:00', '20:00'], ter: 'TER-1', niveau: 2, members: adults.slice(0, 4) },
      { id: 'CYC-0002', nom: 'Adultes niv. 3-4 – jeudi 20 h', offre: O.ad90, coach: U.a, dow: 4, start: '2026-09-10', nb: 20, h: ['19:30', '21:00'], ter: 'TER-2', niveau: 3, members: adults.slice(4, 7) },
      { id: 'CYC-0003', nom: 'Juniors – mercredi 17 h', offre: O.jr1, coach: U.b, dow: 3, start: '2026-09-09', nb: 15, h: ['17:00', '18:00'], ter: 'TER-3', niveau: 1, members: juniors.slice(0, 4) },
      { id: 'CYC-0004', nom: 'Juniors – samedi 12 h 30', offre: O.jr90, coach: U.b, dow: 6, start: '2026-09-12', nb: 15, h: ['12:30', '14:00'], ter: 'TER-1', niveau: 2, members: juniors.slice(4, 7) },
      { id: 'CYC-0005', nom: 'Adultes niv. 1 – lundi 20 h', offre: O.ad1, coach: U.c, dow: 1, start: '2026-09-14', nb: 20, h: ['19:30', '20:30'], ter: 'TER-3', niveau: 1, members: adults.slice(7, 10) }
    ];
    var seances = [];
    function seance(r) { r.id = r.id || id('SEA'); ['cycle_id', 'evenement_id', 'coach_remplacant_id', 'niveau', 'capacite', 'nb_inscrits', 'nb_presents', 'nb_absents', 'nb_no_shows', 'nb_annulations', 'payant', 'commentaire', 'incident'].forEach(function (k) { if (r[k] === undefined) r[k] = ''; }); seances.push(add('seances', r)); return r; }
    function presence(se, m, st, ins) { add('presences', { id: id('PRE'), seance_id: se.id, membre_id: m, inscription_id: ins || '', statut: st, motif: st === 'absent' ? 'Prévenu' : '', commentaire: '' }, 'coach@exemple.invalid'); }
    function hours(coach, se, statut, extra) {
      var h = Object.assign({ id: id('HEU'), coach_id: coach.id, date: se.date, heure_debut: se.heure_debut, heure_fin: se.heure_fin, duree_h: u.round((u.toMinutes(se.heure_fin) - u.toMinutes(se.heure_debut)) / 60, 2),
        type_activite: se.type_activite, seance_id: se.id, cycle_id: se.cycle_id || '', evenement_id: se.evenement_id || '', nb_participants: '', nb_presents: '', remplacement: false, remplace_coach_id: '',
        annulation: false, commentaire: '', statut: statut, motif_correction: '', demande_correction: '', valide_par: '', valide_le: '', paye_le: '', reference_paiement: '' }, extra || {});
      if (statut === 'valide' || statut === 'paye') { h.valide_par = U.admin.email; h.valide_le = u.addDays(se.date, 2) + 'T09:00:00.000Z'; }
      if (statut === 'paye') { h.paye_le = u.addDays(u.endOfMonth(se.date), 5); h.reference_paiement = 'FACT-DEMO-' + se.date.slice(0, 7); }
      add('heures', h, coach.email);
    }
    function hourStatus(d) { if (d <= '2026-09-30') return 'paye'; if (d <= '2026-10-18') return 'valide'; if (d <= '2026-10-29') return chance(0.85) ? 'soumis' : 'brouillon'; return 'brouillon'; }

    cycles.forEach(function (c) {
      var cyc = add('cycles', { id: c.id, nom: c.nom, offre_id: c.offre.id, coach_id: c.coach.id, date_debut: c.start, date_fin: '', jour_semaine: c.dow, heure_debut: c.h[0], heure_fin: c.h[1], terrain_id: c.ter, niveau: c.niveau, capacite: 4, nb_seances: c.nb, statut: 'en_cours', commentaire: '' });
      var ins = c.members.map(function (m, i) {
        var late = (c.id === 'CYC-0001' && i === 3);
        var r = add('inscriptions', { id: id('INS'), membre_id: m, cycle_id: cyc.id, seance_id: '', evenement_id: '', date_inscription: u.addDays(c.start, late ? 14 : -5), date_premiere_seance: late ? u.addDays(c.start, 14) : '', nb_seances_prevues: late ? c.nb - 2 : '', montant_attendu: '', statut: 'inscrit', commentaire: late ? 'Entrée en cours de cycle (fictif)' : '' }, 'reception@exemple.invalid');
        var price = u.num(c.offre.tarif_seance);
        if (price !== null) {
          var nb = late ? c.nb - 2 : c.nb, unpaid = (c.id === 'CYC-0005' && i === 2);
          if (!unpaid) add('paiements', { id: id('PAY'), date_paiement: u.addDays(r.date_inscription, 1), membre_id: m, inscription_id: r.id, evenement_id: '', seance_id: '', categorie_revenu: '', montant: price * nb, mode: pick(['carte', 'bancontact', 'compte_membre']), reference: 'REC-' + r.id.slice(4), statut: (c.id === 'CYC-0002' && i === 0) ? 'a_verifier' : 'encaisse', verifie_par: 'reception@exemple.invalid', verifie_le: '', commentaire: '' }, 'reception@exemple.invalid');
        }
        return r;
      });
      var count = 0;
      for (var d = c.start; count < c.nb; d = u.addDays(d, 7)) {
        if (holiday(d)) continue;
        count++;
        var past = d <= END;
        var cancelled = past && c.id === 'CYC-0002' && count === 3;
        var se = seance({ date: d, heure_debut: c.h[0], heure_fin: c.h[1], type_activite: c.offre.type_activite, cycle_id: cyc.id, terrains: c.ter, coach_id: c.coach.id, niveau: String(c.niveau), capacite: 4,
          statut: !past ? 'planifiee' : (cancelled ? 'annulee_club' : 'realisee'), commentaire: cancelled ? 'Coach indisponible – séance reportée (fictif)' : '' });
        if (!past || cancelled) continue;
        var skip = (c.id === 'CYC-0005' && count === 4);
        if (!skip) ins.forEach(function (r) {
          var first = u.parseDate(r.date_premiere_seance) || c.start;
          if (d < first) return;
          presence(se, r.membre_id, chance(0.86) ? 'present' : (chance(0.6) ? 'absent' : 'no_show'), r.id);
        });
        var replaced = c.id === 'CYC-0001' && count === 5;
        var coach = replaced ? U.c : c.coach;
        if (replaced) se.coach_remplacant_id = U.c.id;
        hours(coach, se, c.id === 'CYC-0003' && count === 6 ? 'a_corriger' : hourStatus(d), {
          nb_participants: ins.length, nb_presents: ins.length, remplacement: replaced, remplace_coach_id: replaced ? c.coach.id : '',
          motif_correction: c.id === 'CYC-0003' && count === 6 ? 'Heure de fin à vérifier (fictif)' : '' });
      }
    });

    // ---------------------------------------------------------- Activités ponctuelles
    var tasterPeople = adults.slice(20, 70);
    var tasterIdx = 0;
    u.eachDay(OPEN, u.addDays(END, 7)).forEach(function (d) {
      var wd = u.weekday(d), past = d <= END;
      // Padel Taster lundi et jeudi 11 h et 12 h (1 terrain, 4 pers.)
      if ((wd === 1 || wd === 4)) ['11:00', '12:00'].forEach(function (h) {
        var se = seance({ date: d, heure_debut: h, heure_fin: u.fromMinutes(u.toMinutes(h) + 60), type_activite: 'padel_taster', terrains: 'TER-2', coach_id: U.c.id, capacite: 4, payant: 'non', statut: past ? 'realisee' : 'planifiee' });
        if (!past) return;
        var n = int(1, 4);
        for (var k = 0; k < n; k++) { var m = tasterPeople[tasterIdx++ % tasterPeople.length]; presence(se, m, chance(0.9) ? 'present' : 'no_show'); }
        hours(U.c, se, hourStatus(d), { nb_participants: n, nb_presents: n });
      });
      // New to Padel mardi et jeudi 18 h
      if (wd === 2 || wd === 4) {
        var nt = seance({ date: d, heure_debut: '18:00', heure_fin: '19:00', type_activite: 'new_to_padel', terrains: 'TER-3', coach_id: U.c.id, capacite: 4, payant: 'non', statut: past ? 'realisee' : 'planifiee' });
        if (past) {
          var pool = tasterPeople.slice(0, Math.max(4, Math.min(tasterPeople.length, Math.floor(tasterIdx * 0.7))));
          var nn = int(2, 4);
          var usedNt = {};
          for (var q = 0; q < nn; q++) { var mm = pool[(q * 7 + u.daysBetween(OPEN, d)) % pool.length]; if (usedNt[mm]) continue; usedNt[mm] = 1; presence(nt, mm, chance(0.88) ? 'present' : 'absent'); }
          hours(U.c, nt, hourStatus(d), { nb_participants: nn, nb_presents: nn });
        }
      }
      // Padel Squad lundi et jeudi 16 h 30
      if (wd === 1 || wd === 4) {
        var sq = seance({ date: d, heure_debut: '16:30', heure_fin: '17:30', type_activite: 'padel_squad', terrains: 'TER-1', coach_id: U.b.id, capacite: 4, payant: 'non', statut: past ? 'realisee' : 'planifiee' });
        if (past) {
          if (d === '2026-10-05') { /* présences non encodées : anomalie volontaire */ }
          else { var ns = int(2, 4); sq.nb_inscrits = ns; sq.nb_presents = ns - (chance(0.2) ? 1 : 0); sq.nb_absents = ns - sq.nb_presents; sq.nb_no_shows = 0; sq.nb_annulations = chance(0.2) ? 1 : 0; }
          hours(U.b, sq, hourStatus(d), { nb_participants: sq.nb_inscrits, nb_presents: sq.nb_presents });
        }
      }
      // Afterwork mercredi et vendredi (objectif 2/semaine), 3 terrains indoor ; une semaine manquée (fictif)
      if ((wd === 3 || wd === 5) && !(d >= '2026-10-12' && d <= '2026-10-18')) {
        var aw = seance({ date: d, heure_debut: '19:00', heure_fin: '20:30', type_activite: 'afterwork', terrains: 'TER-1,TER-2,TER-3', coach_id: U.a.id, capacite: 12, payant: 'non', statut: past ? 'realisee' : 'planifiee',
          incident: d === '2026-09-26' ? 'Éclairage du terrain Indoor 2 défaillant 20 min (fictif)' : '' });
        if (past) { var na = int(7, 12); aw.nb_inscrits = na; aw.nb_presents = na - int(0, 2); aw.nb_absents = 0; aw.nb_no_shows = na - aw.nb_presents; aw.nb_annulations = int(0, 2); hours(U.a, aw, hourStatus(d), { nb_participants: na, nb_presents: aw.nb_presents }); }
      }
    });
    // Une séance en doublon (anomalie volontaire) et une séance sans capacité
    var dup = seances.filter(function (s) { return s.type_activite === 'new_to_padel' && s.statut === 'realisee'; })[3];
    if (dup) seance(Object.assign({}, dup, { id: undefined, archive: false }));
    var nocap = seances.filter(function (s) { return s.type_activite === 'padel_taster' && s.statut === 'realisee'; })[10];
    if (nocap) nocap.capacite = '';

    // ---------------------------------------------------------- Événements
    function event(r) { ['heure_debut', 'heure_fin', 'format', 'nb_equipes', 'partenaires', 'materiel', 'prix', 'catering', 'incidents', 'commentaire', 'revenu_declare'].forEach(function (k) { if (r[k] === undefined) r[k] = ''; }); return add('evenements', r); }
    var t1 = event({ id: 'EVT-0001', nom: 'Tournoi d\'ouverture indoor (démo)', date: '2026-09-26', heure_debut: '09:00', heure_fin: '17:00', type_activite: 'tournoi', format: 'Américain, poules + tableau', terrains: 'TER-1,TER-2,TER-3', nb_terrains: 3, capacite: 32, nb_inscrits: 28, nb_presents: 26, nb_equipes: 13, payant: 'oui', partenaires: 'Sponsor fictif', materiel: 'Balles', prix: 'Lots', catering: 'Brunch', statut: 'realise' });
    var t2 = event({ id: 'EVT-0002', nom: 'Tournoi d\'octobre (démo)', date: '2026-10-24', heure_debut: '09:00', heure_fin: '16:00', type_activite: 'tournoi', format: 'Mexicano', terrains: 'TER-1,TER-2,TER-3', nb_terrains: 3, capacite: 24, nb_inscrits: 22, nb_presents: 22, nb_equipes: 11, payant: 'oui', revenu_declare: 440, statut: 'realise', incidents: 'Retard de 30 min au démarrage (fictif)' });
    var pp = event({ id: 'EVT-0003', nom: 'Padel + Physical (démo)', date: '2026-10-10', heure_debut: '10:00', heure_fin: '12:00', type_activite: 'padel_physical', format: 'Atelier', terrains: 'TER-4,TER-5', nb_terrains: 2, capacite: 16, nb_inscrits: 14, nb_presents: 12, payant: 'oui', statut: 'realise' });
    var t3 = event({ id: 'EVT-0004', nom: 'Tournoi de novembre (démo)', date: '2026-11-21', heure_debut: '09:00', heure_fin: '17:00', type_activite: 'tournoi', format: 'À définir', terrains: 'TER-1,TER-2,TER-3', nb_terrains: 3, capacite: 32, nb_inscrits: 9, nb_presents: '', payant: 'oui', statut: 'planifie' });
    for (var e = 0; e < 13; e++) add('paiements', { id: id('PAY'), date_paiement: u.addDays('2026-09-26', -int(1, 10)), membre_id: adults[30 + e], inscription_id: '', evenement_id: t1.id, seance_id: '', categorie_revenu: '', montant: 40, mode: 'compte_membre', reference: 'TOURNOI-09-' + e, statut: 'encaisse', verifie_par: '', verifie_le: '', commentaire: 'Inscription équipe (fictif)' }, 'reception@exemple.invalid');
    for (var f = 0; f < 12; f++) add('paiements', { id: id('PAY'), date_paiement: u.addDays('2026-10-10', -int(1, 7)), membre_id: adults[45 + f], inscription_id: '', evenement_id: pp.id, seance_id: '', categorie_revenu: '', montant: 25, mode: 'carte', reference: 'PP-' + f, statut: 'encaisse', verifie_par: '', verifie_le: '', commentaire: '' }, 'reception@exemple.invalid');
    for (var g = 0; g < 9; g++) add('paiements', { id: id('PAY'), date_paiement: u.addDays('2026-10-31', -int(0, 6)), membre_id: adults[60 + g], inscription_id: '', evenement_id: t3.id, seance_id: '', categorie_revenu: '', montant: 40, mode: 'compte_membre', reference: 'TOURNOI-11-' + g, statut: 'encaisse', verifie_par: '', verifie_le: '', commentaire: '' }, 'reception@exemple.invalid');
    add('paiements', { id: id('PAY'), date_paiement: '2026-10-14', membre_id: 'DEMO-A088', inscription_id: '', evenement_id: '', seance_id: '', categorie_revenu: '', montant: 25, mode: 'especes', reference: 'SANS-LIEN', statut: 'encaisse', verifie_par: '', verifie_le: '', commentaire: 'Paiement sans inscription (anomalie volontaire)' }, 'reception@exemple.invalid');
    var hoursEv = [[t1, U.a, '09:00', '17:00'], [t2, U.a, '09:00', '16:00'], [pp, U.b, '10:00', '12:00']];
    hoursEv.forEach(function (x) { hours(x[1], { date: x[0].date, heure_debut: x[2], heure_fin: x[3], type_activite: x[0].type_activite, id: '', evenement_id: x[0].id }, hourStatus(x[0].date), { seance_id: '', evenement_id: x[0].id }); });

    // ---------------------------------------------------------- Dépenses
    [
      ['2026-08-20', 'materiel', 180, 'Fournisseur balles (fictif)', '', 'collectif_adulte', 'FAC-001'],
      ['2026-09-24', 'prix_recompenses', 150, 'Lots tournoi (fictif)', t1.id, 'tournoi', 'FAC-002'],
      ['2026-09-26', 'catering', 210, 'Traiteur (fictif)', t1.id, 'tournoi', 'FAC-003'],
      ['2026-10-09', 'materiel', 60, 'Cônes et élastiques (fictif)', pp.id, 'padel_physical', 'FAC-004'],
      ['2026-10-24', 'prix_recompenses', 120, 'Lots tournoi (fictif)', t2.id, 'tournoi', ''],
      ['2026-10-02', 'catering', 85, 'Boissons Afterwork (fictif)', '', 'afterwork', 'FAC-006']
    ].forEach(function (x) { add('depenses', { id: id('DEP'), date: x[0], categorie: x[1], montant: x[2], fournisseur: x[3], type_activite: x[5], evenement_id: x[4], cycle_id: '', seance_id: '', justificatif: x[6], statut: 'payee', commentaire: '' }); });

    // ---------------------------------------------------------- Réservations libres (simulation)
    var slots = { indoor: ['08:00', '09:30', '11:00', '12:30', '14:00', '17:00', '18:30'], outdoor: ['09:00', '10:30', '12:00', '13:30', '17:00', '18:30', '20:00'] };
    u.eachDay(OPEN, END).forEach(function (d) {
      var wd = u.weekday(d);
      T.forEach(function (t) {
        var list = slots[t.lieu];
        if (wd >= 6) list = t.lieu === 'indoor' ? ['08:30', '10:00', '11:30', '13:00', '14:30', '16:00', '17:30', '19:00'] : ['09:00', '10:30', '12:00', '13:30', '15:00', '16:30', '18:00'];
        var autumn = d >= '2026-10-01';
        list.forEach(function (h) {
          var peak = (wd <= 5 && h >= '17:00') || (wd >= 6 && h <= '12:00');
          var p = t.lieu === 'indoor' ? (peak ? 0.8 : 0.32) : (peak ? (autumn ? 0.35 : 0.6) : (autumn ? 0.08 : 0.2));
          if (!chance(p)) return;
          var end = u.toMinutes(h) + 90;
          var close = 21 * 60;
          if (end > close) return;
          var r = R();
          add('occupation', { id: id('OCC'), terrain_id: t.id, date: d, heure_debut: h, heure_fin: u.fromMinutes(end), type: 'reservation_libre',
            statut: r < 0.07 ? 'annule' : (r < 0.1 ? 'no_show' : (d <= END ? 'realise' : 'reserve')), nb_joueurs: 4, reference_externe: 'ABS-DEMO-' + seq.OCC, commentaire: '', import_id: 'IMP-0001' }, 'admin@exemple.invalid');
        });
      });
    });
    add('occupation', { id: id('OCC'), terrain_id: 'TER-5', date: '2026-10-06', heure_debut: '08:00', heure_fin: '13:00', type: 'maintenance', statut: 'realise', nb_joueurs: '', reference_externe: '', commentaire: 'Brossage du gazon (fictif)' });
    add('occupation', { id: id('OCC'), terrain_id: 'TER-6', date: '2026-10-15', heure_debut: '08:00', heure_fin: '22:00', type: 'indisponibilite', statut: 'realise', nb_joueurs: '', reference_externe: '', commentaire: 'Terrain inondé (fictif)' });
    add('imports', { id: 'IMP-0001', date: '2026-10-31T18:00:00.000Z', utilisateur: 'admin@exemple.invalid', source: 'ABS – réservations (simulation démo)', feuille_cible: 'Occupation_Terrains', fichier: 'export_abs_demo.csv', nb_lignes: db.occupation.length, nb_importees: db.occupation.length - 2, nb_doublons: 0, nb_erreurs: 0, statut: 'importe', rapport: '{"note":"Import simulé pour la démonstration"}', annule_le: '', annule_par: '' });

    // ---------------------------------------------------------- Satisfaction
    var acts = ['padel_taster', 'new_to_padel', 'afterwork', 'collectif_adulte', 'tournoi'];
    var improvements = ['Plus de créneaux en soirée', 'Communication des niveaux', 'Accueil des nouveaux joueurs', 'Prêt de raquettes', 'Éclairage outdoor', ''];
    for (var s = 0; s < 46; s++) {
      var reco = pick([10, 10, 9, 9, 9, 8, 8, 7, 7, 6, 5, 10, 9, 8, 3]);
      add('satisfaction', { id: id('SAT'), date: u.addDays(OPEN, int(5, u.daysBetween(OPEN, END))), membre_id: chance(0.6) ? pick(adults) : '', type_activite: pick(acts), seance_id: '', evenement_id: '',
        note_globale: Math.min(10, Math.max(4, reco + int(-1, 1))), note_terrains: int(7, 10), note_organisation: int(5, 10), frequence_avant: pick(['jamais', 'moins_1_mois', '1_3_mois', '1_semaine']),
        frequence_apres: pick(['1_3_mois', '1_semaine', '1_semaine', '2_plus_semaine']), activite_preferee: pick(acts), amelioration: pick(improvements), recommandation: reco, commentaire: '', source: 'formulaire' }, 'formulaire');
    }
    db.satisfaction.filter(function (r) { return r.type_activite === 'tournoi'; }).slice(0, 4).forEach(function (r) { r.evenement_id = t1.id; r.date = t1.date; });

    // ---------------------------------------------------------- Indicateurs Power BI (FICTIFS)
    [['2026-09', { membres_club_total: 2140, membres_padel_actifs: 286, membres_reservants: 241, reservations_terrains: 1310, heures_reservees: 1965, nouveaux_membres_club: 48, nouveaux_membres_padel: 17, nouveaux_joueurs_padel: 22, age_moyen_padel: 41.2, age_moyen_club: 44.8, participants_evenements: 58 }],
     ['2026-10', { membres_club_total: 2165, membres_padel_actifs: 318, membres_reservants: 266, reservations_terrains: 1402, heures_reservees: 2103, nouveaux_membres_club: 39, nouveaux_membres_padel: 16, nouveaux_joueurs_padel: 19, age_moyen_padel: 40.6, age_moyen_club: 44.9, participants_evenements: 45 }]]
      .forEach(function (mth) {
        var from = mth[0] + '-01', to = u.endOfMonth(from);
        Object.keys(mth[1]).forEach(function (k) { add('indicateurs', { id: id('KPI'), date_debut: from, date_fin: to, indicateur: k, segment: 'total', valeur: mth[1][k], source: 'Power BI (FICTIF – démo)', commentaire: '' }); });
      });
    add('parametres', { id: id('PAR'), categorie: 'objectif', cle: 'taux_penetration', reference: '', valeur: '16', libelle: 'Objectif de taux de pénétration (%)', date_effet: '', date_fin: '', statut: 'actif', source: FICTIF, attributs: '', description: '' });

    // ---------------------------------------------------------- Journal
    add('audit', { id: id('AUD'), date: '2026-10-31T18:00:00.000Z', utilisateur: 'admin@exemple.invalid', role: 'admin', action: 'import', feuille: 'Occupation_Terrains', ligne_id: 'IMP-0001', avant: '', apres: '', motif: 'Import simulé (démo)' });
    db.audit.forEach(function (r) { delete r.archive; delete r.import_id; delete r.cree_le; delete r.cree_par; delete r.modifie_le; delete r.modifie_par; });
    return db;
  }

  return { generate: generate, FICTIF: FICTIF };
});
