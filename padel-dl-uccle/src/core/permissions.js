/**
 * Matrice des permissions par rôle.
 *
 * Les valeurs par défaut ci-dessous sont surchargeables dans la feuille
 * « Paramètres » (catégorie « permission », référence = rôle, clé = permission,
 * valeur = oui/non). Le serveur Apps Script applique la même matrice : l'interface
 * ne fait que masquer ce qui est interdit, la sécurité est vérifiée côté serveur.
 */
(function (root, factory) {
  var mod = factory();
  if (typeof module === 'object' && module.exports) module.exports = mod;
  root.Padel = root.Padel || {};
  root.Padel.permissions = mod;
})(typeof globalThis !== 'undefined' ? globalThis : this, function () {
  'use strict';

  var PERMS = {
    'dashboard.view': 'Voir le tableau de bord',
    'terrains.view': 'Voir l\'occupation des terrains',
    'terrains.edit': 'Encoder réservations, maintenance et horaires',
    'seances.view': 'Voir le planning des séances',
    'seances.edit': 'Créer / modifier toutes les séances',
    'seances.edit_own': 'Modifier ses propres séances (coach)',
    'presences.edit': 'Encoder les présences',
    'academies.view': 'Voir offres, cycles et inscriptions',
    'academies.edit': 'Créer / modifier offres et cycles',
    'inscriptions.edit': 'Créer / modifier les inscriptions',
    'membres.view': 'Voir le référentiel membres',
    'membres.edit': 'Modifier le référentiel membres',
    'paiements.view': 'Voir les paiements',
    'paiements.edit': 'Encoder et vérifier les paiements',
    'heures.own': 'Encoder ses propres heures',
    'heures.view_all': 'Voir les heures de tous les coachs',
    'heures.validate': 'Valider / renvoyer en correction les heures',
    'heures.pay': 'Marquer les heures comme payées',
    'couts.view': 'Voir taux horaires et coûts coachs',
    'depenses.view': 'Voir les dépenses',
    'depenses.edit': 'Encoder les dépenses',
    'evenements.view': 'Voir les événements',
    'evenements.edit': 'Créer / modifier les événements',
    'satisfaction.view': 'Voir satisfaction et NPS',
    'satisfaction.edit': 'Encoder un avis membre',
    'pnl.view': 'Voir le P&L',
    'rapports.view': 'Voir les rapports',
    'rapports.export': 'Exporter les rapports (PDF, CSV)',
    'qualite.view': 'Voir la qualité des données',
    'imports.run': 'Importer des fichiers et annuler un import',
    'indicateurs.edit': 'Saisir les indicateurs club (Power BI)',
    'parametres.view': 'Voir les paramètres',
    'parametres.edit': 'Modifier les paramètres (tarifs, taux, règles)',
    'utilisateurs.edit': 'Gérer les utilisateurs et les rôles',
    'audit.view': 'Consulter le journal d\'audit'
  };

  var ALL = Object.keys(PERMS);

  var DEFAULTS = {
    admin: ALL.slice(),
    coach: ['seances.view', 'seances.edit_own', 'presences.edit', 'membres.view', 'heures.own', 'evenements.view', 'satisfaction.edit'],
    reception: ['seances.view', 'academies.view', 'inscriptions.edit', 'membres.view', 'membres.edit', 'paiements.view',
      'paiements.edit', 'evenements.view', 'satisfaction.edit'],
    manager: ['dashboard.view', 'terrains.view', 'seances.view', 'academies.view', 'paiements.view', 'heures.view_all',
      'couts.view', 'depenses.view', 'evenements.view', 'satisfaction.view', 'pnl.view', 'rapports.view',
      'rapports.export', 'qualite.view']
  };

  var ROLES = { admin: 'Administrateur (Anthony)', coach: 'Coach', reception: 'Réception', manager: 'Manager (lecture)' };

  /** Permissions effectives d'un rôle, surcharges « Paramètres » comprises. */
  function permissionsFor(role, parametres) {
    var set = {};
    (DEFAULTS[role] || []).forEach(function (p) { set[p] = true; });
    (parametres || []).forEach(function (r) {
      if (r.categorie !== 'permission' || r.statut === 'archive' || r.archive === true || r.archive === 'TRUE') return;
      if (String(r.reference || '').trim() !== role || !PERMS[r.cle]) return;
      var v = String(r.valeur || '').trim().toLowerCase();
      if (['oui', 'true', '1', 'vrai'].indexOf(v) >= 0) set[r.cle] = true;
      if (['non', 'false', '0', 'faux'].indexOf(v) >= 0) delete set[r.cle];
    });
    return set;
  }

  function can(perms, p) { return !!(perms && perms[p]); }

  /** Permission requise pour écrire dans une feuille (contrôles fins côté serveur). */
  var WRITE = {
    parametres: ['parametres.edit'], utilisateurs: ['utilisateurs.edit'], terrains: ['terrains.edit'],
    membres: ['membres.edit', 'inscriptions.edit'], offres: ['academies.edit'], cycles: ['academies.edit'],
    seances: ['seances.edit', 'seances.edit_own'], inscriptions: ['inscriptions.edit'], presences: ['presences.edit'],
    heures: ['heures.own', 'heures.validate', 'heures.pay'], paiements: ['paiements.edit'], depenses: ['depenses.edit'],
    evenements: ['evenements.edit'], satisfaction: ['satisfaction.edit'], occupation: ['terrains.edit'],
    imports: ['imports.run'], indicateurs: ['indicateurs.edit'], audit: []
  };
  /** Permission requise pour lire une feuille. */
  var READ = {
    parametres: ['parametres.view', 'dashboard.view', 'seances.view', 'heures.own'], utilisateurs: ['utilisateurs.edit'],
    terrains: ['terrains.view', 'seances.view'], membres: ['membres.view', 'dashboard.view'],
    offres: ['academies.view', 'pnl.view'], cycles: ['academies.view', 'seances.view', 'pnl.view'],
    seances: ['seances.view', 'dashboard.view'], inscriptions: ['academies.view', 'pnl.view', 'presences.edit'],
    presences: ['seances.view', 'dashboard.view'], heures: ['heures.own', 'heures.view_all'],
    paiements: ['paiements.view', 'pnl.view'], depenses: ['depenses.view', 'pnl.view'],
    evenements: ['evenements.view', 'dashboard.view'], satisfaction: ['satisfaction.view'],
    occupation: ['terrains.view'], indicateurs: ['dashboard.view', 'rapports.view'], imports: ['imports.run'], audit: ['audit.view']
  };

  function canRead(perms, sheetKey) { return (READ[sheetKey] || []).some(function (p) { return perms[p]; }); }
  function canWrite(perms, sheetKey) { return (WRITE[sheetKey] || []).some(function (p) { return perms[p]; }); }

  return { PERMS: PERMS, ALL: ALL, DEFAULTS: DEFAULTS, ROLES: ROLES, READ: READ, WRITE: WRITE,
    permissionsFor: permissionsFor, can: can, canRead: canRead, canWrite: canWrite };
});
