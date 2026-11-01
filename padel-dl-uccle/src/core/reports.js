/**
 * Modèles de rapports. Chaque rapport est une structure de sections typées :
 *   faits            : chiffres calculés à partir des lignes sources ;
 *   manquants        : données absentes ou incomplètes ;
 *   constats         : lectures automatiques des faits (règles explicites) ;
 *   recommandations  : suggestions automatiques à valider + texte saisi par Anthony ;
 *   saisie           : zones rédigées par Anthony (priorités, décisions demandées).
 * L'interface rend cette structure à l'écran, à l'impression (PDF) et en CSV.
 */
(function (root, factory) {
  var isNode = typeof require === 'function' && typeof module === 'object';
  var u = isNode ? require('./util.js') : root.Padel.util;
  var calc = isNode ? require('./calc.js') : root.Padel.calc;
  var quality = isNode ? require('./quality.js') : root.Padel.quality;
  var mod = factory(u, calc, quality);
  if (typeof module === 'object' && module.exports) module.exports = mod;
  root.Padel = root.Padel || {};
  root.Padel.reports = mod;
})(typeof globalThis !== 'undefined' ? globalThis : this, function (u, calc, quality) {
  'use strict';

  var TEMPLATES = {
    hebdo: { label: 'A. Résumé opérationnel hebdomadaire', period: 'semaine', audience: 'Anthony De Greef' },
    mensuel: { label: 'B. Rapport financier mensuel', period: 'mois', audience: 'Anthony De Greef' },
    laurent: { label: 'C. Bilan pour Laurent Yernaux', period: 'depuis_ouverture', audience: 'Laurent Yernaux, General Manager' },
    trimestre: { label: 'D. Rapport trimestriel comparatif', period: 'trimestre', audience: 'Anthony De Greef, Laurent Yernaux' }
  };

  function kpi(label, m, fmt, prev, opts) {
    opts = opts || {};
    var display = fmt(m.v);
    return { label: label, value: display, raw: m.v, gaps: m.gaps || [], incomplete: (m.gaps || []).length > 0 && m.v !== null,
      delta: prev ? u.delta(m, prev) : null, prevValue: prev ? fmt(prev.v) : null, inverse: !!opts.inverse, note: opts.note || null };
  }
  var E = function (v) { return u.fmtEUR(v); };
  var P = function (v) { return u.fmtPct(v); };
  var N = function (v) { return u.fmtNum(v, 0); };
  var H = function (v) { return u.fmtHours(v); };

  function section(kind, title, extra) { var s = { kind: kind, title: title }; for (var k in extra) s[k] = extra[k]; return s; }

  function missingSection(ctx, from, to, limit) {
    var q = quality.run(ctx).filter(function (a) { return a.gravite !== 'info'; });
    return section('manquants', 'Données manquantes et anomalies', {
      items: q.slice(0, limit || 15).map(function (a) { return (a.gravite === 'bloquant' ? '[Bloquant] ' : '') + a.message; }),
      more: Math.max(0, q.length - (limit || 15))
    });
  }

  /** Constats automatiques (règles explicites, sans interprétation libre). */
  function observations(ctx, f, dash) {
    var out = [], reco = [];
    var byType = u.groupBy(dash.seances.rows, function (r) { return r.seance.type_activite; });
    Object.keys(byType).forEach(function (t) {
      var rows = byType[t]; if (rows.length < 3) return;
      var ins = 0, cap = 0, n = 0;
      rows.forEach(function (r) { if (r.counts.inscrits !== null && r.counts.capacite) { ins += r.counts.inscrits; cap += r.counts.capacite; n++; } });
      if (n < 3 || !cap) return;
      var fill = ins / cap, lbl = calc.typeLabel(ctx, t);
      if (fill < 0.5) { out.push(lbl + ' : remplissage de ' + u.fmtPct(fill) + ' sur ' + n + ' séances.'); reco.push('Revoir le créneau, la communication ou le format de « ' + lbl + ' » (remplissage < 50 %).'); }
      if (fill >= 0.9) { out.push(lbl + ' : remplissage de ' + u.fmtPct(fill) + ', proche de la saturation.'); reco.push('Étudier l\'ouverture d\'un créneau supplémentaire pour « ' + lbl + ' ».'); }
    });
    var o = dash.occupancy;
    if (o.peak.rate.v !== null && o.offpeak.rate.v !== null) {
      out.push('Occupation en heures de pointe : ' + u.fmtPct(o.peak.rate.v) + ' ; en heures creuses : ' + u.fmtPct(o.offpeak.rate.v) + '.');
      if (o.offpeak.rate.v < 0.3) reco.push('Placer des activités encadrées (Tasters, juniors, Afterworks) sur les heures creuses peu occupées.');
    }
    if (o.byLieu.indoor.rate.v !== null && o.byLieu.outdoor.rate.v !== null)
      out.push('Indoor : ' + u.fmtPct(o.byLieu.indoor.rate.v) + ' d\'occupation ; outdoor : ' + u.fmtPct(o.byLieu.outdoor.rate.v) + '.');
    var ns = dash.seances.noShow;
    if (ns.v !== null && ns.v > 0.15) { out.push('Taux de no-show élevé : ' + u.fmtPct(ns.v) + '.'); reco.push('Rappeler la règle d\'annulation (24 h / blâmes) aux participants concernés.'); }
    var nps = dash.nps, seuil = u.num(calc.param(ctx, 'seuil_echantillon_nps')) || 30;
    if (nps.n > 0 && nps.n < seuil) out.push('NPS calculé sur ' + nps.n + ' réponse(s) seulement (seuil de fiabilité : ' + seuil + ').');
    if (nps.n < seuil) reco.push('Diffuser l\'enquête de satisfaction après chaque activité pour atteindre au moins ' + seuil + ' réponses.');
    if (dash.pnl.margeBrute.gaps.length) out.push('Résultat financier incomplet : ' + dash.pnl.margeBrute.gaps.length + ' donnée(s) manquante(s).');
    if (dash.pnl.coutsCoachsProvisoires.v) out.push('Coûts coachs en attente de validation : ' + u.fmtEUR(dash.pnl.coutsCoachsProvisoires.v) + ' (non inclus dans la marge).');
    var eng = dash.engagement;
    if (eng.conversion.v !== null) out.push('Conversion des Tasters vers une autre activité sous ' + eng.delai + ' jours : ' + u.fmtPct(eng.conversion.v) + ' (' + eng.convertis + '/' + eng.tasters + ').');
    return { constats: out, suggestions: u.uniq(reco) };
  }

  function incidents(ctx, from, to) {
    var out = [];
    ctx.db.seances.forEach(function (s) { if (!u.isBlank(s.incident) && u.inRange(u.parseDate(s.date), from, to)) out.push(u.fmtDate(u.parseDate(s.date)) + ' – ' + calc.typeLabel(ctx, s.type_activite) + ' : ' + s.incident); });
    ctx.db.evenements.forEach(function (e) { if (!u.isBlank(e.incidents) && u.inRange(u.parseDate(e.date), from, to)) out.push(u.fmtDate(u.parseDate(e.date)) + ' – ' + e.nom + ' : ' + e.incidents); });
    return out;
  }

  function activityTable(ctx, dash) {
    var byType = u.groupBy(dash.seances.rows, function (r) { return r.seance.type_activite; });
    var pnlBy = {}; dash.pnl.byActivity.forEach(function (a) { pnlBy[a.type] = a; });
    var types = u.uniq(Object.keys(byType).concat(Object.keys(pnlBy).filter(Boolean)));
    return {
      headers: ['Activité', 'Séances', 'Remplissage', 'Présence', 'Participations', 'Revenu reconnu', 'Coût coach', 'Marge'],
      rows: types.map(function (t) {
        var rows = byType[t] || [];
        var s = calc.seancesSummary(ctx, Object.assign({}, dash.filters, { type: t }));
        var p = pnlBy[t];
        return [calc.typeLabel(ctx, t), rows.length, u.fmtPct(s.fill.v), u.fmtPct(s.presence.v), u.fmtNum(s.participations.v, 0),
          p ? u.fmtEUR(p.revenue.v) : u.fmtEUR(0), p ? u.fmtEUR(p.coachCost.v) : u.fmtEUR(0), p ? u.fmtEUR(p.margin.v) : u.fmtEUR(0)];
      })
    };
  }

  function monthsBetween(from, to) {
    var out = [];
    for (var m = u.startOfMonth(from); m <= to; m = u.addMonths(m, 1)) out.push({ from: m < from ? from : m, to: u.endOfMonth(m) > to ? to : u.endOfMonth(m), label: u.MOIS[+m.slice(5, 7) - 1] + ' ' + m.slice(0, 4) });
    return out;
  }

  function dash(ctx, f) { var d = calc.dashboard(ctx, f); d.filters = f; return d; }

  // ------------------------------------------------------------------ A
  function hebdo(ctx, f) {
    var d = dash(ctx, f), prev = dash(ctx, Object.assign({}, f, u.previousPeriod({ kind: 'semaine', from: f.from, to: f.to })));
    var k = d.kpis, pk = prev.kpis;
    var cs = calc.coachSummary(ctx, f);
    var unpaid = ctx.db.inscriptions.filter(function (i) { return i.cycle_id && i.statut === 'inscrit'; }).map(function (i) { return calc.inscriptionState(ctx, i, f.to); })
      .filter(function (st) { return st.solde !== null && st.solde > 0.009 && st.cycle && u.parseDate(st.cycle.date_debut) <= f.to; });
    var obs = observations(ctx, f, d);
    return {
      sections: [
        section('faits', 'Activité de la semaine', { kpis: [
          kpi('Activités organisées', k.activites, N, pk.activites), kpi('Remplissage', k.remplissage, P, pk.remplissage),
          kpi('Taux de présence', k.presence, P, pk.presence), kpi('No-show', k.noShow, P, pk.noShow, { inverse: true }),
          kpi('Occupation des terrains', k.occupation, P, pk.occupation), kpi('Participations', k.participations, N, pk.participations),
          kpi('Séances annulées', u.known(d.seances.count.annulees), N, u.known(prev.seances.count.annulees), { inverse: true })] }),
        section('faits', 'Séances de la semaine', { table: {
          headers: ['Date', 'Horaire', 'Activité', 'Coach', 'Inscrits / capacité', 'Présents', 'Statut'],
          rows: d.seances.list.slice().sort(function (a, b) { return (a.date + a.heure_debut) < (b.date + b.heure_debut) ? -1 : 1; }).map(function (s) {
            var c = calc.seanceCounts(ctx, s);
            return [u.fmtDate(u.parseDate(s.date)), (s.heure_debut || '') + '-' + (s.heure_fin || ''), calc.typeLabel(ctx, s.type_activite), calc.coachName(ctx, s.coach_id),
              (c.inscrits === null ? '?' : c.inscrits) + ' / ' + (c.capacite === null ? '?' : c.capacite), c.presents === null ? 'non encodé' : c.presents, s.statut];
          }) } }),
        section('faits', 'Heures des coachs', { table: { headers: ['Coach', 'Soumises', 'Validées', 'Payées', 'À corriger', 'Coût validé'],
          rows: cs.coaches.map(function (c) { return [c.nom, u.fmtHours(c.heures.soumis), u.fmtHours(c.heures.valide), u.fmtHours(c.heures.paye), u.fmtHours(c.heures.a_corriger), u.fmtEUR(c.coutValide.v)]; }) } }),
        section('faits', 'Paiements manquants', { items: unpaid.length ? unpaid.map(function (st) { return 'Membre ' + st.inscription.membre_id + ' – ' + st.cycle.nom + ' : reste ' + u.fmtEUR(st.solde, 2); }) : ['Aucun solde impayé sur les cycles démarrés.'] }),
        section('faits', 'Incidents', { items: incidents(ctx, f.from, f.to).length ? incidents(ctx, f.from, f.to) : ['Aucun incident encodé.'] }),
        missingSection(ctx, f.from, f.to, 10),
        section('constats', 'Constats', { items: obs.constats.length ? obs.constats : ['Pas de constat automatique sur cette semaine.'] }),
        section('recommandations', 'Suggestions automatiques (à valider)', { items: obs.suggestions }),
        section('saisie', 'Priorités de la semaine suivante', { field: 'priorites', placeholder: 'À rédiger par Anthony.' })
      ]
    };
  }

  // ------------------------------------------------------------------ B
  function mensuel(ctx, f) {
    var d = dash(ctx, f), pf = Object.assign({}, f, u.previousPeriod({ kind: 'mois', from: f.from, to: f.to })), prev = dash(ctx, pf);
    var p = d.pnl, pp = prev.pnl;
    var catRows = Object.keys(calc.REVENUE_LABELS).filter(function (c) { return c !== 'cours_prives' || ctx.includePrivate; }).map(function (c) {
      return [calc.REVENUE_LABELS[c], u.fmtEUR(p.encaissementsByCat[c].v), u.fmtEUR(p.revenusByCat[c].v), u.fmtEUR(pp.revenusByCat[c].v)];
    });
    var budgetRows = [];
    if (p.budget) Object.keys(p.budget.values).forEach(function (key) {
      var map = { revenus_reconnus: p.revenusReconnus, encaissements: p.encaissements, couts_coachs: p.coutsCoachs, couts_directs: p.coutsDirects, marge_brute: p.margeBrute };
      var real = map[key];
      budgetRows.push([key.replace(/_/g, ' '), u.fmtEUR(p.budget.values[key]), real ? u.fmtEUR(real.v) : '–', real && real.v !== null ? u.fmtEUR(real.v - p.budget.values[key]) : u.INDISPO]);
    });
    var obs = observations(ctx, f, d);
    return {
      sections: [
        section('faits', 'Synthèse financière', { kpis: [
          kpi('Encaissements', p.encaissements, E, pp.encaissements), kpi('Revenus reconnus', p.revenusReconnus, E, pp.revenusReconnus),
          kpi('Revenus restant à délivrer (fin de mois)', p.aDelivrer, E, pp.aDelivrer), kpi('Coûts coachs validés', p.coutsCoachs, E, pp.coutsCoachs, { inverse: true }),
          kpi('Coûts directs', p.coutsDirects, E, pp.coutsDirects, { inverse: true }), kpi('Marge brute', p.margeBrute, E, pp.margeBrute),
          kpi('Taux de marge', p.tauxMarge, P, pp.tauxMarge)] }),
        section('faits', 'Revenus par catégorie', { table: { headers: ['Catégorie', 'Encaissé', 'Reconnu', 'Reconnu mois précédent'], rows: catRows } }),
        section('faits', 'Détail par activité', { table: activityTable(ctx, d) }),
        section('faits', 'Coûts directs par catégorie', { table: { headers: ['Catégorie', 'Montant'], rows: Object.keys(p.coutsDirectsByCat).map(function (k) { return [k, u.fmtEUR(p.coutsDirectsByCat[k].v)]; }) } }),
        p.budget ? section('faits', 'Budget / réel', { table: { headers: ['Poste', 'Budget', 'Réel', 'Écart'], rows: budgetRows }, note: p.budget.aligned ? null : 'Période non alignée sur des mois entiers : budget mensuel complet comparé.' })
          : section('manquants', 'Budget', { items: ['Aucun budget renseigné pour cette période (Paramètres → budget).'] }),
        section('faits', 'Exclusions appliquées', { items: p.exclusions.concat(['Coûts coachs en attente de validation (non inclus) : ' + u.fmtEUR(p.coutsCoachsProvisoires.v)]) }),
        missingSection(ctx, f.from, f.to, 15),
        section('constats', 'Constats', { items: obs.constats }),
        section('recommandations', 'Suggestions automatiques (à valider)', { items: obs.suggestions }),
        section('saisie', 'Commentaire d\'Anthony', { field: 'commentaire', placeholder: 'Analyse et actions décidées.' })
      ]
    };
  }

  // ------------------------------------------------------------------ C
  function laurent(ctx, f) {
    var d = dash(ctx, f), k = d.kpis, p = d.pnl, o = d.occupancy, e = d.engagement, n = d.nps;
    var months = monthsBetween(f.from, f.to);
    var evol = months.map(function (m) {
      var mf = Object.assign({}, f, { from: m.from, to: m.to });
      var oc = calc.occupancy(ctx, mf), ss = calc.seancesSummary(ctx, mf), pl = calc.pnl(ctx, mf);
      return [m.label, u.fmtPct(oc.rate.v), u.fmtNum(ss.count.realisees, 0), u.fmtNum(ss.participations.v, 0), u.fmtNum(ss.uniqueParticipants.v, 0), u.fmtEUR(pl.revenusReconnus.v), u.fmtEUR(pl.margeBrute.v)];
    });
    var obs = observations(ctx, f, d);
    var q = quality.run(ctx).filter(function (a) { return a.gravite === 'bloquant'; });
    var cancelled = d.seances.list.filter(function (s) { return calc.CANCELLED_SEANCE[s.statut]; });
    var difficultes = incidents(ctx, f.from, f.to).slice(0, 8);
    if (cancelled.length) difficultes.push(cancelled.length + ' séance(s) annulée(s) sur la période.');
    if (q.length) difficultes.push(q.length + ' anomalie(s) bloquante(s) dans les données (voir « Données manquantes »).');
    return {
      sections: [
        section('faits', 'Synthèse exécutive', { kpis: [
          kpi('Occupation des 6 terrains', k.occupation, P), kpi('Participants uniques', k.participantsUniques, N), kpi('Activités organisées', k.activites, N),
          kpi('Revenus reconnus', p.revenusReconnus, E), kpi('Marge brute', p.margeBrute, E),
          kpi('NPS (n = ' + n.n + ')', n.score, function (v) { return v === null ? u.INDISPO : u.fmtNum(v, 0); }), kpi('Satisfaction /10', k.satisfaction, function (v) { return u.fmtNum(v, 1); })] }),
        section('faits', 'Évolution depuis l\'ouverture de l\'indoor', { table: { headers: ['Mois', 'Occupation', 'Activités', 'Participations', 'Participants uniques', 'Revenus reconnus', 'Marge brute'], rows: evol } }),
        section('faits', 'Utilisation des six terrains', { table: { headers: ['Terrain', 'Type', 'Heures disponibles', 'Heures utilisées', 'Occupation', 'dont activités encadrées', 'dont réservations libres'],
          rows: o.byTerrain.map(function (t) { return [t.label, t.lieu, u.fmtHours(t.available.v), u.fmtHours(t.used.v), u.fmtPct(t.rate.v), u.fmtPct(t.rateOrganised.v), u.fmtPct(t.rateLibre.v)]; }) },
          kpis: [kpi('Indoor', o.byLieu.indoor.rate, P), kpi('Outdoor', o.byLieu.outdoor.rate, P), kpi('Heures de pointe', o.peak.rate, P), kpi('Heures creuses', o.offpeak.rate, P)] }),
        section('faits', 'Engagement des membres', { kpis: [kpi('Participants uniques', e.participants, N), kpi('Nouveaux participants', e.nouveaux, N),
          kpi('Taux de retour', e.retour, P), kpi('Récurrence (≥ 2 participations)', e.recurrence, P), kpi('Conversion Taster (' + (e.delai || '?') + ' j)', e.conversion, P)] }),
        section('faits', 'Résultats des activités', { table: activityTable(ctx, d) }),
        section('faits', 'Satisfaction et NPS', { kpis: [kpi('NPS', n.score, function (v) { return v === null ? u.INDISPO : u.fmtNum(v, 0); }, null, { note: 'n = ' + n.n + ' (promoteurs ' + n.promoteurs + ', passifs ' + n.passifs + ', détracteurs ' + n.detracteurs + ')' }),
          kpi('Note globale /10', u.m(n.noteGlobale.v, []), function (v) { return u.fmtNum(v, 1); }, null, { note: 'n = ' + n.noteGlobale.n }),
          kpi('Qualité des terrains /10', u.m(n.noteTerrains.v, []), function (v) { return u.fmtNum(v, 1); }, null, { note: 'n = ' + n.noteTerrains.n }),
          kpi('Organisation /10', u.m(n.noteOrganisation.v, []), function (v) { return u.fmtNum(v, 1); }, null, { note: 'n = ' + n.noteOrganisation.n })] }),
        section('faits', 'Performance financière', { kpis: [kpi('Encaissements', p.encaissements, E), kpi('Revenus reconnus', p.revenusReconnus, E), kpi('Restant à délivrer', p.aDelivrer, E),
          kpi('Coûts coachs', p.coutsCoachs, E), kpi('Coûts directs', p.coutsDirects, E), kpi('Marge brute', p.margeBrute, E)], items: p.exclusions }),
        section('constats', 'Difficultés opérationnelles', { items: difficultes.length ? difficultes : ['Aucune difficulté encodée.'] }),
        section('constats', 'Constats', { items: obs.constats }),
        missingSection(ctx, f.from, f.to, 12),
        section('recommandations', 'Recommandations', { items: obs.suggestions, field: 'recommandations', placeholder: 'Recommandations validées par Anthony.' }),
        section('saisie', 'Décisions demandées à Laurent', { field: 'decisions', placeholder: 'Ex. budget, créneaux, communication… À rédiger par Anthony.' })
      ]
    };
  }

  // ------------------------------------------------------------------ D
  function trimestre(ctx, f) {
    var months = monthsBetween(f.from, f.to);
    var ds = months.map(function (m) { return dash(ctx, Object.assign({}, f, { from: m.from, to: m.to })); });
    function row(label, get, fmt) { return [label].concat(ds.map(function (d) { var x = get(d); return fmt(x.v); })); }
    var cmp = [
      row('Occupation', function (d) { return d.kpis.occupation; }, P),
      row('Activités organisées', function (d) { return d.kpis.activites; }, N),
      row('Remplissage', function (d) { return d.kpis.remplissage; }, P),
      row('Taux de présence', function (d) { return d.kpis.presence; }, P),
      row('Participations', function (d) { return d.kpis.participations; }, N),
      row('Participants uniques', function (d) { return d.kpis.participantsUniques; }, N),
      row('Récurrence', function (d) { return d.engagement.recurrence; }, P),
      row('Taux de retour', function (d) { return d.engagement.retour; }, P),
      row('Encaissements', function (d) { return d.kpis.encaissements; }, E),
      row('Revenus reconnus', function (d) { return d.kpis.revenusReconnus; }, E),
      row('Coûts coachs', function (d) { return d.kpis.coutsCoachs; }, E),
      row('Coûts directs', function (d) { return d.kpis.coutsDirects; }, E),
      row('Marge brute', function (d) { return d.kpis.margeBrute; }, E),
      ['NPS (n)'].concat(ds.map(function (d) { return d.nps.score.v === null ? u.INDISPO : u.fmtNum(d.nps.score.v, 0) + ' (n = ' + d.nps.n + ')'; }))
    ];
    // Tendances par activité : participations premier mois vs dernier mois.
    var first = ds[0], last = ds[ds.length - 1];
    function partBy(d) { var o = {}; d.seances.rows.forEach(function (r) { var t = r.seance.type_activite; o[t] = (o[t] || 0) + (r.counts.presents || 0); }); return o; }
    var a = partBy(first), b = partBy(last);
    var trends = u.uniq(Object.keys(a).concat(Object.keys(b))).map(function (t) {
      var x = a[t] || 0, y = b[t] || 0;
      return { t: t, x: x, y: y, d: x ? (y - x) / x : null };
    });
    var up = trends.filter(function (t) { return t.y > t.x; }).map(function (t) { return calc.typeLabel(ctx, t.t) + ' : ' + t.x + ' → ' + t.y + ' participations' + (t.d !== null ? ' (' + (t.d > 0 ? '+' : '') + u.fmtPct(t.d, 0) + ')' : ''); });
    var down = trends.filter(function (t) { return t.y < t.x; }).map(function (t) { return calc.typeLabel(ctx, t.t) + ' : ' + t.x + ' → ' + t.y + ' participations (' + u.fmtPct(t.d, 0) + ')'; });
    var whole = dash(ctx, f);
    var obs = observations(ctx, f, whole);
    return {
      sections: [
        section('faits', 'Comparaison des trois mois', { table: { headers: ['Indicateur'].concat(months.map(function (m) { return m.label; })), rows: cmp } }),
        section('constats', 'Activités en croissance', { items: up.length ? up : ['Aucune activité en croissance entre le premier et le dernier mois.'] }),
        section('constats', 'Activités en baisse', { items: down.length ? down : ['Aucune activité en baisse entre le premier et le dernier mois.'] }),
        section('faits', 'Rentabilité par activité (trimestre)', { table: { headers: ['Activité', 'Revenu reconnu', 'Coût coach', 'Coûts directs', 'Marge', 'Marge / participation'],
          rows: whole.pnl.byActivity.map(function (x) { return [x.label, u.fmtEUR(x.revenue.v), u.fmtEUR(x.coachCost.v), u.fmtEUR(x.direct.v), u.fmtEUR(x.margin.v), u.fmtEUR(x.marginPerParticipation.v, 2)]; }) } }),
        section('faits', 'Rentabilité par académie (cycle)', { table: { headers: ['Cycle', 'Offre', 'Participants', 'Revenu reconnu', 'Coût coach', 'Marge', 'Marge / participant'],
          rows: whole.pnl.byCycle.map(function (x) { return [x.label, x.offre, x.participants, u.fmtEUR(x.revenue.v), u.fmtEUR(x.coachCost.v), u.fmtEUR(x.margin.v), u.fmtEUR(x.marginPerParticipant.v, 2)]; }) } }),
        missingSection(ctx, f.from, f.to, 12),
        section('constats', 'Constats', { items: obs.constats }),
        section('recommandations', 'Recommandations', { items: obs.suggestions, field: 'recommandations', placeholder: 'Recommandations validées.' })
      ]
    };
  }

  var BUILDERS = { hebdo: hebdo, mensuel: mensuel, laurent: laurent, trimestre: trimestre };

  function build(ctx, templateId, f) {
    var r = BUILDERS[templateId](ctx, f);
    r.id = templateId; r.title = TEMPLATES[templateId].label; r.audience = TEMPLATES[templateId].audience;
    r.period = f; r.generatedAt = ctx.today;
    return r;
  }

  /** Aplatit un rapport en lignes CSV. */
  function toRows(rep) {
    var rows = [['Rapport', rep.title], ['Période', u.fmtDate(rep.period.from) + ' – ' + u.fmtDate(rep.period.to)], ['Généré le', u.fmtDate(rep.generatedAt)], []];
    rep.sections.forEach(function (s) {
      rows.push(['[' + s.kind.toUpperCase() + '] ' + s.title]);
      (s.kpis || []).forEach(function (k) { rows.push([k.label, k.value, k.incomplete ? 'incomplet' : '', k.prevValue ? 'période précédente : ' + k.prevValue : '']); });
      if (s.table) { rows.push(s.table.headers); s.table.rows.forEach(function (r) { rows.push(r); }); }
      (s.items || []).forEach(function (i) { rows.push(['', i]); });
      if (s.text) rows.push(['', s.text]);
      rows.push([]);
    });
    return rows;
  }

  return { TEMPLATES: TEMPLATES, build: build, toRows: toRows, monthsBetween: monthsBetween, observations: observations };
});
