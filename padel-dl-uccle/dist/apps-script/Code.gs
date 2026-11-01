/**
 * Serveur Google Apps Script – Padel David Lloyd Brussels Uccle.
 *
 * Ce script est lié au classeur Google Sheets (Extensions → Apps Script) : aucun
 * identifiant, aucune clé et aucun ID de classeur n'est écrit dans le code.
 * Les seuls réglages (facultatifs) sont des « Propriétés du script » :
 *   AUTH_MODE       code (défaut : compte Google si transmis, sinon e-mail + code) | google (compte Google uniquement)
 *   SPREADSHEET_ID  uniquement si le script n'est PAS lié au classeur
 *   BACKUP_FOLDER   nom du dossier Drive des sauvegardes (défaut « Sauvegardes Padel DL Uccle »)
 *   BACKUP_KEEP     nombre de sauvegardes conservées (défaut 30)
 *   CODE_SALT       créé automatiquement en mode « code »
 *
 * Fonctions à lancer depuis l'éditeur (jamais depuis l'application) :
 *   setupSpreadsheet()   crée/complète les onglets, en-têtes, listes et paramètres initiaux
 *   backupNow()          copie datée du classeur dans Drive
 *   installDailyBackup() sauvegarde automatique chaque nuit
 *   setAccessCode(email, code)  mode « code » : définit le code personnel d'un utilisateur
 *
 * Shared.gs (généré) contient util, schema, permissions et rules : la même logique de
 * validation et de droits que l'application.
 */


// =========================================================================== web app
function doGet() {
  return HtmlService.createHtmlOutputFromFile('Index')
    .setTitle('Padel · DL Uccle')
    .addMetaTag('viewport', 'width=device-width, initial-scale=1, viewport-fit=cover')
    .setXFrameOptionsMode(HtmlService.XFrameOptionsMode.DEFAULT);
}

// =========================================================================== accès au classeur
function ss_() {
  var id = PropertiesService.getScriptProperties().getProperty('SPREADSHEET_ID');
  return id ? SpreadsheetApp.openById(id) : SpreadsheetApp.getActiveSpreadsheet();
}
function prop_(k, d) { var v = PropertiesService.getScriptProperties().getProperty(k); return v === null || v === '' ? d : v; }
function now_() { return new Date().toISOString(); }

function sheetFor_(key) {
  var def = globalThis.Padel.schema.sheet(key);
  if (!def) throw new Error('Feuille inconnue : ' + key);
  var sh = ss_().getSheetByName(def.tab);
  if (!sh) throw new Error('Onglet « ' + def.tab + ' » absent : lancez setupSpreadsheet() depuis l\'éditeur Apps Script.');
  return sh;
}

/** Lit un onglet en objets. Les dates et heures sont lues telles qu'affichées (évite les décalages de fuseau). */
function readSheet_(key) {
  var def = globalThis.Padel.schema.sheet(key), u = globalThis.Padel.util;
  var sh = sheetFor_(key);
  var range = sh.getDataRange();
  var values = range.getValues(), display = range.getDisplayValues();
  if (values.length < 1) return { rows: [], headers: [], sheet: sh };
  var headers = values[0].map(function (h) { return String(h).trim(); });
  var types = {}; def.cols.forEach(function (c) { types[c.n] = c.t; });
  var rows = [];
  for (var i = 1; i < values.length; i++) {
    var o = {}, empty = true;
    for (var j = 0; j < headers.length; j++) {
      var h = headers[j]; if (!h) continue;
      var v = values[i][j], t = types[h];
      if (v !== '' && v !== null) empty = false;
      if (t === 'date') v = u.parseDate(display[i][j]) || (v instanceof Date ? u.parseDate(v) : (v === '' ? '' : String(v)));
      else if (t === 'time') v = u.parseTime(display[i][j]) || (v === '' ? '' : String(display[i][j]));
      else if (t === 'bool' || h === 'archive') v = (v === true || String(v).toUpperCase() === 'TRUE' || String(v).toLowerCase() === 'oui');
      else if (v instanceof Date) v = v.toISOString();
      o[h] = v;
    }
    if (empty) continue;
    o.__row = i + 1;
    rows.push(o);
  }
  return { rows: rows, headers: headers, sheet: sh };
}
function strip_(r) { var o = {}; for (var k in r) if (k !== '__row') o[k] = r[k]; return o; }

function readAll_(keys) {
  var db = {};
  (keys || globalThis.Padel.schema.SHEETS.map(function (s) { return s.key; })).forEach(function (k) {
    db[k] = readSheet_(k).rows.map(strip_);
  });
  return db;
}

function rowValues_(headers, rec) {
  return headers.map(function (h) {
    var v = rec[h];
    if (v === undefined || v === null) return '';
    return v;
  });
}

// =========================================================================== identité
function cache_() { return CacheService.getScriptCache(); }

/** Identifie l'utilisateur. Renvoie { user, perms, db? } ou lève une erreur lisible. */
function identify_(token, users) {
  var mode = prop_('AUTH_MODE', 'code');
  // 1) Compte Google transmis (propriétaire, ou même domaine) ; 2) sinon session ouverte avec e-mail + code.
  var email = Session.getActiveUser().getEmail() || '';
  if (!email && mode === 'code') email = token ? (cache_().get('sess_' + token) || '') : '';
  if (!email) {
    if (mode === 'code') { var e1 = new Error(token ? 'Session expirée : reconnectez-vous.' : ''); e1.needLogin = true; throw e1; }
    throw new Error('Votre compte Google n\'est pas transmis à l\'application : Anthony doit laisser AUTH_MODE sur « code ».');
  }
  email = String(email).trim().toLowerCase();
  users = users || readSheet_('utilisateurs').rows;
  var user = users.filter(function (x) { return String(x.email).trim().toLowerCase() === email; })[0];
  if (!user || user.actif !== true || user.archive === true) {
    audit_({ email: email, role: '' }, 'acces_refuse', null, '', null, null, 'Utilisateur inconnu ou inactif');
    throw new Error('Accès non autorisé pour ' + email + '. Demandez à Anthony de vous ajouter dans l\'onglet Utilisateurs.');
  }
  return user;
}

function audit_(user, action, sheetKey, id, before, after, motif) {
  try {
    var e = globalThis.Padel.rules.auditEntry({ email: user.email, role: user.role }, action, sheetKey, id, before, after, motif);
    var sh = sheetFor_('audit');
    var headers = sh.getRange(1, 1, 1, sh.getLastColumn()).getValues()[0];
    sh.appendRow(rowValues_(headers, e));
  } catch (err) { console.error('Journal indisponible : ' + err.message); }
}

function wrap_(fn) {
  try { return fn(); }
  catch (err) { return err.needLogin ? { needLogin: true, message: err.message } : { error: err.message }; }
}

// =========================================================================== API appelée par l'application
function api_bootstrap(token) {
  return wrap_(function () {
    var db = readAll_();
    var user = identify_(token, readSheet_('utilisateurs').rows);
    var perms = globalThis.Padel.permissions.permissionsFor(user.role, db.parametres);
    var key = 'login_' + user.email;
    if (!cache_().get(key)) {
      cache_().put(key, '1', 21600);
      audit_(user, 'connexion', null, '', null, null, '');
      try {
        var us = readSheet_('utilisateurs');
        var col = us.headers.indexOf('derniere_connexion') + 1;
        var me = us.rows.filter(function (x) { return x.id === user.id; })[0];
        if (col > 0 && me) us.sheet.getRange(me.__row, col).setValue(now_());
      } catch (e) { /* non bloquant */ }
    }
    var safeUser = { id: user.id, email: user.email, nom_affiche: user.nom_affiche, role: user.role };
    return { user: safeUser, perms: perms, db: globalThis.Padel.rules.filterRead(safeUser, perms, db), notice: null };
  });
}

function withLock_(fn) {
  var lock = LockService.getScriptLock();
  if (!lock.tryLock(20000)) throw new Error('Le classeur est occupé, réessayez dans quelques secondes.');
  try { return fn(); } finally { lock.releaseLock(); }
}

function context_() {
  var users = readSheet_('utilisateurs').rows, params = readSheet_('parametres').rows.map(strip_);
  return { users: users, params: params };
}

/** Enregistre une ou plusieurs lignes (création ou modification). */
function api_save(token, key, recs, motif) {
  return wrap_(function () {
    return withLock_(function () {
      var c = context_();
      var user = identify_(token, c.users);
      var perms = globalThis.Padel.permissions.permissionsFor(user.role, c.params);
      var data = readSheet_(key);
      var seances = (key === 'presences' || key === 'seances') ? globalThis.Padel.util.indexBy(readSheet_('seances').rows.map(strip_), 'id') : {};
      var byId = {}; data.rows.forEach(function (r) { byId[String(r.id)] = r; });
      var out = [], appends = [];
      recs.forEach(function (rec) {
        var v = globalThis.Padel.rules.validateRecord(key, rec, c.params);
        if (v.errors.length) throw new Error(v.errors.join('\n'));
        var r = v.record, existing = r.id ? byId[String(r.id)] : null;
        var before = existing ? strip_(existing) : null;
        if (key === 'utilisateurs' && before) r.code_acces_hash = before.code_acces_hash;
        if (key === 'utilisateurs' && !before) r.code_acces_hash = '';
        var err = globalThis.Padel.rules.checkWrite(user, perms, key, before, r, { seancesById: seances });
        if (err) throw new Error(err);
        if (!before) {
          r.id = r.id || globalThis.Padel.util.newId(globalThis.Padel.schema.sheet(key).prefix);
          r.cree_le = now_(); r.cree_par = user.email; r.archive = false; r.import_id = '';
          appends.push(rowValues_(data.headers, r));
        } else {
          r.cree_le = before.cree_le; r.cree_par = before.cree_par; r.import_id = before.import_id;
          r.modifie_le = now_(); r.modifie_par = user.email;
          data.sheet.getRange(existing.__row, 1, 1, data.headers.length).setValues([rowValues_(data.headers, r)]);
        }
        audit_(user, before ? 'modification' : 'creation', key, r.id, before, r, motif);
        var safe = Object.assign({}, r); if (key === 'utilisateurs') safe.code_acces_hash = safe.code_acces_hash ? '•••' : '';
        out.push(safe);
      });
      if (appends.length) data.sheet.getRange(data.sheet.getLastRow() + 1, 1, appends.length, data.headers.length).setValues(appends);
      return { rows: out };
    });
  });
}

/** Archive une ligne (jamais de suppression). */
function api_archive(token, key, id, motif) {
  return wrap_(function () {
    return withLock_(function () {
      var c = context_();
      var user = identify_(token, c.users);
      var perms = globalThis.Padel.permissions.permissionsFor(user.role, c.params);
      var data = readSheet_(key);
      var row = data.rows.filter(function (r) { return String(r.id) === String(id); })[0];
      if (!row) throw new Error('Ligne introuvable.');
      var before = strip_(row), after = Object.assign({}, before, { archive: true });
      var seances = globalThis.Padel.util.indexBy(readSheet_('seances').rows.map(strip_), 'id');
      var err = globalThis.Padel.rules.checkWrite(user, perms, key, before, after, { seancesById: seances });
      if (err) throw new Error(err);
      after.modifie_le = now_(); after.modifie_par = user.email;
      data.sheet.getRange(row.__row, 1, 1, data.headers.length).setValues([rowValues_(data.headers, after)]);
      audit_(user, 'archivage', key, id, before, null, motif);
      return { row: after };
    });
  });
}

/** Import en lot : validation complète, doublons revérifiés, traçabilité dans « Imports ». */
function api_import(token, key, recs, meta) {
  return wrap_(function () {
    return withLock_(function () {
      var c = context_();
      var user = identify_(token, c.users);
      var perms = globalThis.Padel.permissions.permissionsFor(user.role, c.params);
      if (!perms['imports.run']) throw new Error('Votre rôle ne permet pas d\'importer.');
      if (key === 'utilisateurs' || key === 'audit' || key === 'imports') throw new Error('Import interdit dans cette feuille.');
      var def = globalThis.Padel.schema.sheet(key), data = readSheet_(key);
      var keyOf = function (r) { return def.naturalKey.map(function (k) { var v = r[k]; return v === null || v === undefined ? '' : (typeof v === 'number' ? String(Math.round(v * 100) / 100) : globalThis.Padel.util.normalize(v)); }).join('|'); };
      var existing = {}; data.rows.forEach(function (r) { if (r.archive !== true) existing[keyOf(r)] = 1; });
      var impId = globalThis.Padel.util.newId('IMP'), rows = [], skipped = 0;
      recs.forEach(function (rec, i) {
        var v = globalThis.Padel.rules.validateRecord(key, rec, c.params);
        if (v.errors.length) throw new Error('Ligne ' + (i + 1) + ' : ' + v.errors.join(' ; '));
        var r = v.record, k = keyOf(r);
        if (existing[k]) { skipped++; return; }
        existing[k] = 1;
        r.id = globalThis.Padel.util.newId(def.prefix); r.import_id = impId; r.archive = false; r.cree_le = now_(); r.cree_par = user.email;
        rows.push(rowValues_(data.headers, r));
      });
      if (rows.length) data.sheet.getRange(data.sheet.getLastRow() + 1, 1, rows.length, data.headers.length).setValues(rows);
      var rep = meta.report || {};
      var imp = { id: impId, date: now_(), utilisateur: user.email, source: meta.source || '', feuille_cible: def.tab, fichier: meta.fichier || '',
        nb_lignes: rep.lues || recs.length, nb_importees: rows.length, nb_doublons: (rep.doublons || 0) + skipped, nb_erreurs: rep.erreurs || 0,
        statut: 'importe', rapport: JSON.stringify(rep).slice(0, 45000), annule_le: '', annule_par: '', archive: false, import_id: '', cree_le: now_(), cree_par: user.email };
      var ish = readSheet_('imports');
      ish.sheet.appendRow(rowValues_(ish.headers, imp));
      audit_(user, 'import', key, impId, null, null, (meta.source || '') + ' – ' + rows.length + ' ligne(s)');
      return { import: imp };
    });
  });
}

/** Annule un import : archive toutes les lignes portant son identifiant. */
function api_undoImport(token, impId) {
  return wrap_(function () {
    return withLock_(function () {
      var c = context_();
      var user = identify_(token, c.users);
      var perms = globalThis.Padel.permissions.permissionsFor(user.role, c.params);
      if (!perms['imports.run']) throw new Error('Votre rôle ne permet pas d\'annuler un import.');
      var n = 0;
      globalThis.Padel.schema.SHEETS.forEach(function (s) {
        if (s.noMeta || s.key === 'imports') return;
        var data = readSheet_(s.key);
        var ai = data.headers.indexOf('archive'), ii = data.headers.indexOf('import_id');
        if (ai < 0 || ii < 0) return;
        data.rows.forEach(function (r) {
          if (r.import_id === impId && r.archive !== true) { data.sheet.getRange(r.__row, ai + 1).setValue(true); n++; }
        });
      });
      var imps = readSheet_('imports');
      var row = imps.rows.filter(function (r) { return r.id === impId; })[0];
      if (!row) throw new Error('Import introuvable.');
      var after = strip_(row); after.statut = 'annule'; after.annule_le = now_(); after.annule_par = user.email;
      imps.sheet.getRange(row.__row, 1, 1, imps.headers.length).setValues([rowValues_(imps.headers, after)]);
      audit_(user, 'annulation_import', 'imports', impId, null, null, n + ' ligne(s) archivée(s)');
      return { import: after };
    });
  });
}

function api_log(token, action, motif) {
  return wrap_(function () {
    var user = identify_(token);
    if (['export', 'rapport'].indexOf(action) < 0) throw new Error('Action non journalisable.');
    audit_(user, action, null, '', null, null, String(motif || '').slice(0, 500));
    return { ok: true };
  });
}

// =========================================================================== mode « code »
function sha256_(s) {
  return Utilities.computeDigest(Utilities.DigestAlgorithm.SHA_256, s, Utilities.Charset.UTF_8)
    .map(function (b) { return ('0' + (b & 0xff).toString(16)).slice(-2); }).join('');
}
function salt_() {
  var p = PropertiesService.getScriptProperties();
  var s = p.getProperty('CODE_SALT');
  if (!s) { s = Utilities.getUuid() + Utilities.getUuid(); p.setProperty('CODE_SALT', s); }
  return s;
}

function api_login(email, code) {
  return wrap_(function () {
    if (prop_('AUTH_MODE', 'code') !== 'code') throw new Error('Connexion par code désactivée : utilisez votre compte Google.');
    email = String(email || '').trim().toLowerCase();
    var key = 'tries_' + email, tries = +(cache_().get(key) || 0);
    if (tries >= 5) throw new Error('Trop de tentatives. Réessayez dans 15 minutes.');
    var users = readSheet_('utilisateurs').rows;
    var user = users.filter(function (x) { return String(x.email).trim().toLowerCase() === email && x.actif === true && x.archive !== true; })[0];
    var ok = user && user.code_acces_hash && user.code_acces_hash === sha256_(salt_() + ':' + String(code || ''));
    if (!ok) {
      cache_().put(key, String(tries + 1), 900);
      audit_({ email: email, role: '' }, 'connexion_echec', null, '', null, null, '');
      throw new Error('E-mail ou code incorrect.');
    }
    cache_().remove(key);
    var token = Utilities.getUuid();
    cache_().put('sess_' + token, email, 21600);
    return { token: token };
  });
}

/** Depuis l'application : l'administrateur définit le code personnel d'un utilisateur. */
function api_setAccessCode(token, userId, code) {
  return wrap_(function () {
    return withLock_(function () {
      var c = context_();
      var admin = identify_(token, c.users);
      if (!globalThis.Padel.permissions.permissionsFor(admin.role, c.params)['utilisateurs.edit']) throw new Error('Réservé à l\'administrateur.');
      if (!code || String(code).length < 8) throw new Error('Le code doit contenir au moins 8 caractères.');
      var data = readSheet_('utilisateurs');
      var row = data.rows.filter(function (x) { return String(x.id) === String(userId); })[0];
      if (!row) throw new Error('Utilisateur introuvable.');
      data.sheet.getRange(row.__row, data.headers.indexOf('code_acces_hash') + 1).setValue(sha256_(salt_() + ':' + code));
      audit_(admin, 'code_acces', 'utilisateurs', row.id, null, null, 'Code d\'accès défini');
      return { ok: true };
    });
  });
}

/** Éditeur uniquement. Exemple : setAccessCode('coach@exemple.be', 'un-code-long-et-personnel') */
function setAccessCode(email, code) {
  requireOwner_();
  if (!code || String(code).length < 8) throw new Error('Le code doit contenir au moins 8 caractères.');
  var data = readSheet_('utilisateurs');
  var row = data.rows.filter(function (x) { return String(x.email).trim().toLowerCase() === String(email).trim().toLowerCase(); })[0];
  if (!row) throw new Error('Utilisateur introuvable : ' + email);
  var col = data.headers.indexOf('code_acces_hash') + 1;
  data.sheet.getRange(row.__row, col).setValue(sha256_(salt_() + ':' + code));
  audit_({ email: Session.getEffectiveUser().getEmail(), role: 'admin' }, 'code_acces', 'utilisateurs', row.id, null, null, 'Code d\'accès défini');
  return 'Code défini pour ' + email;
}

/** Les fonctions d'administration ne s'exécutent que depuis l'éditeur, par le propriétaire du script. */
function requireOwner_() {
  var active = Session.getActiveUser().getEmail(), owner = Session.getEffectiveUser().getEmail();
  if (!active || active !== owner) throw new Error('Fonction réservée au propriétaire, depuis l\'éditeur Apps Script.');
}

// =========================================================================== installation
function setupSpreadsheet() {
  requireOwner_();
  var ss = ss_(), u = globalThis.Padel.util;
  globalThis.Padel.schema.SHEETS.forEach(function (def) {
    var sh = ss.getSheetByName(def.tab) || ss.insertSheet(def.tab);
    var headers = def.cols.map(function (c) { return c.n; });
    var cur = sh.getLastColumn() ? sh.getRange(1, 1, 1, sh.getLastColumn()).getValues()[0].map(String) : [];
    // Ajoute les colonnes manquantes sans toucher aux existantes.
    var missing = headers.filter(function (h) { return cur.indexOf(h) < 0; });
    if (!cur.filter(Boolean).length) { sh.getRange(1, 1, 1, headers.length).setValues([headers]); cur = headers; }
    else if (missing.length) { sh.getRange(1, cur.length + 1, 1, missing.length).setValues([missing]); cur = cur.concat(missing); }
    sh.setFrozenRows(1);
    sh.getRange(1, 1, 1, cur.length).setFontWeight('bold').setBackground('#13233a').setFontColor('#ffffff');
    var maxRows = Math.max(sh.getMaxRows() - 1, 1);
    def.cols.forEach(function (c) {
      var idx = cur.indexOf(c.n) + 1; if (!idx) return;
      var rng = sh.getRange(2, idx, maxRows, 1);
      sh.getRange(1, idx).setNote(c.label + (c.req ? ' (obligatoire)' : '') + (c.help ? '\n' + c.help : '') + (c.v ? '\nRègle : ' + c.v : ''));
      if (c.t === 'date' || c.t === 'time' || c.t === 'id' || c.n === 'reference' || c.n === 'cle' || c.n === 'valeur' || c.t === 'ref' || c.t === 'refs') rng.setNumberFormat('@');
      if (c.enumName) rng.setDataValidation(SpreadsheetApp.newDataValidation().requireValueInList(Object.keys(globalThis.Padel.schema.ENUMS[c.enumName]), true).setAllowInvalid(false).build());
      if (c.t === 'bool' || c.n === 'archive') rng.setDataValidation(SpreadsheetApp.newDataValidation().requireCheckbox().build());
      if (c.t === 'rating10') rng.setDataValidation(SpreadsheetApp.newDataValidation().requireNumberBetween(0, 10).setAllowInvalid(false).build());
      if (c.t === 'money' || c.t === 'number') rng.setNumberFormat('0.00');
    });
  });
  // Paramètres initiaux (uniquement si l'onglet est vide).
  var par = readSheet_('parametres');
  if (!par.rows.length) {
    var rows = globalThis.Padel.schema.INITIAL_PARAMETRES.map(function (p) {
      return rowValues_(par.headers, Object.assign({}, p, { id: u.newId('PAR'), archive: false, cree_le: now_(), cree_par: 'setupSpreadsheet' }));
    });
    par.sheet.getRange(2, 1, rows.length, par.headers.length).setValues(rows);
  }
  // Six terrains, horaires confirmés 8 h – 21 h ; indoor en service depuis le 31/08/2026.
  var ter = readSheet_('terrains'), H = globalThis.Padel.schema.HORAIRES_TERRAINS;
  if (!ter.rows.length) {
    var t = [];
    for (var n = 1; n <= 6; n++) t.push(rowValues_(ter.headers, { id: 'TER-' + n, numero: n, nom: (n <= 3 ? 'Indoor ' : 'Outdoor ') + n, lieu: n <= 3 ? 'indoor' : 'outdoor',
      date_mise_en_service: n <= 3 ? '2026-08-31' : '', horaires_lun: H, horaires_mar: H, horaires_mer: H, horaires_jeu: H, horaires_ven: H, horaires_sam: H, horaires_dim: H,
      statut: 'actif', archive: false, commentaire: 'Noms et numérotation à ajuster si besoin.', cree_le: now_(), cree_par: 'setupSpreadsheet' }));
    ter.sheet.getRange(2, 1, t.length, ter.headers.length).setValues(t);
  }
  // Le propriétaire devient administrateur s'il n'y a encore personne.
  var usr = readSheet_('utilisateurs');
  if (!usr.rows.length) {
    var me = Session.getEffectiveUser().getEmail();
    usr.sheet.appendRow(rowValues_(usr.headers, { id: 'USR-ADMIN', email: me, nom_affiche: 'Anthony De Greef', role: 'admin', actif: true, archive: false, cree_le: now_(), cree_par: 'setupSpreadsheet' }));
    // Gilles : seul coach. Son e-mail est à saisir dans l'application (Paramètres → Utilisateurs), puis le cocher « actif ».
    usr.sheet.appendRow(rowValues_(usr.headers, { id: 'USR-GILLES', email: '', nom_affiche: 'Gilles', role: 'coach', actif: false, archive: false, cree_le: now_(), cree_par: 'setupSpreadsheet' }));
  }
  // Offres confirmées (25 €/séance/personne, adultes et juniors).
  var off = readSheet_('offres');
  if (!off.rows.length) {
    var o = globalThis.Padel.schema.INITIAL_OFFRES.map(function (x) { return rowValues_(off.headers, Object.assign({}, x, { archive: false, cree_le: now_(), cree_par: 'setupSpreadsheet' })); });
    off.sheet.getRange(2, 1, o.length, off.headers.length).setValues(o);
  }
  // Protection : journal d'audit et empreintes de codes en avertissement.
  var aud = ss.getSheetByName('Journal_Audit');
  if (aud && !aud.getProtections(SpreadsheetApp.ProtectionType.SHEET).length) aud.protect().setDescription('Journal d\'audit – ne pas modifier').setWarningOnly(true);
  var def = ss.getSheetByName('Sheet1') || ss.getSheetByName('Feuille 1');
  if (def && ss.getSheets().length > 1 && def.getLastRow() === 0) ss.deleteSheet(def);
  audit_({ email: Session.getEffectiveUser().getEmail(), role: 'admin' }, 'installation', null, '', null, null, 'setupSpreadsheet');
  return 'Classeur prêt : ' + globalThis.Padel.schema.SHEETS.length + ' onglets.';
}

// =========================================================================== sauvegarde
function backupNow() {
  if (ScriptApp.getAuthMode && Session.getActiveUser().getEmail()) requireOwner_();
  var ss = ss_();
  var name = prop_('BACKUP_FOLDER', 'Sauvegardes Padel DL Uccle');
  var it = DriveApp.getFoldersByName(name);
  var folder = it.hasNext() ? it.next() : DriveApp.createFolder(name);
  var stamp = Utilities.formatDate(new Date(), ss.getSpreadsheetTimeZone() || 'Europe/Brussels', 'yyyy-MM-dd_HH-mm');
  var copy = DriveApp.getFileById(ss.getId()).makeCopy(ss.getName() + ' – sauvegarde ' + stamp, folder);
  var keep = +prop_('BACKUP_KEEP', 30);
  var files = [], fi = folder.getFiles();
  while (fi.hasNext()) files.push(fi.next());
  files.sort(function (a, b) { return b.getDateCreated() - a.getDateCreated(); });
  files.slice(keep).forEach(function (f) { f.setTrashed(true); });
  console.log('Sauvegarde créée : ' + copy.getName());
  return copy.getUrl();
}

function installDailyBackup() {
  requireOwner_();
  ScriptApp.getProjectTriggers().forEach(function (t) { if (t.getHandlerFunction() === 'backupNow') ScriptApp.deleteTrigger(t); });
  ScriptApp.newTrigger('backupNow').timeBased().everyDays(1).atHour(2).create();
  return 'Sauvegarde quotidienne programmée vers 2 h.';
}
