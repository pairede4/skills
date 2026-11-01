/**
 * Couche d'accès aux données. Deux implémentations, une seule interface :
 *
 *   SheetsStore : application publiée par Google Apps Script ; chaque appel passe par
 *                 google.script.run vers apps-script/Code.gs, qui lit/écrit le classeur
 *                 et applique les droits côté serveur.
 *   DemoStore   : mode démonstration, données FICTIVES conservées dans le navigateur
 *                 (localStorage). Mêmes règles d'écriture que le serveur.
 *
 * Interface (toutes les méthodes renvoient une Promise) :
 *   bootstrap()                       -> { mode, user, perms, db, notice }
 *   save(feuille, ligne, motif)       -> ligne enregistrée
 *   saveMany(feuille, lignes, motif)  -> lignes enregistrées
 *   archive(feuille, id, motif)       -> ligne archivée
 *   importRows(feuille, lignes, meta) -> ligne « Imports »
 *   undoImport(importId)              -> ligne « Imports » annulée
 *   logEvent(action, motif)           -> journalise un export, un rapport…
 */
(function (root) {
  'use strict';
  var Padel = root.Padel;
  var u = Padel.util, schema = Padel.schema, P = Padel.permissions, rules = Padel.rules;

  // ======================================================================= démo
  var KEY = 'padel-dluccle-demo-v1';
  var ROLE_KEY = 'padel-dluccle-demo-role';

  function DemoStore() { this.mode = 'demo'; }

  DemoStore.prototype._load = function () {
    if (this.db) return this.db;
    var raw = null;
    try { raw = root.localStorage.getItem(KEY); } catch (e) { raw = null; }
    if (raw) { try { this.db = JSON.parse(raw); } catch (e) { this.db = null; } }
    if (!this.db) { this.db = Padel.demoSeed.generate(); this._persist(); }
    return this.db;
  };
  DemoStore.prototype._persist = function () {
    try { root.localStorage.setItem(KEY, JSON.stringify(this.db)); this.persistWarning = null; }
    catch (e) { this.persistWarning = 'Stockage local indisponible : les modifications de démonstration seront perdues à la fermeture.'; }
  };
  DemoStore.prototype.roleUser = function () {
    var role = 'admin';
    try { role = root.localStorage.getItem(ROLE_KEY) || 'admin'; } catch (e) { /* navigation privée */ }
    var users = this._load().utilisateurs.filter(function (x) { return x.role === role && x.actif; });
    return users[0] || this.db.utilisateurs[0];
  };
  DemoStore.prototype.setRole = function (role, userId) {
    try { root.localStorage.setItem(ROLE_KEY, role); if (userId) root.localStorage.setItem(ROLE_KEY + '-user', userId); } catch (e) { /* ignore */ }
  };
  DemoStore.prototype._user = function () {
    var u0 = this.roleUser();
    try {
      var forced = root.localStorage.getItem(ROLE_KEY + '-user');
      var f = forced && this.db.utilisateurs.filter(function (x) { return x.id === forced && x.role === u0.role; })[0];
      if (f) return f;
    } catch (e) { /* ignore */ }
    return u0;
  };
  DemoStore.prototype._perms = function (user) { return P.permissionsFor(user.role, this.db.parametres); };
  DemoStore.prototype.bootstrap = function () {
    var db = this._load(), user = this._user(), perms = this._perms(user);
    return Promise.resolve({ mode: 'demo', user: user, perms: perms, db: rules.filterRead(user, perms, db), fullUsers: db.utilisateurs,
      notice: this.persistWarning || null });
  };
  DemoStore.prototype._ctx = function () { return { seancesById: u.indexBy(this.db.seances, 'id') }; };
  DemoStore.prototype._audit = function (user, action, sheet, id, before, after, motif) {
    this.db.audit.push(rules.auditEntry(user, action, sheet, id, before, after, motif));
  };
  DemoStore.prototype._saveOne = function (sheet, rec, motif, user, perms, importId) {
    var v = rules.validateRecord(sheet, rec, this.db.parametres);
    if (v.errors.length) throw new Error(v.errors.join('\n'));
    var r = v.record, rows = this.db[sheet];
    var idx = -1;
    if (!u.isBlank(r.id)) for (var i = 0; i < rows.length; i++) if (String(rows[i].id) === String(r.id)) { idx = i; break; }
    var before = idx >= 0 ? rows[idx] : null;
    var err = rules.checkWrite(user, perms, sheet, before, r, this._ctx());
    if (err) throw new Error(err);
    var now = new Date().toISOString();
    if (!before) {
      if (u.isBlank(r.id)) r.id = u.newId(schema.sheet(sheet).prefix);
      r.cree_le = now; r.cree_par = user.email; r.archive = r.archive === true; r.import_id = importId || '';
      rows.push(r);
    } else {
      r.cree_le = before.cree_le; r.cree_par = before.cree_par; r.import_id = before.import_id;
      r.modifie_le = now; r.modifie_par = user.email;
      rows[idx] = r;
    }
    if (!importId) this._audit(user, before ? 'modification' : 'creation', sheet, r.id, before, r, motif);
    return r;
  };
  DemoStore.prototype.save = function (sheet, rec, motif) {
    var self = this;
    return new Promise(function (resolve) {
      var user = self._user(), perms = self._perms(user);
      var r = self._saveOne(sheet, rec, motif, user, perms);
      self._persist(); resolve(r);
    });
  };
  DemoStore.prototype.saveMany = function (sheet, recs, motif) {
    var self = this;
    return new Promise(function (resolve) {
      var user = self._user(), perms = self._perms(user);
      var snapshot = JSON.stringify(self.db[sheet]);
      try { var out = recs.map(function (r) { return self._saveOne(sheet, r, motif, user, perms); }); }
      catch (e) { self.db[sheet] = JSON.parse(snapshot); throw e; }
      self._persist(); resolve(out);
    });
  };
  DemoStore.prototype.archive = function (sheet, id, motif) {
    var self = this;
    return new Promise(function (resolve) {
      var user = self._user(), perms = self._perms(user);
      var row = self.db[sheet].filter(function (r) { return String(r.id) === String(id); })[0];
      if (!row) throw new Error('Ligne introuvable.');
      var after = Object.assign({}, row, { archive: true });
      var err = rules.checkWrite(user, perms, sheet, row, after, self._ctx());
      if (err) throw new Error(err);
      row.archive = true; row.modifie_le = new Date().toISOString(); row.modifie_par = user.email;
      self._audit(user, 'archivage', sheet, id, null, null, motif);
      self._persist(); resolve(row);
    });
  };
  DemoStore.prototype.importRows = function (sheet, recs, meta) {
    var self = this;
    return new Promise(function (resolve) {
      var user = self._user(), perms = self._perms(user);
      if (!perms['imports.run']) throw new Error('Votre rôle ne permet pas d\'importer.');
      var impId = u.newId('IMP');
      var snapshot = JSON.stringify(self.db[sheet]);
      try { recs.forEach(function (r) { self._saveOne(sheet, Object.assign({}, r, { id: '' }), '', user, perms, impId); }); }
      catch (e) { self.db[sheet] = JSON.parse(snapshot); throw e; }
      var imp = { id: impId, date: new Date().toISOString(), utilisateur: user.email, source: meta.source, feuille_cible: schema.sheet(sheet).tab, fichier: meta.fichier || '',
        nb_lignes: meta.report.lues, nb_importees: recs.length, nb_doublons: meta.report.doublons, nb_erreurs: meta.report.erreurs, statut: 'importe',
        rapport: JSON.stringify(meta.report), annule_le: '', annule_par: '', archive: false, import_id: '', cree_le: new Date().toISOString(), cree_par: user.email, modifie_le: '', modifie_par: '' };
      self.db.imports.push(imp);
      self._audit(user, 'import', sheet, impId, null, null, meta.source + ' – ' + recs.length + ' ligne(s)');
      self._persist(); resolve(imp);
    });
  };
  DemoStore.prototype.undoImport = function (impId) {
    var self = this;
    return new Promise(function (resolve) {
      var user = self._user(), perms = self._perms(user);
      if (!perms['imports.run']) throw new Error('Votre rôle ne permet pas d\'annuler un import.');
      var imp = self.db.imports.filter(function (r) { return r.id === impId; })[0];
      if (!imp || imp.statut === 'annule') throw new Error('Import introuvable ou déjà annulé.');
      var n = 0;
      schema.SHEETS.forEach(function (s) { (self.db[s.key] || []).forEach(function (r) { if (r.import_id === impId && r.archive !== true) { r.archive = true; n++; } }); });
      imp.statut = 'annule'; imp.annule_le = new Date().toISOString(); imp.annule_par = user.email;
      self._audit(user, 'annulation_import', 'imports', impId, null, null, n + ' ligne(s) archivée(s)');
      self._persist(); resolve(imp);
    });
  };
  DemoStore.prototype.logEvent = function (action, motif) {
    var user = this._user(); this._audit(user, action, null, '', null, null, motif); this._persist(); return Promise.resolve(true);
  };
  DemoStore.prototype.reset = function () {
    try { root.localStorage.removeItem(KEY); } catch (e) { /* ignore */ }
    this.db = null; this._load(); return Promise.resolve(true);
  };
  DemoStore.prototype.exportAll = function () { return Promise.resolve(JSON.parse(JSON.stringify(this._load()))); };
  DemoStore.prototype.restoreAll = function (data) {
    var ok = schema.SHEETS.every(function (s) { return Array.isArray(data[s.key]); });
    if (!ok) return Promise.reject(new Error('Fichier de sauvegarde invalide : feuilles manquantes.'));
    this.db = data; this._persist(); return Promise.resolve(true);
  };

  // ===================================================================== Sheets
  function SheetsStore() { this.mode = 'sheets'; this.token = null; try { this.token = root.sessionStorage.getItem('padel-token'); } catch (e) { /* ignore */ } }
  function call(fn, args) {
    return new Promise(function (resolve, reject) {
      var runner = root.google.script.run.withSuccessHandler(function (res) {
        if (res && res.error) reject(new Error(res.error)); else resolve(res);
      }).withFailureHandler(function (err) { reject(new Error((err && err.message) || String(err))); });
      runner[fn].apply(runner, args);
    });
  }
  SheetsStore.prototype.bootstrap = function () {
    var self = this;
    return call('api_bootstrap', [self.token]).then(function (res) { res.mode = 'sheets'; return res; });
  };
  SheetsStore.prototype.login = function (email, code) {
    var self = this;
    return call('api_login', [email, code]).then(function (res) { self.token = res.token; try { root.sessionStorage.setItem('padel-token', res.token); } catch (e) { /* ignore */ } return res; });
  };
  SheetsStore.prototype.logout = function () { this.token = null; try { root.sessionStorage.removeItem('padel-token'); } catch (e) { /* ignore */ } return Promise.resolve(true); };
  SheetsStore.prototype.save = function (sheet, rec, motif) { return call('api_save', [this.token, sheet, [rec], motif || '']).then(function (r) { return r.rows[0]; }); };
  SheetsStore.prototype.saveMany = function (sheet, recs, motif) { return call('api_save', [this.token, sheet, recs, motif || '']).then(function (r) { return r.rows; }); };
  SheetsStore.prototype.archive = function (sheet, id, motif) { return call('api_archive', [this.token, sheet, id, motif || '']).then(function (r) { return r.row; }); };
  SheetsStore.prototype.importRows = function (sheet, recs, meta) { return call('api_import', [this.token, sheet, recs, meta]).then(function (r) { return r.import; }); };
  SheetsStore.prototype.undoImport = function (id) { return call('api_undoImport', [this.token, id]).then(function (r) { return r.import; }); };
  SheetsStore.prototype.logEvent = function (action, motif) { return call('api_log', [this.token, action, motif || '']); };

  function create() {
    var forced = root.PADEL_MODE;
    if (forced === 'sheets' || (forced !== 'demo' && root.google && root.google.script && root.google.script.run)) return new SheetsStore();
    return new DemoStore();
  }

  Padel.store = { create: create, DemoStore: DemoStore, SheetsStore: SheetsStore };
})(typeof globalThis !== 'undefined' ? globalThis : this);
