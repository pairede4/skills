/**
 * Écrans de pilotage et d'administration : P&L, rapports, imports, qualité des
 * données, paramètres, journal d'audit, aide et sauvegarde.
 */
(function (root) {
  'use strict';
  var Padel = root.Padel;
  var u = Padel.util, calc = Padel.calc, UI = Padel.ui, schema = Padel.schema, P = Padel.permissions;
  var e = u.escapeHtml, V = UI.views, A = UI.actions;
  function app() { return UI.app; }
  function ctx() { return UI.app.ctx; }
  function d(x) { return u.fmtDate(u.parseDate(x)); }
  function byId(sheet, id) { return (app().db[sheet] || []).filter(function (r) { return String(r.id) === String(id); })[0]; }
  function liveRows(sheet) { return (app().db[sheet] || []).filter(function (r) { return r.archive !== true; }); }

  // ====================================================================== P&L
  var lastPnl = null;
  V.pnl = function () {
    var a = app(), c = ctx();
    var p = lastPnl = calc.pnl(c, a.filterObj());
    var pp = u.previousPeriod(a.period()), prev = calc.pnl(c, a.filterObj({ from: pp.from, to: pp.to }));
    function line(label, m, trace, opts) {
      opts = opts || {};
      return '<tr class="' + (opts.cls || '') + '"><th scope="row">' + (opts.indent ? '<span class="indent"></span>' : '') + e(label) + '</th><td class="num">' + UI.measure(m, 'eur2') + '</td><td class="num muted">' + (opts.prev ? UI.measure(opts.prev, 'eur') : '') + '</td><td class="num">' +
        (trace ? '<button type="button" class="link-btn" data-action="pnl-trace" data-trace="' + trace + '">Détail</button>' : '') + '</td></tr>';
    }
    var cats = Object.keys(calc.REVENUE_LABELS).filter(function (k) { return k !== 'cours_prives' || c.includePrivate; });
    var html = UI.periodBar();
    html += '<div class="kpi-grid">' + UI.kpi({ label: 'Encaissements', m: p.encaissements, fmt: 'eur', prev: prev.encaissements }) + UI.kpi({ label: 'Revenus reconnus', m: p.revenusReconnus, fmt: 'eur', prev: prev.revenusReconnus }) +
      UI.kpi({ label: 'Restant à délivrer', m: p.aDelivrer, fmt: 'eur', help: 'Payé d\'avance pour des séances futures, à la fin de la période' }) + UI.kpi({ label: 'Marge brute', m: p.margeBrute, fmt: 'eur', prev: prev.margeBrute }) +
      UI.kpi({ label: 'Taux de marge', m: p.tauxMarge, fmt: 'pct', prev: prev.tauxMarge }) + UI.kpi({ label: 'Marge par participant', m: p.margeParParticipant, fmt: 'eur2' }) + '</div>';
    var t = '<div class="tbl-scroll"><table class="tbl pnl"><thead><tr><th>Compte de résultat padel</th><th class="num">Période</th><th class="num">Période préc.</th><th></th></tr></thead><tbody>' +
      '<tr class="group"><th colspan="4">Revenus reconnus (séances et événements réellement délivrés)</th></tr>' +
      cats.map(function (k) { return line(calc.REVENUE_LABELS[k], p.revenusByCat[k], 'reco:' + k, { indent: true, prev: prev.revenusByCat[k] }); }).join('') +
      line('Total revenus reconnus', p.revenusReconnus, 'reco:all', { cls: 'total', prev: prev.revenusReconnus }) +
      '<tr class="group"><th colspan="4">Coûts directs</th></tr>' +
      line('Heures des coachs (validées et payées)', p.coutsCoachs, 'coach:confirmed', { indent: true, prev: prev.coutsCoachs }) +
      Object.keys(p.coutsDirectsByCat).map(function (k) { return line(UI.enumOptions({ enumParam: 'categorie_depense' })[k] || k, p.coutsDirectsByCat[k], 'dep:' + k, { indent: true }); }).join('') +
      (u.bool(calc.param(c, 'inclure_cout_terrains')) ? line('Coût théorique des terrains', p.coutTerrains, null, { indent: true }) : '') +
      line('Total coûts directs', u.sum([p.coutsCoachs, p.coutsDirects, p.coutTerrains]), null, { cls: 'total' }) +
      line('Marge brute', p.margeBrute, null, { cls: 'grand', prev: prev.margeBrute }) +
      '<tr class="group"><th colspan="4">Trésorerie et engagements (hors marge)</th></tr>' +
      line('Encaissements de la période', p.encaissements, 'cash:all', { indent: true, prev: prev.encaissements }) +
      line('Revenus payés d\'avance restant à délivrer (fin de période)', p.aDelivrer, 'deferred', { indent: true }) +
      line('Heures coachs soumises, pas encore validées', p.coutsCoachsProvisoires, 'coach:pending', { indent: true }) +
      '</tbody></table></div>';
    html += UI.card('Compte de résultat', t, { sub: e(p.exclusions.join(' ')) + ' Cliquez sur « Détail » pour voir les lignes sources.' });
    if (p.budget) {
      var map = { revenus_reconnus: p.revenusReconnus, encaissements: p.encaissements, couts_coachs: p.coutsCoachs, couts_directs: p.coutsDirects, marge_brute: p.margeBrute };
      html += UI.card('Budget / réel', '<div class="tbl-scroll"><table class="tbl"><thead><tr><th>Poste</th><th class="num">Budget</th><th class="num">Réel</th><th class="num">Écart</th></tr></thead><tbody>' +
        Object.keys(p.budget.values).map(function (k) { var r = map[k]; var b = p.budget.values[k]; return '<tr><td>' + e(k.replace(/_/g, ' ')) + '</td><td class="num">' + u.fmtEUR(b) + '</td><td class="num">' + (r ? UI.measure(r, 'eur') : '–') + '</td><td class="num">' + (r && r.v !== null ? u.fmtEUR(r.v - b) : '<span class="na">' + u.INDISPO + '</span>') + '</td></tr>'; }).join('') +
        '</tbody></table></div>', { sub: p.budget.aligned ? '' : 'Période non alignée sur des mois entiers : le budget des mois touchés est comparé en entier.' });
    }
    html += UI.card('Marge par activité', UI.table({ id: 'pnl-act', search: false, csv: 'marge-activites', columns: [
      { key: 'label', label: 'Activité' },
      { key: 'rv', label: 'Revenu reconnu', num: true, render: function (r) { return UI.measure(r.revenue, 'eur'); }, sort: function (r) { return r.revenue.v; } },
      { key: 'cc', label: 'Coût coachs', num: true, render: function (r) { return UI.measure(r.coachCost, 'eur'); }, sort: function (r) { return r.coachCost.v; } },
      { key: 'dc', label: 'Coûts directs', num: true, render: function (r) { return UI.measure(r.direct, 'eur'); }, sort: function (r) { return r.direct.v; } },
      { key: 'mg', label: 'Marge', num: true, render: function (r) { return UI.measure(r.margin, 'eur'); }, sort: function (r) { return r.margin.v; } },
      { key: 'pa', label: 'Participations', num: true },
      { key: 'mp', label: 'Marge / participation', num: true, render: function (r) { return UI.measure(r.marginPerParticipation, 'eur2'); }, sort: function (r) { return r.marginPerParticipation.v; } }
    ], rows: p.byActivity.map(function (r) { return Object.assign({ id: r.type, pa: r.participations }, r); }) }));
    html += UI.card('Marge par académie (cycle)', UI.table({ id: 'pnl-cyc', search: false, csv: 'marge-cycles', columns: [
      { key: 'label', label: 'Cycle' }, { key: 'offre', label: 'Offre' }, { key: 'participants', label: 'Participants', num: true },
      { key: 'rv', label: 'Revenu reconnu', num: true, render: function (r) { return UI.measure(r.revenue, 'eur'); }, sort: function (r) { return r.revenue.v; } },
      { key: 'cc', label: 'Coût coachs', num: true, render: function (r) { return UI.measure(r.coachCost, 'eur'); }, sort: function (r) { return r.coachCost.v; } },
      { key: 'mg', label: 'Marge', num: true, render: function (r) { return UI.measure(r.margin, 'eur'); }, sort: function (r) { return r.margin.v; } },
      { key: 'mp', label: 'Marge / participant', num: true, render: function (r) { return UI.measure(r.marginPerParticipant, 'eur2'); }, sort: function (r) { return r.marginPerParticipant.v; } }
    ], rows: p.byCycle, empty: 'Aucun cycle avec activité sur la période.' }));
    return html;
  };
  /** Traçabilité : lignes sources d'un chiffre du P&L. */
  A['pnl-trace'] = function (el) {
    var p = lastPnl, key = el.getAttribute('data-trace').split(':');
    var lines, title;
    if (key[0] === 'reco') { lines = p.lines.recognized.filter(function (l) { return key[1] === 'all' || l.categorie === key[1]; }); title = 'Revenus reconnus – ' + (calc.REVENUE_LABELS[key[1]] || 'total'); }
    if (key[0] === 'cash') { lines = p.lines.cash; title = 'Encaissements'; }
    if (key[0] === 'coach') { lines = p.lines.coach.filter(function (l) { return key[1] === 'confirmed' ? l.confirmed : (!l.confirmed && l.statut !== 'brouillon'); }); title = 'Coûts des coachs'; }
    if (key[0] === 'dep') { lines = p.lines.direct.filter(function (l) { return (l.categorie || 'autre') === key[1]; }); title = 'Dépenses – ' + key[1]; }
    if (key[0] === 'deferred') { lines = p.lines.deferred; title = 'Revenus restant à délivrer'; }
    var html = '<p class="muted">' + lines.length + ' ligne(s) source. Feuille et identifiant permettent de retrouver chaque ligne dans Google Sheets.</p><div class="tbl-scroll"><table class="tbl"><thead><tr><th>Feuille</th><th>ID</th><th>Date</th><th>Libellé</th><th class="num">Montant</th></tr></thead><tbody>' +
      lines.slice(0, 500).map(function (l) { return '<tr><td>' + e(l.source) + '</td><td><code>' + e(l.id) + '</code></td><td>' + (l.date ? d(l.date) : '') + '</td><td>' + e(l.libelle || '') + (l.gaps && l.gaps.length ? ' <span class="badge warn" title="' + e(l.gaps.join('\n')) + '">' + (l.montant === null ? 'inconnu' : 'à vérifier') + '</span>' : '') + '</td><td class="num">' + (l.montant === null || l.montant === undefined ? '<span class="na">' + u.INDISPO + '</span>' : u.fmtEUR(l.montant, 2)) + '</td></tr>'; }).join('') +
      '</tbody></table></div>';
    var m = UI.modal(title, html, { wide: true, footer: '<span class="spacer"></span>' + UI.btn('Exporter en CSV', 'trace-csv', { cls: 'ghost', icon: 'download' }) + UI.btn('Fermer', 'modal-close', { cls: 'primary' }) });
    m.querySelector('[data-action="trace-csv"]').addEventListener('click', function () {
      UI.download('trace.csv', Padel.importer.toCSV(['Feuille', 'ID', 'Date', 'Libellé', 'Montant'], lines.map(function (l) { return [l.source, l.id, l.date || '', l.libelle || '', l.montant === null ? 'inconnu' : l.montant]; })), 'text/csv;charset=utf-8');
    });
  };

  // ====================================================================== RAPPORTS
  var rep = { id: null, from: null, to: null, data: null };
  function draftKey() { return 'padel-rapport-' + rep.id + '-' + rep.from + '-' + rep.to; }
  function defaultRange(id) {
    var a = app(), t = a.today;
    if (id === 'hebdo') { var w = u.periodRange('semaine', u.addDays(t, -7)); return [w.from, w.to]; }
    if (id === 'mensuel') { var m = u.periodRange('mois', u.addMonths(u.startOfMonth(t), -1)); return [m.from, m.to]; }
    if (id === 'trimestre') { var q = u.periodRange('trimestre', u.addMonths(u.startOfQuarter(t), -3)); return [q.from, q.to]; }
    return [a.histStart(), t];
  }
  V.rapports = function () {
    var a = app(), T = Padel.reports.TEMPLATES;
    var html = '<div class="cards report-picker">' + Object.keys(T).map(function (id) {
      return '<button type="button" class="mini-card pick' + (rep.id === id ? ' active' : '') + '" data-action="rep-pick" data-id="' + id + '"><h3>' + e(T[id].label) + '</h3><p class="muted">Pour : ' + e(T[id].audience) + '</p></button>';
    }).join('') + '</div>';
    if (!rep.id) return html + UI.empty('Choisissez un modèle de rapport.');
    html += '<div class="period-bar"><label class="field inline"><span>Du</span><input class="input sm" type="date" value="' + e(rep.from) + '" data-action="rep-from"></label><label class="field inline"><span>Au</span><input class="input sm" type="date" value="' + e(rep.to) + '" data-action="rep-to"></label>' +
      UI.btn('Générer', 'rep-build', { cls: 'primary sm' }) + '<span class="spacer"></span>' +
      (rep.data && a.can('rapports.export') ? UI.btn('Imprimer / PDF', 'rep-print', { cls: 'ghost sm', icon: 'print' }) + UI.btn('CSV', 'rep-csv', { cls: 'ghost sm', icon: 'download' }) : '') + '</div>';
    if (rep.data) html += renderReport(rep.data);
    return html;
  };
  var KIND = { faits: ['Fait vérifié', 'k-fait'], manquants: ['Données manquantes', 'k-manque'], constats: ['Constat', 'k-constat'], recommandations: ['Recommandation', 'k-reco'], saisie: ['À rédiger', 'k-saisie'] };
  function renderReport(r) {
    var drafts = {};
    try { drafts = JSON.parse(root.localStorage.getItem(draftKey()) || '{}'); } catch (x) { drafts = {}; }
    var a = app();
    var html = '<article class="report" id="report"><header class="report-h"><div class="brand-mark">DL</div><div><p class="eyebrow">David Lloyd Brussels Uccle · Padel</p><h2>' + e(r.title) + '</h2>' +
      '<p class="muted">Période : ' + d(r.period.from) + ' – ' + d(r.period.to) + ' · Destinataire : ' + e(r.audience) + ' · Généré le ' + d(r.generatedAt) + ' par ' + e(a.user.nom_affiche || a.user.email) + '</p>' +
      (a.mode === 'demo' ? '<p class="report-demo">DONNÉES FICTIVES – RAPPORT DE DÉMONSTRATION</p>' : '') + '</div></header>' +
      '<p class="report-legend">' + Object.keys(KIND).map(function (k) { return '<span class="kind ' + KIND[k][1] + '">' + KIND[k][0] + '</span>'; }).join(' ') + '</p>';
    r.sections.forEach(function (s, i) {
      var k = KIND[s.kind];
      html += '<section class="report-s ' + k[1] + '"><h3><span class="kind ' + k[1] + '">' + k[0] + '</span> ' + e(s.title) + '</h3>';
      if (s.kpis) html += '<div class="kpi-grid compact">' + s.kpis.map(function (x) {
        return '<div class="kpi"><div class="kpi-label">' + e(x.label) + '</div><div class="kpi-value">' + (x.raw === null ? '<span class="na" title="' + e(x.gaps.join('\n')) + '">' + u.INDISPO + '</span>' : e(x.value)) +
          (x.incomplete ? ' <span class="badge warn" title="' + e(x.gaps.join('\n')) + '">incomplet</span>' : '') + '</div>' +
          (x.prevValue !== null ? '<div class="kpi-sub">période précédente : ' + e(x.prevValue) + (x.delta !== null ? ' (' + (x.delta > 0 ? '+' : '') + u.fmtPct(x.delta, 0) + ')' : '') + '</div>' : '') + (x.note ? '<div class="kpi-sub">' + e(x.note) + '</div>' : '') + '</div>';
      }).join('') + '</div>';
      if (s.table) html += s.table.rows.length ? '<div class="tbl-scroll"><table class="tbl"><thead><tr>' + s.table.headers.map(function (h, j) { return '<th' + (j ? ' class="num"' : '') + '>' + e(h) + '</th>'; }).join('') + '</tr></thead><tbody>' +
        s.table.rows.map(function (row) { return '<tr>' + row.map(function (c, j) { return '<td' + (j ? ' class="num"' : '') + '>' + (String(c) === u.INDISPO ? '<span class="na">' + u.INDISPO + '</span>' : e(c)) + '</td>'; }).join('') + '</tr>'; }).join('') + '</tbody></table></div>' : '<p class="muted">Aucune donnée.</p>';
      if (s.note) html += '<p class="muted sm">' + e(s.note) + '</p>';
      if (s.items && s.items.length) html += '<ul class="report-list">' + s.items.map(function (it) { return '<li>' + e(it) + '</li>'; }).join('') + (s.more ? '<li class="muted">… et ' + s.more + ' autre(s) (écran « Qualité des données »).</li>' : '') + '</ul>';
      else if (s.items) html += '<p class="muted">Rien à signaler.</p>';
      if (s.kind === 'recommandations' && !s.field) html += '<p class="muted sm">Suggestions générées par des règles explicites : à valider avant diffusion.</p>';
      if (s.field) {
        var val = drafts[s.field] || '';
        html += '<textarea class="input report-input no-print" rows="4" placeholder="' + e(s.placeholder || '') + '" data-action="rep-draft" data-live data-field="' + s.field + '">' + e(val) + '</textarea>' +
          '<div class="print-only report-text">' + (val ? e(val).replace(/\n/g, '<br>') : '<em>Non renseigné.</em>') + '</div>';
      }
      html += '</section>';
    });
    return html + '<footer class="report-f muted sm">Chaque chiffre provient des feuilles Google Sheets (traçable depuis l\'écran P&L). Une « donnée indisponible » signifie que l\'information manque : elle n\'est jamais remplacée par zéro.</footer></article>';
  }
  A['rep-pick'] = function (el) { var id = el.getAttribute('data-id'); var r = defaultRange(id); rep = { id: id, from: r[0], to: r[1], data: null }; buildReport(); };
  A['rep-from'] = function (el) { rep.from = el.value; };
  A['rep-to'] = function (el) { rep.to = el.value; };
  A['rep-build'] = function () { buildReport(); };
  function buildReport() {
    var a = app();
    if (!u.parseDate(rep.from) || !u.parseDate(rep.to) || rep.from > rep.to) { UI.toast('Période invalide.', 'bad'); return; }
    if (rep.id === 'trimestre' && Padel.reports.monthsBetween(rep.from, rep.to).length !== 3) UI.toast('Le rapport trimestriel compare trois mois : choisissez une période de trois mois.', 'bad');
    rep.data = Padel.reports.build(a.ctx, rep.id, { from: rep.from, to: rep.to });
    a.render();
    var el = document.getElementById('report'); if (el && el.scrollIntoView) el.scrollIntoView({ block: 'start' });
  }
  A['rep-draft'] = function (el) {
    var drafts = {};
    try { drafts = JSON.parse(root.localStorage.getItem(draftKey()) || '{}'); } catch (x) { drafts = {}; }
    drafts[el.getAttribute('data-field')] = el.value;
    try { root.localStorage.setItem(draftKey(), JSON.stringify(drafts)); } catch (x) { /* navigation privée */ }
    var out = el.nextElementSibling; if (out) out.innerHTML = el.value ? e(el.value).replace(/\n/g, '<br>') : '<em>Non renseigné.</em>';
  };
  A['rep-print'] = function () { app().store.logEvent('export', 'Rapport imprimé / PDF : ' + rep.data.title); root.print(); };
  A['rep-csv'] = function () {
    var rows = Padel.reports.toRows(rep.data);
    var drafts = {}; try { drafts = JSON.parse(root.localStorage.getItem(draftKey()) || '{}'); } catch (x) { drafts = {}; }
    Object.keys(drafts).forEach(function (k) { if (drafts[k]) rows.push([k, drafts[k]]); });
    UI.download('rapport-' + rep.id + '-' + rep.from + '.csv', Padel.importer.toCSV([], rows).replace(/^﻿\r\n/, '﻿'), 'text/csv;charset=utf-8');
    app().store.logEvent('export', 'Rapport CSV : ' + rep.data.title);
  };

  // ====================================================================== IMPORTS
  var imp = { step: 1 };
  V.imports = function () {
    var a = app();
    var html = '<ol class="steps">' + ['Fichier', 'Colonnes', 'Contrôle', 'Terminé'].map(function (s, i) { return '<li class="' + (imp.step === i + 1 ? 'active' : (imp.step > i + 1 ? 'done' : '')) + '">' + (i + 1) + '. ' + s + '</li>'; }).join('') + '</ol>';
    if (imp.step === 1) {
      html += UI.card('1. Choisir la source et le fichier', '<form class="form-grid" id="imp-form"><label class="field"><span>Type d\'import</span><select class="input" name="preset">' +
        Padel.importer.PRESETS.map(function (p) { return '<option value="' + p.id + '"' + (imp.preset === p.id ? ' selected' : '') + '>' + e(p.label) + '</option>'; }).join('') + '</select></label>' +
        '<label class="field" data-other><span>Feuille cible (si « Autre »)</span><select class="input" name="sheet">' + schema.SHEETS.filter(function (s) { return ['audit', 'imports', 'utilisateurs'].indexOf(s.key) < 0; }).map(function (s) { return '<option value="' + s.key + '">' + e(s.tab) + '</option>'; }).join('') + '</select></label>' +
        '<label class="field"><span>Libellé de la source</span><input class="input" name="source" placeholder="ex. Export ABS octobre 2026" value="' + e(imp.source || '') + '"></label>' +
        '<label class="field"><span>Fichier CSV ou Excel (.xlsx)</span><input class="input" type="file" name="file" accept=".csv,.txt,.xlsx,.xls"></label><div class="form-errors full" role="alert"></div></form>' +
        '<div class="action-row">' + UI.btn('Lire le fichier', 'imp-read', { cls: 'primary' }) + '</div>', { sub: 'Le fichier n\'est lu que dans votre navigateur. Rien n\'est écrit avant l\'étape 3.' });
    }
    if (imp.step === 2) {
      var def = schema.sheet(imp.sheet);
      html += UI.card('Aperçu (' + imp.raw.rows.length + ' lignes, ' + imp.raw.headers.length + ' colonnes)', '<div class="tbl-scroll"><table class="tbl"><thead><tr>' + imp.raw.headers.map(function (h) { return '<th>' + e(h) + '</th>'; }).join('') + '</tr></thead><tbody>' +
        imp.raw.rows.slice(0, 8).map(function (r) { return '<tr>' + imp.raw.headers.map(function (h) { return '<td>' + e(r[h]) + '</td>'; }).join('') + '</tr>'; }).join('') + '</tbody></table></div>');
      html += UI.card('2. Associer les colonnes → « ' + def.tab + ' »', '<form id="map-form" class="map-grid">' + def.cols.filter(function (c) { return !c.meta && (c.n !== 'id' || imp.sheet === 'membres') && !c.secret; }).map(function (c) {
        var cur = imp.mapping[c.n] || '';
        return '<div class="map-row"><span class="map-target">' + e(c.label) + (c.req ? ' <b class="req">*</b>' : '') + '</span><select class="input sm" name="map-' + c.n + '" aria-label="Colonne source pour ' + e(c.label) + '"><option value="">— non importé —</option>' +
          imp.raw.headers.map(function (h) { return '<option value="' + e(h) + '"' + (cur === h ? ' selected' : '') + '>' + e(h) + '</option>'; }).join('') + '</select>' +
          '<input class="input sm" name="const-' + c.n + '" placeholder="ou valeur fixe" value="' + e(imp.constants[c.n] || '') + '" aria-label="Valeur fixe pour ' + e(c.label) + '"></div>';
      }).join('') + '</form><div class="action-row">' + UI.btn('Retour', 'imp-back', { cls: 'ghost' }) + UI.btn('Contrôler les lignes', 'imp-check', { cls: 'primary' }) + '</div>',
      { sub: 'Associations proposées automatiquement : vérifiez-les. Les terrains, coachs et membres peuvent être donnés par leur nom ou leur ID.' });
    }
    if (imp.step === 3) {
      var pr = imp.prep;
      html += '<div class="kpi-grid">' + UI.kpi({ label: 'Lignes lues', m: u.known(pr.total) }) + UI.kpi({ label: 'Prêtes à importer', m: u.known(pr.ok.length) }) + UI.kpi({ label: 'Doublons ignorés', m: u.known(pr.duplicates.length) }) + UI.kpi({ label: 'Lignes incomplètes / en erreur', m: u.known(pr.errors.length) }) + '</div>';
      function list(title, items) { return items.length ? UI.card(title, '<ul class="report-list">' + items.slice(0, 60).map(function (x) { return '<li>' + e(x) + '</li>'; }).join('') + (items.length > 60 ? '<li class="muted">… ' + (items.length - 60) + ' de plus (voir le rapport)</li>' : '') + '</ul>') : ''; }
      var report = Padel.importer.report(pr, { source: imp.source, fichier: imp.fileName, feuille: imp.sheet });
      html += list('Lignes en erreur (non importées)', report.details_erreurs) + list('Doublons (non importés)', report.details_doublons) + list('Avertissements', report.avertissements);
      html += '<div class="action-row">' + UI.btn('Retour', 'imp-back', { cls: 'ghost' }) + UI.btn('Télécharger le rapport', 'imp-report', { cls: 'ghost', icon: 'download' }) +
        UI.btn('Importer ' + pr.ok.length + ' ligne(s)', 'imp-go', { cls: 'primary', disabled: !pr.ok.length }) + '</div>';
    }
    if (imp.step === 4) html += UI.notice('Import terminé : ' + imp.done.nb_importees + ' ligne(s) ajoutée(s) à « ' + e(imp.done.feuille_cible) + ' » (import ' + e(imp.done.id) + '). Il peut être annulé ci-dessous.', 'ok') + '<div class="action-row">' + UI.btn('Nouvel import', 'imp-reset', { cls: 'primary' }) + '</div>';
    html += UI.card('Historique des imports', UI.table({ id: 'imp-hist', csv: 'imports', defaultSort: 'date', columns: [
      { key: 'date', label: 'Date', render: function (r) { return e(String(r.date).replace('T', ' ').slice(0, 16)); } }, { key: 'utilisateur', label: 'Par' }, { key: 'source', label: 'Source' }, { key: 'feuille_cible', label: 'Feuille' },
      { key: 'fichier', label: 'Fichier' }, { key: 'nb_importees', label: 'Importées', num: true }, { key: 'nb_doublons', label: 'Doublons', num: true }, { key: 'nb_erreurs', label: 'Erreurs', num: true },
      { key: 'statut', label: 'Statut', render: function (r) { return UI.status('statut_import', r.statut); } },
      { key: 'x', label: '', render: function (r) { return r.statut === 'importe' ? UI.btn('Annuler l\'import', 'imp-undo', { cls: 'ghost sm danger-text', data: { id: r.id } }) : ''; } }
    ], rows: liveRows('imports') }));
    return html;
  };
  function readFile(file) {
    var name = file.name.toLowerCase();
    if (/\.xlsx?$/.test(name)) {
      return loadXLSX().then(function () {
        return file.arrayBuffer().then(function (buf) {
          var wb = root.XLSX.read(buf, { type: 'array', cellDates: false });
          var ws = wb.Sheets[wb.SheetNames[0]];
          var rows = root.XLSX.utils.sheet_to_json(ws, { header: 1, raw: false, defval: '' });
          if (!rows.length) return { headers: [], rows: [] };
          var headers = rows[0].map(function (h, i) { return String(h).trim() || 'Colonne ' + (i + 1); });
          return { headers: headers, rows: rows.slice(1).filter(function (r) { return r.some(function (c) { return String(c).trim(); }); }).map(function (r) { var o = {}; headers.forEach(function (h, i) { o[h] = r[i] === undefined ? '' : String(r[i]).trim(); }); return o; }) };
        });
      });
    }
    return file.text().then(Padel.importer.parseCSV);
  }
  function loadXLSX() {
    if (root.XLSX) return Promise.resolve();
    return new Promise(function (resolve, reject) {
      var s = document.createElement('script');
      s.src = 'https://cdnjs.cloudflare.com/ajax/libs/xlsx/0.18.5/xlsx.full.min.js';
      s.onload = resolve; s.onerror = function () { reject(new Error('Lecture Excel indisponible (bibliothèque non chargée). Enregistrez le fichier en CSV puis réessayez.')); };
      document.head.appendChild(s);
    });
  }
  A['imp-read'] = function () {
    var f = document.getElementById('imp-form'), err = f.querySelector('.form-errors');
    var file = f.file.files[0];
    if (!file) { err.textContent = 'Choisissez un fichier.'; return; }
    var preset = Padel.importer.PRESETS.filter(function (p) { return p.id === f.preset.value; })[0];
    imp.preset = preset.id; imp.sheet = preset.sheet || f.sheet.value; imp.source = f.source.value.trim() || preset.label; imp.fileName = file.name;
    return readFile(file).then(function (raw) {
      if (!raw.rows.length) { err.textContent = 'Le fichier ne contient aucune ligne de données.'; return; }
      imp.raw = raw; imp.mapping = Padel.importer.guessMapping(raw.headers, imp.sheet); imp.constants = Object.assign({}, preset.defaults); imp.step = 2; app().render();
    }).catch(function (x) { err.textContent = x.message; });
  };
  A['imp-back'] = function () { imp.step = Math.max(1, imp.step - 1); app().render(); };
  A['imp-reset'] = function () { imp = { step: 1 }; app().render(); };
  A['imp-check'] = function () {
    var f = document.getElementById('map-form');
    imp.mapping = {}; imp.constants = {};
    schema.sheet(imp.sheet).cols.forEach(function (c) {
      var m = f.querySelector('[name="map-' + c.n + '"]'), k = f.querySelector('[name="const-' + c.n + '"]');
      if (m && m.value) imp.mapping[c.n] = m.value;
      if (k && k.value.trim()) imp.constants[c.n] = k.value.trim();
    });
    imp.prep = Padel.importer.prepare(app().db, imp.sheet, imp.raw.rows, imp.mapping, imp.constants);
    imp.step = 3; app().render();
  };
  A['imp-report'] = function () { UI.download('rapport-import.json', JSON.stringify(Padel.importer.report(imp.prep, { source: imp.source, fichier: imp.fileName, feuille: imp.sheet }), null, 2), 'application/json'); };
  A['imp-go'] = function (el) {
    var a = app(); el.disabled = true;
    var report = Padel.importer.report(imp.prep, { source: imp.source, fichier: imp.fileName, feuille: imp.sheet });
    return a.store.importRows(imp.sheet, imp.prep.ok, { source: imp.source, fichier: imp.fileName, report: report }).then(function (res) {
      imp.done = res; imp.step = 4; return a.reload();
    }).catch(function (x) { el.disabled = false; UI.toast(x.message, 'bad'); });
  };
  A['imp-undo'] = function (el) {
    var a = app(), id = el.getAttribute('data-id');
    return UI.confirm('Annuler l\'import ' + e(id) + ' ? Toutes ses lignes seront archivées (et non supprimées).', { ok: 'Annuler l\'import', danger: true }).then(function () {
      return a.store.undoImport(id).then(function () { UI.toast('Import annulé.', 'ok'); return a.reload(); });
    });
  };

  // ====================================================================== QUALITÉ
  var qFilter = '';
  V.qualite = function () {
    var a = app();
    var list = Padel.quality.run(a.ctx);
    var count = { bloquant: 0, attention: 0, info: 0 }; list.forEach(function (x) { count[x.gravite]++; });
    var cats = u.groupBy(list, function (x) { return x.categorie; });
    var html = '<div class="kpi-grid">' + UI.kpi({ label: 'Bloquant', m: u.known(count.bloquant), help: 'Un calcul ne peut pas être produit correctement' }) + UI.kpi({ label: 'À vérifier', m: u.known(count.attention) }) + UI.kpi({ label: 'Information', m: u.known(count.info) }) + '</div>';
    html += '<div class="chips">' + '<button type="button" class="chip' + (!qFilter ? ' on' : '') + '" data-action="q-filter" data-cat="">Toutes (' + list.length + ')</button>' +
      Object.keys(cats).map(function (k) { return '<button type="button" class="chip' + (qFilter === k ? ' on' : '') + '" data-action="q-filter" data-cat="' + k + '">' + e(Padel.quality.CATS[k] || k) + ' (' + cats[k].length + ')</button>'; }).join('') + '</div>';
    var shown = list.filter(function (x) { return !qFilter || x.categorie === qFilter; });
    html += UI.card('Anomalies', shown.length ? '<ul class="issues">' + shown.map(function (x) {
      var sheetKey = schema.SHEETS.filter(function (s) { return s.tab === x.feuille; })[0];
      var openable = sheetKey && x.ligne_id && x.ligne_id.indexOf(',') < 0 && byId(sheetKey.key, x.ligne_id) && P.canWrite(a.perms, sheetKey.key);
      return '<li class="issue ' + x.gravite + '"><span class="badge ' + (x.gravite === 'bloquant' ? 'bad' : x.gravite === 'attention' ? 'warn' : 'info') + '">' + e(x.gravite) + '</span><div><p>' + e(x.message) + '</p><p class="muted sm">' + e(x.feuille) + (x.ligne_id ? ' · ' + e(x.ligne_id) : '') + ' · contrôle ' + e(x.code) + '</p></div>' +
        (openable ? UI.btn('Corriger', 'q-open', { cls: 'ghost sm', data: { sheet: sheetKey.key, id: x.ligne_id } }) : '') + '</li>';
    }).join('') + '</ul>' : UI.empty('Aucune anomalie dans cette catégorie.'), { sub: 'Une donnée manquante n\'est jamais remplacée par zéro : elle rend le calcul concerné « indisponible » ou « incomplet » jusqu\'à correction.' });
    return html;
  };
  A['q-filter'] = function (el) { qFilter = el.getAttribute('data-cat'); app().render(); };
  A['q-open'] = function (el) { UI.editForm(el.getAttribute('data-sheet'), byId(el.getAttribute('data-sheet'), el.getAttribute('data-id'))); };

  // ====================================================================== PARAMÈTRES
  var parTab = 'general';
  var PAR_TABS = {
    general: ['Général', 'general'], taux: ['Taux des coachs', 'taux_coach'], types: ['Types d\'activité', 'type_activite'], niveaux: ['Niveaux', 'niveau'],
    objectifs: ['Objectifs', 'objectif'], indicateurs: ['Indicateurs Power BI', 'indicateur_club'],
    pointe: ['Heures de pointe', 'heures_pointe'], vacances: ['Vacances', 'vacances'], budget: ['Budget', 'budget'], categories: ['Catégories', null],
    terrains: ['Terrains', null], utilisateurs: ['Utilisateurs', null], permissions: ['Droits par rôle', null]
  };
  var PAR_HELP = {
    general: 'Règles générales. Une valeur vide = inconnue. Pour changer une valeur sans perdre l\'historique, ajoutez une nouvelle ligne avec sa date d\'effet.',
    taux: 'Taux horaire par coach, historisé : ne modifiez pas un ancien taux, ajoutez-en un nouveau avec sa date d\'effet. « Référence » = ID utilisateur du coach.',
    types: 'Catalogue des activités. Attributs : public=adulte|junior|mixte ; payant=oui|non ; famille=academie|decouverte|social|evenement|tournoi|prive. Archivé = plus proposé.',
    niveaux: 'Grille des 8 niveaux (indicatif Playtomic dans les attributs).',
    pointe: 'Plages de pointe par jour : Référence = 1 (lundi) … 7 (dimanche) ou « tous » ; Valeur = 17:00-22:00. Le reste des heures ouvertes est « creux ».',
    objectifs: 'Objectifs : catégorie objectif. « seances_semaine » : Référence = code de l\'activité (padel_taster, afterwork, new_to_padel…), Valeur = séances par semaine, avec date d\'effet. « taux_penetration » : cible en %.',
    indicateurs: 'Liste des indicateurs saisis depuis Power BI. Attributs : unite ; agregation = dernier (stock : membres, âge) ou somme (flux : réservations, nouveaux membres). Les chiffres eux-mêmes se saisissent dans Communauté & pénétration.',
    vacances: 'Périodes de vacances scolaires (FWB) pendant lesquelles les cycles sont suspendus : date d\'effet = début, date de fin = fin.',
    budget: 'Budget mensuel : Référence = AAAA-MM ; Clé = revenus_reconnus, encaissements, couts_coachs, couts_directs ou marge_brute ; Valeur = montant.'
  };
  V.parametres = function () {
    var a = app();
    var html = '<div class="tabs scroll" role="tablist">' + Object.keys(PAR_TABS).filter(function (k) { return k !== 'utilisateurs' || a.can('utilisateurs.edit'); }).map(function (k) {
      return '<button type="button" role="tab" class="tab' + (parTab === k ? ' active' : '') + '" aria-selected="' + (parTab === k) + '" data-action="par-tab" data-tab="' + k + '">' + e(PAR_TABS[k][0]) + '</button>';
    }).join('') + '</div>';
    var canEdit = a.can('parametres.edit');
    var cat = PAR_TABS[parTab][1];
    if (cat) {
      var rows = liveRows('parametres').filter(function (p) { return p.categorie === cat; });
      html += UI.card(PAR_TABS[parTab][0], UI.table({ id: 'par-' + parTab, csv: 'parametres-' + parTab, columns: [
        { key: 'cle', label: 'Clé' },
        { key: 'reference', label: 'Référence', render: function (r) { var usr = cat === 'taux_coach' && a.ctx.users[r.reference]; return e(r.reference) + (usr ? ' <span class="muted">(' + e(usr.nom_affiche) + ')</span>' : (cat === 'taux_coach' && r.reference ? ' ' + UI.badge('coach inconnu', 'warn') : '')); } },
        { key: 'valeur', label: 'Valeur', render: function (r) { return u.isBlank(r.valeur) ? '<span class="na">non renseigné</span>' : e(r.valeur); } },
        { key: 'libelle', label: 'Libellé' }, { key: 'attributs', label: 'Attributs' },
        { key: 'date_effet', label: 'Effet', render: function (r) { return r.date_effet ? d(r.date_effet) : (cat === 'taux_coach' ? UI.badge('sans date', 'warn') : ''); } },
        { key: 'date_fin', label: 'Fin', render: function (r) { return d(r.date_fin); } },
        { key: 'statut', label: 'Statut', render: function (r) { return UI.status('statut_actif', r.statut); } },
        { key: 'source', label: 'Source' }
      ], rows: rows, onRow: canEdit ? 'par-edit' : null, pageSize: 60 }), { sub: e(PAR_HELP[parTab] || ''), actions: canEdit ? UI.btn('Ajouter', 'par-add', { cls: 'primary sm', icon: 'plus', data: { cat: cat } }) : '' });
    } else if (parTab === 'categories') {
      ['categorie_depense', 'categorie_revenu'].forEach(function (cc) {
        html += UI.card(schema.ENUMS.param_categorie[cc], UI.table({ id: 'par-' + cc, search: false, columns: [{ key: 'cle', label: 'Code' }, { key: 'valeur', label: 'Libellé' }, { key: 'statut', label: 'Statut', render: function (r) { return UI.status('statut_actif', r.statut); } }],
          rows: liveRows('parametres').filter(function (p) { return p.categorie === cc; }), onRow: canEdit ? 'par-edit' : null }), { actions: canEdit ? UI.btn('Ajouter', 'par-add', { cls: 'primary sm', icon: 'plus', data: { cat: cc } }) : '' });
      });
    } else if (parTab === 'terrains') {
      var DAYS = ['lun', 'mar', 'mer', 'jeu', 'ven', 'sam', 'dim'];
      html += UI.card('Terrains et horaires d\'ouverture', UI.table({ id: 'par-terr', search: false, columns: [
        { key: 'numero', label: 'N°', num: true }, { key: 'nom', label: 'Nom' }, { key: 'lieu', label: 'Type', render: function (r) { return r.lieu === 'indoor' ? 'Indoor' : 'Outdoor'; } },
        { key: 'date_mise_en_service', label: 'Mise en service', render: function (r) { return r.date_mise_en_service ? d(r.date_mise_en_service) : (r.lieu === 'indoor' ? UI.badge('à renseigner', 'warn') : ''); } }
      ].concat(DAYS.map(function (dd) { return { key: 'horaires_' + dd, label: dd, render: function (r) { var v = r['horaires_' + dd]; return u.isBlank(v) ? '<span class="na">?</span>' : e(v); } }; })),
      rows: liveRows('terrains'), onRow: a.can('terrains.edit') ? 'edit-terrain' : null }), { actions: a.can('terrains.edit') ? UI.btn('Ajouter', 'terr-add', { cls: 'primary sm', icon: 'plus' }) : '', sub: 'Horaire vide = inconnu : le taux d\'occupation de ce terrain n\'est pas calculé.' });
    } else if (parTab === 'utilisateurs') {
      html += UI.card('Utilisateurs', UI.table({ id: 'par-usr', columns: [
        { key: 'id', label: 'ID' }, { key: 'nom_affiche', label: 'Nom' }, { key: 'email', label: 'E-mail' }, { key: 'role', label: 'Rôle', render: function (r) { return e(P.ROLES[r.role] || r.role); } },
        { key: 'actif', label: 'Actif', render: function (r) { return r.actif === true ? UI.badge('actif', 'ok') : UI.badge('inactif', 'muted'); } },
        { key: 'taux', label: 'Taux actuel', render: function (r) { if (r.role !== 'coach' && r.role !== 'admin') return ''; var x = calc.coachRate(a.ctx, r.id, a.today); return x.v === null ? (r.role === 'coach' ? UI.badge('aucun taux', 'warn') : '') : u.fmtEUR(x.v, 2) + '/h'; } },
        { key: 'code', label: 'Code d\'accès', render: function (r) { return r.code_acces_hash ? 'défini' : '–'; } }
      ], rows: liveRows('utilisateurs'), onRow: 'usr-edit' }), { actions: UI.btn('Ajouter', 'usr-add', { cls: 'primary sm', icon: 'plus' }), sub: 'Le rôle détermine les droits (onglet « Droits par rôle »). Un coach doit avoir un taux horaire (onglet « Taux des coachs ») avec la même référence que son ID.' });
    } else if (parTab === 'permissions') {
      var roles = Object.keys(P.ROLES);
      var eff = {}; roles.forEach(function (r) { eff[r] = P.permissionsFor(r, a.db.parametres); });
      html += UI.card('Matrice des permissions', '<div class="tbl-scroll"><table class="tbl matrix"><thead><tr><th>Permission</th>' + roles.map(function (r) { return '<th class="c">' + e(P.ROLES[r]) + '</th>'; }).join('') + '</tr></thead><tbody>' +
        P.ALL.map(function (p) {
          return '<tr><th scope="row">' + e(P.PERMS[p]) + '<br><code class="muted sm">' + p + '</code></th>' + roles.map(function (r) {
            var on = !!eff[r][p], def = P.DEFAULTS[r].indexOf(p) >= 0;
            return '<td class="c">' + (canEdit && r !== 'admin' ? '<button type="button" class="perm ' + (on ? 'on' : '') + (on !== def ? ' changed' : '') + '" data-action="perm-toggle" data-role="' + r + '" data-perm="' + p + '" aria-pressed="' + on + '" aria-label="' + e(P.PERMS[p] + ' – ' + P.ROLES[r]) + '">' + (on ? '✓' : '–') + '</button>' : (on ? '✓' : '–')) + '</td>';
          }).join('') + '</tr>';
        }).join('') + '</tbody></table></div>', { sub: 'Les valeurs modifiées (encadrées) sont des surcharges enregistrées dans « Paramètres » (catégorie permission) et appliquées aussi par le serveur. Les droits de l\'administrateur ne sont pas modifiables ici.' });
    }
    return html;
  };
  A['par-tab'] = function (el) { parTab = el.getAttribute('data-tab'); app().render(); };
  var PAR_FIELDS = ['categorie', 'cle', 'reference', 'valeur', 'libelle', 'attributs', 'date_effet', 'date_fin', 'statut', 'source', 'description'];
  A['par-add'] = function (el) {
    var cat = el.getAttribute('data-cat');
    var def = { categorie: cat, statut: 'actif', date_effet: cat === 'taux_coach' ? app().today : '' };
    if (cat === 'taux_coach') def.cle = 'taux_horaire';
    UI.editForm('parametres', null, { fields: PAR_FIELDS, defaults: def, selects: ['categorie'], intro: e(PAR_HELP[parTab] || ''),
      onMount: cat === 'taux_coach' ? function (form) {
        var ref = form.querySelector('[name=reference]');
        var coaches = app().db.utilisateurs.filter(function (x) { return x.role === 'coach' || x.role === 'admin'; });
        ref.outerHTML = '<select class="input" name="reference" id="f-reference">' + coaches.map(function (c) { return '<option value="' + e(c.id) + '">' + e(c.nom_affiche + ' (' + c.id + ')') + '</option>'; }).join('') + '</select>';
      } : null });
  };
  A['par-edit'] = function (el) {
    var r = byId('parametres', el.getAttribute('data-id'));
    UI.editForm('parametres', r, { fields: PAR_FIELDS, selects: ['categorie'], intro: r.categorie === 'taux_coach' || r.categorie === 'general' ? UI.notice('Pour un nouveau tarif ou taux, préférez « Ajouter » avec une nouvelle date d\'effet : l\'historique des calculs passés est ainsi conservé.', 'info') : '', motif: 'Modification paramètre' });
  };
  A['terr-add'] = function () { UI.editForm('terrains', null, { defaults: { statut: 'actif' } }); };
  var USR_FIELDS = ['email', 'nom_affiche', 'role', 'actif'];
  A['usr-add'] = function () { UI.editForm('utilisateurs', null, { fields: USR_FIELDS, defaults: { actif: true, role: 'coach' }, intro: 'L\'e-mail doit être celui du compte Google utilisé pour ouvrir l\'application.' }); };
  A['usr-edit'] = function (el) {
    var id = el.getAttribute('data-id');
    UI.editForm('utilisateurs', byId('utilisateurs', id), { fields: USR_FIELDS, archivable: false, motif: 'Gestion des utilisateurs',
      extraFooter: UI.btn('Définir le code d\'accès', 'usr-code', { cls: 'ghost', data: { id: id } }) });
  };
  A['usr-code'] = function (el) {
    var a = app(), id = el.getAttribute('data-id');
    if (!a.store.setAccessCode) { UI.toast('En démonstration, aucun code n\'est nécessaire.'); return; }
    var body = '<p>Code personnel (8 caractères minimum) à communiquer de vive voix. Il n\'est jamais stocké en clair et ne pourra pas être relu : en cas d\'oubli, définissez-en un nouveau.</p>' +
      '<label class="field"><span>Nouveau code</span><input class="input" type="text" name="code" autocomplete="off" minlength="8"></label><div class="form-errors" role="alert"></div>';
    var m = UI.modal('Code d\'accès', body, { footer: '<span class="spacer"></span>' + UI.btn('Annuler', 'modal-close', { cls: 'ghost' }) + UI.btn('Enregistrer le code', 'usr-code-ok', { cls: 'primary' }) });
    m.querySelector('[data-action="usr-code-ok"]').addEventListener('click', function () {
      var code = m.querySelector('[name=code]').value;
      if (code.length < 8) { m.querySelector('.form-errors').textContent = 'Au moins 8 caractères.'; return; }
      a.store.setAccessCode(id, code).then(function () { UI.closeModal(); UI.toast('Code enregistré.', 'ok'); }).catch(function (x) { m.querySelector('.form-errors').textContent = x.message; });
    });
  };
  A['perm-toggle'] = function (el) {
    var a = app(), role = el.getAttribute('data-role'), perm = el.getAttribute('data-perm');
    var on = el.getAttribute('aria-pressed') !== 'true';
    var existing = liveRows('parametres').filter(function (p) { return p.categorie === 'permission' && p.reference === role && p.cle === perm; })[0];
    var rec = Object.assign({}, existing || { categorie: 'permission', reference: role, cle: perm, statut: 'actif', source: 'Matrice des droits' }, { valeur: on ? 'oui' : 'non' });
    return UI.confirm((on ? 'Accorder' : 'Retirer') + ' « ' + e(P.PERMS[perm]) + ' » au rôle ' + e(P.ROLES[role]) + ' ?', { motif: true }).then(function (motif) {
      return a.save('parametres', rec, motif || 'Droits').then(function () { UI.toast('Droits mis à jour.', 'ok'); a.render(); });
    });
  };

  // ====================================================================== JOURNAL
  V.journal = function () {
    var rows = (app().db.audit || []).slice();
    return UI.card('Journal d\'audit', UI.table({ id: 'audit', csv: 'journal-audit', defaultSort: 'date', columns: [
      { key: 'date', label: 'Date', render: function (r) { return e(String(r.date).replace('T', ' ').slice(0, 19)); } }, { key: 'utilisateur', label: 'Utilisateur' }, { key: 'role', label: 'Rôle' },
      { key: 'action', label: 'Action' }, { key: 'feuille', label: 'Feuille' }, { key: 'ligne_id', label: 'Ligne' }, { key: 'motif', label: 'Motif' }
    ], rows: rows, onRow: 'audit-open', pageSize: 50 }), { sub: 'Ajout seul : aucune entrée ne peut être modifiée depuis l\'application. Les changements de niveau des membres, de tarifs, de taux et de statut d\'heures y sont tracés avec l\'état avant/après.' });
  };
  A['audit-open'] = function (el) {
    var r = (app().db.audit || []).filter(function (x) { return x.id === el.getAttribute('data-id'); })[0];
    function pretty(s) { try { return JSON.stringify(JSON.parse(s), null, 2); } catch (x) { return s || '–'; } }
    UI.modal('Entrée ' + r.id, '<dl class="facts">' + [['Date', r.date], ['Utilisateur', r.utilisateur], ['Action', r.action], ['Feuille', r.feuille], ['Ligne', r.ligne_id], ['Motif', r.motif || '–']].map(function (x) { return '<div><dt>' + x[0] + '</dt><dd>' + e(x[1]) + '</dd></div>'; }).join('') + '</dl>' +
      '<div class="grid-2"><div><h3>Avant</h3><pre class="code">' + e(pretty(r.avant)) + '</pre></div><div><h3>Après</h3><pre class="code">' + e(pretty(r.apres)) + '</pre></div></div>', { wide: true });
  };

  // ====================================================================== AIDE
  var GUIDES = {
    admin: ['Chaque matin : « Qualité des données » pour corriger ce qui bloque un calcul.', 'Après une activité : Séances → « Séance rapide » (moins d\'une minute), puis « Présences » si la liste nominative est connue.', 'Chaque semaine : Heures coachs → « À valider », puis « À payer » après réception de la facture.', 'Le lundi : Rapports → A. Résumé hebdomadaire ; début de mois : B. Rapport financier.', 'Tarifs, taux et règles : Paramètres. Ne jamais écraser un ancien taux ; ajouter une ligne avec une date d\'effet.', 'Imports ABS / application : menu Imports ; un import se vérifie avant écriture et s\'annule en un clic.'],
    coach: ['Après chaque intervention : Heures → « Nouvelle intervention ». Choisissez la séance du jour pour remplir l\'horaire.', '« Soumettre à Anthony » quand c\'est exact. Une fois validées, les heures ne se modifient plus : ouvrez la ligne et « Demander une correction ».', 'Séances → bouton « Présences » pour cocher présents, absents (prévenus) et no-shows.', 'Remplacement : cochez « Remplacement » et indiquez le coach remplacé. Séance annulée : cochez « Séance annulée » et ajoutez un commentaire.'],
    reception: ['Paiements → « À encaisser » : liste des membres avec un solde. Bouton « Encaisser » pour enregistrer le paiement.', '« À vérifier » : contrôlez la référence puis cliquez « Vérifié ».', 'Académies → Inscriptions : inscrire un membre à un cycle (entrée en cours de cycle : indiquer la première séance due).', 'Satisfaction → « Nouvel avis membre » pour encoder un questionnaire papier.'],
    manager: ['Tableau de bord : choisissez la période (semaine, mois, trimestre, depuis l\'ouverture) et comparez à la période précédente.', 'Rapports → C. Bilan pour Laurent : synthèse complète, exportable en PDF (Imprimer → Enregistrer en PDF) ou CSV.', '« donnée indisponible » : l\'information manque, elle n\'est pas égale à zéro. « incomplet » : le chiffre exclut des lignes dont une donnée manque (survolez pour voir lesquelles).']
  };
  V.aide = function () {
    var a = app();
    var html = UI.card('Guide rapide – ' + (P.ROLES[a.user.role] || a.user.role), '<ol class="guide">' + (GUIDES[a.user.role] || []).map(function (g) { return '<li>' + e(g) + '</li>'; }).join('') + '</ol>');
    html += UI.card('Comprendre les chiffres', '<ul class="guide"><li><strong>Encaissé</strong> : argent réellement reçu sur la période.</li><li><strong>Revenu reconnu</strong> : valeur des séances réellement données sur la période (une absence du membre compte, une annulation du club non).</li><li><strong>Restant à délivrer</strong> : payé d\'avance pour des séances futures.</li><li><strong>Marge brute</strong> = revenu reconnu − heures coachs validées − coûts directs.</li><li><strong>Occupation</strong> = heures utilisées ÷ heures disponibles (jamais calculée sans horaires d\'ouverture).</li><li><strong>NPS</strong> = % de notes 9-10 − % de notes 0-6, toujours affiché avec le nombre de réponses (n).</li></ul>');
    if (a.mode === 'demo') {
      html += UI.card('Mode démonstration', '<p>Les données sont <strong>fictives</strong> et stockées uniquement dans ce navigateur. Utilisez le sélecteur en haut à droite pour voir l\'application comme un coach, la réception ou un manager.</p><div class="action-row">' +
        UI.btn('Télécharger une sauvegarde (JSON)', 'demo-export', { cls: 'ghost', icon: 'download' }) + '<label class="btn ghost file-btn">' + UI.icon('upload', 16) + '<span>Restaurer une sauvegarde</span><input type="file" accept=".json" data-action="demo-restore" hidden></label>' +
        UI.btn('Réinitialiser les données fictives', 'demo-reset', { cls: 'ghost danger-text' }) + '</div>');
    } else {
      html += UI.card('Sauvegarde', '<p>Les données sont dans Google Sheets. Une copie datée du classeur est créée automatiquement chaque nuit (voir docs/SAUVEGARDE_RESTAURATION.md). Pour une sauvegarde immédiate : Extensions → Apps Script → exécuter <code>backupNow</code>, ou Fichier → Créer une copie.</p>' +
        (a.store.logout ? '<div class="action-row">' + UI.btn('Se déconnecter', 'logout', { cls: 'ghost' }) + '</div>' : ''));
    }
    html += UI.card('Confidentialité', '<p>L\'application ne conserve que le strict nécessaire : un identifiant membre suffit, sans e-mail ni téléphone. Les accès et modifications sensibles sont tracés dans le journal d\'audit. Les identifiants Google ne transitent jamais par l\'application.</p>');
    return html;
  };
  A['demo-export'] = function () { return app().store.exportAll().then(function (data) { UI.download('sauvegarde-padel-demo-' + app().today + '.json', JSON.stringify(data), 'application/json'); }); };
  A['demo-restore'] = function (el) {
    var f = el.files[0]; if (!f) return;
    return f.text().then(function (t) { return app().store.restoreAll(JSON.parse(t)); }).then(function () { UI.toast('Sauvegarde restaurée.', 'ok'); return app().reload(); });
  };
  A['demo-reset'] = function () { return UI.confirm('Réinitialiser toutes les données fictives ? Vos modifications de démonstration seront perdues.', { danger: true, ok: 'Réinitialiser' }).then(function () { return app().store.reset(); }).then(function () { return app().reload(); }); };
  A.logout = function () { return app().store.logout().then(function () { location.reload(); }); };
})(typeof globalThis !== 'undefined' ? globalThis : this);
