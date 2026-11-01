/**
 * Règles d'écriture et de lecture par rôle, partagées entre le serveur Apps Script
 * (sécurité réelle) et le mode démonstration (même comportement).
 *
 *  - validateRecord : types, champs obligatoires, listes de valeurs ;
 *  - checkWrite     : droits de la personne sur la ligne (ex. un coach ne modifie
 *                     ni les heures d'un autre ni des heures déjà validées) ;
 *  - filterRead     : ce que chaque rôle reçoit (minimisation des données).
 */
(function (root, factory) {
  var isNode = typeof require === 'function' && typeof module === 'object';
  var u = isNode ? require('./util.js') : root.Padel.util;
  var schema = isNode ? require('./schema.js') : root.Padel.schema;
  var perms = isNode ? require('./permissions.js') : root.Padel.permissions;
  var mod = factory(u, schema, perms);
  if (typeof module === 'object' && module.exports) module.exports = mod;
  root.Padel = root.Padel || {};
  root.Padel.rules = mod;
})(typeof globalThis !== 'undefined' ? globalThis : this, function (u, schema, P) {
  'use strict';

  function enumKeys(col, parametres) {
    if (col.enumName) return Object.keys(schema.ENUMS[col.enumName]);
    return (parametres || []).filter(function (p) { return p.categorie === col.enumParam && !(p.archive === true || p.archive === 'TRUE'); }).map(function (p) { return p.cle; });
  }

  /** Normalise et valide une ligne. Renvoie { record, errors[] }. */
  function validateRecord(sheetKey, rec, parametres) {
    var def = schema.sheet(sheetKey);
    if (!def) return { record: null, errors: ['Feuille inconnue : ' + sheetKey] };
    var out = {}, errors = [];
    def.cols.forEach(function (c) {
      var v = rec[c.n];
      if (v === undefined || v === null) v = '';
      if (c.meta) { out[c.n] = v; return; }
      if (u.isBlank(v)) {
        if (c.req && c.n !== 'id' && c.t !== 'bool') errors.push('« ' + c.label + ' » est obligatoire.');
        out[c.n] = c.t === 'bool' ? (c.req ? false : '') : '';
        return;
      }
      switch (c.t) {
        case 'date': { var d = u.parseDate(v); if (!d) errors.push('« ' + c.label + ' » : date invalide.'); out[c.n] = d || ''; break; }
        case 'time': { var t = u.parseTime(v); if (!t) errors.push('« ' + c.label + ' » : heure invalide (HH:MM).'); out[c.n] = t || ''; break; }
        case 'int': case 'number': case 'money': case 'rating10': {
          var n = u.num(v);
          if (n === null) { errors.push('« ' + c.label + ' » : nombre attendu.'); out[c.n] = ''; break; }
          if (c.t === 'int' && Math.round(n) !== n) errors.push('« ' + c.label + ' » : nombre entier attendu.');
          if (c.t === 'rating10' && (n < 0 || n > 10)) errors.push('« ' + c.label + ' » : note de 0 à 10.');
          if ((c.t === 'money' || c.t === 'int') && n < 0) errors.push('« ' + c.label + ' » : valeur négative interdite.');
          if (c.min !== undefined && n < c.min) errors.push('« ' + c.label + ' » : minimum ' + c.min + '.');
          if (c.max !== undefined && n > c.max) errors.push('« ' + c.label + ' » : maximum ' + c.max + '.');
          out[c.n] = n; break;
        }
        case 'bool': { var b = u.bool(v); out[c.n] = b === null ? '' : b; break; }
        case 'email': { var e = String(v).trim().toLowerCase(); if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(e)) errors.push('« ' + c.label + ' » : e-mail invalide.'); out[c.n] = e; break; }
        case 'enum': {
          var keys = enumKeys(c, parametres);
          if (keys.length && keys.indexOf(String(v)) < 0) errors.push('« ' + c.label + ' » : valeur « ' + v + ' » non autorisée.');
          out[c.n] = String(v); break;
        }
        case 'refs': out[c.n] = u.splitList(v).join(','); break;
        default: out[c.n] = typeof v === 'string' ? v.trim() : v;
      }
    });
    // Contrôles croisés
    if (out.heure_debut && out.heure_fin && u.toMinutes(out.heure_fin) <= u.toMinutes(out.heure_debut)) errors.push('L\'heure de fin doit être après l\'heure de début.');
    if (sheetKey === 'heures' && out.heure_debut && out.heure_fin) out.duree_h = u.round((u.toMinutes(out.heure_fin) - u.toMinutes(out.heure_debut)) / 60, 2);
    if (out.date_debut && out.date_fin && out.date_fin < out.date_debut) errors.push('La date de fin précède la date de début.');
    if (sheetKey === 'paiements' && out.montant !== '' && out.montant <= 0) errors.push('Le montant doit être positif.');
    return { record: out, errors: errors };
  }

  var COACH_HOUR_FIELDS = ['date', 'heure_debut', 'heure_fin', 'duree_h', 'type_activite', 'seance_id', 'cycle_id', 'evenement_id', 'nb_participants',
    'nb_presents', 'remplacement', 'remplace_coach_id', 'annulation', 'commentaire', 'statut'];

  /**
   * Vérifie qu'un utilisateur peut écrire cette ligne.
   * @param user   { id, email, role }
   * @param perms  permissions effectives
   * @param before ligne existante (null si création)
   * @param after  ligne proposée (déjà validée)
   * @param ctx    { seancesById } pour les contrôles de séance
   * @return message d'erreur ou null
   */
  function checkWrite(user, perms, sheetKey, before, after, ctx) {
    if (!P.canWrite(perms, sheetKey)) return 'Votre rôle ne permet pas de modifier « ' + schema.sheet(sheetKey).label + ' ».';
    if (sheetKey === 'audit') return 'Le journal d\'audit ne peut pas être modifié.';
    if (sheetKey === 'heures') {
      var admin = perms['heures.validate'] || perms['heures.pay'];
      if (!admin) {
        if (String(after.coach_id) !== String(user.id)) return 'Vous ne pouvez encoder que vos propres heures.';
        if (before && String(before.coach_id) !== String(user.id)) return 'Ces heures appartiennent à un autre coach.';
        if (before && ['valide', 'paye'].indexOf(before.statut) >= 0) {
          // Seule la demande de correction peut être ajoutée sur une ligne validée.
          var changed = COACH_HOUR_FIELDS.filter(function (k) { return String(before[k] === undefined ? '' : before[k]) !== String(after[k] === undefined ? '' : after[k]); });
          if (changed.length) return 'Heures déjà validées : utilisez « Demander une correction ».';
          ['valide_par', 'valide_le', 'paye_le', 'reference_paiement', 'motif_correction'].forEach(function (k) { after[k] = before[k]; });
          return null;
        }
        if (['brouillon', 'soumis'].indexOf(after.statut) < 0) return 'Seul Anthony peut valider ou marquer payées des heures.';
        if (before && before.statut === 'soumis' && after.statut === 'brouillon') return 'Des heures soumises ne repassent pas en brouillon ; demandez une correction.';
      } else {
        if (after.statut === 'paye' && !perms['heures.pay']) return 'Marquer « payé » demande la permission de paiement.';
        if ((after.statut === 'valide' || after.statut === 'paye') && (!before || before.statut !== after.statut)) {
          after.valide_par = after.valide_par || user.email; after.valide_le = after.valide_le || new Date().toISOString();
        }
        if (after.statut === 'a_corriger' && u.isBlank(after.motif_correction)) return 'Indiquez le motif de correction.';
      }
    }
    if ((sheetKey === 'seances' || sheetKey === 'presences') && !perms['seances.edit']) {
      var s = sheetKey === 'seances' ? (before || after) : (ctx && ctx.seancesById[after.seance_id]);
      if (!s) return 'Séance introuvable.';
      var mine = String(s.coach_id) === String(user.id) || String(s.coach_remplacant_id) === String(user.id);
      if (!mine) return 'Vous ne pouvez modifier que vos propres séances.';
      if (sheetKey === 'seances' && after.coach_id !== s.coach_id && before) return 'Le coach responsable ne peut être changé que par Anthony.';
    }
    if (sheetKey === 'utilisateurs' && before && !u.isBlank(before.code_acces_hash)) after.code_acces_hash = before.code_acces_hash;
    if (sheetKey === 'membres' && !perms['membres.edit'] && before) return 'Modification des membres réservée.';
    return null;
  }

  /** Données envoyées à un rôle (lecture). */
  function filterRead(user, perms, db) {
    var out = {};
    schema.SHEETS.forEach(function (s) {
      var rows = db[s.key] || [];
      if (!P.canRead(perms, s.key)) { out[s.key] = []; return; }
      out[s.key] = rows;
    });
    // Utilisateurs : liste réduite (ID, nom, rôle) pour les menus déroulants.
    out.utilisateurs = (db.utilisateurs || []).map(function (r) {
      if (perms['utilisateurs.edit']) { var c = {}; for (var k in r) if (k !== 'code_acces_hash') c[k] = r[k]; c.code_acces_hash = u.isBlank(r.code_acces_hash) ? '' : '•••'; return c; }
      return { id: r.id, nom_affiche: r.nom_affiche, role: r.role, actif: r.actif };
    });
    // Paramètres : taux et budget visibles seulement avec accès aux coûts / P&L.
    out.parametres = (db.parametres || []).filter(function (p) {
      if (p.categorie === 'taux_coach') return perms['couts.view'] || String(p.reference) === String(user.id);
      if (p.categorie === 'budget') return !!perms['pnl.view'];
      if (p.categorie === 'permission') return !!perms['parametres.view'];
      return true;
    });
    // Heures : un coach ne voit que les siennes.
    if (!perms['heures.view_all']) out.heures = (db.heures || []).filter(function (h) { return String(h.coach_id) === String(user.id); });
    return out;
  }

  /** Lignes nécessaires à la synthèse d'audit. */
  function auditEntry(user, action, sheetKey, id, before, after, motif) {
    return { id: u.newId('AUD'), date: new Date().toISOString(), utilisateur: user.email, role: user.role, action: action,
      feuille: sheetKey ? schema.sheet(sheetKey).tab : '', ligne_id: id || '',
      avant: before ? JSON.stringify(before) : '', apres: after ? JSON.stringify(after) : '', motif: motif || '' };
  }

  return { validateRecord: validateRecord, checkWrite: checkWrite, filterRead: filterRead, auditEntry: auditEntry, enumKeys: enumKeys };
});
