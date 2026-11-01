# Matrice des permissions

> Généré par `node scripts/build.js` depuis `src/core/permissions.js`. Valeurs par défaut ; chaque case est modifiable dans l'application (Paramètres → Droits par rôle), ce qui crée une ligne `permission` dans l'onglet Paramètres. Le serveur Apps Script applique la même matrice.

| Permission | Code | Administrateur (Anthony) | Coach | Réception | Manager (lecture) |
|---|---|:-:|:-:|:-:|:-:|
| Voir le tableau de bord | `dashboard.view` | ✓ | – | – | ✓ |
| Voir l'occupation des terrains | `terrains.view` | ✓ | – | – | ✓ |
| Encoder réservations, maintenance et horaires | `terrains.edit` | ✓ | – | – | – |
| Voir le planning des séances | `seances.view` | ✓ | ✓ | ✓ | ✓ |
| Créer / modifier toutes les séances | `seances.edit` | ✓ | – | – | – |
| Modifier ses propres séances (coach) | `seances.edit_own` | ✓ | ✓ | – | – |
| Encoder les présences | `presences.edit` | ✓ | ✓ | – | – |
| Voir offres, cycles et inscriptions | `academies.view` | ✓ | – | ✓ | ✓ |
| Créer / modifier offres et cycles | `academies.edit` | ✓ | – | – | – |
| Créer / modifier les inscriptions | `inscriptions.edit` | ✓ | – | ✓ | – |
| Voir le référentiel membres | `membres.view` | ✓ | ✓ | ✓ | – |
| Modifier le référentiel membres | `membres.edit` | ✓ | – | ✓ | – |
| Voir les paiements | `paiements.view` | ✓ | – | ✓ | ✓ |
| Encoder et vérifier les paiements | `paiements.edit` | ✓ | – | ✓ | – |
| Encoder ses propres heures | `heures.own` | ✓ | ✓ | – | – |
| Voir les heures de tous les coachs | `heures.view_all` | ✓ | – | – | ✓ |
| Valider / renvoyer en correction les heures | `heures.validate` | ✓ | – | – | – |
| Marquer les heures comme payées | `heures.pay` | ✓ | – | – | – |
| Voir taux horaires et coûts coachs | `couts.view` | ✓ | – | – | ✓ |
| Voir les dépenses | `depenses.view` | ✓ | – | – | ✓ |
| Encoder les dépenses | `depenses.edit` | ✓ | – | – | – |
| Voir les événements | `evenements.view` | ✓ | ✓ | ✓ | ✓ |
| Créer / modifier les événements | `evenements.edit` | ✓ | – | – | – |
| Voir satisfaction et NPS | `satisfaction.view` | ✓ | – | – | ✓ |
| Encoder un avis membre | `satisfaction.edit` | ✓ | ✓ | ✓ | – |
| Voir le P&L | `pnl.view` | ✓ | – | – | ✓ |
| Voir les rapports | `rapports.view` | ✓ | – | – | ✓ |
| Exporter les rapports (PDF, CSV) | `rapports.export` | ✓ | – | – | ✓ |
| Voir la qualité des données | `qualite.view` | ✓ | – | – | ✓ |
| Importer des fichiers et annuler un import | `imports.run` | ✓ | – | – | – |
| Saisir les indicateurs club (Power BI) | `indicateurs.edit` | ✓ | – | – | – |
| Voir les paramètres | `parametres.view` | ✓ | – | – | – |
| Modifier les paramètres (tarifs, taux, règles) | `parametres.edit` | ✓ | – | – | – |
| Gérer les utilisateurs et les rôles | `utilisateurs.edit` | ✓ | – | – | – |
| Consulter le journal d'audit | `audit.view` | ✓ | – | – | – |

## Règles fines appliquées par le serveur (en plus de la matrice)

- Un coach n'encode que **ses propres** heures, en statut Brouillon ou Soumis.
- Des heures **Validées** ou **Payées** ne sont plus modifiables par le coach : seule une « demande de correction » (texte) peut être ajoutée.
- « À corriger » exige un motif ; « Payé » exige la permission de paiement ; la validation enregistre qui a validé et quand.
- Un coach ne modifie que ses séances (responsable ou remplaçant) et leurs présences ; il ne change pas le coach responsable.
- Lecture minimisée : un coach ne reçoit que ses heures et son propre taux ; seuls les rôles avec `couts.view` voient les taux ; seuls ceux avec `pnl.view` voient le budget ; les e-mails des utilisateurs ne sont envoyés qu'à l'administrateur ; l'empreinte des codes d'accès n'est jamais envoyée.
- Le journal d'audit est en ajout seul. Rien n'est supprimé : « Archiver » met `archive = TRUE`.
