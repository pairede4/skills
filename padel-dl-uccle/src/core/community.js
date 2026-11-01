/**
 * Indicateurs de développement de la communauté padel :
 *   - programme gratuit (Tasters, Afterworks, New to Padel…) comparé aux objectifs hebdomadaires ;
 *   - indicateurs du club transmis par Power BI (feuille Indicateurs_Club) et ratios dérivés,
 *     dont le taux de pénétration.
 * Aucune valeur n'est estimée : sans chiffre Power BI, le ratio est « donnée indisponible ».
 * Formules : docs/FORMULES_FINANCIERES.md, section 10.
 */
(function (root, factory) {
  var isNode = typeof require === 'function' && typeof module === 'object';
  var u = isNode ? require('./util.js') : root.Padel.util;
  var calc = isNode ? require('./calc.js') : root.Padel.calc;
  var mod = factory(u, calc);
  if (typeof module === 'object' && module.exports) module.exports = mod;
  root.Padel = root.Padel || {};
  root.Padel.community = mod;
})(typeof globalThis !== 'undefined' ? globalThis : this, function (u, calc) {
  'use strict';

  // ------------------------------------------------------------------ objectifs
  /** Objectif « séances par semaine » d'un type d'activité, en vigueur à une date. */
  function weeklyObjective(ctx, type, date) {
    var best = null;
    ctx.params.forEach(function (p) {
      if (p.categorie !== 'objectif' || p.cle !== 'seances_semaine' || String(p.reference).trim() !== type) return;
      var de = u.parseDate(p.date_effet), df = u.parseDate(p.date_fin);
      if (date && de && de > date) return;
      if (date && df && df < date) return;
      if (!best || (de || '') >= (u.parseDate(best.date_effet) || '')) best = p;
    });
    return best ? u.num(best.valeur) : null;
  }
  function objectiveValue(ctx, cle) {
    var p = ctx.params.filter(function (x) { return x.categorie === 'objectif' && x.cle === cle; })[0];
    return p ? u.num(p.valeur) : null;
  }

  /** Types suivis dans le programme gratuit : ceux qui ont un objectif, ou gratuits et encadrés. */
  function freeTypes(ctx) {
    var out = {};
    ctx.params.forEach(function (p) { if (p.categorie === 'objectif' && p.cle === 'seances_semaine') out[p.reference] = 1; });
    Object.keys(ctx.types).forEach(function (k) { var t = ctx.types[k]; if (t.actif && u.bool(t.attrs.payant) === false && t.attrs.famille !== 'prive') out[k] = 1; });
    return Object.keys(out);
  }

  function minutes(s) { var a = u.toMinutes(s.heure_debut), b = u.toMinutes(s.heure_fin); return a === null || b === null || b <= a ? null : b - a; }

  /** Première participation de chaque membre (toutes activités encadrées confondues). */
  function firstParticipation(ctx) {
    var first = {};
    ctx.db.seances.forEach(function (s) {
      if (s.statut !== 'realisee') return;
      var d = u.parseDate(s.date);
      (ctx.presencesBySeance[s.id] || []).forEach(function (p) {
        if (p.statut !== 'present') return;
        if (!first[p.membre_id] || d < first[p.membre_id].d) first[p.membre_id] = { d: d, t: s.type_activite };
      });
    });
    return first;
  }

  /**
   * Programme gratuit sur une période.
   * Atteinte de l'objectif = séances réalisées ÷ (objectif hebdomadaire × semaines écoulées).
   * Les semaines sont comptées jusqu'à aujourd'hui (une période en cours n'est pas pénalisée pour le futur).
   */
  function freeProgram(ctx, f) {
    var from = f.from, to = f.to;
    if (ctx.histStart && from < ctx.histStart) from = ctx.histStart;
    var end = to > ctx.today ? ctx.today : to;
    var weeks = end >= from ? (u.daysBetween(from, end) + 1) / 7 : 0;
    var first = firstParticipation(ctx);
    var occ = calc.occupancy(ctx, { from: f.from, to: f.to, terrains: f.terrains, lieu: f.lieu });
    var totals = { realisees: 0, realiseesObj: 0, objectif: 0, sansObjectif: [], terrainH: 0, places: 0, nouveaux: {}, membres: {} };
    var rows = freeTypes(ctx).filter(function (t) { return !f.type || f.type === t; }).map(function (t) {
      var ff = Object.assign({}, f, { type: t });
      var ss = calc.seancesSummary(ctx, ff);
      var done = ss.list.filter(function (s) { return s.statut === 'realisee' && u.parseDate(s.date) <= end; });
      var obj = weeklyObjective(ctx, t, end);
      var target = obj === null ? null : obj * weeks;
      var terrainMin = 0, places = 0, placesUnknown = 0;
      done.forEach(function (s) {
        var m = minutes(s); if (m !== null) terrainMin += m * Math.max(1, u.splitList(s.terrains).length);
        var c = calc.seanceCounts(ctx, s); if (c.capacite === null) placesUnknown++; else places += c.capacite;
      });
      var membres = Object.keys(ss.members);
      var nouveaux = membres.filter(function (m) { return first[m] && first[m].t === t && u.inRange(first[m].d, from, to); });
      totals.realisees += done.length; totals.terrainH += terrainMin / 60; totals.places += places;
      if (target === null) totals.sansObjectif.push(calc.typeLabel(ctx, t)); else { totals.objectif += target; totals.realiseesObj += done.length; }
      membres.forEach(function (m) { totals.membres[m] = 1; });
      nouveaux.forEach(function (m) { totals.nouveaux[m] = 1; });
      return {
        type: t, label: calc.typeLabel(ctx, t), objectifSemaine: obj,
        realisees: done.length, planifiees: ss.count.planifiees, annulees: ss.count.annulees,
        objectif: target === null ? u.missing('Objectif hebdomadaire non défini pour ' + calc.typeLabel(ctx, t)) : u.known(u.round(target, 1)),
        atteinte: target === null ? u.missing('Objectif non défini') : u.ratio(done.length, target, 'Atteinte de l\'objectif'),
        places: u.m(places, placesUnknown ? [placesUnknown + ' séance(s) sans capacité'] : []),
        remplissage: ss.fill, presence: ss.presence, noShow: ss.noShow, participations: ss.participations,
        participants: ss.uniqueParticipants, nouveaux: u.m(nouveaux.length, ss.uniqueParticipants.gaps),
        heuresTerrain: u.known(u.round(terrainMin / 60, 2))
      };
    });
    var eng = calc.engagement(ctx, f);
    return {
      weeks: u.round(weeks, 1), rows: rows,
      total: {
        realisees: u.known(totals.realisees),
        objectif: totals.objectif ? u.known(u.round(totals.objectif, 1)) : u.missing('Aucun objectif hebdomadaire défini'),
        atteinte: totals.objectif ? u.ratio(totals.realiseesObj, totals.objectif, 'Atteinte de l\'objectif') : u.missing('Aucun objectif hebdomadaire défini'),
        sansObjectif: totals.sansObjectif,
        heuresTerrain: u.known(u.round(totals.terrainH, 2)),
        partOccupation: u.ratio(u.known(totals.terrainH), occ.available, 'Part des heures disponibles'),
        places: u.known(totals.places),
        participants: u.known(Object.keys(totals.membres).length),
        nouveaux: u.known(Object.keys(totals.nouveaux).length)
      },
      conversion: eng.conversion, tasters: eng.tasters, convertis: eng.convertis, delai: eng.delai
    };
  }

  // ------------------------------------------------------------------ Power BI
  function indicatorDefs(ctx) {
    return ctx.params.filter(function (p) { return p.categorie === 'indicateur_club'; }).map(function (p) {
      var a = calc.parseAttrs(p.attributs);
      return { code: p.cle, label: p.libelle || p.valeur || p.cle, unite: a.unite || '', agregation: a.agregation === 'somme' ? 'somme' : 'dernier' };
    });
  }

  /**
   * Valeur d'un indicateur sur une période : lignes entièrement comprises dans la période.
   * « somme » additionne les périodes (flux) ; « dernier » prend la période la plus récente (stock).
   */
  function indicatorValue(ctx, def, from, to, segment) {
    var rows = ctx.db.indicateurs.filter(function (r) {
      return r.indicateur === def.code && (r.segment || 'total') === (segment || 'total') &&
        u.parseDate(r.date_debut) >= from && u.parseDate(r.date_fin) <= to && u.num(r.valeur) !== null;
    });
    if (!rows.length) return u.missing(def.label + ' : aucune donnée Power BI sur la période');
    if (def.agregation === 'dernier') {
      rows.sort(function (a, b) { return a.date_fin < b.date_fin ? 1 : -1; });
      return u.m(u.num(rows[0].valeur), [], { row: rows[0] });
    }
    var covered = {};
    rows.forEach(function (r) { u.eachDay(u.parseDate(r.date_debut), u.parseDate(r.date_fin)).forEach(function (d) { covered[d] = 1; }); });
    var days = u.daysBetween(from, to) + 1, n = Object.keys(covered).length;
    var v = rows.reduce(function (t, r) { return t + u.num(r.valeur); }, 0);
    return u.m(v, n < days ? ['Période couverte à ' + Math.round(n / days * 100) + ' % par les chiffres Power BI'] : []);
  }

  /** Indicateurs club et ratios dérivés (dont le taux de pénétration). */
  function clubIndicators(ctx, f, segment) {
    var defs = indicatorDefs(ctx), vals = {};
    defs.forEach(function (d) { vals[d.code] = indicatorValue(ctx, d, f.from, f.to, segment); });
    function V(k) { return vals[k] || u.missing('Indicateur « ' + k + ' » non paramétré'); }
    var fp = freeProgram(ctx, f);
    var nouveauxPadel = u.sum([V('nouveaux_membres_padel'), V('nouveaux_joueurs_padel')]);
    if (V('nouveaux_membres_padel').v === null && V('nouveaux_joueurs_padel').v === null) nouveauxPadel = u.missing('Nouveaux joueurs non transmis par Power BI');
    var derived = {
      penetration: u.ratio(V('membres_padel_actifs'), V('membres_club_total'), 'Taux de pénétration'),
      penetrationPowerBI: V('taux_penetration_powerbi').v === null ? V('taux_penetration_powerbi') : u.known(V('taux_penetration_powerbi').v / 100),
      tauxReservants: u.ratio(V('membres_reservants'), V('membres_club_total'), 'Part des membres qui réservent'),
      penetrationNouveaux: u.ratio(V('nouveaux_membres_padel'), V('nouveaux_membres_club'), 'Pénétration des nouveaux membres'),
      reservationsParReservant: u.ratio(V('reservations_terrains'), V('membres_reservants'), 'Réservations par membre'),
      participationEvenements: u.ratio(V('participants_evenements'), V('membres_padel_actifs'), 'Participation aux événements'),
      partRecruteeProgramme: u.ratio(fp.total.nouveaux, nouveauxPadel, 'Part des nouveaux joueurs passés par le programme gratuit')
    };
    var objectif = objectiveValue(ctx, 'taux_penetration');
    return { defs: defs, values: vals, derived: derived, objectifPenetration: objectif === null ? null : objectif / 100 };
  }

  /** Participation aux événements suivis dans l'application (présents ÷ inscrits, présents ÷ capacité). */
  function eventsParticipation(ctx, f) {
    var ev = ctx.db.evenements.filter(function (e) { return e.statut === 'realise' && u.inRange(u.parseDate(e.date), f.from, f.to); });
    var ins = 0, pres = 0, cap = 0, nP = 0, nC = 0;
    ev.forEach(function (e) {
      var i = u.num(e.nb_inscrits), p = u.num(e.nb_presents), c = u.num(e.capacite);
      if (i !== null && p !== null) { ins += i; pres += p; } else nP++;
      if (c !== null && p !== null) cap += c; else nC++;
    });
    return {
      nombre: ev.length, presents: u.m(pres, nP ? [nP + ' événement(s) sans inscrits/présents'] : []),
      presence: ev.length ? u.m(ins ? pres / ins : null, nP ? [nP + ' événement(s) exclus'] : []) : u.missing('Aucun événement réalisé'),
      remplissage: ev.length ? u.m(cap ? pres / cap : null, nC ? [nC + ' événement(s) exclus'] : []) : u.missing('Aucun événement réalisé')
    };
  }

  /** Série mensuelle des indicateurs clés (évolution depuis l'ouverture). */
  function monthlyCommunity(ctx, from, to) {
    var out = [];
    for (var m = u.startOfMonth(from); m <= to; m = u.addMonths(m, 1)) {
      var r = { from: m < from ? from : m, to: u.endOfMonth(m) > to ? to : u.endOfMonth(m) };
      var ci = clubIndicators(ctx, { from: u.startOfMonth(m), to: u.endOfMonth(m) });
      var fp = freeProgram(ctx, r);
      out.push({ label: u.MOIS[+m.slice(5, 7) - 1].slice(0, 4) + '. ' + m.slice(2, 4), month: m.slice(0, 7), penetration: ci.derived.penetration,
        reservants: ci.values.membres_reservants, reservations: ci.values.reservations_terrains, atteinte: fp.total.atteinte,
        participants: fp.total.participants, nouveaux: fp.total.nouveaux });
    }
    return out;
  }

  return { weeklyObjective: weeklyObjective, freeTypes: freeTypes, freeProgram: freeProgram, indicatorDefs: indicatorDefs,
    indicatorValue: indicatorValue, clubIndicators: clubIndicators, eventsParticipation: eventsParticipation, monthlyCommunity: monthlyCommunity };
});
