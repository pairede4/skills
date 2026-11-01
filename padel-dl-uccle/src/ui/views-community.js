/**
 * Écran « Communauté & pénétration » : programme gratuit vs objectifs, indicateurs
 * Power BI (taux de pénétration, membres qui réservent, âge moyen…) et saisie mensuelle.
 */
(function (root) {
  'use strict';
  var Padel = root.Padel;
  var u = Padel.util, calc = Padel.calc, UI = Padel.ui, CM = Padel.community, schema = Padel.schema;
  var e = u.escapeHtml, V = UI.views, A = UI.actions;
  function app() { return UI.app; }

  function unitFmt(unite) {
    if (unite === 'pourcent') return function (v) { return u.fmtNum(v, 1) + ' %'; };
    if (unite === 'ans') return function (v) { return u.fmtNum(v, 1) + ' ans'; };
    if (unite === 'heures') return 'h';
    return 'int';
  }

  /** Cartes KPI communauté (réutilisées par le tableau de bord). */
  UI.communityKpis = function (cur, prev, compact) {
    var d = cur.derived, v = cur.values, pd = prev ? prev.derived : null, pv = prev ? prev.values : null;
    var obj = cur.objectifPenetration;
    var cards = [
      UI.kpi({ label: 'Taux de pénétration padel', m: d.penetration, fmt: 'pct', prev: pd && pd.penetration, help: 'Membres ayant joué au padel ÷ membres du club (Power BI)',
        sub: obj !== null ? 'objectif ' + u.fmtPct(obj, 0) : (d.penetrationPowerBI.v !== null ? 'Power BI : ' + u.fmtPct(d.penetrationPowerBI.v) : '') }),
      UI.kpi({ label: 'Membres qui réservent un terrain', m: v.membres_reservants || u.missing('non paramétré'), prev: pv && pv.membres_reservants, sub: d.tauxReservants.v !== null ? u.fmtPct(d.tauxReservants.v) + ' des membres du club' : '' }),
      UI.kpi({ label: 'Réservations de terrains', m: v.reservations_terrains || u.missing('non paramétré'), prev: pv && pv.reservations_terrains, sub: d.reservationsParReservant.v !== null ? u.fmtNum(d.reservationsParReservant.v, 1) + ' par membre qui réserve' : '' }),
      UI.kpi({ label: 'Nouveaux membres qui jouent', m: d.penetrationNouveaux, fmt: 'pct', prev: pd && pd.penetrationNouveaux, help: 'Nouveaux membres ayant joué au padel ÷ nouveaux membres du club' })
    ];
    if (!compact) cards = cards.concat([
      UI.kpi({ label: 'Membres actifs padel', m: v.membres_padel_actifs || u.missing('non paramétré'), prev: pv && pv.membres_padel_actifs }),
      UI.kpi({ label: 'Membres du club', m: v.membres_club_total || u.missing('non paramétré'), prev: pv && pv.membres_club_total }),
      UI.kpi({ label: 'Âge moyen des joueurs', m: v.age_moyen_padel || u.missing('non paramétré'), fmt: unitFmt('ans'), sub: v.age_moyen_club && v.age_moyen_club.v !== null ? 'club : ' + u.fmtNum(v.age_moyen_club.v, 1) + ' ans' : '' }),
      UI.kpi({ label: 'Participation aux événements', m: d.participationEvenements, fmt: 'pct', help: 'Participants aux événements ÷ membres actifs padel' }),
      UI.kpi({ label: 'Nouveaux joueurs venus du programme gratuit', m: d.partRecruteeProgramme, fmt: 'pct', help: 'Nouveaux joueurs dont la 1re activité est gratuite ÷ nouveaux joueurs (Power BI)' })
    ]);
    return '<div class="kpi-grid">' + cards.join('') + '</div>';
  };

  UI.freeProgramTable = function (fp, id) {
    return UI.table({ id: id || 'fp', search: false, csv: 'programme-gratuit', columns: [
      { key: 'label', label: 'Activité' },
      { key: 'obj', label: 'Objectif / sem.', num: true, render: function (r) { return r.objectifSemaine === null ? '<span class="na">–</span>' : String(r.objectifSemaine); }, sort: function (r) { return r.objectifSemaine; } },
      { key: 'real', label: 'Réalisées', num: true, render: function (r) { return r.realisees + ' / ' + (r.objectif.v === null ? '?' : u.fmtNum(r.objectif.v, 0)); }, sort: function (r) { return r.realisees; } },
      { key: 'att', label: 'Atteinte', num: true, render: function (r) { return UI.measure(r.atteinte, 'pct'); }, sort: function (r) { return r.atteinte.v; } },
      { key: 'fill', label: 'Remplissage', num: true, render: function (r) { return UI.measure(r.remplissage, 'pct'); }, sort: function (r) { return r.remplissage.v; } },
      { key: 'pres', label: 'Présence', num: true, render: function (r) { return UI.measure(r.presence, 'pct'); }, sort: function (r) { return r.presence.v; } },
      { key: 'part', label: 'Participations', num: true, render: function (r) { return UI.measure(r.participations); }, sort: function (r) { return r.participations.v; } },
      { key: 'uniq', label: 'Participants', num: true, render: function (r) { return UI.measure(r.participants); }, sort: function (r) { return r.participants.v; } },
      { key: 'new', label: 'Nouveaux joueurs', num: true, render: function (r) { return UI.measure(r.nouveaux); }, sort: function (r) { return r.nouveaux.v; } },
      { key: 'h', label: 'Heures de terrain', num: true, render: function (r) { return UI.measure(r.heuresTerrain, 'h'); }, sort: function (r) { return r.heuresTerrain.v; } }
    ], rows: fp.rows.map(function (r) { r.id = r.type; return r; }), empty: 'Aucune activité gratuite paramétrée.' });
  };

  V.communaute = function () {
    var a = app(), c = a.ctx, f = a.filterObj();
    var pp = u.previousPeriod(a.period());
    var ci = CM.clubIndicators(c, f), cp = CM.clubIndicators(c, a.filterObj({ from: pp.from, to: pp.to }));
    var fp = CM.freeProgram(c, f);
    var html = UI.periodBar();
    var hasPBI = (a.db.indicateurs || []).some(function (r) { return r.archive !== true; });
    html += '<div class="action-row">' + (a.can('indicateurs.edit') ? UI.btn('Saisir les chiffres Power BI d\'un mois', 'pbi-month', { cls: 'primary', icon: 'plus' }) : '') +
      (a.can('imports.run') ? '<a class="btn ghost" href="#/imports">' + UI.icon('upload', 16) + '<span>Importer un export</span></a>' : '') + '</div>';
    if (!hasPBI) html += UI.notice('<strong>Aucun chiffre Power BI encodé.</strong> Le taux de pénétration, le nombre de membres qui réservent, les réservations et l\'âge moyen restent « donnée indisponible » jusqu\'à la première saisie. Rien n\'est estimé.', 'warn');
    html += '<div class="kpi-group"><h3>Pénétration et réservations (Power BI)</h3>' + UI.communityKpis(ci, cp) + '</div>';
    html += '<div class="kpi-group"><h3>Programme gratuit (' + u.fmtNum(fp.weeks, 1) + ' semaine(s) écoulée(s))</h3><div class="kpi-grid">' +
      UI.kpi({ label: 'Séances réalisées / objectif', m: fp.total.realisees, sub: 'objectif : ' + (fp.total.objectif.v === null ? u.INDISPO : u.fmtNum(fp.total.objectif.v, 0)) }) +
      UI.kpi({ label: 'Atteinte de l\'objectif', m: fp.total.atteinte, fmt: 'pct', sub: fp.total.sansObjectif.length ? e('Sans objectif : ' + fp.total.sansObjectif.join(', ')) : '' }) +
      UI.kpi({ label: 'Participants (uniques)', m: fp.total.participants }) +
      UI.kpi({ label: 'Nouveaux joueurs recrutés', m: fp.total.nouveaux, help: 'Membres dont la toute première activité padel encadrée est une activité gratuite de la période' }) +
      UI.kpi({ label: 'Conversion Taster (' + (fp.delai || '?') + ' j)', m: fp.conversion, fmt: 'pct', sub: fp.convertis + ' / ' + fp.tasters + ' Tasters' }) +
      UI.kpi({ label: 'Heures de terrain du programme', m: fp.total.heuresTerrain, fmt: 'h', sub: fp.total.partOccupation.v !== null ? u.fmtPct(fp.total.partOccupation.v) + ' des heures disponibles' : '' }) + '</div></div>';
    html += UI.card('Programme gratuit par activité', UI.freeProgramTable(fp, 'fp'), { sub: 'Objectifs modifiables dans Paramètres → Objectifs. Les inscriptions venant de l\'application des membres s\'importent via « Imports → Liste de présences ».' });
    var series = CM.monthlyCommunity(c, a.histStart(), a.today);
    html += '<div class="grid-2">' + UI.card('Taux de pénétration par mois', UI.lineChart(series.map(function (s) { return { label: s.label, v: s.penetration.v }; }), { fmt: function (v) { return u.fmtPct(v, 0); }, title: 'Taux de pénétration par mois' }), { sub: 'Source : chiffres Power BI encodés.' }) +
      UI.card('Participants au programme gratuit par mois', UI.lineChart(series.map(function (s) { return { label: s.label, v: s.participants.v }; }), { color: UI.COLORS.C2, title: 'Participants au programme gratuit' })) + '</div>';
    var rows = (a.db.indicateurs || []).filter(function (r) { return r.archive !== true; });
    var defs = {}; CM.indicatorDefs(c).forEach(function (dd) { defs[dd.code] = dd; });
    html += UI.card('Chiffres Power BI encodés', UI.table({ id: 'pbi', csv: 'indicateurs-club', defaultSort: 'date_fin', columns: [
      { key: 'date_debut', label: 'Du', render: function (r) { return u.fmtDate(r.date_debut); } }, { key: 'date_fin', label: 'Au', render: function (r) { return u.fmtDate(r.date_fin); } },
      { key: 'indicateur', label: 'Indicateur', render: function (r) { return e(defs[r.indicateur] ? defs[r.indicateur].label : r.indicateur); }, text: function (r) { return defs[r.indicateur] ? defs[r.indicateur].label : r.indicateur; } },
      { key: 'segment', label: 'Segment', render: function (r) { return e(schema.ENUMS.segment_kpi[r.segment] || r.segment); } },
      { key: 'valeur', label: 'Valeur', num: true, render: function (r) { return u.fmtNum(u.num(r.valeur), 1); }, sort: function (r) { return u.num(r.valeur); } },
      { key: 'source', label: 'Source' }
    ], rows: rows, onRow: a.can('indicateurs.edit') ? 'pbi-edit' : null, empty: 'Aucun chiffre encodé.' }),
    { sub: 'Une ligne par indicateur et par période. Les chiffres « stock » (nombre de membres, âge) prennent la période la plus récente ; les flux (réservations, nouveaux membres) s\'additionnent.' });
    return html;
  };

  A['pbi-edit'] = function (el) { UI.editForm('indicateurs', (app().db.indicateurs || []).filter(function (r) { return r.id === el.getAttribute('data-id'); })[0]); };

  /** Saisie mensuelle : un champ par indicateur. */
  A['pbi-month'] = function () {
    var a = app(), defs = CM.indicatorDefs(a.ctx);
    var prevMonth = u.addMonths(u.startOfMonth(a.today), -1).slice(0, 7);
    var body = '<form class="form-grid" id="pbi-form"><label class="field"><span>Mois</span><input class="input" type="month" name="mois" value="' + prevMonth + '" required></label>' +
      '<label class="field"><span>Segment</span><select class="input" name="segment">' + Object.keys(schema.ENUMS.segment_kpi).map(function (k) { return '<option value="' + k + '">' + schema.ENUMS.segment_kpi[k] + '</option>'; }).join('') + '</select></label>' +
      '<label class="field full"><span>Source</span><input class="input" name="source" value="Power BI"></label>' +
      defs.map(function (dd) { return '<label class="field"><span>' + e(dd.label) + '</span><input class="input" type="text" inputmode="decimal" name="k-' + e(dd.code) + '" placeholder="' + e(dd.unite) + '"><small class="help">' + (dd.agregation === 'somme' ? 'Total du mois' : 'Valeur à la fin du mois') + '</small></label>'; }).join('') +
      '</form><p class="muted sm">Laissez vide ce que Power BI ne donne pas : la case restera « inconnue », jamais zéro. Une valeur déjà saisie pour ce mois est remplacée.</p><div class="form-errors" role="alert"></div>';
    var m = UI.modal('Chiffres Power BI du mois', body, { wide: true, footer: '<span class="spacer"></span>' + UI.btn('Annuler', 'modal-close', { cls: 'ghost' }) + UI.btn('Enregistrer', 'pbi-save', { cls: 'primary', icon: 'check' }) });
    function fill() {
      var f = m.querySelector('#pbi-form'), mo = f.mois.value; if (!mo) return;
      var from = mo + '-01', to = u.endOfMonth(from), seg = f.segment.value;
      defs.forEach(function (dd) {
        var r = (a.db.indicateurs || []).filter(function (x) { return x.archive !== true && x.indicateur === dd.code && (x.segment || 'total') === seg && x.date_debut === from && x.date_fin === to; })[0];
        f['k-' + dd.code].value = r ? String(r.valeur).replace('.', ',') : '';
      });
    }
    m.querySelector('[name=mois]').addEventListener('change', fill); m.querySelector('[name=segment]').addEventListener('change', fill); fill();
    m.querySelector('[data-action="pbi-save"]').addEventListener('click', function () {
      var f = m.querySelector('#pbi-form'), mo = f.mois.value, err = m.querySelector('.form-errors');
      if (!/^\d{4}-\d{2}$/.test(mo)) { err.textContent = 'Choisissez un mois.'; return; }
      var from = mo + '-01', to = u.endOfMonth(from), seg = f.segment.value, recs = [], bad = [];
      defs.forEach(function (dd) {
        var raw = f['k-' + dd.code].value.trim(); if (!raw) return;
        var n = u.num(raw); if (n === null) { bad.push(dd.label); return; }
        var ex = (a.db.indicateurs || []).filter(function (x) { return x.archive !== true && x.indicateur === dd.code && (x.segment || 'total') === seg && x.date_debut === from && x.date_fin === to; })[0];
        recs.push(Object.assign({}, ex || {}, { date_debut: from, date_fin: to, indicateur: dd.code, segment: seg, valeur: n, source: f.source.value }));
      });
      if (bad.length) { err.textContent = 'Nombre illisible : ' + bad.join(', '); return; }
      if (!recs.length) { err.textContent = 'Aucune valeur saisie.'; return; }
      a.saveMany('indicateurs', recs, 'Chiffres Power BI ' + mo).then(function () { UI.closeModal(); UI.toast(recs.length + ' indicateur(s) enregistré(s).', 'ok'); a.render(); })
        .catch(function (x) { err.textContent = x.message; });
    });
  };
})(typeof globalThis !== 'undefined' ? globalThis : this);
