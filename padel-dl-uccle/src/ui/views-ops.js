/**
 * Écrans opérationnels : tableau de bord, terrains, séances & présences, académies,
 * heures des coachs, paiements, événements, satisfaction, membres, dépenses.
 */
(function (root) {
  'use strict';
  var Padel = root.Padel;
  var u = Padel.util, calc = Padel.calc, UI = Padel.ui, schema = Padel.schema;
  var e = u.escapeHtml, V = UI.views, A = UI.actions;
  function app() { return UI.app; }
  function ctx() { return UI.app.ctx; }
  function d(x) { return u.fmtDate(u.parseDate(x)); }
  function typeL(t) { return calc.typeLabel(ctx(), t); }
  function coachL(id) { return id ? calc.coachName(ctx(), id) : ''; }
  function terrL(list) { return u.splitList(list).map(function (t) { var x = ctx().terrains[t]; return x ? x.nom : t; }).join(', '); }
  function byId(sheet, id) { return (app().db[sheet] || []).filter(function (r) { return String(r.id) === String(id); })[0]; }
  function liveRows(sheet) { return (app().db[sheet] || []).filter(function (r) { return r.archive !== true; }); }

  // ====================================================================== TABLEAU DE BORD
  V.dashboard = function () {
    var a = app(), c = ctx(), f = a.filterObj();
    var cur = calc.dashboard(c, f);
    var pp = u.previousPeriod(a.period()), prev = calc.dashboard(c, a.filterObj({ from: pp.from, to: pp.to }));
    var k = cur.kpis, pk = prev.kpis;
    var html = UI.periodBar();
    if (!calc.param(c, 'date_ouverture_indoor')) html += UI.notice('<strong>Date d\'ouverture indoor non renseignée.</strong> L\'historique n\'a pas de point de départ : renseignez-la dans Paramètres → Général.', 'warn');
    if (cur.occupancy.note) html += UI.notice(e(cur.occupancy.note), 'info');
    var ciCur = Padel.community.clubIndicators(c, f), ciPrev = Padel.community.clubIndicators(c, a.filterObj({ from: pp.from, to: pp.to }));
    var fpCur = Padel.community.freeProgram(c, f);
    html += '<div class="kpi-group"><h3>Communauté <a class="sm" href="#/communaute">détail →</a></h3>' + UI.communityKpis(ciCur, ciPrev, true) +
      '<div class="kpi-grid" style="margin-top:10px">' + UI.kpi({ label: 'Programme gratuit : objectif atteint', m: fpCur.total.atteinte, fmt: 'pct', sub: e(fpCur.total.realisees.v + ' séances réalisées') }) +
      UI.kpi({ label: 'Nouveaux joueurs via le programme gratuit', m: fpCur.total.nouveaux }) + '</div></div>';
    html += '<div class="kpi-group"><h3>Terrains</h3><div class="kpi-grid">' +
      UI.kpi({ label: 'Heures disponibles', m: k.heuresDisponibles, fmt: 'h', prev: pk.heuresDisponibles }) +
      UI.kpi({ label: 'Heures réservées', m: k.heuresReservees, fmt: 'h', prev: pk.heuresReservees }) +
      UI.kpi({ label: 'Occupation globale', m: k.occupation, fmt: 'pct', prev: pk.occupation, help: 'Heures utilisées ÷ heures disponibles' }) +
      UI.kpi({ label: 'Occupation indoor', m: k.occupationIndoor, fmt: 'pct', prev: pk.occupationIndoor }) +
      UI.kpi({ label: 'Occupation outdoor', m: k.occupationOutdoor, fmt: 'pct', prev: pk.occupationOutdoor }) + '</div></div>';
    html += '<div class="kpi-group"><h3>Activités et membres</h3><div class="kpi-grid">' +
      UI.kpi({ label: 'Activités organisées', m: k.activites, prev: pk.activites, sub: e(cur.seances.count.annulees + ' séance(s) annulée(s)') }) +
      UI.kpi({ label: 'Participants uniques', m: k.participantsUniques, prev: pk.participantsUniques }) +
      UI.kpi({ label: 'Participations totales', m: k.participations, prev: pk.participations }) +
      UI.kpi({ label: 'Taux de remplissage', m: k.remplissage, fmt: 'pct', prev: pk.remplissage, help: 'Inscrits ÷ capacité' }) +
      UI.kpi({ label: 'Taux de présence', m: k.presence, fmt: 'pct', prev: pk.presence, help: 'Présents ÷ inscrits' }) +
      UI.kpi({ label: 'Taux d\'annulation', m: k.annulation, fmt: 'pct', prev: pk.annulation, inverse: true }) +
      UI.kpi({ label: 'Taux de no-show', m: k.noShow, fmt: 'pct', prev: pk.noShow, inverse: true }) + '</div></div>';
    if (a.can('pnl.view')) html += '<div class="kpi-group"><h3>Finances</h3><div class="kpi-grid">' +
      UI.kpi({ label: 'Revenus encaissés', m: k.encaissements, fmt: 'eur', prev: pk.encaissements }) +
      UI.kpi({ label: 'Revenus reconnus', m: k.revenusReconnus, fmt: 'eur', prev: pk.revenusReconnus, help: 'Valeur des séances réellement données' }) +
      UI.kpi({ label: 'Coûts des coachs', m: k.coutsCoachs, fmt: 'eur', prev: pk.coutsCoachs, inverse: true, sub: 'validés ; ' + e(u.fmtEUR(cur.pnl.coutsCoachsProvisoires.v)) + ' en attente' }) +
      UI.kpi({ label: 'Coûts des événements', m: k.coutsDirects, fmt: 'eur', prev: pk.coutsDirects, inverse: true, help: 'Dépenses directes : matériel, prix, catering…' }) +
      UI.kpi({ label: 'Marge brute', m: k.margeBrute, fmt: 'eur', prev: pk.margeBrute }) + '</div></div>';
    if (a.can('satisfaction.view')) html += '<div class="kpi-group"><h3>Satisfaction</h3><div class="kpi-grid">' +
      UI.kpi({ label: 'Satisfaction moyenne /10', m: k.satisfaction, fmt: 'num1', prev: pk.satisfaction, sub: 'n = ' + cur.nps.noteGlobale.n }) +
      UI.kpi({ label: 'NPS', m: k.nps, fmt: 'nps', prev: pk.nps, sub: '<strong>n = ' + cur.nps.n + '</strong> réponse(s)' + (cur.nps.n && cur.nps.n < (u.num(calc.param(c, 'seuil_echantillon_nps')) || 30) ? ' · échantillon faible' : '') }) + '</div></div>';

    // Évolution hebdomadaire depuis l'ouverture
    var series = calc.weeklySeries(c, a.histStart(), u.parseDate(a.today), a.filterObj({ from: null, to: null }));
    var charts = '<div class="grid-2">' + UI.card('Occupation hebdomadaire depuis l\'ouverture', UI.lineChart(series.map(function (s) { return { label: s.label, v: s.occupation, tip: 'Semaine du ' + u.fmtDate(s.from) }; }), { fmt: function (v) { return u.fmtPct(v, 0); }, title: 'Occupation par semaine' })) +
      UI.card('Participations par semaine', UI.lineChart(series.map(function (s) { return { label: s.label, v: s.participations, tip: 'Semaine du ' + u.fmtDate(s.from) }; }), { color: UI.COLORS.C2, title: 'Participations par semaine' })) + '</div>';
    if (a.can('pnl.view')) charts += '<div class="grid-2">' + UI.card('Revenus reconnus par semaine', UI.lineChart(series.map(function (s) { return { label: s.label, v: s.revenus, incomplete: s.incomplet, tip: 'Semaine du ' + u.fmtDate(s.from) }; }), { fmt: function (v) { return u.fmtEUR(v); }, title: 'Revenus reconnus par semaine' }), { sub: 'Point en pointillé : semaine dont une donnée manque.' }) +
      UI.card('Marge brute par semaine', UI.lineChart(series.map(function (s) { return { label: s.label, v: s.marge, incomplete: s.incomplet, tip: 'Semaine du ' + u.fmtDate(s.from) }; }), { fmt: function (v) { return u.fmtEUR(v); }, title: 'Marge brute par semaine', color: UI.COLORS.C2 }), { sub: 'Revenus reconnus − coûts coachs validés − coûts directs.' }) + '</div>';
    html += charts;
    var o = cur.occupancy;
    html += '<div class="grid-2">' + UI.card('Occupation par terrain', UI.bars(o.byTerrain.map(function (t) { return { label: t.label, v: t.rate.v, display: UI.measure(t.rate, 'pct'), color: t.lieu === 'indoor' ? UI.COLORS.C1 : UI.COLORS.C2, tip: u.fmtHours(t.used.v) + ' utilisées / ' + u.fmtHours(t.available.v) }; }), { max: 1 }) +
      '<p class="legend"><i style="background:' + UI.COLORS.C1 + '"></i>Indoor <i style="background:' + UI.COLORS.C2 + '"></i>Outdoor</p>') +
      UI.card('Pointe / creuse, encadré / libre', UI.bars([
        { label: 'Heures de pointe', v: o.peak.rate.v, display: UI.measure(o.peak.rate, 'pct') },
        { label: 'Heures creuses', v: o.offpeak.rate.v, display: UI.measure(o.offpeak.rate, 'pct') },
        { label: 'Activités encadrées', v: o.rateOrganised.v, display: UI.measure(o.rateOrganised, 'pct'), color: UI.COLORS.C2 },
        { label: 'Réservations libres', v: o.rateLibre.v, display: UI.measure(o.rateLibre, 'pct'), color: UI.COLORS.C2 }], { max: 1 })) + '</div>';
    html += UI.card('Occupation par jour et par tranche horaire', UI.heatmap(o.heatmap), { sub: 'Pourcentage d\'heures utilisées sur les heures disponibles, tous terrains filtrés confondus.' });
    var rows = cur.pnl.byActivity;
    var byType = u.groupBy(cur.seances.rows, function (r) { return r.seance.type_activite; });
    var types = u.uniq(Object.keys(byType).concat(rows.map(function (r) { return r.type; }).filter(Boolean)));
    html += UI.card('Résultats par activité', UI.table({ id: 'dash-act', search: false, csv: 'activites', columns: [
      { key: 'label', label: 'Activité' },
      { key: 'n', label: 'Séances', num: true },
      { key: 'fill', label: 'Remplissage', num: true, render: function (r) { return UI.measure(r.fill, 'pct'); }, sort: function (r) { return r.fill.v; } },
      { key: 'pres', label: 'Présence', num: true, render: function (r) { return UI.measure(r.pres, 'pct'); }, sort: function (r) { return r.pres.v; } },
      { key: 'part', label: 'Participations', num: true, render: function (r) { return UI.measure(r.part); }, sort: function (r) { return r.part.v; } }
    ].concat(a.can('pnl.view') ? [{ key: 'marge', label: 'Marge', num: true, render: function (r) { return r.marge ? UI.measure(r.marge, 'eur') : '–'; }, sort: function (r) { return r.marge ? r.marge.v : null; } }] : []),
    rows: types.map(function (t) {
      var s = calc.seancesSummary(c, Object.assign({}, f, { type: t })), p = rows.filter(function (r) { return r.type === t; })[0];
      return { id: t, label: typeL(t), n: (byType[t] || []).length, fill: s.fill, pres: s.presence, part: s.participations, marge: p ? p.margin : null };
    }) }));
    return html;
  };

  // ====================================================================== TERRAINS
  V.terrains = function () {
    var a = app(), c = ctx(), f = a.filterObj();
    var o = calc.occupancy(c, f);
    var html = UI.periodBar();
    if (o.note) html += UI.notice(e(o.note), 'info');
    html += '<div class="kpi-grid">' + UI.kpi({ label: 'Heures disponibles', m: o.available, fmt: 'h' }) + UI.kpi({ label: 'Heures réservées', m: o.reserved, fmt: 'h' }) +
      UI.kpi({ label: 'Heures utilisées', m: o.used, fmt: 'h' }) + UI.kpi({ label: 'Occupation totale', m: o.rate, fmt: 'pct' }) +
      UI.kpi({ label: 'Heures de pointe', m: o.peak.rate, fmt: 'pct' }) + UI.kpi({ label: 'Heures creuses', m: o.offpeak.rate, fmt: 'pct' }) +
      UI.kpi({ label: 'Activités encadrées', m: o.rateOrganised, fmt: 'pct', sub: u.fmtHours(o.organised.v) }) + UI.kpi({ label: 'Réservations libres', m: o.rateLibre, fmt: 'pct', sub: u.fmtHours(o.libre.v) }) +
      UI.kpi({ label: 'Heures bloquées', m: o.blocked, fmt: 'h' }) + '</div>';
    html += UI.card('Par terrain', UI.table({ id: 'terr', search: false, csv: 'occupation-terrains', columns: [
      { key: 'label', label: 'Terrain' }, { key: 'lieu', label: 'Type', render: function (r) { return r.lieu === 'indoor' ? 'Indoor' : 'Outdoor'; } },
      { key: 'av', label: 'Disponibles', num: true, render: function (r) { return UI.measure(r.available, 'h'); }, sort: function (r) { return r.available.v; } },
      { key: 're', label: 'Réservées', num: true, render: function (r) { return UI.measure(r.reserved, 'h'); }, sort: function (r) { return r.reserved.v; } },
      { key: 'us', label: 'Utilisées', num: true, render: function (r) { return UI.measure(r.used, 'h'); }, sort: function (r) { return r.used.v; } },
      { key: 'rate', label: 'Occupation', num: true, render: function (r) { return UI.measure(r.rate, 'pct'); }, sort: function (r) { return r.rate.v; } },
      { key: 'org', label: 'Encadré', num: true, render: function (r) { return UI.measure(r.rateOrganised, 'pct'); }, sort: function (r) { return r.rateOrganised.v; } },
      { key: 'lib', label: 'Libre', num: true, render: function (r) { return UI.measure(r.rateLibre, 'pct'); }, sort: function (r) { return r.rateLibre.v; } }
    ], rows: o.byTerrain, rowId: function (r) { return r.id; }, onRow: a.can('terrains.edit') ? 'edit-terrain' : null }),
    { sub: a.can('terrains.edit') ? 'Cliquez sur un terrain pour modifier ses horaires d\'ouverture (dénominateur du taux).' : '' });
    html += UI.card('Occupation par jour et par heure', UI.heatmap(o.heatmap));
    var occ = liveRows('occupation').filter(function (r) { return u.inRange(u.parseDate(r.date), f.from, f.to) && (!f.terrains.length || f.terrains.indexOf(r.terrain_id) >= 0); });
    html += UI.card('Réservations libres, blocages et maintenance', UI.table({ id: 'occ', csv: 'occupation', defaultSort: 'date', columns: [
      { key: 'date', label: 'Date', render: function (r) { return d(r.date); }, sort: function (r) { return r.date + r.heure_debut; } },
      { key: 'h', label: 'Horaire', render: function (r) { return e(r.heure_debut + '–' + r.heure_fin); } },
      { key: 'terrain_id', label: 'Terrain', render: function (r) { return e(terrL(r.terrain_id)); }, text: function (r) { return terrL(r.terrain_id); } },
      { key: 'type', label: 'Type', render: function (r) { return e(schema.ENUMS.type_occupation[r.type] || r.type); } },
      { key: 'statut', label: 'Statut', render: function (r) { return UI.status('statut_occupation', r.statut); } },
      { key: 'reference_externe', label: 'Référence' }
    ], rows: occ, onRow: 'edit-occupation', pageSize: 30 }), { actions: a.can('terrains.edit') ? UI.btn('Ajouter', 'add-occupation', { cls: 'primary sm', icon: 'plus' }) : '',
      sub: 'Les réservations libres viennent idéalement de l\'import ABS / application (menu Imports). Les activités encadrées viennent des Séances.' });
    return html;
  };
  A['edit-terrain'] = function (el) { UI.editForm('terrains', byId('terrains', el.getAttribute('data-id')), { intro: 'Format des horaires : <code>07:00-23:00</code>, plusieurs plages séparées par « ; », ou <code>fermé</code>. Laisser vide = inconnu (aucun taux ne sera calculé).' }); };
  A['add-occupation'] = function () { UI.editForm('occupation', null, { defaults: { date: app().today, type: 'reservation_libre', statut: 'reserve' } }); };
  A['edit-occupation'] = function (el) { UI.editForm('occupation', byId('occupation', el.getAttribute('data-id'))); };

  // ====================================================================== SÉANCES
  var seanceTab = 'liste';
  V.seances = function () {
    var a = app(), c = ctx(), f = a.filterObj();
    var coachOnly = !a.can('seances.edit');
    var mine = coachOnly ? a.user.id : null;
    var list = liveRows('seances').filter(function (s) { return calc.seanceMatches(c, s, f) && (!mine || s.coach_id === mine || s.coach_remplacant_id === mine); });
    var sum = calc.seancesSummary(c, f);
    var canAdd = a.can('seances.edit') || a.can('seances.edit_own');
    var html = UI.periodBar();
    html += '<div class="action-row">' + (canAdd ? UI.btn('Séance rapide', 'seance-quick', { cls: 'primary', icon: 'plus' }) : '') +
      (a.can('seances.edit') ? UI.btn('Générer les séances d\'un cycle', 'cycle-generate', { cls: 'ghost', icon: 'calendar' }) : '') + '</div>';
    if (!coachOnly) html += '<div class="kpi-grid">' + UI.kpi({ label: 'Réalisées', m: u.known(sum.count.realisees) }) + UI.kpi({ label: 'Planifiées', m: u.known(sum.count.planifiees) }) +
      UI.kpi({ label: 'Annulées', m: u.known(sum.count.annulees) }) + UI.kpi({ label: 'Remplissage', m: sum.fill, fmt: 'pct' }) + UI.kpi({ label: 'Présence', m: sum.presence, fmt: 'pct' }) +
      UI.kpi({ label: 'No-show', m: sum.noShow, fmt: 'pct' }) + '</div>';
    html += UI.card(coachOnly ? 'Mes séances' : 'Séances', UI.table({ id: 'seances', csv: 'seances', defaultSort: 'date', stack: true, columns: [
      { key: 'date', label: 'Date', render: function (r) { return '<strong>' + d(r.date) + '</strong> <span class="muted">' + e(u.JOURS_COURTS[u.weekday(u.parseDate(r.date)) - 1] || '') + '</span>'; }, sort: function (r) { return r.date + r.heure_debut; }, csv: function (r) { return r.date; } },
      { key: 'h', label: 'Horaire', render: function (r) { return e((r.heure_debut || '') + '–' + (r.heure_fin || '')); }, csv: function (r) { return r.heure_debut + '-' + r.heure_fin; } },
      { key: 'type_activite', label: 'Activité', render: function (r) { return e(typeL(r.type_activite)) + (r.incident ? ' ' + UI.badge('incident', 'warn', r.incident) : ''); }, text: function (r) { return typeL(r.type_activite); } },
      { key: 'terrains', label: 'Terrain(s)', render: function (r) { return e(terrL(r.terrains)); }, text: function (r) { return terrL(r.terrains); } },
      { key: 'coach_id', label: 'Coach', render: function (r) { return e(coachL(r.coach_id)) + (r.coach_remplacant_id ? ' <span class="muted">(remplacé par ' + e(coachL(r.coach_remplacant_id)) + ')</span>' : ''); }, text: function (r) { return coachL(r.coach_id); } },
      { key: 'remp', label: 'Inscrits / cap.', num: true, render: function (r) { var k = calc.seanceCounts(c, r); return (k.inscrits === null ? '?' : k.inscrits) + ' / ' + (k.capacite === null ? '<span class="na" title="Capacité absente">?</span>' : k.capacite); }, sort: function (r) { return calc.seanceCounts(c, r).inscrits; } },
      { key: 'pres', label: 'Présents', num: true, render: function (r) { var k = calc.seanceCounts(c, r); return k.presents === null ? (r.statut === 'realisee' ? UI.badge('à encoder', 'warn') : '–') : String(k.presents) + (k.mode === 'detail' ? '' : ' <span class="muted" title="Compteur déclaré, sans liste nominative">≈</span>'); }, sort: function (r) { return calc.seanceCounts(c, r).presents; } },
      { key: 'statut', label: 'Statut', render: function (r) { return UI.status('statut_seance', r.statut); } },
      { key: 'act', label: '', render: function (r) { return a.can('presences.edit') && !calc.CANCELLED_SEANCE[r.statut] ? UI.btn('Présences', 'presence-open', { cls: 'ghost sm', data: { id: r.id } }) : ''; }, csv: function () { return ''; } }
    ], rows: list, onRow: 'seance-edit', pageSize: 40, empty: 'Aucune séance sur la période.' }));
    return html;
  };

  var SEANCE_FIELDS = ['date', 'heure_debut', 'heure_fin', 'type_activite', 'terrains', 'coach_id', 'statut', 'capacite', 'nb_inscrits', 'nb_presents', 'nb_absents', 'nb_no_shows', 'nb_annulations', 'payant', 'niveau', 'cycle_id', 'evenement_id', 'coach_remplacant_id', 'commentaire', 'incident'];
  function seanceForm(rec) {
    var a = app();
    var isNew = !rec || !rec.id;
    var defaults = { date: a.today, statut: 'realisee' };
    if (!a.can('seances.edit')) defaults.coach_id = a.user.id;
    UI.editForm('seances', rec, {
      title: isNew ? 'Séance rapide' : 'Séance du ' + d(rec.date), fields: SEANCE_FIELDS, defaults: defaults, selects: ['statut'],
      readonly: a.can('seances.edit') ? [] : ['coach_id'],
      intro: isNew ? 'Choisissez l\'activité : horaires, terrains, coach et capacité de la dernière séance du même type sont repris.' : '',
      labels: { nb_inscrits: 'Inscrits', nb_presents: 'Présents', nb_absents: 'Absents prévenus', nb_no_shows: 'No-shows', nb_annulations: 'Annulations' },
      extraFooter: !isNew && a.can('presences.edit') ? UI.btn('Présences nominatives', 'presence-open', { cls: 'ghost', data: { id: rec.id } }) : '',
      onMount: function (form) {
        if (!isNew) return;
        var type = form.querySelector('[name=type_activite]');
        type.addEventListener('change', function () {
          var last = liveRows('seances').filter(function (s) { return s.type_activite === type.value; }).sort(function (x, y) { return x.date < y.date ? 1 : -1; })[0];
          if (!last) return;
          ['heure_debut', 'heure_fin', 'capacite', 'niveau', 'coach_id', 'cycle_id'].forEach(function (k) { var i = form.querySelector('[name=' + k + ']'); if (i && !i.value && !i.disabled) i.value = last[k] === undefined ? '' : last[k]; });
          u.splitList(last.terrains).forEach(function (t) { var b = form.querySelector('input[name=terrains][value="' + t + '"]'); if (b) b.checked = true; });
          var pay = form.querySelector('input[name=payant][value="' + (last.payant || '') + '"]'); if (pay) pay.checked = true;
        });
        var date = form.querySelector('[name=date]'), st = form.querySelector('[name=statut]');
        date.addEventListener('change', function () { if (date.value > a.today) st.value = 'planifiee'; });
      }
    });
  }
  A['seance-quick'] = function () { seanceForm(null); };
  A['seance-edit'] = function (el) { seanceForm(byId('seances', el.getAttribute('data-id'))); };

  /** Présences nominatives d'une séance. */
  A['presence-open'] = function (el) {
    var a = app(), c = ctx();
    var s = byId('seances', el.getAttribute('data-id'));
    if (UI.topModal() && el.closest('.modal')) UI.closeModal();
    var existing = liveRows('presences').filter(function (p) { return p.seance_id === s.id; });
    var byMember = {}; existing.forEach(function (p) { byMember[p.membre_id] = p; });
    var members = existing.map(function (p) { return p.membre_id; });
    var insByMember = {};
    if (s.cycle_id) calc.cycleActiveInscriptions(c, s.cycle_id, u.parseDate(s.date)).forEach(function (i) { insByMember[i.membre_id] = i.id; if (members.indexOf(i.membre_id) < 0) members.push(i.membre_id); });
    liveRows('inscriptions').filter(function (i) { return i.seance_id === s.id && i.statut === 'inscrit'; }).forEach(function (i) { insByMember[i.membre_id] = i.id; if (members.indexOf(i.membre_id) < 0) members.push(i.membre_id); });
    var STATES = schema.ENUMS.statut_presence;
    function row(m) {
      var cur = byMember[m] ? byMember[m].statut : '';
      var mem = c.db.membres.filter(function (x) { return x.id === m; })[0];
      return '<div class="pres-row" data-member="' + e(m) + '"><span class="pres-name">' + e(m) + (mem && mem.alias ? ' <span class="muted">' + e(mem.alias) + '</span>' : '') + (!mem ? ' ' + UI.badge('inconnu', 'warn', 'Membre absent du référentiel') : '') + '</span><div class="seg sm">' +
        Object.keys(STATES).map(function (k) { return '<label class="seg-item"><input type="radio" name="p-' + e(m) + '" value="' + k + '"' + (cur === k ? ' checked' : '') + '><span>' + e(STATES[k]) + '</span></label>'; }).join('') + '</div></div>';
    }
    var body = '<p class="muted">' + e(typeL(s.type_activite)) + ' · ' + d(s.date) + ' ' + e(s.heure_debut + '–' + s.heure_fin) + ' · ' + e(terrL(s.terrains)) + '</p>' +
      '<div class="action-row">' + UI.btn('Tous présents', 'pres-all', { cls: 'ghost sm', icon: 'check' }) + '</div>' +
      '<div class="pres-list">' + (members.length ? members.map(row).join('') : '<p class="muted">Aucun inscrit connu : ajoutez les participants par leur ID membre.</p>') + '</div>' +
      '<div class="add-member"><input class="input" list="dl-pres-membres" placeholder="Ajouter un membre (ID)…" aria-label="Ajouter un membre"><datalist id="dl-pres-membres">' + c.db.membres.slice(0, 800).map(function (m) { return '<option value="' + e(m.id) + '">' + e(m.alias || '') + '</option>'; }).join('') + '</datalist>' + UI.btn('Ajouter', 'pres-add', { cls: 'ghost sm', icon: 'plus' }) + '</div>' +
      '<label class="switch-field field"><input type="checkbox" class="switch" name="mark-done"' + (s.statut === 'realisee' ? ' checked' : '') + '><span>Marquer la séance comme réalisée</span></label><div class="form-errors" role="alert"></div>';
    var m = UI.modal('Présences', body, { wide: true, footer: '<span class="spacer"></span>' + UI.btn('Annuler', 'modal-close', { cls: 'ghost' }) + UI.btn('Enregistrer les présences', 'pres-save', { cls: 'primary', icon: 'check' }) });
    m.querySelector('[data-action="pres-all"]').addEventListener('click', function () { m.querySelectorAll('.pres-row').forEach(function (r) { var x = r.querySelector('input[value=present]'); if (x) x.checked = true; }); });
    m.querySelector('[data-action="pres-add"]').addEventListener('click', function () {
      var inp = m.querySelector('.add-member input'), id = inp.value.trim();
      if (!id || m.querySelector('.pres-row[data-member="' + CSS.escape(id) + '"]')) return;
      var list = m.querySelector('.pres-list'); if (!list.querySelector('.pres-row')) list.innerHTML = '';
      list.insertAdjacentHTML('beforeend', row(id)); list.lastElementChild.querySelector('input[value=present]').checked = true; inp.value = '';
    });
    m.querySelector('[data-action="pres-save"]').addEventListener('click', function () {
      var recs = [];
      m.querySelectorAll('.pres-row').forEach(function (r) {
        var mid = r.getAttribute('data-member'), ch = r.querySelector('input:checked');
        if (!ch) return;
        var prev = byMember[mid];
        if (prev && prev.statut === ch.value) return;
        recs.push(Object.assign({}, prev || { seance_id: s.id, membre_id: mid, inscription_id: insByMember[mid] || '' }, { statut: ch.value }));
      });
      var done = m.querySelector('[name=mark-done]').checked;
      var p = recs.length ? a.saveMany('presences', recs, 'Présences ' + s.id) : Promise.resolve([]);
      p.then(function () { if (done && s.statut !== 'realisee') return a.save('seances', Object.assign({}, s, { statut: 'realisee' })); })
        .then(function () { UI.closeModal(); UI.toast(recs.length + ' présence(s) enregistrée(s).', 'ok'); a.render(); })
        .catch(function (err) { m.querySelector('.form-errors').textContent = err.message; });
    });
  };

  /** Génère les séances hebdomadaires d'un cycle (hors vacances encodées). */
  A['cycle-generate'] = function (el) {
    var a = app(), c = ctx();
    var cycles = liveRows('cycles').filter(function (x) { return x.statut !== 'termine' && x.statut !== 'annule'; });
    var pre = el.getAttribute('data-id') || '';
    var body = '<form class="form-grid"><label class="field full"><span>Cycle</span><select class="input" name="cycle">' + cycles.map(function (x) { return '<option value="' + e(x.id) + '"' + (x.id === pre ? ' selected' : '') + '>' + e(x.nom) + '</option>'; }).join('') + '</select></label></form><div class="gen-preview"></div>';
    var m = UI.modal('Générer les séances d\'un cycle', body, { footer: '<span class="spacer"></span>' + UI.btn('Annuler', 'modal-close', { cls: 'ghost' }) + UI.btn('Créer les séances', 'gen-go', { cls: 'primary' }) });
    var plan = [];
    function preview() {
      var cy = byId('cycles', m.querySelector('[name=cycle]').value), box = m.querySelector('.gen-preview');
      plan = [];
      if (!cy) { box.innerHTML = ''; return; }
      var of = c.offres[cy.offre_id];
      var nb = u.num(cy.nb_seances) || (of && u.num(of.nb_seances));
      var miss = [];
      if (!nb) miss.push('nombre de séances (offre ou cycle)');
      if (!u.num(cy.jour_semaine)) miss.push('jour de la semaine');
      if (!cy.heure_debut || !cy.heure_fin) miss.push('horaires');
      if (!cy.date_debut) miss.push('date de début');
      if (miss.length) { box.innerHTML = UI.notice('Impossible de générer : ' + e(miss.join(', ')) + ' manquant(s) dans le cycle.', 'warn'); return; }
      var hol = c.params.filter(function (p) { return p.categorie === 'vacances'; });
      var existing = liveRows('seances').filter(function (s) { return s.cycle_id === cy.id; }).map(function (s) { return u.parseDate(s.date); });
      var dd = cy.date_debut; while (u.weekday(dd) !== +cy.jour_semaine) dd = u.addDays(dd, 1);
      var skipped = [], guard = 0;
      while (plan.length + existing.length < nb && guard++ < 80) {
        var inHol = hol.filter(function (h) { return u.inRange(dd, u.parseDate(h.date_effet), u.parseDate(h.date_fin)); })[0];
        if (inHol) skipped.push(u.fmtDate(dd) + ' (' + (inHol.libelle || inHol.cle) + ')');
        else if (existing.indexOf(dd) < 0) plan.push(dd);
        dd = u.addDays(dd, 7);
      }
      box.innerHTML = '<p>' + plan.length + ' séance(s) à créer (' + existing.length + ' déjà existante(s), objectif ' + nb + ') :</p><p class="muted">' + plan.map(u.fmtDate).join(' · ') + '</p>' +
        (skipped.length ? '<p class="muted">Semaines ignorées (vacances encodées) : ' + e(skipped.join(', ')) + '</p>' : '') +
        (!hol.length ? UI.notice('Aucune période de vacances encodée : vérifiez qu\'aucune date ne tombe pendant les congés scolaires FWB.', 'warn') : '');
      m._cycle = cy;
    }
    m.querySelector('[name=cycle]').addEventListener('change', preview); preview();
    m.querySelector('[data-action="gen-go"]').addEventListener('click', function () {
      var cy = m._cycle; if (!cy || !plan.length) { UI.closeModal(); return; }
      var of = c.offres[cy.offre_id];
      var recs = plan.map(function (dt) { return { date: dt, heure_debut: cy.heure_debut, heure_fin: cy.heure_fin, type_activite: of ? of.type_activite : '', cycle_id: cy.id, terrains: cy.terrain_id, coach_id: cy.coach_id, niveau: cy.niveau, capacite: cy.capacite, statut: dt <= a.today ? 'realisee' : 'planifiee' }; });
      a.saveMany('seances', recs, 'Génération cycle ' + cy.nom).then(function () { UI.closeModal(); UI.toast(recs.length + ' séance(s) créée(s).', 'ok'); a.render(); }).catch(function (err) { UI.toast(err.message, 'bad'); });
    });
  };

  // ====================================================================== ACADÉMIES
  var acaTab = 'cycles';
  V.academies = function () {
    var a = app(), c = ctx();
    var tabs = { cycles: 'Cycles', inscriptions: 'Inscriptions', offres: 'Offres et tarifs' };
    var html = '<div class="tabs" role="tablist">' + Object.keys(tabs).map(function (k) { return '<button type="button" role="tab" class="tab' + (acaTab === k ? ' active' : '') + '" aria-selected="' + (acaTab === k) + '" data-action="aca-tab" data-tab="' + k + '">' + tabs[k] + '</button>'; }).join('') + '</div>';
    var fin = a.can('pnl.view') || a.can('paiements.view');
    if (acaTab === 'cycles') {
      html += '<div class="action-row">' + (a.can('academies.edit') ? UI.btn('Nouveau cycle', 'aca-add-cycle', { cls: 'primary', icon: 'plus' }) : '') + '</div><div class="cards">';
      var cycles = liveRows('cycles').sort(function (x, y) { return (x.statut === 'termine') - (y.statut === 'termine') || (x.date_debut < y.date_debut ? 1 : -1); });
      if (!cycles.length) html += UI.empty('Aucun cycle encodé.');
      cycles.forEach(function (cy) {
        var of = c.offres[cy.offre_id];
        var ins = liveRows('inscriptions').filter(function (i) { return i.cycle_id === cy.id && i.statut === 'inscrit'; });
        var states = ins.map(function (i) { return calc.inscriptionState(c, i, a.today); });
        var se = liveRows('seances').filter(function (s) { return s.cycle_id === cy.id; });
        var done = se.filter(function (s) { return s.statut === 'realisee'; }).length;
        var nb = u.num(cy.nb_seances) || (of && u.num(of.nb_seances));
        var reco = u.sum(states.map(function (s) { return s.reconnu === null ? u.missing(s.gaps[0] || 'inconnu') : u.known(s.reconnu); }));
        var enc = u.sum(states.map(function (s) { return u.known(s.encaisse); }));
        var dlv = u.sum(states.map(function (s) { return s.aDelivrer === null ? u.missing(s.gaps[0] || 'inconnu') : u.known(s.aDelivrer); }));
        var warn = !of ? 'Offre introuvable' : (u.num(of.tarif_seance) === null && u.num(of.prix_cycle) === null ? 'Tarif manquant : calcul bloqué' : '');
        html += '<article class="mini-card"><header><h3>' + e(cy.nom) + '</h3>' + UI.status('statut_cycle', cy.statut) + '</header>' +
          '<p class="muted">' + e(of ? of.nom : '?') + ' · ' + e(coachL(cy.coach_id) || 'coach ?') + ' · ' + e(cy.jour_semaine ? u.JOURS[cy.jour_semaine - 1] : '?') + ' ' + e(cy.heure_debut || '') + ' · ' + e(terrL(cy.terrain_id)) + '</p>' +
          (warn ? UI.notice(e(warn), 'warn') : '') +
          '<dl class="facts"><div><dt>Inscrits</dt><dd>' + ins.length + ' / ' + (cy.capacite || '?') + '</dd></div><div><dt>Séances</dt><dd>' + done + ' / ' + (nb || '?') + '</dd></div>' +
          (fin ? '<div><dt>Encaissé</dt><dd>' + UI.measure(enc, 'eur') + '</dd></div><div><dt>Reconnu</dt><dd>' + UI.measure(reco, 'eur') + '</dd></div><div><dt>À délivrer</dt><dd>' + UI.measure(dlv, 'eur') + '</dd></div>' : '') + '</dl>' +
          '<footer>' + (a.can('academies.edit') ? UI.btn('Modifier', 'aca-edit-cycle', { cls: 'ghost sm', data: { id: cy.id } }) + UI.btn('Générer les séances', 'cycle-generate', { cls: 'ghost sm', data: { id: cy.id } }) : '') +
          (a.can('inscriptions.edit') ? UI.btn('Inscrire', 'aca-add-ins', { cls: 'ghost sm', data: { cycle: cy.id } }) : '') + '</footer></article>';
      });
      html += '</div>';
    } else if (acaTab === 'inscriptions') {
      var rows = liveRows('inscriptions').filter(function (i) { return i.cycle_id; }).map(function (i) { var st = calc.inscriptionState(c, i, a.today); st.id = i.id; return st; });
      html += '<div class="action-row">' + (a.can('inscriptions.edit') ? UI.btn('Nouvelle inscription', 'aca-add-ins', { cls: 'primary', icon: 'plus' }) : '') + '</div>';
      html += UI.card('Inscriptions aux cycles', UI.table({ id: 'ins', csv: 'inscriptions', stack: true, columns: [
        { key: 'm', label: 'Membre', render: function (r) { return e(r.inscription.membre_id); }, sort: function (r) { return r.inscription.membre_id; } },
        { key: 'c', label: 'Cycle', render: function (r) { return e(r.cycle ? r.cycle.nom : '?'); }, sort: function (r) { return r.cycle ? r.cycle.nom : ''; } },
        { key: 'st', label: 'Statut', render: function (r) { return UI.status('statut_inscription', r.inscription.statut); }, sort: function (r) { return r.inscription.statut; } },
        { key: 'p', label: 'Prévues', num: true, render: function (r) { return r.prevues === null ? '<span class="na">?</span>' : r.prevues; }, sort: function (r) { return r.prevues; } },
        { key: 'r', label: 'Réalisées', num: true, render: function (r) { return String(r.realisees); }, sort: function (r) { return r.realisees; } },
        { key: 'pr', label: 'Présences', num: true, render: function (r) { return r.presences + (r.presencesInconnues ? ' <span class="muted" title="Séances sans présence encodée">(+' + r.presencesInconnues + ' ?)</span>' : ''); }, sort: function (r) { return r.presences; } },
        { key: 'ab', label: 'Absences', num: true, render: function (r) { return String(r.absences); }, sort: function (r) { return r.absences; } },
        { key: 'att', label: 'Attendu', num: true, render: function (r) { return r.attendu === null ? '<span class="na" title="' + e(r.gaps.join('\n')) + '">bloqué</span>' : u.fmtEUR(r.attendu, 2); }, sort: function (r) { return r.attendu; } },
        { key: 'enc', label: 'Encaissé', num: true, render: function (r) { return u.fmtEUR(r.encaisse, 2); }, sort: function (r) { return r.encaisse; } },
        { key: 'sol', label: 'Solde dû', num: true, render: function (r) { return r.solde === null ? '<span class="na">?</span>' : (r.solde > 0.009 ? '<strong class="bad-text">' + u.fmtEUR(r.solde, 2) + '</strong>' : u.fmtEUR(r.solde, 2)); }, sort: function (r) { return r.solde; } },
        { key: 'vc', label: 'Valeur consommée', num: true, render: function (r) { return r.valeurConsommee === null ? '<span class="na">?</span>' : u.fmtEUR(r.valeurConsommee, 2); }, sort: function (r) { return r.valeurConsommee; } },
        { key: 'vr', label: 'Valeur restante', num: true, render: function (r) { return r.valeurRestante === null ? '<span class="na">?</span>' : u.fmtEUR(r.valeurRestante, 2); }, sort: function (r) { return r.valeurRestante; } },
        { key: 'ad', label: 'Payé d\'avance à délivrer', num: true, render: function (r) { return r.aDelivrer === null ? '<span class="na">?</span>' : u.fmtEUR(r.aDelivrer, 2); }, sort: function (r) { return r.aDelivrer; } }
      ], rows: rows, onRow: 'aca-edit-ins' }), { sub: 'Absence du membre = séance consommée (revenu reconnu). Annulation club/coach = séance reportée (aucun revenu reconnu).' });
    } else {
      html += '<div class="action-row">' + (a.can('academies.edit') ? UI.btn('Nouvelle offre', 'aca-add-offre', { cls: 'primary', icon: 'plus' }) : '') + '</div>';
      html += UI.card('Offres', UI.table({ id: 'offres', csv: 'offres', columns: [
        { key: 'nom', label: 'Formule' }, { key: 'public', label: 'Public', render: function (r) { return e(schema.ENUMS.public[r.public] || r.public); } },
        { key: 'duree_seance_min', label: 'Durée (min)', num: true }, { key: 'nb_seances', label: 'Séances', num: true, render: function (r) { return u.isBlank(r.nb_seances) ? '<span class="na">manquant</span>' : e(r.nb_seances); } },
        { key: 'tarif_seance', label: '€ / séance / pers.', num: true, render: function (r) { return u.isBlank(r.tarif_seance) ? '<span class="na">manquant</span>' : u.fmtEUR(u.num(r.tarif_seance), 2); } },
        { key: 'prix_cycle', label: '€ / cycle / pers.', num: true, render: function (r) { return u.isBlank(r.prix_cycle) ? (u.num(r.tarif_seance) !== null && u.num(r.nb_seances) !== null ? '<span class="muted">' + u.fmtEUR(u.num(r.tarif_seance) * u.num(r.nb_seances), 2) + ' (calculé)</span>' : '<span class="na">–</span>') : u.fmtEUR(u.num(r.prix_cycle), 2); } },
        { key: 'groupe', label: 'Groupe', render: function (r) { return e((r.taille_min || '?') + '–' + (r.taille_max || '?')); } },
        { key: 'date_effet', label: 'Effet', render: function (r) { return d(r.date_effet); } }, { key: 'statut', label: 'Statut', render: function (r) { return UI.status('statut_actif', r.statut); } },
        { key: 'source', label: 'Source' }
      ], rows: liveRows('offres'), onRow: 'aca-edit-offre' }), { sub: 'Aucun tarif n\'est supposé : une offre sans tarif bloque le calcul du revenu et apparaît dans « Qualité des données ». Pour changer un tarif, archivez l\'offre et créez-en une nouvelle avec sa date d\'effet (historique conservé).' });
    }
    return html;
  };
  A['aca-tab'] = function (el) { acaTab = el.getAttribute('data-tab'); app().render(); };
  A['aca-add-cycle'] = function () { UI.editForm('cycles', null, { defaults: { statut: 'planifie', capacite: '' } }); };
  A['aca-edit-cycle'] = function (el) { UI.editForm('cycles', byId('cycles', el.getAttribute('data-id'))); };
  A['aca-add-offre'] = function () { UI.editForm('offres', null, { defaults: { statut: 'actif', date_effet: app().today } }); };
  A['aca-edit-offre'] = function (el) { UI.editForm('offres', byId('offres', el.getAttribute('data-id'))); };
  var INS_FIELDS = ['membre_id', 'cycle_id', 'date_inscription', 'date_premiere_seance', 'nb_seances_prevues', 'montant_attendu', 'statut', 'commentaire'];
  A['aca-add-ins'] = function (el) { UI.editForm('inscriptions', null, { fields: INS_FIELDS, defaults: { cycle_id: el.getAttribute('data-cycle') || '', date_inscription: app().today, statut: 'inscrit' }, intro: 'Entrée en cours de cycle : indiquez la première séance due et le nombre de séances restantes. Le montant attendu est calculé depuis l\'offre si vous le laissez vide.' }); };
  A['aca-edit-ins'] = function (el) { UI.editForm('inscriptions', byId('inscriptions', el.getAttribute('data-id')), { fields: INS_FIELDS }); };

  // ====================================================================== HEURES DES COACHS
  var heuresTab = null;
  V.heures = function () {
    var a = app();
    var admin = a.can('heures.validate');
    var tabs = {};
    if (a.can('heures.own')) tabs.saisie = admin ? 'Encoder' : 'Encoder mes heures';
    if (admin) { tabs.valider = 'À valider'; tabs.payer = 'À payer'; }
    if (a.can('heures.view_all')) { tabs.toutes = 'Toutes les heures'; tabs.synthese = 'Synthèse et coûts'; }
    if (!heuresTab || !tabs[heuresTab]) heuresTab = Object.keys(tabs)[0];
    var html = Object.keys(tabs).length > 1 ? '<div class="tabs" role="tablist">' + Object.keys(tabs).map(function (k) {
      var n = k === 'valider' ? liveRows('heures').filter(function (h) { return h.statut === 'soumis'; }).length : (k === 'payer' ? liveRows('heures').filter(function (h) { return h.statut === 'valide'; }).length : 0);
      return '<button type="button" role="tab" class="tab' + (heuresTab === k ? ' active' : '') + '" aria-selected="' + (heuresTab === k) + '" data-action="h-tab" data-tab="' + k + '">' + tabs[k] + (n ? ' <span class="count">' + n + '</span>' : '') + '</button>';
    }).join('') + '</div>' : '';
    if (heuresTab === 'saisie') html += coachEntry();
    if (heuresTab === 'valider') html += validationQueue('soumis');
    if (heuresTab === 'payer') html += validationQueue('valide');
    if (heuresTab === 'toutes') html += UI.periodBar({ filters: false }) + UI.card('Heures', hoursTable('h-all', liveRows('heures').filter(function (h) { return u.inRange(u.parseDate(h.date), a.filters.from, a.filters.to); }), true));
    if (heuresTab === 'synthese') html += hoursSynthesis();
    return html;
  };
  A['h-tab'] = function (el) { heuresTab = el.getAttribute('data-tab'); app().render(); };

  function hoursTable(id, rows, showCoach) {
    var a = app(), c = ctx();
    var showCost = a.can('couts.view') || !showCoach;
    return UI.table({ id: id, csv: 'heures-coachs', defaultSort: 'date', stack: true, columns: [
      { key: 'date', label: 'Date', render: function (r) { return d(r.date); }, sort: function (r) { return r.date + r.heure_debut; } },
      { key: 'h', label: 'Horaire', render: function (r) { return e(r.heure_debut + '–' + r.heure_fin); } },
      { key: 'duree', label: 'Durée', num: true, render: function (r) { return u.fmtHours(calc.heureDuree(r)); }, sort: function (r) { return calc.heureDuree(r); } }
    ].concat(showCoach ? [{ key: 'coach_id', label: 'Coach', render: function (r) { return e(coachL(r.coach_id)); }, text: function (r) { return coachL(r.coach_id); } }] : [])
      .concat([
        { key: 'type_activite', label: 'Type', render: function (r) { return e(typeL(r.type_activite)) + (r.remplacement === true ? ' ' + UI.badge('remplacement', 'info') : '') + (r.annulation === true ? ' ' + UI.badge('annulée', 'bad') : ''); }, text: function (r) { return typeL(r.type_activite); } },
        { key: 'statut', label: 'Statut', render: function (r) { return UI.status('statut_heure', r.statut) + (r.motif_correction && r.statut === 'a_corriger' ? '<div class="muted sm">' + e(r.motif_correction) + '</div>' : '') + (r.demande_correction ? '<div class="muted sm">Demande : ' + e(r.demande_correction) + '</div>' : ''); } }
      ]).concat(showCost ? [{ key: 'cout', label: 'Coût', num: true, render: function (r) { var rate = calc.coachRate(c, r.coach_id, u.parseDate(r.date)); var du = calc.heureDuree(r); return rate.v === null || du === null ? '<span class="na" title="' + e(rate.gaps.join('\n')) + '">taux ?</span>' : u.fmtEUR(rate.v * du, 2); }, sort: function (r) { var rate = calc.coachRate(c, r.coach_id, u.parseDate(r.date)); return rate.v === null ? null : rate.v * (calc.heureDuree(r) || 0); } }] : []),
    rows: rows, onRow: 'h-edit', pageSize: 30, empty: 'Aucune heure encodée.' });
  }

  function coachEntry() {
    var a = app(), c = ctx();
    var admin = a.can('heures.validate');
    var mine = liveRows('heures').filter(function (h) { return h.coach_id === a.user.id; });
    var month = u.startOfMonth(a.today);
    var mm = mine.filter(function (h) { return u.parseDate(h.date) >= month; });
    function sumH(list, st) { return list.filter(function (h) { return !st || st.indexOf(h.statut) >= 0; }).reduce(function (t, h) { return t + (calc.heureDuree(h) || 0); }, 0); }
    var html = '<section class="card entry-card"><header class="card-h"><h2>Nouvelle intervention</h2></header>' + hourForm(null, admin) + '</section>';
    html += '<div class="kpi-grid">' + UI.kpi({ label: 'Ce mois – brouillons', m: u.known(sumH(mm, ['brouillon'])), fmt: 'h' }) + UI.kpi({ label: 'Ce mois – soumises', m: u.known(sumH(mm, ['soumis'])), fmt: 'h' }) +
      UI.kpi({ label: 'Ce mois – validées', m: u.known(sumH(mm, ['valide'])), fmt: 'h' }) + UI.kpi({ label: 'Ce mois – payées', m: u.known(sumH(mm, ['paye'])), fmt: 'h' }) + '</div>';
    html += UI.card('Mon historique', hoursTable('h-mine', mine, false), { sub: 'Les heures validées ne sont plus modifiables : ouvrez la ligne et utilisez « Demander une correction ».' });
    return html;
  }

  var HOUR_FIELDS = ['date', 'heure_debut', 'heure_fin', 'type_activite', 'seance_id', 'cycle_id', 'evenement_id', 'nb_participants', 'nb_presents', 'remplacement', 'remplace_coach_id', 'annulation', 'commentaire'];
  function hourForm(rec, admin) {
    var a = app(), r = rec || { date: a.today, coach_id: a.user.id };
    var fields = (admin ? ['coach_id'] : []).concat(HOUR_FIELDS);
    return '<form class="form-grid hour-form" data-hour-form novalidate>' + fields.map(function (n) {
      var col = schema.col('heures', n);
      if (n === 'seance_id') return '<label class="field full"><span>Séance du jour (facultatif)</span><select class="input" name="seance_id" data-action="h-seance">' + seanceOptions(r.date, r.coach_id, r.seance_id) + '</select><small class="help">Choisir une séance remplit l\'horaire et le type.</small></label>';
      return UI.field(col, r[n], { select: n === 'type_activite' });
    }).join('') + '<div class="duration full" aria-live="polite"></div><div class="form-errors" role="alert"></div>' +
      '<div class="form-actions full">' + UI.btn('Enregistrer en brouillon', 'h-save', { cls: 'ghost', data: { statut: 'brouillon' } }) + UI.btn('Soumettre à Anthony', 'h-save', { cls: 'primary', icon: 'check', data: { statut: 'soumis' } }) + '</div></form>';
  }
  function seanceOptions(date, coach, current) {
    var list = liveRows('seances').filter(function (s) { return u.parseDate(s.date) === u.parseDate(date) && (!coach || s.coach_id === coach || s.coach_remplacant_id === coach); });
    return '<option value="">–</option>' + list.map(function (s) { return '<option value="' + e(s.id) + '"' + (s.id === current ? ' selected' : '') + '>' + e(s.heure_debut + '–' + s.heure_fin + ' ' + typeL(s.type_activite)) + '</option>'; }).join('');
  }
  function hourDuration(form) {
    var a = u.toMinutes(form.heure_debut.value), b = u.toMinutes(form.heure_fin.value), out = form.querySelector('.duration');
    if (!out) return;
    out.innerHTML = (a !== null && b !== null && b > a) ? 'Durée calculée : <strong>' + u.fmtHours((b - a) / 60) + '</strong>' : (a !== null && b !== null ? '<span class="bad-text">L\'heure de fin doit être après le début.</span>' : '');
  }
  V.heures.after = function (main) {
    main.querySelectorAll('[data-hour-form]').forEach(bindHourForm);
  };
  function bindHourForm(form) {
    ['heure_debut', 'heure_fin'].forEach(function (n) { form[n].addEventListener('input', function () { hourDuration(form); }); });
    hourDuration(form);
    form.date.addEventListener('change', function () { form.seance_id.innerHTML = seanceOptions(form.date.value, form.coach_id ? form.coach_id.value : app().user.id, ''); });
    if (form.coach_id) form.coach_id.addEventListener('change', function () { form.seance_id.innerHTML = seanceOptions(form.date.value, form.coach_id.value, ''); });
  }
  A['h-seance'] = function (el) {
    var s = byId('seances', el.value); var form = el.form; if (!s) return;
    form.heure_debut.value = s.heure_debut; form.heure_fin.value = s.heure_fin; form.type_activite.value = s.type_activite;
    if (form.cycle_id) form.cycle_id.value = s.cycle_id || '';
    var k = calc.seanceCounts(ctx(), s);
    if (k.inscrits !== null) form.nb_participants.value = k.inscrits;
    if (k.presents !== null) form.nb_presents.value = k.presents;
    if (s.coach_remplacant_id === app().user.id) { form.remplacement.checked = true; if (form.remplace_coach_id) form.remplace_coach_id.value = s.coach_id; }
    hourDuration(form);
  };
  A['h-save'] = function (el) {
    var a = app(), form = el.closest('form');
    var base = form._rec || { coach_id: a.user.id };
    var data = UI.readForm(form, 'heures', base);
    if (!data.coach_id) data.coach_id = a.user.id;
    data.statut = el.getAttribute('data-statut');
    var v = Padel.rules.validateRecord('heures', data, a.db.parametres);
    var err = form.querySelector('.form-errors');
    if (v.errors.length) { err.innerHTML = v.errors.map(e).join('<br>'); return; }
    el.disabled = true;
    return a.save('heures', data).then(function () {
      if (UI.topModal()) UI.closeModal();
      UI.toast(data.statut === 'soumis' ? 'Heures soumises à Anthony.' : 'Brouillon enregistré.', 'ok'); a.render();
    }).catch(function (x) { el.disabled = false; err.textContent = x.message; });
  };
  A['h-edit'] = function (el) {
    var a = app(), h = byId('heures', el.getAttribute('data-id'));
    var admin = a.can('heures.validate');
    var locked = h.statut === 'valide' || h.statut === 'paye';
    var mine = h.coach_id === a.user.id;
    if (!admin && (locked || h.statut === 'soumis')) {
      var body = '<dl class="facts">' + [['Date', d(h.date)], ['Horaire', h.heure_debut + '–' + h.heure_fin], ['Durée', u.fmtHours(calc.heureDuree(h))], ['Type', typeL(h.type_activite)], ['Statut', schema.ENUMS.statut_heure[h.statut]], ['Commentaire', h.commentaire || '–']].map(function (x) { return '<div><dt>' + x[0] + '</dt><dd>' + e(x[1]) + '</dd></div>'; }).join('') + '</dl>' +
        (mine ? '<label class="field"><span>Demander une correction (motif)</span><textarea class="input" name="demande" rows="2">' + e(h.demande_correction || '') + '</textarea></label>' : '') + '<div class="form-errors" role="alert"></div>';
      var m = UI.modal('Heures du ' + d(h.date), body, { footer: '<span class="spacer"></span>' + UI.btn('Fermer', 'modal-close', { cls: 'ghost' }) + (mine ? UI.btn('Envoyer la demande', 'h-ask', { cls: 'primary' }) : '') });
      var ask = m.querySelector('[data-action="h-ask"]');
      if (ask) ask.addEventListener('click', function () {
        var txt = m.querySelector('[name=demande]').value.trim(); if (!txt) return;
        a.save('heures', Object.assign({}, h, { demande_correction: txt }), 'Demande de correction').then(function () { UI.closeModal(); UI.toast('Demande envoyée à Anthony.', 'ok'); a.render(); }).catch(function (x) { m.querySelector('.form-errors').textContent = x.message; });
      });
      return;
    }
    if (!admin) {
      var mm = UI.modal('Modifier mes heures', hourForm(h, false), {});
      var f = mm.querySelector('form'); f._rec = h; bindHourForm(f);
      return;
    }
    UI.editForm('heures', h, { fields: ['coach_id'].concat(HOUR_FIELDS, ['statut', 'motif_correction', 'demande_correction', 'paye_le', 'reference_paiement']), selects: ['statut'],
      intro: h.demande_correction ? UI.notice('Demande de correction du coach : « ' + e(h.demande_correction) + ' ». Corrigez la ligne puis videz la demande.', 'warn') : '' });
  };

  function validationQueue(statut) {
    var a = app(), c = ctx();
    var rows = liveRows('heures').filter(function (h) { return h.statut === statut; }).sort(function (x, y) { return x.date < y.date ? -1 : 1; });
    if (!rows.length) return UI.empty(statut === 'soumis' ? 'Aucune heure en attente de validation.' : 'Aucune heure validée en attente de paiement.');
    var byCoach = u.groupBy(rows, function (h) { return h.coach_id; });
    var html = statut === 'soumis' ? '<p class="muted">Cochez les lignes puis validez, ou renvoyez-les en correction avec un motif.</p>' : '<p class="muted">Cochez les lignes rapprochées avec la facture ou le relevé du coach, puis marquez-les payées.</p>';
    Object.keys(byCoach).forEach(function (cid) {
      var list = byCoach[cid];
      var total = 0, missing = false;
      list.forEach(function (h) { var r = calc.coachRate(c, h.coach_id, u.parseDate(h.date)); if (r.v === null) missing = true; else total += r.v * (calc.heureDuree(h) || 0); });
      html += '<section class="card"><header class="card-h"><h2>' + e(coachL(cid)) + '</h2><span class="muted">' + list.length + ' ligne(s) · ' + u.fmtHours(list.reduce(function (t, h) { return t + (calc.heureDuree(h) || 0); }, 0)) + ' · ' + (missing ? '<span class="na">taux manquant</span>' : u.fmtEUR(total, 2)) + '</span></header>' +
        '<label class="check-all"><input type="checkbox" data-action="h-check-all" data-coach="' + e(cid) + '"> Tout sélectionner</label><ul class="check-list">' + list.map(function (h) {
          var r = calc.coachRate(c, h.coach_id, u.parseDate(h.date));
          return '<li><label><input type="checkbox" name="hsel" value="' + e(h.id) + '" data-coach="' + e(cid) + '"><span><strong>' + d(h.date) + '</strong> ' + e(h.heure_debut + '–' + h.heure_fin) + ' · ' + e(typeL(h.type_activite)) +
            (h.remplacement === true ? ' ' + UI.badge('remplacement', 'info') : '') + (h.annulation === true ? ' ' + UI.badge('annulée', 'bad') : '') + (h.commentaire ? '<br><span class="muted sm">' + e(h.commentaire) + '</span>' : '') + '</span>' +
            '<span class="num">' + u.fmtHours(calc.heureDuree(h)) + '<br><span class="muted sm">' + (r.v === null ? 'taux ?' : u.fmtEUR(r.v * (calc.heureDuree(h) || 0), 2)) + '</span></span></label>' +
            '<button type="button" class="icon-btn" data-action="h-edit" data-id="' + e(h.id) + '" aria-label="Ouvrir">' + UI.icon('edit', 16) + '</button></li>';
        }).join('') + '</ul></section>';
    });
    html += '<div class="sticky-actions">' + (statut === 'soumis' ? UI.btn('Renvoyer en correction', 'h-bulk', { cls: 'ghost', data: { to: 'a_corriger' } }) + UI.btn('Valider la sélection', 'h-bulk', { cls: 'primary', icon: 'check', data: { to: 'valide' } })
      : UI.btn('Marquer payé', 'h-bulk', { cls: 'primary', icon: 'check', data: { to: 'paye' } })) + '</div>';
    return html;
  }
  A['h-check-all'] = function (el) { document.querySelectorAll('input[name=hsel][data-coach="' + CSS.escape(el.getAttribute('data-coach')) + '"]').forEach(function (b) { b.checked = el.checked; }); };
  A['h-bulk'] = function (el) {
    var a = app(), to = el.getAttribute('data-to');
    var ids = Array.prototype.filter.call(document.querySelectorAll('input[name=hsel]'), function (b) { return b.checked; }).map(function (b) { return b.value; });
    if (!ids.length) { UI.toast('Sélectionnez au moins une ligne.', 'bad'); return; }
    var rows = ids.map(function (id) { return byId('heures', id); });
    if (to === 'valide') return a.saveMany('heures', rows.map(function (h) { return Object.assign({}, h, { statut: 'valide', motif_correction: '' }); }), 'Validation').then(function () { UI.toast(ids.length + ' ligne(s) validée(s).', 'ok'); a.render(); });
    if (to === 'a_corriger') return UI.confirm('Renvoyer ' + ids.length + ' ligne(s) au coach pour correction ?', { motif: true, motifRequired: true, ok: 'Renvoyer' }).then(function (motif) {
      return a.saveMany('heures', rows.map(function (h) { return Object.assign({}, h, { statut: 'a_corriger', motif_correction: motif }); }), motif);
    }).then(function () { UI.toast('Lignes renvoyées en correction.', 'ok'); a.render(); });
    var body = '<form class="form-grid"><label class="field"><span>Date de paiement</span><input class="input" type="date" name="paye_le" value="' + a.today + '"></label><label class="field"><span>Référence facture / relevé</span><input class="input" name="ref" required></label></form><div class="form-errors" role="alert"></div>';
    var m = UI.modal('Marquer ' + ids.length + ' ligne(s) payée(s)', body, { footer: '<span class="spacer"></span>' + UI.btn('Annuler', 'modal-close', { cls: 'ghost' }) + UI.btn('Confirmer le paiement', 'h-pay-ok', { cls: 'primary' }) });
    m.querySelector('[data-action="h-pay-ok"]').addEventListener('click', function () {
      var ref = m.querySelector('[name=ref]').value.trim(), dt = m.querySelector('[name=paye_le]').value;
      if (!ref) { m.querySelector('.form-errors').textContent = 'La référence de la facture ou du relevé est obligatoire.'; return; }
      a.saveMany('heures', rows.map(function (h) { return Object.assign({}, h, { statut: 'paye', paye_le: dt, reference_paiement: ref }); }), 'Paiement ' + ref)
        .then(function () { UI.closeModal(); UI.toast('Paiement enregistré.', 'ok'); a.render(); }).catch(function (x) { m.querySelector('.form-errors').textContent = x.message; });
    });
  };

  function hoursSynthesis() {
    var a = app(), c = ctx();
    var s = calc.coachSummary(c, a.filterObj());
    var html = UI.periodBar({ filters: false });
    html += '<div class="kpi-grid">' + UI.kpi({ label: 'Coût validé (validé + payé)', m: s.totalValide, fmt: 'eur' }) + UI.kpi({ label: 'En attente de validation', m: s.totalEnAttente, fmt: 'eur' }) + '</div>';
    html += UI.card('Par coach', UI.table({ id: 'h-syn', search: false, csv: 'synthese-coachs', columns: [
      { key: 'nom', label: 'Coach' },
      { key: 'hs', label: 'Soumises', num: true, render: function (r) { return u.fmtHours(r.heures.soumis); }, sort: function (r) { return r.heures.soumis; } },
      { key: 'hv', label: 'Validées non payées', num: true, render: function (r) { return u.fmtHours(r.heures.valide); }, sort: function (r) { return r.heures.valide; } },
      { key: 'hp', label: 'Payées', num: true, render: function (r) { return u.fmtHours(r.heures.paye); }, sort: function (r) { return r.heures.paye; } },
      { key: 'cv', label: 'Coût validé', num: true, render: function (r) { return UI.measure(r.coutValide, 'eur2'); }, sort: function (r) { return r.coutValide.v; } },
      { key: 'cnp', label: 'Validé non payé', num: true, render: function (r) { return UI.measure(r.coutValideNonPaye, 'eur2'); }, sort: function (r) { return r.coutValideNonPaye.v; } },
      { key: 'cp', label: 'Payé', num: true, render: function (r) { return UI.measure(r.coutPaye, 'eur2'); }, sort: function (r) { return r.coutPaye.v; } },
      { key: 'cpp', label: 'Coût / participant', num: true, render: function (r) { return UI.measure(r.coutParParticipant, 'eur2'); }, sort: function (r) { return r.coutParParticipant.v; } }
    ], rows: s.coaches }));
    html += UI.card('Coût par type d\'activité', UI.bars(s.byType.map(function (t) { return { label: t.label + ' (' + u.fmtHours(t.heures) + ')', v: t.cout.v, display: UI.measure(t.cout, 'eur') }; })));
    return html;
  }

  // ====================================================================== PAIEMENTS
  var payTab = 'encaisser';
  V.paiements = function () {
    var a = app(), c = ctx();
    var tabs = { encaisser: 'À encaisser', verifier: 'À vérifier', tous: 'Tous les paiements' };
    var html = '<div class="tabs" role="tablist">' + Object.keys(tabs).map(function (k) { return '<button type="button" role="tab" class="tab' + (payTab === k ? ' active' : '') + '" aria-selected="' + (payTab === k) + '" data-action="pay-tab" data-tab="' + k + '">' + tabs[k] + '</button>'; }).join('') + '</div>';
    var canEdit = a.can('paiements.edit');
    if (payTab === 'encaisser') {
      var due = liveRows('inscriptions').filter(function (i) { return i.cycle_id && i.statut === 'inscrit'; }).map(function (i) { return calc.inscriptionState(c, i, a.today); })
        .filter(function (st) { return st.attendu === null || st.solde > 0.009; });
      html += UI.card('Inscriptions avec un solde à payer', UI.table({ id: 'pay-due', csv: 'soldes', stack: true, columns: [
        { key: 'm', label: 'Membre', render: function (r) { return '<strong>' + e(r.inscription.membre_id) + '</strong>'; }, sort: function (r) { return r.inscription.membre_id; } },
        { key: 'c', label: 'Cycle', render: function (r) { return e(r.cycle ? r.cycle.nom : '?'); }, sort: function (r) { return r.cycle ? r.cycle.nom : ''; } },
        { key: 'deb', label: 'Début', render: function (r) { return r.cycle ? d(r.cycle.date_debut) : ''; }, sort: function (r) { return r.cycle ? r.cycle.date_debut : ''; } },
        { key: 'att', label: 'Attendu', num: true, render: function (r) { return r.attendu === null ? '<span class="na" title="' + e(r.gaps.join('\n')) + '">tarif manquant</span>' : u.fmtEUR(r.attendu, 2); }, sort: function (r) { return r.attendu; } },
        { key: 'enc', label: 'Encaissé', num: true, render: function (r) { return u.fmtEUR(r.encaisse, 2); }, sort: function (r) { return r.encaisse; } },
        { key: 'sol', label: 'Solde', num: true, render: function (r) { return r.solde === null ? '<span class="na">?</span>' : '<strong>' + u.fmtEUR(r.solde, 2) + '</strong>'; }, sort: function (r) { return r.solde; } },
        { key: 'go', label: '', render: function (r) { return canEdit && r.solde !== null ? UI.btn('Encaisser', 'pay-collect', { cls: 'primary sm', data: { id: r.inscription.id } }) : ''; } }
      ], rows: due, rowId: function (r) { return r.inscription.id; }, empty: 'Aucun solde dû.' }), { sub: 'Le paiement des collectifs se fait à la réception avant le cycle. Une entrée en cours de cycle ne paie que les séances restantes.' });
    } else if (payTab === 'verifier') {
      var rows = liveRows('paiements').filter(function (p) { return p.statut === 'a_verifier'; });
      html += UI.card('Paiements à vérifier', rows.length ? '<ul class="check-list">' + rows.map(function (p) {
        var t = calc.paymentTarget(c, p);
        return '<li><span><strong>' + u.fmtEUR(u.num(p.montant), 2) + '</strong> · ' + d(p.date_paiement) + ' · membre ' + e(p.membre_id || '?') + '<br><span class="muted sm">' + e(schema.ENUMS.mode_paiement[p.mode] || p.mode || '') + ' · réf. ' + e(p.reference || '–') + ' · ' + e(t.kind === 'cycle' ? (t.cycle ? t.cycle.nom : '') : t.kind) + '</span></span>' +
          (canEdit ? UI.btn('Vérifié', 'pay-verify', { cls: 'primary sm', icon: 'check', data: { id: p.id } }) + UI.btn('Corriger', 'pay-edit', { cls: 'ghost sm', data: { id: p.id } }) : '') + '</li>';
      }).join('') + '</ul>' : UI.empty('Aucun paiement à vérifier.'));
    } else {
      html += '<div class="action-row">' + (canEdit ? UI.btn('Nouveau paiement', 'pay-add', { cls: 'primary', icon: 'plus' }) : '') + '</div>' + UI.periodBar({ filters: false });
      var all = liveRows('paiements').filter(function (p) { return u.inRange(u.parseDate(p.date_paiement), a.filters.from, a.filters.to); });
      html += UI.card('Paiements', UI.table({ id: 'pay-all', csv: 'paiements', defaultSort: 'date_paiement', stack: true, columns: [
        { key: 'date_paiement', label: 'Date', render: function (r) { return d(r.date_paiement); } },
        { key: 'membre_id', label: 'Membre' },
        { key: 'objet', label: 'Objet', render: function (r) { var t = calc.paymentTarget(c, r); return t.kind === 'cycle' ? e(t.cycle ? t.cycle.nom : 'cycle') : t.kind === 'evenement' ? e(t.evenement.nom) : t.kind === 'seance' ? 'Séance ' + d(t.seance.date) : t.kind === 'autre' ? e(UI.enumOptions({ enumParam: 'categorie_revenu' })[r.categorie_revenu] || r.categorie_revenu) : UI.badge('non rattaché', 'warn'); }, text: function (r) { return calc.paymentTarget(c, r).kind; } },
        { key: 'montant', label: 'Montant', num: true, render: function (r) { return u.fmtEUR(u.num(r.montant), 2); }, sort: function (r) { return u.num(r.montant); } },
        { key: 'mode', label: 'Mode', render: function (r) { return e(schema.ENUMS.mode_paiement[r.mode] || r.mode || ''); } },
        { key: 'reference', label: 'Référence' },
        { key: 'statut', label: 'Statut', render: function (r) { return UI.status('statut_paiement', r.statut); } }
      ], rows: all, onRow: 'pay-edit' }));
    }
    return html;
  };
  var PAY_FIELDS = ['date_paiement', 'membre_id', 'inscription_id', 'evenement_id', 'seance_id', 'categorie_revenu', 'montant', 'mode', 'reference', 'statut', 'commentaire'];
  A['pay-tab'] = function (el) { payTab = el.getAttribute('data-tab'); app().render(); };
  A['pay-add'] = function () { UI.editForm('paiements', null, { fields: PAY_FIELDS, selects: ['statut', 'mode'], defaults: { date_paiement: app().today, statut: 'encaisse' }, intro: 'Rattachez le paiement à une inscription, un événement ou une séance. « Catégorie » seulement pour les autres revenus.' }); };
  A['pay-edit'] = function (el) { UI.editForm('paiements', byId('paiements', el.getAttribute('data-id')), { fields: PAY_FIELDS, selects: ['statut', 'mode'] }); };
  A['pay-collect'] = function (el) {
    var a = app(), i = byId('inscriptions', el.getAttribute('data-id'));
    var st = calc.inscriptionState(ctx(), i, a.today);
    UI.editForm('paiements', null, { title: 'Encaisser – membre ' + i.membre_id, fields: ['date_paiement', 'montant', 'mode', 'reference', 'statut', 'commentaire'], selects: ['mode'],
      defaults: { date_paiement: a.today, membre_id: i.membre_id, inscription_id: i.id, montant: u.round(st.solde, 2), statut: 'encaisse' },
      intro: e((st.cycle ? st.cycle.nom : '') + ' · attendu ' + u.fmtEUR(st.attendu, 2) + ' · déjà encaissé ' + u.fmtEUR(st.encaisse, 2)) });
  };
  A['pay-verify'] = function (el) {
    var a = app(), p = byId('paiements', el.getAttribute('data-id'));
    return a.save('paiements', Object.assign({}, p, { statut: 'encaisse', verifie_par: a.user.email, verifie_le: new Date().toISOString() }), 'Vérification').then(function () { UI.toast('Paiement vérifié.', 'ok'); a.render(); });
  };

  // ====================================================================== ÉVÉNEMENTS
  V.evenements = function () {
    var a = app(), c = ctx();
    var list = liveRows('evenements').sort(function (x, y) { return x.date < y.date ? 1 : -1; });
    var fin = a.can('pnl.view');
    var html = '<div class="action-row">' + (a.can('evenements.edit') ? UI.btn('Nouvel événement', 'ev-add', { cls: 'primary', icon: 'plus' }) : '') + '</div><div class="cards">';
    if (!list.length) html += UI.empty('Aucun événement encodé.');
    list.forEach(function (ev) {
      var s = calc.eventSummary(c, ev);
      html += '<article class="mini-card"><header><h3>' + e(ev.nom) + '</h3>' + UI.status('statut_evenement', ev.statut) + '</header><p class="muted">' + d(ev.date) + ' · ' + e(typeL(ev.type_activite)) + (ev.format ? ' · ' + e(ev.format) : '') + ' · ' + e(ev.nb_terrains || '?') + ' terrain(s)</p>' +
        '<dl class="facts"><div><dt>Inscrits / capacité</dt><dd>' + (s.inscrits === null ? '?' : s.inscrits) + ' / ' + (s.capacite === null ? '?' : s.capacite) + '</dd></div><div><dt>Remplissage</dt><dd>' + UI.measure(s.fill, 'pct') + '</dd></div>' +
        '<div><dt>Présents</dt><dd>' + (s.presents === null ? '<span class="na">?</span>' : s.presents) + '</dd></div><div><dt>Équipes</dt><dd>' + e(ev.nb_equipes || '–') + '</dd></div>' +
        (fin ? '<div><dt>Revenus</dt><dd>' + UI.measure(s.revenue, 'eur') + '</dd></div><div><dt>Coûts</dt><dd>' + UI.measure(s.costs, 'eur') + '</dd></div><div><dt>Résultat</dt><dd>' + UI.measure(s.margin, 'eur') + '</dd></div><div><dt>Coût / participant</dt><dd>' + UI.measure(s.costPerParticipant, 'eur2') + '</dd></div>' : '') +
        '<div><dt>Satisfaction</dt><dd>' + (s.satisfaction.n ? u.fmtNum(s.satisfaction.moyenne, 1) + '/10 <span class="muted">(n = ' + s.satisfaction.n + ')</span>' : '<span class="na">aucun avis</span>') + '</dd></div></dl>' +
        (ev.incidents ? '<p class="sm">' + UI.badge('incident', 'warn') + ' ' + e(ev.incidents) + '</p>' : '') +
        '<footer>' + UI.btn('Détails', 'ev-edit', { cls: 'ghost sm', data: { id: ev.id } }) + (a.can('depenses.edit') ? UI.btn('Ajouter une dépense', 'dep-add', { cls: 'ghost sm', data: { ev: ev.id } }) : '') + '</footer></article>';
    });
    return html + '</div>';
  };
  A['ev-add'] = function () { UI.editForm('evenements', null, { defaults: { statut: 'planifie', date: app().today }, wide: true }); };
  A['ev-edit'] = function (el) { UI.editForm('evenements', byId('evenements', el.getAttribute('data-id')), { wide: true }); };

  // ====================================================================== DÉPENSES
  V.depenses = function () {
    var a = app();
    var rows = liveRows('depenses').filter(function (x) { return u.inRange(u.parseDate(x.date), a.filters.from, a.filters.to); });
    var cats = UI.enumOptions({ enumParam: 'categorie_depense' });
    return UI.periodBar({ filters: false }) + '<div class="action-row">' + (a.can('depenses.edit') ? UI.btn('Nouvelle dépense', 'dep-add', { cls: 'primary', icon: 'plus' }) : '') + '</div>' +
      UI.card('Dépenses directes', UI.table({ id: 'dep', csv: 'depenses', defaultSort: 'date', columns: [
        { key: 'date', label: 'Date', render: function (r) { return d(r.date); } }, { key: 'categorie', label: 'Catégorie', render: function (r) { return e(cats[r.categorie] || r.categorie); } },
        { key: 'fournisseur', label: 'Fournisseur' }, { key: 'objet', label: 'Rattachement', render: function (r) { var ev = r.evenement_id && ctx().evenements[r.evenement_id]; return e(ev ? ev.nom : (r.type_activite ? typeL(r.type_activite) : '')); } },
        { key: 'montant', label: 'Montant', num: true, render: function (r) { return u.fmtEUR(u.num(r.montant), 2); }, sort: function (r) { return u.num(r.montant); } },
        { key: 'justificatif', label: 'Justificatif', render: function (r) { return u.isBlank(r.justificatif) ? UI.badge('manquant', 'warn') : e(r.justificatif); } },
        { key: 'statut', label: 'Statut', render: function (r) { return UI.status('statut_depense', r.statut); } }
      ], rows: rows, onRow: 'dep-edit' }));
  };
  A['dep-add'] = function (el) { UI.editForm('depenses', null, { defaults: { date: app().today, statut: 'payee', evenement_id: el.getAttribute('data-ev') || '' }, selects: ['statut'] }); };
  A['dep-edit'] = function (el) { UI.editForm('depenses', byId('depenses', el.getAttribute('data-id')), { selects: ['statut'] }); };

  // ====================================================================== SATISFACTION
  V.satisfaction = function () {
    var a = app(), c = ctx();
    var html = '';
    if (a.can('satisfaction.edit')) html += '<div class="action-row">' + UI.btn('Nouvel avis membre', 'sat-add', { cls: 'primary', icon: 'plus' }) + '</div>';
    if (!a.can('satisfaction.view')) return html + UI.empty('Vous pouvez encoder les avis des membres ; la consultation des résultats est réservée.');
    html += UI.periodBar();
    var rows = calc.satisfactionRows(c, a.filterObj());
    var n = calc.nps(rows);
    var seuil = u.num(calc.param(c, 'seuil_echantillon_nps')) || 30;
    html += '<div class="kpi-grid">' + UI.kpi({ label: 'NPS', m: n.score, fmt: 'nps', sub: '<strong>n = ' + n.n + '</strong>' + (n.n && n.n < seuil ? ' · échantillon faible (< ' + seuil + ')' : '') }) +
      UI.kpi({ label: 'Promoteurs (9-10)', m: u.known(n.promoteurs), sub: n.n ? u.fmtPct(n.promoteurs / n.n, 0) : '' }) + UI.kpi({ label: 'Passifs (7-8)', m: u.known(n.passifs), sub: n.n ? u.fmtPct(n.passifs / n.n, 0) : '' }) +
      UI.kpi({ label: 'Détracteurs (0-6)', m: u.known(n.detracteurs), sub: n.n ? u.fmtPct(n.detracteurs / n.n, 0) : '' }) +
      UI.kpi({ label: 'Note globale /10', m: u.m(n.noteGlobale.v, n.noteGlobale.n ? [] : ['Aucune note']), fmt: 'num1', sub: 'n = ' + n.noteGlobale.n }) +
      UI.kpi({ label: 'Terrains /10', m: u.m(n.noteTerrains.v, n.noteTerrains.n ? [] : ['Aucune note']), fmt: 'num1', sub: 'n = ' + n.noteTerrains.n }) +
      UI.kpi({ label: 'Organisation /10', m: u.m(n.noteOrganisation.v, n.noteOrganisation.n ? [] : ['Aucune note']), fmt: 'num1', sub: 'n = ' + n.noteOrganisation.n }) + '</div>';
    var byType = u.groupBy(rows, function (r) { return r.type_activite || ''; });
    html += '<div class="grid-2">' + UI.card('NPS par activité', UI.table({ id: 'sat-type', search: false, columns: [
      { key: 'label', label: 'Activité' }, { key: 'n', label: 'n', num: true },
      { key: 'nps', label: 'NPS', num: true, render: function (r) { return UI.measure(r.nps, 'nps'); }, sort: function (r) { return r.nps.v; } },
      { key: 'note', label: 'Note /10', num: true, render: function (r) { return r.note === null ? '<span class="na">–</span>' : u.fmtNum(r.note, 1); }, sort: function (r) { return r.note; } }
    ], rows: Object.keys(byType).map(function (t) { var x = calc.nps(byType[t]); return { id: t, label: t ? typeL(t) : 'Non précisé', n: x.n, nps: x.score, note: x.noteGlobale.v }; }) }), { sub: 'Interpréter avec prudence en dessous de ' + seuil + ' réponses.' });
    var imp = u.groupBy(rows.filter(function (r) { return !u.isBlank(r.amelioration); }), function (r) { return r.amelioration.trim(); });
    html += UI.card('Améliorations prioritaires citées', UI.bars(Object.keys(imp).sort(function (x, y) { return imp[y].length - imp[x].length; }).slice(0, 8).map(function (k) { return { label: k, v: imp[k].length, display: String(imp[k].length) }; }))) + '</div>';
    var freq = schema.ENUMS.frequence;
    function dist(key) { var g = u.groupBy(rows.filter(function (r) { return r[key]; }), function (r) { return r[key]; }); return Object.keys(freq).map(function (k) { return { label: freq[k], v: (g[k] || []).length, display: String((g[k] || []).length) }; }); }
    html += '<div class="grid-2">' + UI.card('Fréquence de jeu avant l\'indoor', UI.bars(dist('frequence_avant'))) + UI.card('Fréquence de jeu depuis l\'indoor', UI.bars(dist('frequence_apres'), { color: UI.COLORS.C2 })) + '</div>';
    html += UI.card('Réponses', UI.table({ id: 'sat-rows', csv: 'satisfaction', defaultSort: 'date', columns: [
      { key: 'date', label: 'Date', render: function (r) { return d(r.date); } }, { key: 'type_activite', label: 'Activité', render: function (r) { return e(typeL(r.type_activite)); } },
      { key: 'note_globale', label: 'Note', num: true }, { key: 'recommandation', label: 'Reco.', num: true }, { key: 'amelioration', label: 'Amélioration' }, { key: 'commentaire', label: 'Commentaire' }
    ], rows: rows, onRow: 'sat-edit', pageSize: 25 }));
    return html;
  };
  var SAT_FIELDS = ['date', 'type_activite', 'evenement_id', 'membre_id', 'note_globale', 'note_terrains', 'note_organisation', 'recommandation', 'frequence_avant', 'frequence_apres', 'activite_preferee', 'amelioration', 'commentaire'];
  A['sat-add'] = function () { UI.editForm('satisfaction', null, { title: 'Avis membre', fields: SAT_FIELDS, selects: ['frequence_avant', 'frequence_apres', 'type_activite', 'activite_preferee'], defaults: { date: app().today, source: 'formulaire' }, intro: 'Questionnaire court. L\'identifiant membre est facultatif (avis anonyme possible).', labels: { recommandation: 'Recommanderiez-vous le padel du club à un ami ? (0-10)' } }); };
  A['sat-edit'] = function (el) { UI.editForm('satisfaction', byId('satisfaction', el.getAttribute('data-id')), { fields: SAT_FIELDS, selects: ['frequence_avant', 'frequence_apres', 'type_activite', 'activite_preferee'] }); };

  // ====================================================================== MEMBRES
  V.membres = function () {
    var a = app(), c = ctx();
    var counts = {};
    c.db.presences.forEach(function (p) { if (p.statut === 'present') counts[p.membre_id] = (counts[p.membre_id] || 0) + 1; });
    return '<div class="action-row">' + (a.can('membres.edit') ? UI.btn('Nouveau membre', 'mbr-add', { cls: 'primary', icon: 'plus' }) : '') + '</div>' +
      UI.notice('Données minimales (RGPD) : un identifiant membre suffit. N\'encodez pas d\'e-mail, de téléphone ni de nom complet.', 'info') +
      UI.card('Référentiel membres', UI.table({ id: 'mbr', csv: 'membres', columns: [
        { key: 'id', label: 'ID membre' }, { key: 'alias', label: 'Alias' }, { key: 'segment', label: 'Segment', render: function (r) { return e(schema.ENUMS.segment[r.segment] || r.segment); } },
        { key: 'niveau', label: 'Niveau', num: true, render: function (r) { var lv = calc.param(c, String(r.niveau), null, 'niveau'); return r.niveau ? e(r.niveau + (lv ? ' – ' + lv : '')) : ''; } },
        { key: 'categorie_abonnement', label: 'Abonnement' }, { key: 'part', label: 'Participations', num: true, render: function (r) { return String(counts[r.id] || 0); }, sort: function (r) { return counts[r.id] || 0; } },
        { key: 'statut', label: 'Statut', render: function (r) { return UI.status('statut_membre', r.statut); } }
      ], rows: liveRows('membres'), onRow: 'mbr-edit' }), { sub: 'L\'historique des changements de niveau (date, motif, auteur) est conservé dans le Journal d\'audit.' });
  };
  A['mbr-add'] = function () { UI.editForm('membres', null, { fields: ['id', 'alias', 'segment', 'categorie_abonnement', 'niveau', 'date_niveau', 'motif_niveau', 'statut', 'commentaire'], defaults: { statut: 'actif', segment: 'adulte' } }); };
  A['mbr-edit'] = function (el) {
    var m = byId('membres', el.getAttribute('data-id'));
    UI.editForm('membres', m, { fields: ['alias', 'segment', 'categorie_abonnement', 'niveau', 'date_niveau', 'motif_niveau', 'statut', 'commentaire'],
      beforeSave: function (data) { if (String(data.niveau) !== String(m.niveau) && u.isBlank(data.motif_niveau === m.motif_niveau ? '' : data.motif_niveau)) return 'Changement de niveau : indiquez un nouveau motif et la date.'; } });
  };
})(typeof globalThis !== 'undefined' ? globalThis : this);
