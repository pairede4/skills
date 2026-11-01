/**
 * Composants d'interface : rendu HTML (chaînes échappées), cartes KPI, tableaux,
 * formulaires générés depuis le schéma, fenêtres modales, graphiques SVG.
 * Aucune dépendance externe.
 */
(function (root) {
  'use strict';
  var Padel = root.Padel;
  var u = Padel.util, schema = Padel.schema;
  var UI = Padel.ui = Padel.ui || { actions: {}, tables: {}, views: {} };
  var e = u.escapeHtml;
  UI.e = e;

  // ------------------------------------------------------------------ icônes (SVG inline, trait 1.75)
  var ICONS = {
    dashboard: '<path d="M3 13h8V3H3zM13 21h8V11h-8zM3 21h8v-6H3zM13 3v6h8V3z"/>',
    court: '<rect x="3" y="4" width="18" height="16" rx="2"/><path d="M12 4v16M3 12h18"/>',
    calendar: '<rect x="3" y="5" width="18" height="16" rx="2"/><path d="M16 3v4M8 3v4M3 10h18"/>',
    users: '<path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M22 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75"/>',
    clock: '<circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/>',
    euro: '<path d="M18 7a6 6 0 1 0 0 10M4 10h10M4 14h10"/>',
    trophy: '<path d="M8 21h8M12 17v4M7 4h10v5a5 5 0 0 1-10 0z"/><path d="M17 5h3v2a3 3 0 0 1-3 3M7 5H4v2a3 3 0 0 0 3 3"/>',
    star: '<path d="m12 3 2.7 5.6 6.1.9-4.4 4.3 1 6.1L12 17l-5.4 2.9 1-6.1-4.4-4.3 6.1-.9z"/>',
    chart: '<path d="M3 3v18h18"/><path d="m7 15 4-4 3 3 5-6"/>',
    file: '<path d="M14 3H6a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V9z"/><path d="M14 3v6h6M8 13h8M8 17h5"/>',
    upload: '<path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4M17 8l-5-5-5 5M12 3v12"/>',
    check: '<path d="M20 6 9 17l-5-5"/>',
    alert: '<path d="M12 9v4M12 17h.01"/><path d="M10.3 3.9 1.8 18a2 2 0 0 0 1.7 3h17a2 2 0 0 0 1.7-3L13.7 3.9a2 2 0 0 0-3.4 0z"/>',
    settings: '<circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.7 1.7 0 0 0 .3 1.8l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.7 1.7 0 0 0-1.8-.3 1.7 1.7 0 0 0-1 1.5V21a2 2 0 0 1-4 0v-.1a1.7 1.7 0 0 0-1.1-1.5 1.7 1.7 0 0 0-1.8.3l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1a1.7 1.7 0 0 0 .3-1.8 1.7 1.7 0 0 0-1.5-1H3a2 2 0 0 1 0-4h.1a1.7 1.7 0 0 0 1.5-1.1 1.7 1.7 0 0 0-.3-1.8l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1a1.7 1.7 0 0 0 1.8.3H9a1.7 1.7 0 0 0 1-1.5V3a2 2 0 0 1 4 0v.1a1.7 1.7 0 0 0 1 1.5 1.7 1.7 0 0 0 1.8-.3l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.7 1.7 0 0 0-.3 1.8V9a1.7 1.7 0 0 0 1.5 1H21a2 2 0 0 1 0 4h-.1a1.7 1.7 0 0 0-1.5 1z"/>',
    list: '<path d="M8 6h13M8 12h13M8 18h13M3 6h.01M3 12h.01M3 18h.01"/>',
    help: '<circle cx="12" cy="12" r="9"/><path d="M9.1 9a3 3 0 0 1 5.8 1c0 2-3 3-3 3M12 17h.01"/>',
    receipt: '<path d="M4 2v20l3-2 3 2 3-2 3 2 3-2 1 1V2l-1 1-3-2-3 2-3-2-3 2-3-2z"/><path d="M8 8h8M8 12h8M8 16h5"/>',
    plus: '<path d="M12 5v14M5 12h14"/>',
    x: '<path d="M18 6 6 18M6 6l12 12"/>',
    filter: '<path d="M22 3H2l8 9.5V19l4 2v-8.5z"/>',
    left: '<path d="m15 18-6-6 6-6"/>', right: '<path d="m9 18 6-6-6-6"/>',
    more: '<circle cx="12" cy="12" r="1"/><circle cx="19" cy="12" r="1"/><circle cx="5" cy="12" r="1"/>',
    print: '<path d="M6 9V2h12v7M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2"/><path d="M6 14h12v8H6z"/>',
    download: '<path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4M7 10l5 5 5-5M12 15V3"/>',
    archive: '<path d="M21 8v13H3V8M1 3h22v5H1zM10 12h4"/>',
    edit: '<path d="M12 20h9M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4z"/>',
    shield: '<path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>',
    member: '<circle cx="12" cy="8" r="4"/><path d="M4 21v-1a6 6 0 0 1 6-6h4a6 6 0 0 1 6 6v1"/>'
  };
  function icon(name, size) {
    return '<svg class="ico" width="' + (size || 18) + '" height="' + (size || 18) + '" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">' + (ICONS[name] || '') + '</svg>';
  }
  UI.icon = icon;

  // ------------------------------------------------------------------ mesures
  var FORMATS = {
    eur: function (v) { return u.fmtEUR(v); }, eur2: function (v) { return u.fmtEUR(v, 2); }, pct: function (v) { return u.fmtPct(v); },
    int: function (v) { return u.fmtNum(v, 0); }, num1: function (v) { return u.fmtNum(v, 1); }, h: function (v) { return u.fmtHours(v); },
    nps: function (v) { return v === null || v === undefined ? u.INDISPO : (v > 0 ? '+' : '') + u.fmtNum(v, 0); }
  };
  UI.FORMATS = FORMATS;

  /** Affiche une mesure : valeur, « incomplet » ou « donnée indisponible », avec les raisons en info-bulle. */
  function measure(m, fmt) {
    var f = typeof fmt === 'function' ? fmt : FORMATS[fmt || 'int'];
    if (!m || m.v === null || m.v === undefined) {
      var why = m && m.gaps && m.gaps.length ? m.gaps.slice(0, 6).join('\n') : 'Aucune donnée';
      return '<span class="na" title="' + e(why) + '">' + u.INDISPO + '</span>';
    }
    var html = '<span class="val">' + e(f(m.v)) + '</span>';
    if (m.gaps && m.gaps.length) html += ' <span class="badge warn" title="' + e(m.gaps.slice(0, 8).join('\n')) + '">incomplet</span>';
    return html;
  }
  UI.measure = measure;

  function deltaHtml(cur, prev, inverse) {
    var d = u.delta(cur, prev);
    if (d === null) return '<span class="delta muted">vs préc. : –</span>';
    var up = d > 0.0005, down = d < -0.0005;
    var good = inverse ? down : up, bad = inverse ? up : down;
    var cls = good ? 'good' : (bad ? 'bad' : 'muted');
    return '<span class="delta ' + cls + '">' + (up ? '▲ ' : down ? '▼ ' : '') + (d > 0 ? '+' : '') + u.fmtPct(d, 0) + ' <span class="muted">vs préc.</span></span>';
  }

  /** Carte KPI. opts : { label, m, fmt, prev, inverse, sub, help, href } */
  function kpi(o) {
    var na = !o.m || o.m.v === null;
    return '<div class="kpi' + (na ? ' kpi-na' : '') + '"' + (o.help ? ' title="' + e(o.help) + '"' : '') + '>' +
      '<div class="kpi-label">' + e(o.label) + '</div>' +
      '<div class="kpi-value">' + measure(o.m, o.fmt) + '</div>' +
      (o.prev !== undefined ? deltaHtml(o.m, o.prev, o.inverse) : '') +
      (o.sub ? '<div class="kpi-sub">' + o.sub + '</div>' : '') + '</div>';
  }
  UI.kpi = kpi;

  UI.card = function (title, body, opts) {
    opts = opts || {};
    return '<section class="card' + (opts.cls ? ' ' + opts.cls : '') + '"' + (opts.id ? ' id="' + opts.id + '"' : '') + '>' +
      (title ? '<header class="card-h"><h2>' + e(title) + '</h2>' + (opts.actions || '') + '</header>' : '') +
      (opts.sub ? '<p class="card-sub">' + opts.sub + '</p>' : '') + body + '</section>';
  };
  UI.badge = function (text, cls, title) { return '<span class="badge ' + (cls || '') + '"' + (title ? ' title="' + e(title) + '"' : '') + '>' + e(text) + '</span>'; };
  UI.btn = function (label, action, opts) {
    opts = opts || {};
    var attrs = '';
    if (opts.data) for (var k in opts.data) attrs += ' data-' + k + '="' + e(opts.data[k]) + '"';
    return '<button type="button" class="btn ' + (opts.cls || '') + '" data-action="' + action + '"' + attrs + (opts.disabled ? ' disabled' : '') +
      (opts.title ? ' title="' + e(opts.title) + '"' : '') + '>' + (opts.icon ? icon(opts.icon, 16) : '') + '<span>' + e(label) + '</span></button>';
  };
  UI.empty = function (text, action) { return '<div class="empty">' + e(text) + (action || '') + '</div>'; };
  UI.notice = function (text, cls) { return '<div class="notice ' + (cls || '') + '">' + icon(cls === 'ok' ? 'check' : 'alert', 18) + '<div>' + text + '</div></div>'; };

  var STATUS_CLS = {
    realisee: 'ok', planifiee: 'info', annulee_club: 'bad', annulee_meteo: 'bad', annulee_participants: 'bad',
    brouillon: 'muted', soumis: 'info', valide: 'ok', a_corriger: 'warn', paye: 'ok-strong',
    a_verifier: 'warn', encaisse: 'ok', rembourse: 'muted', annule: 'bad', importe: 'ok', reserve: 'info', realise: 'ok', no_show: 'warn',
    inscrit: 'ok', liste_attente: 'warn', planifie: 'info', en_cours: 'ok', termine: 'muted', actif: 'ok', archive: 'muted', engagee: 'info', payee: 'ok', annulee: 'bad',
    present: 'ok', absent: 'warn'
  };
  /** Badge de statut avec libellé de la liste de valeurs. */
  UI.status = function (enumName, value) {
    if (u.isBlank(value)) return '';
    var lbl = (schema.ENUMS[enumName] || {})[value] || value;
    return UI.badge(lbl, STATUS_CLS[value] || '');
  };

  // ------------------------------------------------------------------ tableaux
  /**
   * Tableau filtrable et triable, re-rendu sur place.
   * cfg : { id, columns:[{ key, label, render(row), sort(row), num }], rows, empty, csv: 'nom', onRow: 'action', rowId, search: true, pageSize }
   */
  UI.table = function (cfg) {
    UI.tables[cfg.id] = cfg;
    var st = UI.tableState(cfg.id);
    if (cfg.defaultSort && !st.sort) { st.sort = cfg.defaultSort; st.dir = cfg.defaultDir || 'desc'; }
    return '<div class="tbl-wrap" data-tbl="' + cfg.id + '">' + UI.tableInner(cfg.id) + '</div>';
  };
  UI.tableState = function (id) { UI.tstate = UI.tstate || {}; return (UI.tstate[id] = UI.tstate[id] || { q: '', sort: null, dir: 'desc', page: 1 }); };
  UI.tableRows = function (cfg) {
    var st = UI.tableState(cfg.id), rows = cfg.rows.slice();
    if (st.q) {
      var q = u.normalize(st.q);
      rows = rows.filter(function (r) { return cfg.columns.some(function (c) { var v = c.text ? c.text(r) : (c.sort ? c.sort(r) : r[c.key]); return u.normalize(v).indexOf(q) >= 0; }); });
    }
    if (st.sort) {
      var col = cfg.columns.filter(function (c) { return c.key === st.sort; })[0];
      if (col) {
        var get = col.sort || function (r) { return r[col.key]; };
        rows.sort(function (a, b) {
          var x = get(a), y = get(b);
          if (x === y) return 0;
          if (x === null || x === undefined || x === '') return 1;
          if (y === null || y === undefined || y === '') return -1;
          var r = (typeof x === 'number' && typeof y === 'number') ? x - y : String(x).localeCompare(String(y), 'fr');
          return st.dir === 'asc' ? r : -r;
        });
      }
    }
    return rows;
  };
  UI.tableInner = function (id) {
    var cfg = UI.tables[id], st = UI.tableState(id);
    var rows = UI.tableRows(cfg);
    var size = cfg.pageSize || 50, pages = Math.max(1, Math.ceil(rows.length / size));
    if (st.page > pages) st.page = pages;
    var shown = rows.slice((st.page - 1) * size, st.page * size);
    var tools = '';
    if (cfg.search !== false || cfg.csv) {
      tools = '<div class="tbl-tools">' + (cfg.search !== false ? '<input type="search" class="input sm" placeholder="Rechercher…" value="' + e(st.q) + '" data-action="tbl-search" data-tbl="' + id + '" aria-label="Rechercher dans le tableau">' : '') +
        '<span class="muted sm">' + rows.length + ' ligne(s)</span>' + (cfg.tools || '') +
        (cfg.csv ? UI.btn('CSV', 'tbl-csv', { cls: 'ghost sm', icon: 'download', data: { tbl: id }, title: 'Exporter ce tableau en CSV' }) : '') + '</div>';
    }
    var head = '<tr>' + cfg.columns.map(function (c) {
      var arrow = st.sort === c.key ? (st.dir === 'asc' ? ' ▲' : ' ▼') : '';
      return '<th class="' + (c.num ? 'num' : '') + '"><button type="button" class="th-btn" data-action="tbl-sort" data-tbl="' + id + '" data-col="' + c.key + '">' + e(c.label) + arrow + '</button></th>';
    }).join('') + '</tr>';
    var body = shown.length ? shown.map(function (r) {
      var rid = cfg.rowId ? cfg.rowId(r) : r.id;
      var attrs = cfg.onRow ? ' data-action="' + cfg.onRow + '" data-id="' + e(rid) + '" tabindex="0" class="clickable' + (r.archive === true ? ' archived' : '') + '"' : (r.archive === true ? ' class="archived"' : '');
      return '<tr' + attrs + '>' + cfg.columns.map(function (c) {
        var v = c.render ? c.render(r) : e(r[c.key] === undefined ? '' : r[c.key]);
        return '<td class="' + (c.num ? 'num' : '') + '" data-label="' + e(c.label) + '">' + (v === '' || v === null || v === undefined ? '<span class="muted">–</span>' : v) + '</td>';
      }).join('') + '</tr>';
    }).join('') : '<tr><td colspan="' + cfg.columns.length + '" class="empty-cell">' + e(cfg.empty || 'Aucune ligne.') + '</td></tr>';
    var pager = pages > 1 ? '<div class="pager">' + UI.btn('Précédent', 'tbl-page', { cls: 'ghost sm', data: { tbl: id, dir: -1 }, disabled: st.page <= 1 }) +
      '<span class="muted sm">Page ' + st.page + ' / ' + pages + '</span>' + UI.btn('Suivant', 'tbl-page', { cls: 'ghost sm', data: { tbl: id, dir: 1 }, disabled: st.page >= pages }) + '</div>' : '';
    return tools + '<div class="tbl-scroll"><table class="tbl' + (cfg.stack ? ' stack' : '') + '"><thead>' + head + '</thead><tbody>' + body + '</tbody></table></div>' + pager;
  };
  UI.refreshTable = function (id) {
    var el = document.querySelector('.tbl-wrap[data-tbl="' + id + '"]');
    if (el) el.innerHTML = UI.tableInner(id);
  };
  UI.tableCSV = function (id) {
    var cfg = UI.tables[id];
    var rows = UI.tableRows(cfg).map(function (r) {
      return cfg.columns.map(function (c) { if (c.csv) return c.csv(r); if (c.sort) return c.sort(r); var v = r[c.key]; return v === undefined ? '' : v; });
    });
    UI.download((cfg.csv || 'export') + '.csv', Padel.importer.toCSV(cfg.columns.map(function (c) { return c.label; }), rows), 'text/csv;charset=utf-8');
  };
  UI.download = function (name, content, type) {
    var blob = new Blob([content], { type: type || 'text/plain;charset=utf-8' });
    var a = document.createElement('a');
    a.href = URL.createObjectURL(blob); a.download = name;
    document.body.appendChild(a); a.click();
    setTimeout(function () { URL.revokeObjectURL(a.href); a.remove(); }, 500);
  };

  // ------------------------------------------------------------------ modales
  var modalStack = [];
  UI.modal = function (title, body, opts) {
    opts = opts || {};
    var root = document.getElementById('modal-root');
    var id = 'm' + Date.now() + Math.floor(Math.random() * 1000);
    var el = document.createElement('div');
    el.className = 'modal-back'; el.id = id;
    el.innerHTML = '<div class="modal' + (opts.wide ? ' wide' : '') + '" role="dialog" aria-modal="true" aria-labelledby="' + id + '-t">' +
      '<header class="modal-h"><h2 id="' + id + '-t">' + e(title) + '</h2><button type="button" class="icon-btn" data-action="modal-close" aria-label="Fermer">' + icon('x') + '</button></header>' +
      '<div class="modal-b">' + body + '</div>' + (opts.footer ? '<footer class="modal-f">' + opts.footer + '</footer>' : '') + '</div>';
    root.appendChild(el);
    modalStack.push({ id: id, onClose: opts.onClose });
    document.body.classList.add('no-scroll');
    setTimeout(function () { var f = el.querySelector('[autofocus], input:not([type=hidden]):not([readonly]), select, textarea'); if (f && window.innerWidth > 700) f.focus(); }, 30);
    return el;
  };
  UI.closeModal = function () {
    var m = modalStack.pop(); if (!m) return;
    var el = document.getElementById(m.id); if (el) el.remove();
    if (!modalStack.length) document.body.classList.remove('no-scroll');
    if (m.onClose) m.onClose();
  };
  UI.topModal = function () { var m = modalStack[modalStack.length - 1]; return m && document.getElementById(m.id); };

  /** Confirmation (avec motif facultatif). Renvoie une Promise résolue avec le motif, rejetée si annulé. */
  UI.confirm = function (message, opts) {
    opts = opts || {};
    return new Promise(function (resolve, reject) {
      var done = false;
      var el = UI.modal(opts.title || 'Confirmer', '<p>' + message + '</p>' + (opts.motif ? '<label class="field"><span>Motif' + (opts.motifRequired ? ' (obligatoire)' : '') + '</span><textarea class="input" data-confirm-motif rows="2"></textarea></label>' : ''),
        { footer: UI.btn('Annuler', 'modal-close', { cls: 'ghost' }) + UI.btn(opts.ok || 'Confirmer', 'confirm-ok', { cls: opts.danger ? 'danger' : 'primary' }), onClose: function () { if (!done) reject(new Error('annulé')); } });
      el.querySelector('[data-action="confirm-ok"]').addEventListener('click', function () {
        var t = el.querySelector('[data-confirm-motif]'); var motif = t ? t.value.trim() : '';
        if (opts.motifRequired && !motif) { t.classList.add('invalid'); t.focus(); return; }
        done = true; UI.closeModal(); resolve(motif);
      });
    });
  };

  var toastTimer;
  UI.toast = function (msg, cls) {
    var t = document.getElementById('toast');
    t.className = 'toast show ' + (cls || ''); t.textContent = msg;
    t.setAttribute('role', cls === 'bad' ? 'alert' : 'status');
    clearTimeout(toastTimer); toastTimer = setTimeout(function () { t.className = 'toast'; }, cls === 'bad' ? 7000 : 3500);
  };

  // ------------------------------------------------------------------ formulaires
  /** Libellé d'une ligne référencée (pour les listes déroulantes). */
  UI.refLabel = function (sheet, r) {
    if (!r) return '';
    switch (sheet) {
      case 'terrains': return r.nom || ('Terrain ' + r.numero);
      case 'utilisateurs': return r.nom_affiche || r.email || r.id;
      case 'membres': return r.id + (r.alias ? ' – ' + r.alias : '');
      case 'offres': return r.nom;
      case 'cycles': return r.nom;
      case 'seances': return u.fmtDate(u.parseDate(r.date)) + ' ' + (r.heure_debut || '') + ' – ' + Padel.calc.typeLabel(UI.app.ctx, r.type_activite);
      case 'evenements': return r.nom + ' (' + u.fmtDate(u.parseDate(r.date)) + ')';
      case 'inscriptions': { var cy = UI.app.ctx.cycles[r.cycle_id]; return r.membre_id + ' – ' + (cy ? cy.nom : (r.evenement_id || r.seance_id || '')); }
      default: return r.id;
    }
  };

  function enumOptions(col) {
    if (col.enumName) return schema.ENUMS[col.enumName];
    var out = {};
    UI.app.db.parametres.filter(function (p) { return p.categorie === col.enumParam && p.archive !== true && p.statut !== 'archive'; })
      .forEach(function (p) { out[p.cle] = p.libelle || p.valeur || p.cle; });
    return out;
  }
  UI.enumOptions = enumOptions;

  function refRows(col) {
    var rows = (UI.app.db[col.ref] || []).filter(function (r) { return r.archive !== true && r.statut !== 'archive'; });
    if (col.refRole) rows = rows.filter(function (r) { return r.role === col.refRole || r.role === 'admin'; });
    return rows;
  }

  /** Champ de formulaire généré depuis la colonne du schéma. */
  UI.field = function (col, value, opts) {
    opts = opts || {};
    var name = col.n, v = value === undefined || value === null ? '' : value;
    var req = col.req && col.n !== 'id' && col.t !== 'bool';
    var label = '<span>' + e(opts.label || col.label) + (req ? ' <b class="req" aria-hidden="true">*</b>' : '') + '</span>';
    var help = (opts.help || col.help || col.v) ? '<small class="help">' + e(opts.help || col.help || col.v) + '</small>' : '';
    var common = ' name="' + name + '" id="f-' + name + '"' + (req ? ' required' : '') + (opts.readonly ? ' disabled' : '');
    var input;
    switch (col.t) {
      case 'longtext': input = '<textarea class="input" rows="2"' + common + '>' + e(v) + '</textarea>'; break;
      case 'date': input = '<input class="input" type="date"' + common + ' value="' + e(u.parseDate(v) || '') + '">'; break;
      case 'time': input = '<input class="input" type="time" step="300"' + common + ' value="' + e(u.parseTime(v) || '') + '">'; break;
      case 'int': case 'number': case 'money':
        input = '<input class="input" type="text" inputmode="' + (col.t === 'int' ? 'numeric' : 'decimal') + '"' + common + ' value="' + e(v === '' ? '' : String(v).replace('.', ',')) + '"' + (col.t === 'money' ? ' placeholder="€"' : '') + '>'; break;
      case 'bool': {
        var on = v === true || String(v).toUpperCase() === 'TRUE' || v === 'oui';
        return '<label class="field switch-field"><input type="checkbox" class="switch"' + common.replace(' required', '') + (on ? ' checked' : '') + '>' + label + help + '</label>';
      }
      case 'rating10': {
        var btns = '';
        for (var i = 0; i <= 10; i++) btns += '<label class="seg-item"><input type="radio" name="' + name + '" value="' + i + '"' + (String(v) === String(i) ? ' checked' : '') + (opts.readonly ? ' disabled' : '') + '><span>' + i + '</span></label>';
        return '<fieldset class="field"><legend>' + label + '</legend><div class="seg rating">' + btns + '<label class="seg-item"><input type="radio" name="' + name + '" value=""' + (v === '' ? ' checked' : '') + '><span>–</span></label></div>' + help + '</fieldset>';
      }
      case 'enum': {
        var opt = enumOptions(col), keys = Object.keys(opt);
        if (keys.length <= 4 && !opts.select) {
          var seg = keys.map(function (k) { return '<label class="seg-item"><input type="radio" name="' + name + '" value="' + e(k) + '"' + (String(v) === k ? ' checked' : '') + (opts.readonly ? ' disabled' : '') + '><span>' + e(opt[k]) + '</span></label>'; }).join('');
          if (!req) seg += '<label class="seg-item"><input type="radio" name="' + name + '" value=""' + (v === '' ? ' checked' : '') + '><span>–</span></label>';
          return '<fieldset class="field"><legend>' + label + '</legend><div class="seg">' + seg + '</div>' + help + '</fieldset>';
        }
        input = '<select class="input"' + common + '><option value="">' + (req ? 'Choisir…' : '–') + '</option>' + keys.map(function (k) { return '<option value="' + e(k) + '"' + (String(v) === k ? ' selected' : '') + '>' + e(opt[k]) + '</option>'; }).join('') +
          (v !== '' && !opt[v] ? '<option value="' + e(v) + '" selected>' + e(v) + ' (inconnu)</option>' : '') + '</select>';
        break;
      }
      case 'ref': {
        var rows = refRows(col);
        if (col.ref === 'membres' || rows.length > 60) {
          var dl = 'dl-' + col.ref;
          input = '<input class="input" type="text" list="' + dl + '"' + common + ' value="' + e(v) + '" autocomplete="off" placeholder="ID…"><datalist id="' + dl + '">' +
            rows.slice(0, 600).map(function (r) { return '<option value="' + e(r.id) + '">' + e(UI.refLabel(col.ref, r)) + '</option>'; }).join('') + '</datalist>';
        } else {
          if (opts.filterRef) rows = rows.filter(opts.filterRef);
          input = '<select class="input"' + common + '><option value="">–</option>' + rows.map(function (r) { return '<option value="' + e(r.id) + '"' + (String(v) === String(r.id) ? ' selected' : '') + '>' + e(UI.refLabel(col.ref, r)) + '</option>'; }).join('') +
            (v !== '' && !rows.some(function (r) { return String(r.id) === String(v); }) ? '<option value="' + e(v) + '" selected>' + e(v) + '</option>' : '') + '</select>';
        }
        break;
      }
      case 'refs': {
        var sel = u.splitList(v);
        var chips = refRows(col).sort(function (a, b) { return (+a.numero || 0) - (+b.numero || 0); }).map(function (r) {
          return '<label class="chip-check"><input type="checkbox" name="' + name + '" value="' + e(r.id) + '"' + (sel.indexOf(String(r.id)) >= 0 ? ' checked' : '') + (opts.readonly ? ' disabled' : '') + '><span>' + e(UI.refLabel(col.ref, r)) + '</span></label>';
        }).join('');
        return '<fieldset class="field"><legend>' + label + '</legend><div class="chips">' + chips + '</div>' + help + '</fieldset>';
      }
      case 'email': input = '<input class="input" type="email" autocomplete="off"' + common + ' value="' + e(v) + '">'; break;
      default: input = '<input class="input" type="text"' + common + ' value="' + e(v) + '">';
    }
    return '<label class="field" for="f-' + name + '">' + label + input + help + '</label>';
  };

  /** Lit les valeurs d'un formulaire selon les colonnes du schéma. */
  UI.readForm = function (form, sheetKey, base) {
    var def = schema.sheet(sheetKey), out = Object.assign({}, base || {});
    def.cols.forEach(function (c) {
      if (c.t === 'refs') {
        var boxes = form.querySelectorAll('input[name="' + c.n + '"]');
        if (boxes.length) out[c.n] = Array.prototype.filter.call(boxes, function (b) { return b.checked; }).map(function (b) { return b.value; }).join(',');
        return;
      }
      var els = form.querySelectorAll('[name="' + c.n + '"]');
      if (!els.length) return;
      if (els[0].type === 'radio') { var ch = Array.prototype.filter.call(els, function (x) { return x.checked; })[0]; out[c.n] = ch ? ch.value : ''; return; }
      if (els[0].type === 'checkbox') { out[c.n] = els[0].checked; return; }
      if (els[0].disabled) return;
      out[c.n] = els[0].value;
    });
    return out;
  };

  /**
   * Formulaire d'édition générique dans une fenêtre modale.
   * opts : { title, fields:[noms], defaults, readonly:[noms], onSaved(row), intro, labels, help, extraFooter, motif }
   */
  UI.editForm = function (sheetKey, record, opts) {
    opts = opts || {};
    var def = schema.sheet(sheetKey), app = UI.app;
    var rec = Object.assign({}, opts.defaults || {}, record || {});
    var isNew = !record || !record.id;
    var fields = opts.fields || def.cols.filter(function (c) { return !c.meta && c.n !== 'id' && !c.secret; }).map(function (c) { return c.n; });
    var canWrite = Padel.permissions.canWrite(app.perms, sheetKey);
    var ro = !canWrite || (opts.readonlyAll === true);
    var html = (opts.intro ? '<div class="form-intro">' + opts.intro + '</div>' : '') + '<form class="form-grid" novalidate>' +
      fields.map(function (n) {
        var col = schema.col(sheetKey, n); if (!col) return '';
        return UI.field(col, rec[n], { readonly: ro || (opts.readonly || []).indexOf(n) >= 0, label: (opts.labels || {})[n], help: (opts.help || {})[n], select: (opts.selects || []).indexOf(n) >= 0, filterRef: (opts.filterRefs || {})[n] });
      }).join('') + '<div class="form-errors" role="alert"></div></form>' +
      (!isNew ? '<p class="meta-line">ID ' + e(rec.id) + (rec.cree_le ? ' · créé le ' + e(String(rec.cree_le).slice(0, 10)) + ' par ' + e(rec.cree_par || '?') : '') + (rec.modifie_le ? ' · modifié le ' + e(String(rec.modifie_le).slice(0, 10)) + ' par ' + e(rec.modifie_par || '?') : '') + (rec.import_id ? ' · import ' + e(rec.import_id) : '') + '</p>' : '');
    var footer = (!isNew && canWrite && opts.archivable !== false && !ro ? UI.btn('Archiver', 'form-archive', { cls: 'ghost danger-text', icon: 'archive' }) : '') + '<span class="spacer"></span>' +
      (opts.extraFooter || '') + UI.btn(ro ? 'Fermer' : 'Annuler', 'modal-close', { cls: 'ghost' }) + (ro ? '' : UI.btn(opts.saveLabel || 'Enregistrer', 'form-save', { cls: 'primary', icon: 'check' }));
    var el = UI.modal(opts.title || ((isNew ? 'Ajouter – ' : 'Modifier – ') + def.label), html, { footer: footer, wide: opts.wide });
    var form = el.querySelector('form');
    if (opts.onMount) opts.onMount(form, el);
    function submit(extra) {
      var data = UI.readForm(form, sheetKey, rec);
      if (extra) Object.assign(data, extra);
      if (opts.beforeSave) { var msg = opts.beforeSave(data, form); if (msg) { showErr(msg); return; } }
      var v = Padel.rules.validateRecord(sheetKey, data, app.db.parametres);
      if (v.errors.length) { showErr(v.errors.join('<br>')); return; }
      var btn = el.querySelector('[data-action="form-save"]'); if (btn) btn.disabled = true;
      app.save(sheetKey, data, opts.motif || '').then(function (saved) {
        UI.closeModal(); UI.toast(isNew ? 'Enregistré.' : 'Modifications enregistrées.', 'ok');
        if (opts.onSaved) opts.onSaved(saved); else app.render();
      }).catch(function (err) { if (btn) btn.disabled = false; showErr(e(err.message).replace(/\n/g, '<br>')); });
    }
    function showErr(msg) { var b = el.querySelector('.form-errors'); b.innerHTML = msg; b.scrollIntoView({ block: 'nearest' }); }
    el.querySelector('form').addEventListener('submit', function (ev) { ev.preventDefault(); submit(); });
    var sb = el.querySelector('[data-action="form-save"]'); if (sb) sb.addEventListener('click', function () { submit(); });
    el._submit = submit;
    var ab = el.querySelector('[data-action="form-archive"]');
    if (ab) ab.addEventListener('click', function () {
      UI.confirm('Archiver cette ligne ? Elle sera exclue des calculs mais restera dans Google Sheets (rien n\'est supprimé).', { motif: true, ok: 'Archiver', danger: true }).then(function (motif) {
        return app.archive(sheetKey, rec.id, motif).then(function () { UI.closeModal(); UI.toast('Ligne archivée.', 'ok'); app.render(); });
      }).catch(function (err) { if (err.message !== 'annulé') showErr(e(err.message)); });
    });
    return el;
  };

  // ------------------------------------------------------------------ graphiques
  var C1 = '#2F6DB5', C2 = '#2A9D8F';
  /** Courbe d'une série (une mesure par graphique : jamais de double axe). */
  UI.lineChart = function (points, opts) {
    opts = opts || {};
    var W = 640, Hh = 200, padL = 52, padR = 12, padT = 14, padB = 30;
    var vals = points.map(function (p) { return p.v; }).filter(function (v) { return v !== null && v !== undefined; });
    if (!vals.length) return UI.empty('Pas assez de données pour tracer la courbe.');
    var max = Math.max.apply(null, vals.concat([opts.min0 === false ? -Infinity : 0])), min = opts.min0 === false ? Math.min.apply(null, vals) : Math.min(0, Math.min.apply(null, vals));
    if (opts.max !== undefined) max = Math.max(max, opts.max);
    if (max === min) max = min + 1;
    var n = points.length, iw = W - padL - padR, ih = Hh - padT - padB;
    function x(i) { return padL + (n === 1 ? iw / 2 : i * iw / (n - 1)); }
    function y(v) { return padT + ih - (v - min) / (max - min) * ih; }
    var grid = '', ticks = 4;
    for (var t = 0; t <= ticks; t++) {
      var gv = min + (max - min) * t / ticks;
      grid += '<line x1="' + padL + '" x2="' + (W - padR) + '" y1="' + y(gv) + '" y2="' + y(gv) + '" class="grid"/>' +
        '<text x="' + (padL - 8) + '" y="' + (y(gv) + 4) + '" class="axis" text-anchor="end">' + e(opts.fmt ? opts.fmt(gv) : u.fmtNum(gv, 0)) + '</text>';
    }
    var path = '', open = false, dots = '', labels = '';
    var every = Math.ceil(n / 8);
    points.forEach(function (p, i) {
      if (i % every === 0 || i === n - 1) labels += '<text x="' + x(i) + '" y="' + (Hh - 8) + '" class="axis" text-anchor="middle">' + e(p.label) + '</text>';
      if (p.v === null || p.v === undefined) { open = false; return; }
      path += (open ? 'L' : 'M') + x(i).toFixed(1) + ' ' + y(p.v).toFixed(1); open = true;
      var tip = (p.tip || p.label) + ' : ' + (opts.fmt ? opts.fmt(p.v) : u.fmtNum(p.v, 1)) + (p.incomplete ? ' (incomplet)' : '');
      dots += '<g class="pt"><circle cx="' + x(i) + '" cy="' + y(p.v) + '" r="12" class="hit"/><circle cx="' + x(i) + '" cy="' + y(p.v) + '" r="4" fill="' + (opts.color || C1) + '" stroke="#fff" stroke-width="2"' + (p.incomplete ? ' stroke-dasharray="2 2"' : '') + '/><title>' + e(tip) + '</title></g>';
    });
    return '<figure class="chart"><svg viewBox="0 0 ' + W + ' ' + Hh + '" role="img" aria-label="' + e(opts.title || 'Graphique') + '">' + grid +
      '<path d="' + path + '" fill="none" stroke="' + (opts.color || C1) + '" stroke-width="2" stroke-linejoin="round" stroke-linecap="round"/>' + dots + labels + '</svg>' +
      (opts.caption ? '<figcaption>' + opts.caption + '</figcaption>' : '') + '</figure>';
  };

  /** Barres horizontales avec étiquettes directes. items : [{ label, v, display, tip }] */
  UI.bars = function (items, opts) {
    opts = opts || {};
    var max = opts.max || Math.max.apply(null, items.map(function (i) { return i.v || 0; }).concat([0.0001]));
    return '<div class="bars">' + items.map(function (it) {
      var w = it.v === null || it.v === undefined ? 0 : Math.max(0, Math.min(100, it.v / max * 100));
      return '<div class="bar-row" title="' + e(it.tip || '') + '"><span class="bar-label">' + e(it.label) + '</span><span class="bar-track"><span class="bar-fill" style="width:' + w.toFixed(1) + '%;background:' + (it.color || opts.color || C1) + '"></span></span><span class="bar-val">' + (it.display || measure({ v: it.v, gaps: [] }, opts.fmt)) + '</span></div>';
    }).join('') + '</div>';
  };

  /** Carte de chaleur jour × heure (séquentiel, une seule teinte). */
  UI.heatmap = function (heat) {
    var hours = [];
    for (var h = 0; h < 24; h++) if (heat.some(function (row) { return row[h].avail > 0; })) hours.push(h);
    if (!hours.length) return UI.empty('Aucune heure disponible renseignée sur la période.');
    var html = '<div class="heat-wrap"><table class="heat" aria-label="Occupation par jour et par heure"><thead><tr><th></th>' + hours.map(function (h) { return '<th>' + h + 'h</th>'; }).join('') + '</tr></thead><tbody>';
    heat.forEach(function (row, wd) {
      html += '<tr><th>' + u.JOURS_COURTS[wd] + '</th>' + hours.map(function (h) {
        var c = row[h];
        if (!c.avail) return '<td class="off" title="Fermé ou horaires inconnus"></td>';
        var r = c.rate || 0, step = Math.min(5, Math.floor(r * 5.0001));
        return '<td class="s' + step + '" title="' + u.JOURS[wd] + ' ' + h + 'h : ' + u.fmtPct(c.rate, 0) + ' (' + u.fmtNum(c.used, 1) + ' h / ' + u.fmtNum(c.avail, 1) + ' h)"><span>' + Math.round(r * 100) + '</span></td>';
      }).join('') + '</tr>';
    });
    return html + '</tbody></table></div><div class="heat-legend"><span>0 %</span><i class="s0"></i><i class="s1"></i><i class="s2"></i><i class="s3"></i><i class="s4"></i><i class="s5"></i><span>100 %</span></div>';
  };
  UI.COLORS = { C1: C1, C2: C2 };
})(typeof globalThis !== 'undefined' ? globalThis : this);
