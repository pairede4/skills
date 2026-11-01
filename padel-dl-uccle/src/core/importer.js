/**
 * Assistant d'import CSV / Excel : lecture, association des colonnes, conversion,
 * contrôle des lignes incomplètes, détection des doublons et rapport d'import.
 * (La lecture Excel est faite dans le navigateur par SheetJS, qui fournit un tableau
 * de lignes identique à celui produit par parseCSV.)
 */
(function (root, factory) {
  var isNode = typeof require === 'function' && typeof module === 'object';
  var u = isNode ? require('./util.js') : root.Padel.util;
  var schema = isNode ? require('./schema.js') : root.Padel.schema;
  var mod = factory(u, schema);
  if (typeof module === 'object' && module.exports) module.exports = mod;
  root.Padel = root.Padel || {};
  root.Padel.importer = mod;
})(typeof globalThis !== 'undefined' ? globalThis : this, function (u, schema) {
  'use strict';

  /** Modèles d'import proposés (feuille cible + valeurs par défaut). */
  var PRESETS = [
    { id: 'abs_reservations', label: 'Export ABS / application – réservations libres', sheet: 'occupation', defaults: { type: 'reservation_libre', statut: 'reserve' } },
    { id: 'planning_academies', label: 'Planning des académies (séances)', sheet: 'seances', defaults: { statut: 'planifiee' } },
    { id: 'presences', label: 'Liste de présences', sheet: 'presences', defaults: { statut: 'present' } },
    { id: 'heures_coachs', label: 'Heures et factures des coachs', sheet: 'heures', defaults: { statut: 'soumis' } },
    { id: 'inscriptions_evenements', label: 'Inscriptions aux événements', sheet: 'inscriptions', defaults: { statut: 'inscrit' } },
    { id: 'paiements', label: 'Paiements (réception / ABS)', sheet: 'paiements', defaults: { statut: 'a_verifier' } },
    { id: 'membres', label: 'Référentiel membres (ID, segment, niveau)', sheet: 'membres', defaults: { statut: 'actif' } },
    { id: 'satisfaction', label: 'Réponses à l\'enquête de satisfaction', sheet: 'satisfaction', defaults: { source: 'import' } },
    { id: 'autre', label: 'Autre feuille…', sheet: null, defaults: {} }
  ];

  /** Synonymes fréquents pour l'association automatique des colonnes. */
  var ALIASES = {
    date: ['date', 'jour', 'day', 'date_reservation', 'booking_date', 'date_seance'],
    date_paiement: ['date', 'date_paiement', 'paid_on', 'payment_date'],
    heure_debut: ['debut', 'heure_debut', 'start', 'start_time', 'de', 'from', 'heure'],
    heure_fin: ['fin', 'heure_fin', 'end', 'end_time', 'a', 'to'],
    terrain_id: ['terrain', 'court', 'piste', 'resource', 'ressource', 'terrain_id'],
    terrains: ['terrain', 'terrains', 'court', 'courts', 'piste'],
    membre_id: ['membre', 'member', 'member_id', 'id_membre', 'numero_membre', 'n_membre', 'membership_number', 'client'],
    coach_id: ['coach', 'entraineur', 'moniteur', 'coach_id'],
    montant: ['montant', 'amount', 'prix', 'total', 'price'],
    reference_externe: ['reference', 'ref', 'booking_id', 'id_reservation', 'reservation'],
    nb_joueurs: ['joueurs', 'players', 'nb_joueurs', 'participants'],
    type_activite: ['activite', 'type', 'activity', 'type_activite', 'cours'],
    statut: ['statut', 'status', 'etat'],
    recommandation: ['recommandation', 'nps', 'recommend', 'probabilite_recommandation']
  };

  /** Lecture CSV (séparateur ; , ou tabulation détecté, guillemets, BOM). */
  function parseCSV(text) {
    text = String(text || '').replace(/^﻿/, '');
    var first = text.split(/\r?\n/)[0] || '';
    var cands = [';', ',', '\t'];
    var sep = cands.sort(function (a, b) { return first.split(b).length - first.split(a).length; })[0];
    var rows = [], row = [], field = '', q = false;
    for (var i = 0; i < text.length; i++) {
      var ch = text[i];
      if (q) {
        if (ch === '"') { if (text[i + 1] === '"') { field += '"'; i++; } else q = false; }
        else field += ch;
      } else if (ch === '"') q = true;
      else if (ch === sep) { row.push(field); field = ''; }
      else if (ch === '\n' || ch === '\r') {
        if (ch === '\r' && text[i + 1] === '\n') i++;
        row.push(field); field = '';
        if (row.some(function (c) { return c.trim() !== ''; })) rows.push(row);
        row = [];
      } else field += ch;
    }
    row.push(field);
    if (row.some(function (c) { return c.trim() !== ''; })) rows.push(row);
    if (!rows.length) return { headers: [], rows: [], separator: sep };
    var headers = rows[0].map(function (h, i) { return h.trim() || ('Colonne ' + (i + 1)); });
    var data = rows.slice(1).map(function (r) { var o = {}; headers.forEach(function (h, i) { o[h] = r[i] === undefined ? '' : r[i].trim(); }); return o; });
    return { headers: headers, rows: data, separator: sep };
  }

  /** Propose une association colonne cible -> colonne source. */
  function guessMapping(headers, sheetKey) {
    var def = schema.sheet(sheetKey), map = {};
    var norm = headers.map(function (h) { return { h: h, n: u.normalize(h) }; });
    def.cols.forEach(function (c) {
      if (c.meta || c.n === 'id' && sheetKey !== 'membres') return;
      var keys = [u.normalize(c.n), u.normalize(c.label)].concat(ALIASES[c.n] || []);
      var hit = norm.filter(function (x) { return keys.indexOf(x.n) >= 0; })[0];
      if (hit) map[c.n] = hit.h;
    });
    return map;
  }

  /** Résout une référence (ID, nom, numéro, e-mail) vers l'ID d'une ligne de la feuille cible. */
  function resolveRef(db, refSheet, value) {
    if (u.isBlank(value)) return null;
    var rows = db[refSheet] || [];
    var v = String(value).trim(), n = u.normalize(v);
    for (var i = 0; i < rows.length; i++) if (String(rows[i].id) === v) return rows[i].id;
    for (var j = 0; j < rows.length; j++) {
      var r = rows[j];
      var keys = [r.nom, r.nom_affiche, r.email, r.alias, r.numero !== undefined && r.numero !== '' ? 'terrain ' + r.numero : null, r.numero];
      if (keys.some(function (k) { return k !== null && k !== undefined && k !== '' && u.normalize(k) === n; })) return r.id;
    }
    return undefined;
  }

  function enumValues(col, db) {
    if (col.enumName) return schema.ENUMS[col.enumName];
    var out = {};
    (db.parametres || []).forEach(function (p) { if (p.categorie === col.enumParam && !p.archive) out[p.cle] = p.libelle || p.valeur || p.cle; });
    return out;
  }

  /** Convertit et valide une valeur selon le type de colonne. Renvoie { value, error }. */
  function convert(col, raw, db) {
    if (u.isBlank(raw)) return { value: '' };
    var s = String(raw).trim();
    switch (col.t) {
      case 'date': { var d = u.parseDate(raw); return d ? { value: d } : { error: 'date illisible « ' + s + ' »' }; }
      case 'time': { var t = u.parseTime(raw); return t ? { value: t } : { error: 'heure illisible « ' + s + ' »' }; }
      case 'int': case 'number': case 'money': case 'rating10': {
        var n = u.num(raw); if (n === null) return { error: 'nombre illisible « ' + s + ' »' };
        if (col.t === 'int' && Math.round(n) !== n) return { error: 'entier attendu « ' + s + ' »' };
        if (col.t === 'rating10' && (n < 0 || n > 10)) return { error: 'note hors de 0-10 « ' + s + ' »' };
        if (col.min !== undefined && n < col.min) return { error: 'valeur < ' + col.min };
        if (col.max !== undefined && n > col.max) return { error: 'valeur > ' + col.max };
        return { value: n };
      }
      case 'bool': { var b = u.bool(raw); return b === null ? { error: 'oui/non attendu « ' + s + ' »' } : { value: b }; }
      case 'email': return /^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(s) ? { value: s.toLowerCase() } : { error: 'e-mail invalide' };
      case 'enum': {
        var vals = enumValues(col, db), ns = u.normalize(s);
        for (var k in vals) if (u.normalize(k) === ns || u.normalize(vals[k]) === ns) return { value: k };
        return { error: 'valeur « ' + s + ' » inconnue pour ' + col.label + ' (attendu : ' + Object.keys(vals).join(', ') + ')' };
      }
      case 'ref': {
        var id = resolveRef(db, col.ref, s);
        if (id === undefined) return col.req ? { error: col.label + ' « ' + s + ' » introuvable dans ' + schema.sheet(col.ref).tab } : { value: s, warning: col.label + ' « ' + s + ' » introuvable dans ' + schema.sheet(col.ref).tab };
        return { value: id };
      }
      case 'refs': {
        var ids = u.splitList(s).map(function (x) { var r = resolveRef(db, col.ref, x); return r === undefined ? x : r; });
        var unknown = u.splitList(s).filter(function (x) { return resolveRef(db, col.ref, x) === undefined; });
        return { value: ids.join(','), warning: unknown.length ? 'Terrain(s) inconnu(s) : ' + unknown.join(', ') : null };
      }
      default: return { value: s };
    }
  }

  function keyOf(def, r) {
    return def.naturalKey.map(function (k) {
      var v = r[k]; if (v === null || v === undefined) return '';
      if (typeof v === 'number') return String(u.round(v, 2));
      return u.normalize(v);
    }).join('|');
  }

  /**
   * Prépare l'import : conversion + validation + doublons.
   * @param mapping   { colonneCible: 'En-tête source' }
   * @param constants { colonneCible: valeur fixe }
   */
  function prepare(db, sheetKey, rawRows, mapping, constants) {
    var def = schema.sheet(sheetKey);
    var existing = {};
    (db[sheetKey] || []).forEach(function (r) { if (!(r.archive === true || r.archive === 'TRUE')) existing[keyOf(def, r)] = r.id; });
    var inFile = {};
    var out = { ok: [], duplicates: [], errors: [], warnings: [], total: rawRows.length };
    rawRows.forEach(function (raw, idx) {
      var rec = {}, errs = [], warns = [];
      def.cols.forEach(function (c) {
        if (c.meta) return;
        var src = mapping[c.n];
        var val = src ? raw[src] : (constants && !u.isBlank(constants[c.n]) ? constants[c.n] : '');
        var r = convert(c, val, db);
        if (r.error) errs.push(c.label + ' : ' + r.error);
        if (r.warning) warns.push(r.warning);
        rec[c.n] = r.value === undefined ? '' : r.value;
      });
      if (sheetKey === 'heures' && rec.heure_debut && rec.heure_fin) {
        var a = u.toMinutes(rec.heure_debut), b = u.toMinutes(rec.heure_fin);
        if (b > a) rec.duree_h = u.round((b - a) / 60, 2); else errs.push('Heure de fin avant l\'heure de début');
      }
      def.cols.forEach(function (c) {
        if (!c.req || c.n === 'id' || c.meta) return;
        if (u.isBlank(rec[c.n]) && rec[c.n] !== false) errs.push('Champ obligatoire manquant : ' + c.label);
      });
      var line = idx + 2; // ligne 1 = en-têtes
      if (errs.length) { out.errors.push({ line: line, errors: errs, raw: raw }); return; }
      var k = keyOf(def, rec);
      if (existing[k]) { out.duplicates.push({ line: line, reason: 'déjà présent (' + existing[k] + ')', record: rec }); return; }
      if (inFile[k]) { out.duplicates.push({ line: line, reason: 'doublon dans le fichier (ligne ' + inFile[k] + ')', record: rec }); return; }
      inFile[k] = line;
      if (warns.length) out.warnings.push({ line: line, warnings: warns });
      out.ok.push(rec);
    });
    return out;
  }

  /** Rapport d'import (stocké dans la feuille « Imports »). */
  function report(prep, meta) {
    return {
      source: meta.source, fichier: meta.fichier, feuille: meta.feuille,
      lues: prep.total, importees: prep.ok.length, doublons: prep.duplicates.length, erreurs: prep.errors.length,
      details_erreurs: prep.errors.slice(0, 200).map(function (e) { return 'Ligne ' + e.line + ' : ' + e.errors.join(' ; '); }),
      details_doublons: prep.duplicates.slice(0, 200).map(function (d) { return 'Ligne ' + d.line + ' : ' + d.reason; }),
      avertissements: prep.warnings.slice(0, 200).map(function (w) { return 'Ligne ' + w.line + ' : ' + w.warnings.join(' ; '); })
    };
  }

  /** Export CSV (séparateur « ; » pour Excel en français, BOM UTF-8). */
  function toCSV(headers, rows) {
    function cell(v) {
      if (v === null || v === undefined) return '';
      var s = typeof v === 'number' ? String(v).replace('.', ',') : String(v);
      return /[";\n\r]/.test(s) ? '"' + s.replace(/"/g, '""') + '"' : s;
    }
    return '﻿' + [headers.map(cell).join(';')].concat(rows.map(function (r) { return r.map(cell).join(';'); })).join('\r\n');
  }

  return { PRESETS: PRESETS, ALIASES: ALIASES, parseCSV: parseCSV, guessMapping: guessMapping, resolveRef: resolveRef,
    convert: convert, prepare: prepare, report: report, toCSV: toCSV, keyOf: keyOf };
});
