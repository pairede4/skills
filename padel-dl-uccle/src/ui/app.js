/**
 * Application : démarrage, navigation, filtres de période et actions globales.
 */
(function (root) {
  'use strict';
  var Padel = root.Padel;
  var u = Padel.util, calc = Padel.calc, UI = Padel.ui, P = Padel.permissions;
  var e = u.escapeHtml, icon = UI.icon;

  var NAV = [
    { id: 'dashboard', label: 'Tableau de bord', icon: 'dashboard', perms: ['dashboard.view'] },
    { id: 'seances', label: 'Séances', icon: 'calendar', perms: ['seances.view'] },
    { id: 'heures', label: 'Heures coachs', icon: 'clock', perms: ['heures.own', 'heures.view_all'] },
    { id: 'paiements', label: 'Paiements', icon: 'receipt', perms: ['paiements.view'] },
    { id: 'terrains', label: 'Terrains', icon: 'court', perms: ['terrains.view'] },
    { id: 'academies', label: 'Académies', icon: 'users', perms: ['academies.view'] },
    { id: 'evenements', label: 'Événements', icon: 'trophy', perms: ['evenements.view'] },
    { id: 'satisfaction', label: 'Satisfaction', icon: 'star', perms: ['satisfaction.view', 'satisfaction.edit'] },
    { id: 'pnl', label: 'P&L padel', icon: 'euro', perms: ['pnl.view'] },
    { id: 'depenses', label: 'Dépenses', icon: 'file', perms: ['depenses.view'] },
    { id: 'rapports', label: 'Rapports', icon: 'chart', perms: ['rapports.view'] },
    { id: 'membres', label: 'Membres', icon: 'member', perms: ['membres.view'] },
    { id: 'imports', label: 'Imports', icon: 'upload', perms: ['imports.run'] },
    { id: 'qualite', label: 'Qualité des données', icon: 'alert', perms: ['qualite.view'] },
    { id: 'parametres', label: 'Paramètres', icon: 'settings', perms: ['parametres.view'] },
    { id: 'journal', label: 'Journal d\'audit', icon: 'list', perms: ['audit.view'] },
    { id: 'aide', label: 'Aide', icon: 'help', perms: [] }
  ];
  var HOME = { admin: 'dashboard', manager: 'dashboard', coach: 'heures', reception: 'paiements' };

  var app = UI.app = {
    store: null, mode: null, user: null, perms: {}, db: null, ctx: null, today: u.parseDate(new Date()),
    filters: { kind: 'mois', anchor: null, from: null, to: null, terrains: [], lieu: '', type: '', niveau: '', coach: '', public: '', payant: '' },
    route: null
  };

  app.can = function (p) { return !!app.perms[p]; };
  app.canAny = function (list) { return !list.length || list.some(function (p) { return app.perms[p]; }); };
  app.navItems = function () { return NAV.filter(function (n) { return app.canAny(n.perms); }); };

  app.refreshCtx = function () { app.ctx = calc.context(app.db, app.today); };

  /** Remplace ou ajoute une ligne dans la base locale après un enregistrement. */
  function upsertLocal(sheet, row) {
    var rows = app.db[sheet] = app.db[sheet] || [];
    for (var i = 0; i < rows.length; i++) if (String(rows[i].id) === String(row.id)) { rows[i] = row; return; }
    rows.push(row);
  }
  app.save = function (sheet, rec, motif) {
    return app.store.save(sheet, rec, motif).then(function (row) { upsertLocal(sheet, row); app.refreshCtx(); return row; });
  };
  app.saveMany = function (sheet, recs, motif) {
    return app.store.saveMany(sheet, recs, motif).then(function (rows) { rows.forEach(function (r) { upsertLocal(sheet, r); }); app.refreshCtx(); return rows; });
  };
  app.archive = function (sheet, id, motif) {
    return app.store.archive(sheet, id, motif).then(function (row) { upsertLocal(sheet, row); app.refreshCtx(); return row; });
  };
  app.reload = function () {
    return app.store.bootstrap().then(function (res) { applySession(res); app.render(); });
  };

  // ------------------------------------------------------------------ période et filtres
  app.histStart = function () { return app.ctx.histStart || '2026-08-01'; };
  app.setPeriod = function (kind, anchor) {
    var f = app.filters;
    f.kind = kind;
    if (kind === 'depuis') { f.from = app.histStart(); f.to = app.today; return; }
    if (kind === 'personnalisee') { f.from = f.from || app.histStart(); f.to = f.to || app.today; return; }
    var r = u.periodRange(kind, anchor || f.anchor || app.today);
    f.anchor = r.from; f.from = r.from; f.to = r.to;
  };
  app.period = function () { return { kind: app.filters.kind === 'depuis' ? 'personnalisee' : app.filters.kind, from: app.filters.from, to: app.filters.to }; };
  app.filterObj = function (extra) {
    var f = app.filters;
    return Object.assign({ from: f.from, to: f.to, terrains: f.terrains, lieu: f.lieu, type: f.type, niveau: f.niveau, coach: f.coach, public: f.public, payant: f.payant }, extra || {});
  };
  app.activeFilterCount = function () { var f = app.filters; return (f.terrains.length ? 1 : 0) + ['lieu', 'type', 'niveau', 'coach', 'public', 'payant'].filter(function (k) { return f[k]; }).length; };

  /** Barre de période (+ bouton filtres). */
  UI.periodBar = function (opts) {
    opts = opts || {};
    var f = app.filters;
    var kinds = { semaine: 'Semaine', mois: 'Mois', trimestre: 'Trimestre', depuis: 'Depuis l\'ouverture', personnalisee: 'Personnalisée' };
    var label = f.kind === 'depuis' ? 'Depuis le ' + u.fmtDate(f.from) : u.periodLabel(app.period());
    var nav = (f.kind === 'semaine' || f.kind === 'mois' || f.kind === 'trimestre') ?
      '<button type="button" class="icon-btn" data-action="period-step" data-dir="-1" aria-label="Période précédente">' + icon('left') + '</button>' +
      '<span class="period-label">' + e(label) + '</span>' +
      '<button type="button" class="icon-btn" data-action="period-step" data-dir="1" aria-label="Période suivante">' + icon('right') + '</button>' : '<span class="period-label">' + e(label) + '</span>';
    var custom = f.kind === 'personnalisee' ? '<input type="date" class="input sm" value="' + e(f.from) + '" data-action="period-from" aria-label="Du"><input type="date" class="input sm" value="' + e(f.to) + '" data-action="period-to" aria-label="Au">' : '';
    var n = app.activeFilterCount();
    return '<div class="period-bar"><select class="input sm" data-action="period-kind" aria-label="Type de période">' +
      Object.keys(kinds).map(function (k) { return '<option value="' + k + '"' + (f.kind === k ? ' selected' : '') + '>' + kinds[k] + '</option>'; }).join('') + '</select>' +
      nav + custom + (opts.filters === false ? '' : '<button type="button" class="btn ghost sm' + (n ? ' active' : '') + '" data-action="open-filters">' + icon('filter', 16) + '<span>Filtres' + (n ? ' (' + n + ')' : '') + '</span></button>') +
      (n && opts.filters !== false ? '<button type="button" class="btn ghost sm" data-action="clear-filters">Effacer</button>' : '') + (f.to >= app.today && f.from <= app.today ? UI.badge('Période en cours : chiffres provisoires', 'warn', 'La période n\'est pas terminée ; la comparaison avec la période précédente porte sur une période incomplète.') : '') + '</div>' + (n && opts.filters !== false ? filterChips() : '');
  };
  function filterChips() {
    var f = app.filters, out = [];
    if (f.terrains.length) out.push('Terrain : ' + f.terrains.map(function (t) { return UI.refLabel('terrains', app.ctx.terrains[t]) || t; }).join(', '));
    if (f.lieu) out.push(f.lieu === 'indoor' ? 'Indoor' : 'Outdoor');
    if (f.type) out.push(calc.typeLabel(app.ctx, f.type));
    if (f.niveau) out.push('Niveau ' + f.niveau);
    if (f.coach) out.push('Coach : ' + calc.coachName(app.ctx, f.coach));
    if (f.public) out.push(f.public === 'junior' ? 'Juniors' : 'Adultes');
    if (f.payant) out.push(f.payant === 'payant' ? 'Payant' : 'Gratuit');
    return '<div class="chips filter-chips">' + out.map(function (x) { return '<span class="chip">' + e(x) + '</span>'; }).join('') + '</div>';
  }

  function openFilters() {
    var f = app.filters;
    var terr = app.db.terrains.filter(function (t) { return t.archive !== true; }).sort(function (a, b) { return a.numero - b.numero; });
    var types = UI.enumOptions({ enumParam: 'type_activite' });
    var coaches = app.db.utilisateurs.filter(function (x) { return x.role === 'coach' || x.role === 'admin'; });
    function sel(name, opts, cur, label) {
      return '<label class="field"><span>' + label + '</span><select class="input" name="' + name + '"><option value="">Tous</option>' +
        Object.keys(opts).map(function (k) { return '<option value="' + e(k) + '"' + (cur === k ? ' selected' : '') + '>' + e(opts[k]) + '</option>'; }).join('') + '</select></label>';
    }
    var coachOpts = {}; coaches.forEach(function (c) { coachOpts[c.id] = c.nom_affiche; });
    var niv = {}; for (var i = 1; i <= 8; i++) niv[i] = 'Niveau ' + i;
    var body = '<form class="form-grid">' +
      '<fieldset class="field full"><legend>Terrains</legend><div class="chips">' + terr.map(function (t) { return '<label class="chip-check"><input type="checkbox" name="terrains" value="' + e(t.id) + '"' + (f.terrains.indexOf(t.id) >= 0 ? ' checked' : '') + '><span>' + e(t.nom) + '</span></label>'; }).join('') + '</div></fieldset>' +
      sel('lieu', { indoor: 'Indoor', outdoor: 'Outdoor' }, f.lieu, 'Indoor / outdoor') + sel('type', types, f.type, 'Activité') + sel('niveau', niv, f.niveau, 'Niveau') +
      sel('coach', coachOpts, f.coach, 'Coach') + sel('public', { adulte: 'Adultes', junior: 'Juniors' }, f.public, 'Académie adulte / junior') + sel('payant', { payant: 'Payant', gratuit: 'Gratuit' }, f.payant, 'Gratuit / payant') +
      '</form><p class="muted sm">Les filtres d\'activité s\'appliquent aux activités encadrées ; les réservations libres ne sont alors plus comptées dans l\'occupation.</p>';
    var el = UI.modal('Filtres', body, { footer: UI.btn('Réinitialiser', 'clear-filters', { cls: 'ghost' }) + '<span class="spacer"></span>' + UI.btn('Appliquer', 'apply-filters', { cls: 'primary' }) });
    el.querySelector('[data-action="apply-filters"]').addEventListener('click', function () {
      var form = el.querySelector('form');
      f.terrains = Array.prototype.filter.call(form.querySelectorAll('input[name=terrains]'), function (b) { return b.checked; }).map(function (b) { return b.value; });
      ['lieu', 'type', 'niveau', 'coach', 'public', 'payant'].forEach(function (k) { f[k] = form.querySelector('[name=' + k + ']').value; });
      UI.closeModal(); app.render();
    });
  }

  // ------------------------------------------------------------------ rendu
  function shell() {
    var items = app.navItems();
    var roleLabel = P.ROLES[app.user.role] || app.user.role;
    var demoSwitch = '';
    if (app.mode === 'demo') {
      var opts = (app.fullUsers || []).filter(function (x) { return x.actif; }).map(function (x) {
        return '<option value="' + e(x.role + '|' + x.id) + '"' + (x.id === app.user.id ? ' selected' : '') + '>' + e(x.nom_affiche + ' – ' + (P.ROLES[x.role] || x.role)) + '</option>';
      }).join('');
      demoSwitch = '<label class="role-switch"><span class="sr">Voir en tant que</span><select class="input sm" data-action="demo-role" aria-label="Voir l\'application en tant que">' + opts + '</select></label>';
    }
    var mobile = items.slice(0, 4);
    return '<div class="layout">' +
      '<aside class="sidebar" aria-label="Navigation principale"><div class="brand"><div class="brand-mark">DL</div><div><strong>Padel</strong><span>Brussels Uccle</span></div></div><nav>' +
      items.map(function (n) { return '<a href="#/' + n.id + '" class="nav-item' + (app.route === n.id ? ' active' : '') + '"' + (app.route === n.id ? ' aria-current="page"' : '') + '>' + icon(n.icon) + '<span>' + e(n.label) + '</span></a>'; }).join('') +
      '</nav><div class="side-foot">' + (app.mode === 'demo' ? '<span class="badge demo">Démonstration – données fictives</span>' : '<span class="badge ok">Google Sheets</span>') + '</div></aside>' +
      '<div class="main-col"><header class="topbar"><div class="topbar-title"><span class="brand-mark sm mobile-only">DL</span><h1>' + e((NAV.filter(function (n) { return n.id === app.route; })[0] || {}).label || '') + '</h1></div>' +
      '<div class="topbar-user">' + demoSwitch + '<span class="user-chip" title="' + e(app.user.email || '') + '">' + icon('member', 16) + '<span>' + e(app.user.nom_affiche || app.user.email) + '</span><small>' + e(roleLabel) + '</small></span></div></header>' +
      (app.mode === 'demo' ? '<div class="demo-banner" role="note">' + icon('alert', 16) + '<span><strong>Mode démonstration.</strong> Toutes les données affichées sont fictives (membres DEMO-…, coachs « démo », tarifs et horaires inventés). Aucune connexion à Google Sheets n\'est active.</span></div>' : '') +
      (app.notice ? UI.notice(e(app.notice), 'warn') : '') +
      '<main id="main" tabindex="-1"></main></div>' +
      '<nav class="bottom-nav" aria-label="Navigation mobile">' + mobile.map(function (n) { return '<a href="#/' + n.id + '" class="' + (app.route === n.id ? 'active' : '') + '">' + icon(n.icon, 22) + '<span>' + e(shortLabel(n.label)) + '</span></a>'; }).join('') +
      (items.length > 4 ? '<button type="button" data-action="more-menu" class="' + (mobile.some(function (n) { return n.id === app.route; }) ? '' : 'active') + '">' + icon('more', 22) + '<span>Plus</span></button>' : '') + '</nav></div>';
  }
  function shortLabel(l) { return { 'Tableau de bord': 'Accueil', 'Heures coachs': 'Heures', 'Qualité des données': 'Qualité' }[l] || l; }

  app.render = function () {
    var appEl = document.getElementById('app');
    var scroll = window.scrollY;
    var sameRoute = app._lastRoute === app.route;
    appEl.innerHTML = shell();
    var view = UI.views[app.route] || UI.views.aide;
    var main = document.getElementById('main');
    try { main.innerHTML = view(); }
    catch (err) { main.innerHTML = UI.notice('Erreur d\'affichage : ' + e(err.message), 'bad'); if (root.console) console.error(err); }
    if (view.after) view.after(main);
    if (sameRoute) window.scrollTo(0, scroll); else window.scrollTo(0, 0);
    app._lastRoute = app.route;
    document.title = ((NAV.filter(function (n) { return n.id === app.route; })[0] || {}).label || 'Padel') + ' · Padel DL Uccle';
  };

  function route() {
    var h = (location.hash || '').replace(/^#\/?/, '').split('?')[0];
    var allowed = app.navItems().map(function (n) { return n.id; });
    if (allowed.indexOf(h) < 0) h = allowed.indexOf(HOME[app.user.role]) >= 0 ? HOME[app.user.role] : allowed[0];
    app.route = h;
    app.render();
  }
  app.go = function (r) { if (location.hash === '#/' + r) route(); else location.hash = '#/' + r; };

  // ------------------------------------------------------------------ actions globales
  var A = UI.actions;
  A['modal-close'] = function () { UI.closeModal(); };
  A['period-kind'] = function (el) { app.setPeriod(el.value); app.render(); };
  A['period-step'] = function (el) {
    var f = app.filters, d = +el.getAttribute('data-dir');
    var anchor = f.kind === 'semaine' ? u.addDays(f.from, 7 * d) : u.addMonths(f.from, (f.kind === 'mois' ? 1 : 3) * d);
    app.setPeriod(f.kind, anchor); app.render();
  };
  A['period-from'] = function (el) { if (u.parseDate(el.value)) { app.filters.from = el.value; app.render(); } };
  A['period-to'] = function (el) { if (u.parseDate(el.value)) { app.filters.to = el.value; app.render(); } };
  A['open-filters'] = openFilters;
  A['clear-filters'] = function () { var f = app.filters; f.terrains = []; ['lieu', 'type', 'niveau', 'coach', 'public', 'payant'].forEach(function (k) { f[k] = ''; }); if (UI.topModal()) UI.closeModal(); app.render(); };
  A['tbl-sort'] = function (el) {
    var id = el.getAttribute('data-tbl'), col = el.getAttribute('data-col'), st = UI.tableState(id);
    if (st.sort === col) st.dir = st.dir === 'asc' ? 'desc' : 'asc'; else { st.sort = col; st.dir = 'asc'; }
    UI.refreshTable(id);
  };
  A['tbl-page'] = function (el) { var st = UI.tableState(el.getAttribute('data-tbl')); st.page += +el.getAttribute('data-dir'); UI.refreshTable(el.getAttribute('data-tbl')); };
  A['tbl-csv'] = function (el) { UI.tableCSV(el.getAttribute('data-tbl')); app.store.logEvent('export', 'Export CSV : ' + (UI.tables[el.getAttribute('data-tbl')].csv || '')); };
  A['demo-role'] = function (el) {
    var p = el.value.split('|'); app.store.setRole(p[0], p[1]);
    app.reload().then(function () { UI.toast('Vue « ' + (P.ROLES[p[0]] || p[0]) + ' » (démonstration).'); route(); });
  };
  A['more-menu'] = function () {
    var items = app.navItems().slice(4);
    var el = UI.modal('Menu', '<nav class="more-list">' + items.map(function (n) { return '<a href="#/' + n.id + '" class="nav-item">' + icon(n.icon) + '<span>' + e(n.label) + '</span></a>'; }).join('') + '</nav>');
    el.querySelectorAll('a').forEach(function (a) { a.addEventListener('click', function () { UI.closeModal(); }); });
  };

  function delegate(type) {
    document.addEventListener(type, function (ev) {
      var el = ev.target.closest('[data-action]');
      if (!el) return;
      var name = el.getAttribute('data-action');
      var tag = el.tagName;
      if (type === 'click' && (tag === 'SELECT' || (tag === 'INPUT' && el.type !== 'checkbox' && el.type !== 'button'))) return;
      if (type === 'change' && !(tag === 'SELECT' || tag === 'INPUT' || tag === 'TEXTAREA')) return;
      if (type === 'input' && name !== 'tbl-search' && !el.hasAttribute('data-live')) return;
      if (name === 'tbl-search') {
        if (type !== 'input') return;
        var st = UI.tableState(el.getAttribute('data-tbl')); st.q = el.value; st.page = 1;
        var wrap = el.closest('.tbl-wrap'), pos = el.selectionStart;
        UI.refreshTable(el.getAttribute('data-tbl'));
        var ni = wrap.querySelector('input[type=search]'); if (ni) { ni.focus(); try { ni.setSelectionRange(pos, pos); } catch (x) { /* ignore */ } }
        return;
      }
      if (type === 'input' && el.type === 'checkbox') return;
      var fn = A[name];
      if (!fn) return;
      if (type === 'click' && el.closest('form') && el.tagName === 'BUTTON') ev.preventDefault();
      try {
        var res = fn(el, ev);
        if (res && res.catch) res.catch(function (err) { if (err && err.message !== 'annulé') UI.toast(err.message, 'bad'); });
      } catch (err) { UI.toast(err.message, 'bad'); if (root.console) console.error(err); }
    });
  }
  document.addEventListener('keydown', function (ev) {
    if (ev.key === 'Escape' && UI.topModal()) UI.closeModal();
    if ((ev.key === 'Enter' || ev.key === ' ') && ev.target.matches('tr.clickable')) { ev.preventDefault(); ev.target.click(); }
  });

  // ------------------------------------------------------------------ démarrage
  function applySession(res) {
    app.mode = res.mode; app.user = res.user; app.perms = res.perms; app.db = res.db; app.fullUsers = res.fullUsers || res.db.utilisateurs;
    app.notice = res.notice || null;
    app.refreshCtx();
    if (!app.filters.from) app.setPeriod('mois', +app.today.slice(8, 10) < 8 ? u.addMonths(u.startOfMonth(app.today), -1) : app.today);
  }

  function loginScreen(msg) {
    document.getElementById('app').innerHTML = '<div class="login"><div class="login-card"><div class="brand"><div class="brand-mark">DL</div><div><strong>Padel</strong><span>Brussels Uccle</span></div></div>' +
      '<h1>Connexion</h1>' + (msg ? UI.notice(e(msg), 'warn') : '') +
      '<form id="login-form"><label class="field"><span>E-mail</span><input class="input" type="email" name="email" autocomplete="username" required></label>' +
      '<label class="field"><span>Code d\'accès personnel</span><input class="input" type="password" name="code" autocomplete="current-password" required></label>' +
      '<button class="btn primary block" type="submit">Se connecter</button></form><p class="muted sm">Le code est remis par Anthony. Il n\'est jamais stocké en clair.</p></div></div>';
    document.getElementById('login-form').addEventListener('submit', function (ev) {
      ev.preventDefault();
      var f = ev.target;
      app.store.login(f.email.value, f.code.value).then(start).catch(function (err) { loginScreen(err.message); });
    });
  }

  function start() {
    document.getElementById('app').innerHTML = '<div class="loading" role="status">Chargement des données…</div>';
    return app.store.bootstrap().then(function (res) {
      if (res.needLogin) { loginScreen(res.message); return; }
      applySession(res);
      route();
    }).catch(function (err) {
      document.getElementById('app').innerHTML = '<div class="login"><div class="login-card">' + UI.notice('Impossible de charger les données : ' + e(err.message), 'bad') +
        '<p class="muted sm">Vérifiez votre connexion ou contactez Anthony. Si vous venez de déployer l\'application, consultez docs/GUIDE_CONNEXION_GOOGLE_SHEETS.md.</p></div></div>';
    });
  }

  app.boot = function () {
    ['click', 'change', 'input'].forEach(delegate);
    window.addEventListener('hashchange', function () { if (app.user) route(); });
    app.store = Padel.store.create();
    start();
  };
})(typeof globalThis !== 'undefined' ? globalThis : this);
