# Structure Google Sheets

> Fichier généré par `node scripts/build.js` à partir de `src/core/schema.js`. Ne pas modifier à la main.

Le classeur contient 18 onglets. La fonction `setupSpreadsheet()` (Apps Script) les crée avec leurs en-têtes, listes déroulantes et protections.

Règles communes :

- la première colonne `id` est l'identifiant unique de la ligne ;
- les six dernières colonnes (`archive`, `import_id`, `cree_le`, `cree_par`, `modifie_le`, `modifie_par`) sont techniques ; `archive = TRUE` exclut la ligne des calculs sans la supprimer ;
- une cellule vide signifie « inconnu » : elle n'est jamais lue comme zéro ;
- les listes « configurables » sont lues dans l'onglet Paramètres (catégorie indiquée).

## Sommaire

- [Paramètres](#parametres)
- [Utilisateurs](#utilisateurs)
- [Terrains](#terrains)
- [Membres](#membres)
- [Offres](#offres)
- [Cycles](#cycles)
- [Séances](#seances)
- [Inscriptions](#inscriptions)
- [Présences](#presences)
- [Heures_Coachs](#heures_coachs)
- [Paiements](#paiements)
- [Dépenses](#depenses)
- [Événements](#evenements)
- [Satisfaction](#satisfaction)
- [Occupation_Terrains](#occupation_terrains) *(ajoutée au modèle demandé)*
- [Indicateurs_Club](#indicateurs_club) *(ajoutée au modèle demandé)*
- [Imports](#imports)
- [Journal_Audit](#journal_audit)

## Paramètres

Règles et valeurs modifiables, toujours historisées par date d'effet (tarifs de référence, taux coachs, types d'activité, niveaux, heures de pointe, vacances, budget, permissions).

Clé de détection des doublons : `categorie + cle + reference + date_effet`

| Colonne | Libellé | Type | Obligatoire | Règle de validation | Relation |
|---|---|---|---|---|---|
| `id` | ID | Identifiant (texte unique) | Oui |  |  |
| `categorie` | Catégorie | Liste de valeurs | Oui | valeurs : `general`, `taux_coach`, `type_activite`, `niveau`, `heures_pointe`, `vacances`, `budget`, `categorie_depense`, `categorie_revenu`, `permission`, `indicateur_club`, `objectif` |  |
| `cle` | Clé | Texte | Oui | Ex. date_ouverture_indoor, tournoi, 3… |  |
| `reference` | Référence | Texte | Non | ID du coach (taux), jour 1-7 (heures de pointe), mois AAAA-MM (budget), rôle (permission). |  |
| `valeur` | Valeur | Texte | Non | Vide = inconnu. Jamais remplacé par 0. |  |
| `libelle` | Libellé affiché | Texte | Non |  |  |
| `attributs` | Attributs | Texte | Non | Pour un type d'activité : public=adulte\|junior\|mixte; payant=oui\|non; encadre=oui\|non; famille=academie\|evenement\|tournoi\|decouverte\|autre |  |
| `date_effet` | Date d'effet | Date (AAAA-MM-JJ) | Non | Vide = depuis toujours (signalé à vérifier). |  |
| `date_fin` | Date de fin | Date (AAAA-MM-JJ) | Non |  |  |
| `statut` | Statut | Liste de valeurs | Oui | valeurs : `actif`, `archive` |  |
| `source` | Source / confirmation | Texte | Non | Ex. « Cadrage 01/11/2026 », « À confirmer ». |  |
| `description` | Description | Texte long | Non |  |  |
| `archive` | Archivé | Booléen (TRUE/FALSE) | Non | TRUE = ligne archivée (jamais supprimée). |  |
| `import_id` | Import d'origine | Référence (ID) | Non |  | → Imports.id |
| `cree_le` | Créé le | Texte | Non |  |  |
| `cree_par` | Créé par | Texte | Non |  |  |
| `modifie_le` | Modifié le | Texte | Non |  |  |
| `modifie_par` | Modifié par | Texte | Non |  |  |

## Utilisateurs

Personnes ayant accès à l'application et leur rôle. Un coach est identifié par son ID utilisateur.

Clé de détection des doublons : `email`

| Colonne | Libellé | Type | Obligatoire | Règle de validation | Relation |
|---|---|---|---|---|---|
| `id` | ID | Identifiant (texte unique) | Oui |  |  |
| `email` | E-mail (compte Google) | E-mail | Oui | Adresse e-mail valide, unique |  |
| `nom_affiche` | Nom affiché | Texte | Oui |  |  |
| `role` | Rôle | Liste de valeurs | Oui | valeurs : `admin`, `coach`, `reception`, `manager` |  |
| `actif` | Actif | Booléen (TRUE/FALSE) | Oui |  |  |
| `code_acces_hash` | Code d'accès (empreinte) | Texte | Non | Rempli uniquement par la fonction setAccessCode (mode « code »). Jamais lisible dans l'application. |  |
| `derniere_connexion` | Dernière connexion | Texte | Non |  |  |
| `archive` | Archivé | Booléen (TRUE/FALSE) | Non | TRUE = ligne archivée (jamais supprimée). |  |
| `import_id` | Import d'origine | Référence (ID) | Non |  | → Imports.id |
| `cree_le` | Créé le | Texte | Non |  |  |
| `cree_par` | Créé par | Texte | Non |  |  |
| `modifie_le` | Modifié le | Texte | Non |  |  |
| `modifie_par` | Modifié par | Texte | Non |  |  |

## Terrains

Les six terrains, leur type et leurs horaires d'ouverture (dénominateur du taux d'occupation). Horaire vide = inconnu ; « fermé » = fermé ce jour-là.

Clé de détection des doublons : `numero`

| Colonne | Libellé | Type | Obligatoire | Règle de validation | Relation |
|---|---|---|---|---|---|
| `id` | ID | Identifiant (texte unique) | Oui |  |  |
| `numero` | Numéro | Nombre entier | Oui |  |  |
| `nom` | Nom | Texte | Oui |  |  |
| `lieu` | Indoor / outdoor | Liste de valeurs | Oui | valeurs : `indoor`, `outdoor` |  |
| `date_mise_en_service` | Mise en service | Date (AAAA-MM-JJ) | Non | Indoor : date d'ouverture (à fournir). |  |
| `horaires_lun` | Horaires lundi | Texte | Non | HH:MM-HH:MM, plusieurs plages séparées par « ; », ou « fermé » |  |
| `horaires_mar` | Horaires mardi | Texte | Non | idem |  |
| `horaires_mer` | Horaires mercredi | Texte | Non | idem |  |
| `horaires_jeu` | Horaires jeudi | Texte | Non | idem |  |
| `horaires_ven` | Horaires vendredi | Texte | Non | idem |  |
| `horaires_sam` | Horaires samedi | Texte | Non | idem |  |
| `horaires_dim` | Horaires dimanche | Texte | Non | idem |  |
| `statut` | Statut | Liste de valeurs | Oui | valeurs : `actif`, `archive` |  |
| `commentaire` | Commentaire | Texte long | Non |  |  |
| `archive` | Archivé | Booléen (TRUE/FALSE) | Non | TRUE = ligne archivée (jamais supprimée). |  |
| `import_id` | Import d'origine | Référence (ID) | Non |  | → Imports.id |
| `cree_le` | Créé le | Texte | Non |  |  |
| `cree_par` | Créé par | Texte | Non |  |  |
| `modifie_le` | Modifié le | Texte | Non |  |  |
| `modifie_par` | Modifié par | Texte | Non |  |  |

## Membres

Référentiel minimal (RGPD) : un identifiant membre suffit. Aucun e-mail ni téléphone.

Clé de détection des doublons : `id`

| Colonne | Libellé | Type | Obligatoire | Règle de validation | Relation |
|---|---|---|---|---|---|
| `id` | ID membre | Identifiant (texte unique) | Oui | Idéalement le numéro de membre ABS. |  |
| `alias` | Alias (prénom + initiale) | Texte | Non | Facultatif. Ne pas saisir le nom complet si inutile. |  |
| `segment` | Adulte / junior | Liste de valeurs | Oui | valeurs : `adulte`, `junior` |  |
| `categorie_abonnement` | Abonnement | Texte | Non | Ex. Platinum, Diamond. |  |
| `niveau` | Niveau (1-8) | Nombre entier | Non | Entier de 1 à 8 (grille des niveaux) ; entre 1 et 8 |  |
| `date_niveau` | Date du niveau | Date (AAAA-MM-JJ) | Non |  |  |
| `motif_niveau` | Motif du dernier changement de niveau | Texte | Non |  |  |
| `statut` | Statut | Liste de valeurs | Oui | valeurs : `actif`, `inactif` |  |
| `commentaire` | Commentaire | Texte long | Non |  |  |
| `archive` | Archivé | Booléen (TRUE/FALSE) | Non | TRUE = ligne archivée (jamais supprimée). |  |
| `import_id` | Import d'origine | Référence (ID) | Non |  | → Imports.id |
| `cree_le` | Créé le | Texte | Non |  |  |
| `cree_par` | Créé par | Texte | Non |  |  |
| `modifie_le` | Modifié le | Texte | Non |  |  |
| `modifie_par` | Modifié par | Texte | Non |  |  |

## Offres

Catalogue des formules (académies, collectifs). Aucun tarif n'est supposé : un tarif vide bloque le calcul du revenu et est signalé.

Clé de détection des doublons : `nom + date_effet`

| Colonne | Libellé | Type | Obligatoire | Règle de validation | Relation |
|---|---|---|---|---|---|
| `id` | ID | Identifiant (texte unique) | Oui |  |  |
| `nom` | Nom de la formule | Texte | Oui |  |  |
| `type_activite` | Type d'activité | Liste de valeurs | Oui | valeurs configurables (Paramètres → `type_activite`) |  |
| `public` | Adulte / junior | Liste de valeurs | Oui | valeurs : `adulte`, `junior`, `mixte` |  |
| `duree_seance_min` | Durée d'une séance (min) | Nombre entier | Non |  |  |
| `nb_seances` | Nombre de séances | Nombre entier | Non | Entier > 0 |  |
| `tarif_seance` | Prix par participant et par séance (€) | Montant en euros | Non | ≥ 0, vide = inconnu |  |
| `prix_cycle` | Prix du cycle par participant (€) | Montant en euros | Non | ≥ 0, vide = inconnu. Si vide : prix par séance × nombre de séances. |  |
| `taille_min` | Taille minimale du groupe | Nombre entier | Non |  |  |
| `taille_max` | Taille maximale du groupe | Nombre entier | Non |  |  |
| `date_effet` | Date d'effet | Date (AAAA-MM-JJ) | Oui |  |  |
| `date_fin` | Date de fin | Date (AAAA-MM-JJ) | Non |  |  |
| `statut` | Statut | Liste de valeurs | Oui | valeurs : `actif`, `archive` |  |
| `source` | Source du tarif | Texte | Non |  |  |
| `commentaire` | Commentaire | Texte long | Non |  |  |
| `archive` | Archivé | Booléen (TRUE/FALSE) | Non | TRUE = ligne archivée (jamais supprimée). |  |
| `import_id` | Import d'origine | Référence (ID) | Non |  | → Imports.id |
| `cree_le` | Créé le | Texte | Non |  |  |
| `cree_par` | Créé par | Texte | Non |  |  |
| `modifie_le` | Modifié le | Texte | Non |  |  |
| `modifie_par` | Modifié par | Texte | Non |  |  |

## Cycles

Groupes payants (un cycle = une offre, un coach, un créneau, des dates).

Clé de détection des doublons : `offre_id + date_debut + jour_semaine + heure_debut + terrain_id`

| Colonne | Libellé | Type | Obligatoire | Règle de validation | Relation |
|---|---|---|---|---|---|
| `id` | ID | Identifiant (texte unique) | Oui |  |  |
| `nom` | Nom du groupe | Texte | Oui |  |  |
| `offre_id` | Offre | Référence (ID) | Oui |  | → Offres.id |
| `coach_id` | Coach | Référence (ID) | Non |  | → Utilisateurs.id |
| `date_debut` | Date de début | Date (AAAA-MM-JJ) | Oui |  |  |
| `date_fin` | Date de fin | Date (AAAA-MM-JJ) | Non |  |  |
| `jour_semaine` | Jour (1 = lundi … 7 = dimanche) | Nombre entier | Non | entre 1 et 7 |  |
| `heure_debut` | Heure de début | Heure (HH:MM) | Non |  |  |
| `heure_fin` | Heure de fin | Heure (HH:MM) | Non |  |  |
| `terrain_id` | Terrain | Référence (ID) | Non |  | → Terrains.id |
| `niveau` | Niveau | Nombre entier | Non | entre 1 et 8 |  |
| `capacite` | Capacité | Nombre entier | Non |  |  |
| `nb_seances` | Nombre de séances du cycle | Nombre entier | Non | Cycles flexibles : idéalement 15 ou 20. Obligatoire si l'offre ne le fixe pas. |  |
| `statut` | Statut | Liste de valeurs | Oui | valeurs : `planifie`, `en_cours`, `termine`, `annule` |  |
| `commentaire` | Commentaire | Texte long | Non |  |  |
| `archive` | Archivé | Booléen (TRUE/FALSE) | Non | TRUE = ligne archivée (jamais supprimée). |  |
| `import_id` | Import d'origine | Référence (ID) | Non |  | → Imports.id |
| `cree_le` | Créé le | Texte | Non |  |  |
| `cree_par` | Créé par | Texte | Non |  |  |
| `modifie_le` | Modifié le | Texte | Non |  |  |
| `modifie_par` | Modifié par | Texte | Non |  |  |

## Séances

Planning et réalisation de chaque séance. Les compteurs « déclarés » permettent un encodage rapide sans liste nominative ; la liste « Présences » est prioritaire quand elle existe.

Clé de détection des doublons : `date + heure_debut + type_activite + terrains`

| Colonne | Libellé | Type | Obligatoire | Règle de validation | Relation |
|---|---|---|---|---|---|
| `id` | ID | Identifiant (texte unique) | Oui |  |  |
| `date` | Date | Date (AAAA-MM-JJ) | Oui |  |  |
| `heure_debut` | Début | Heure (HH:MM) | Oui |  |  |
| `heure_fin` | Fin | Heure (HH:MM) | Oui |  |  |
| `type_activite` | Type d'activité | Liste de valeurs | Oui | valeurs configurables (Paramètres → `type_activite`) |  |
| `cycle_id` | Cycle (académie) | Référence (ID) | Non |  | → Cycles.id |
| `evenement_id` | Événement | Référence (ID) | Non |  | → Événements.id |
| `terrains` | Terrain(s) | Liste d'ID séparés par des virgules | Non |  | → Terrains.id |
| `coach_id` | Coach responsable | Référence (ID) | Non |  | → Utilisateurs.id |
| `coach_remplacant_id` | Coach remplaçant | Référence (ID) | Non |  | → Utilisateurs.id |
| `niveau` | Niveau | Texte | Non | Ex. 2 ou 2-3 |  |
| `capacite` | Capacité | Nombre entier | Non |  |  |
| `nb_inscrits` | Inscrits (déclaré) | Nombre entier | Non |  |  |
| `nb_presents` | Présents (déclaré) | Nombre entier | Non |  |  |
| `nb_absents` | Absents prévenus (déclaré) | Nombre entier | Non |  |  |
| `nb_no_shows` | No-shows (déclaré) | Nombre entier | Non |  |  |
| `nb_annulations` | Annulations (déclaré) | Nombre entier | Non |  |  |
| `payant` | Payant | Liste de valeurs | Non | valeurs : `oui`, `non`. Vide = selon le type d'activité. |  |
| `statut` | Statut | Liste de valeurs | Oui | valeurs : `planifiee`, `realisee`, `annulee_club`, `annulee_meteo`, `annulee_participants` |  |
| `commentaire` | Commentaire | Texte long | Non |  |  |
| `incident` | Incident | Texte long | Non |  |  |
| `archive` | Archivé | Booléen (TRUE/FALSE) | Non | TRUE = ligne archivée (jamais supprimée). |  |
| `import_id` | Import d'origine | Référence (ID) | Non |  | → Imports.id |
| `cree_le` | Créé le | Texte | Non |  |  |
| `cree_par` | Créé par | Texte | Non |  |  |
| `modifie_le` | Modifié le | Texte | Non |  |  |
| `modifie_par` | Modifié par | Texte | Non |  |  |

## Inscriptions

Inscription d'un membre à un cycle (académie), à une séance ponctuelle ou à un événement. Une entrée en cours de cycle ne prévoit que les séances restantes.

Clé de détection des doublons : `membre_id + cycle_id + seance_id + evenement_id`

| Colonne | Libellé | Type | Obligatoire | Règle de validation | Relation |
|---|---|---|---|---|---|
| `id` | ID | Identifiant (texte unique) | Oui |  |  |
| `membre_id` | Membre | Référence (ID) | Oui |  | → Membres.id |
| `cycle_id` | Cycle | Référence (ID) | Non |  | → Cycles.id |
| `seance_id` | Séance ponctuelle | Référence (ID) | Non |  | → Séances.id |
| `evenement_id` | Événement | Référence (ID) | Non |  | → Événements.id |
| `date_inscription` | Date d'inscription | Date (AAAA-MM-JJ) | Oui |  |  |
| `date_premiere_seance` | Première séance due | Date (AAAA-MM-JJ) | Non | Entrée en cours de cycle. Vide = début du cycle. |  |
| `nb_seances_prevues` | Séances prévues | Nombre entier | Non | Vide = séances du cycle. |  |
| `montant_attendu` | Montant attendu (€) | Montant en euros | Non | ≥ 0, vide = inconnu. Vide = calculé depuis l'offre ; bloqué si l'offre n'a pas de tarif. |  |
| `statut` | Statut | Liste de valeurs | Oui | valeurs : `inscrit`, `liste_attente`, `annule`, `transfere` |  |
| `commentaire` | Commentaire | Texte long | Non |  |  |
| `archive` | Archivé | Booléen (TRUE/FALSE) | Non | TRUE = ligne archivée (jamais supprimée). |  |
| `import_id` | Import d'origine | Référence (ID) | Non |  | → Imports.id |
| `cree_le` | Créé le | Texte | Non |  |  |
| `cree_par` | Créé par | Texte | Non |  |  |
| `modifie_le` | Modifié le | Texte | Non |  |  |
| `modifie_par` | Modifié par | Texte | Non |  |  |

## Présences

Participation réelle, une ligne par membre et par séance.

Clé de détection des doublons : `seance_id + membre_id`

| Colonne | Libellé | Type | Obligatoire | Règle de validation | Relation |
|---|---|---|---|---|---|
| `id` | ID | Identifiant (texte unique) | Oui |  |  |
| `seance_id` | Séance | Référence (ID) | Oui |  | → Séances.id |
| `membre_id` | Membre | Référence (ID) | Oui |  | → Membres.id |
| `inscription_id` | Inscription | Référence (ID) | Non |  | → Inscriptions.id |
| `statut` | Présence | Liste de valeurs | Oui | valeurs : `present`, `absent`, `no_show`, `annule` |  |
| `motif` | Motif | Texte | Non |  |  |
| `commentaire` | Commentaire | Texte | Non |  |  |
| `archive` | Archivé | Booléen (TRUE/FALSE) | Non | TRUE = ligne archivée (jamais supprimée). |  |
| `import_id` | Import d'origine | Référence (ID) | Non |  | → Imports.id |
| `cree_le` | Créé le | Texte | Non |  |  |
| `cree_par` | Créé par | Texte | Non |  |  |
| `modifie_le` | Modifié le | Texte | Non |  |  |
| `modifie_par` | Modifié par | Texte | Non |  |  |

## Heures_Coachs

Interventions des coachs. Coût = durée validée × taux horaire en vigueur à la date (Paramètres, catégorie taux_coach).

Clé de détection des doublons : `coach_id + date + heure_debut`

| Colonne | Libellé | Type | Obligatoire | Règle de validation | Relation |
|---|---|---|---|---|---|
| `id` | ID | Identifiant (texte unique) | Oui |  |  |
| `coach_id` | Coach | Référence (ID) | Oui |  | → Utilisateurs.id |
| `date` | Date | Date (AAAA-MM-JJ) | Oui |  |  |
| `heure_debut` | Début | Heure (HH:MM) | Oui |  |  |
| `heure_fin` | Fin | Heure (HH:MM) | Oui |  |  |
| `duree_h` | Durée (h) | Nombre décimal | Non | Calculée depuis début/fin. |  |
| `type_activite` | Type de séance | Liste de valeurs | Oui | valeurs configurables (Paramètres → `type_activite`) |  |
| `seance_id` | Séance | Référence (ID) | Non |  | → Séances.id |
| `cycle_id` | Académie (cycle) | Référence (ID) | Non |  | → Cycles.id |
| `evenement_id` | Événement | Référence (ID) | Non |  | → Événements.id |
| `nb_participants` | Participants | Nombre entier | Non |  |  |
| `nb_presents` | Présents | Nombre entier | Non |  |  |
| `remplacement` | Remplacement | Booléen (TRUE/FALSE) | Non |  |  |
| `remplace_coach_id` | Coach remplacé | Référence (ID) | Non |  | → Utilisateurs.id |
| `annulation` | Séance annulée | Booléen (TRUE/FALSE) | Non |  |  |
| `commentaire` | Commentaire | Texte long | Non |  |  |
| `statut` | Statut | Liste de valeurs | Oui | valeurs : `brouillon`, `soumis`, `valide`, `a_corriger`, `paye` |  |
| `motif_correction` | Motif de correction | Texte | Non |  |  |
| `demande_correction` | Demande de correction (coach) | Texte | Non |  |  |
| `valide_par` | Validé par | Texte | Non |  |  |
| `valide_le` | Validé le | Texte | Non |  |  |
| `paye_le` | Payé le | Date (AAAA-MM-JJ) | Non |  |  |
| `reference_paiement` | Référence facture / relevé | Texte | Non |  |  |
| `archive` | Archivé | Booléen (TRUE/FALSE) | Non | TRUE = ligne archivée (jamais supprimée). |  |
| `import_id` | Import d'origine | Référence (ID) | Non |  | → Imports.id |
| `cree_le` | Créé le | Texte | Non |  |  |
| `cree_par` | Créé par | Texte | Non |  |  |
| `modifie_le` | Modifié le | Texte | Non |  |  |
| `modifie_par` | Modifié par | Texte | Non |  |  |

## Paiements

Encaissements réels. Un paiement doit être rattaché à une inscription, une séance ou un événement, sauf « autres revenus ».

Clé de détection des doublons : `date_paiement + membre_id + montant + reference`

| Colonne | Libellé | Type | Obligatoire | Règle de validation | Relation |
|---|---|---|---|---|---|
| `id` | ID | Identifiant (texte unique) | Oui |  |  |
| `date_paiement` | Date de paiement | Date (AAAA-MM-JJ) | Oui |  |  |
| `membre_id` | Membre | Référence (ID) | Non |  | → Membres.id |
| `inscription_id` | Inscription | Référence (ID) | Non |  | → Inscriptions.id |
| `evenement_id` | Événement | Référence (ID) | Non |  | → Événements.id |
| `seance_id` | Séance | Référence (ID) | Non |  | → Séances.id |
| `categorie_revenu` | Catégorie (autres revenus) | Liste de valeurs | Non | valeurs configurables (Paramètres → `categorie_revenu`) |  |
| `montant` | Montant (€) | Montant en euros | Oui | Nombre > 0 (un remboursement se saisit avec le statut « Remboursé ») |  |
| `mode` | Mode de paiement | Liste de valeurs | Non | valeurs : `carte`, `bancontact`, `virement`, `especes`, `compte_membre`, `application`, `autre` |  |
| `reference` | Référence | Texte | Non |  |  |
| `statut` | Statut | Liste de valeurs | Oui | valeurs : `a_verifier`, `encaisse`, `rembourse`, `annule` |  |
| `verifie_par` | Vérifié par | Texte | Non |  |  |
| `verifie_le` | Vérifié le | Texte | Non |  |  |
| `commentaire` | Commentaire | Texte long | Non |  |  |
| `archive` | Archivé | Booléen (TRUE/FALSE) | Non | TRUE = ligne archivée (jamais supprimée). |  |
| `import_id` | Import d'origine | Référence (ID) | Non |  | → Imports.id |
| `cree_le` | Créé le | Texte | Non |  |  |
| `cree_par` | Créé par | Texte | Non |  |  |
| `modifie_le` | Modifié le | Texte | Non |  |  |
| `modifie_par` | Modifié par | Texte | Non |  |  |

## Dépenses

Coûts directs (matériel, prix, catering, événements…). Le justificatif est obligatoire pour la qualité des données.

Clé de détection des doublons : `date + categorie + montant + fournisseur`

| Colonne | Libellé | Type | Obligatoire | Règle de validation | Relation |
|---|---|---|---|---|---|
| `id` | ID | Identifiant (texte unique) | Oui |  |  |
| `date` | Date | Date (AAAA-MM-JJ) | Oui |  |  |
| `categorie` | Catégorie | Liste de valeurs | Oui | valeurs configurables (Paramètres → `categorie_depense`) |  |
| `montant` | Montant (€) | Montant en euros | Oui | ≥ 0, vide = inconnu |  |
| `fournisseur` | Fournisseur | Texte | Non |  |  |
| `type_activite` | Activité concernée | Liste de valeurs | Non | valeurs configurables (Paramètres → `type_activite`) |  |
| `evenement_id` | Événement | Référence (ID) | Non |  | → Événements.id |
| `cycle_id` | Cycle | Référence (ID) | Non |  | → Cycles.id |
| `seance_id` | Séance | Référence (ID) | Non |  | → Séances.id |
| `justificatif` | Justificatif (lien ou n° de pièce) | Texte | Non |  |  |
| `statut` | Statut | Liste de valeurs | Oui | valeurs : `engagee`, `payee`, `annulee` |  |
| `commentaire` | Commentaire | Texte long | Non |  |  |
| `archive` | Archivé | Booléen (TRUE/FALSE) | Non | TRUE = ligne archivée (jamais supprimée). |  |
| `import_id` | Import d'origine | Référence (ID) | Non |  | → Imports.id |
| `cree_le` | Créé le | Texte | Non |  |  |
| `cree_par` | Créé par | Texte | Non |  |  |
| `modifie_le` | Modifié le | Texte | Non |  |  |
| `modifie_par` | Modifié par | Texte | Non |  |  |

## Événements

Tournois et événements. Revenus = paiements rattachés (+ revenu déclaré si pas de détail) ; coûts = dépenses + heures coachs rattachées.

Clé de détection des doublons : `nom + date`

| Colonne | Libellé | Type | Obligatoire | Règle de validation | Relation |
|---|---|---|---|---|---|
| `id` | ID | Identifiant (texte unique) | Oui |  |  |
| `nom` | Nom | Texte | Oui |  |  |
| `date` | Date | Date (AAAA-MM-JJ) | Oui |  |  |
| `heure_debut` | Début | Heure (HH:MM) | Non |  |  |
| `heure_fin` | Fin | Heure (HH:MM) | Non |  |  |
| `type_activite` | Type | Liste de valeurs | Oui | valeurs configurables (Paramètres → `type_activite`) |  |
| `format` | Format | Texte | Non |  |  |
| `terrains` | Terrains | Liste d'ID séparés par des virgules | Non |  | → Terrains.id |
| `nb_terrains` | Nombre de terrains | Nombre entier | Non |  |  |
| `capacite` | Capacité (joueurs) | Nombre entier | Non |  |  |
| `nb_inscrits` | Inscrits | Nombre entier | Non |  |  |
| `nb_presents` | Présents | Nombre entier | Non |  |  |
| `nb_equipes` | Équipes | Nombre entier | Non |  |  |
| `payant` | Payant | Liste de valeurs | Non | valeurs : `oui`, `non` |  |
| `revenu_declare` | Revenu déclaré (€) | Montant en euros | Non | ≥ 0, vide = inconnu. Uniquement si les paiements ne sont pas détaillés. |  |
| `partenaires` | Partenaires / sponsors | Texte | Non |  |  |
| `materiel` | Matériel | Texte | Non |  |  |
| `prix` | Prix / lots | Texte | Non |  |  |
| `catering` | Catering | Texte | Non |  |  |
| `incidents` | Incidents | Texte long | Non |  |  |
| `statut` | Statut | Liste de valeurs | Oui | valeurs : `planifie`, `realise`, `annule` |  |
| `commentaire` | Commentaire | Texte long | Non |  |  |
| `archive` | Archivé | Booléen (TRUE/FALSE) | Non | TRUE = ligne archivée (jamais supprimée). |  |
| `import_id` | Import d'origine | Référence (ID) | Non |  | → Imports.id |
| `cree_le` | Créé le | Texte | Non |  |  |
| `cree_par` | Créé par | Texte | Non |  |  |
| `modifie_le` | Modifié le | Texte | Non |  |  |
| `modifie_par` | Modifié par | Texte | Non |  |  |

## Satisfaction

Avis des membres. NPS = % promoteurs (9-10) − % détracteurs (0-6), toujours affiché avec la taille de l'échantillon.

Clé de détection des doublons : `date + membre_id + type_activite + seance_id + evenement_id`

| Colonne | Libellé | Type | Obligatoire | Règle de validation | Relation |
|---|---|---|---|---|---|
| `id` | ID | Identifiant (texte unique) | Oui |  |  |
| `date` | Date | Date (AAAA-MM-JJ) | Oui |  |  |
| `membre_id` | Membre (facultatif) | Référence (ID) | Non |  | → Membres.id |
| `type_activite` | Activité concernée | Liste de valeurs | Non | valeurs configurables (Paramètres → `type_activite`) |  |
| `seance_id` | Séance | Référence (ID) | Non |  | → Séances.id |
| `evenement_id` | Événement | Référence (ID) | Non |  | → Événements.id |
| `note_globale` | Note globale /10 | Note de 0 à 10 | Non | 0 à 10 |  |
| `note_terrains` | Qualité des terrains /10 | Note de 0 à 10 | Non | 0 à 10 |  |
| `note_organisation` | Qualité de l'organisation /10 | Note de 0 à 10 | Non | 0 à 10 |  |
| `frequence_avant` | Fréquence de jeu avant l'indoor | Liste de valeurs | Non | valeurs : `jamais`, `moins_1_mois`, `1_3_mois`, `1_semaine`, `2_plus_semaine` |  |
| `frequence_apres` | Fréquence de jeu depuis l'indoor | Liste de valeurs | Non | valeurs : `jamais`, `moins_1_mois`, `1_3_mois`, `1_semaine`, `2_plus_semaine` |  |
| `activite_preferee` | Activité préférée | Liste de valeurs | Non | valeurs configurables (Paramètres → `type_activite`) |  |
| `amelioration` | Amélioration prioritaire | Texte | Non |  |  |
| `recommandation` | Probabilité de recommandation (0-10) | Note de 0 à 10 | Oui | 0 à 10 |  |
| `commentaire` | Commentaire libre | Texte long | Non |  |  |
| `source` | Source | Liste de valeurs | Non | valeurs : `formulaire`, `papier`, `import` |  |
| `archive` | Archivé | Booléen (TRUE/FALSE) | Non | TRUE = ligne archivée (jamais supprimée). |  |
| `import_id` | Import d'origine | Référence (ID) | Non |  | → Imports.id |
| `cree_le` | Créé le | Texte | Non |  |  |
| `cree_par` | Créé par | Texte | Non |  |  |
| `modifie_le` | Modifié le | Texte | Non |  |  |
| `modifie_par` | Modifié par | Texte | Non |  |  |

## Occupation_Terrains

Feuille ajoutée au modèle demandé : réservations libres (exports ABS / application), heures bloquées, maintenance et indisponibilités. Les activités encadrées viennent de « Séances ».

Clé de détection des doublons : `terrain_id + date + heure_debut + type + reference_externe`

| Colonne | Libellé | Type | Obligatoire | Règle de validation | Relation |
|---|---|---|---|---|---|
| `id` | ID | Identifiant (texte unique) | Oui |  |  |
| `terrain_id` | Terrain | Référence (ID) | Oui |  | → Terrains.id |
| `date` | Date | Date (AAAA-MM-JJ) | Oui |  |  |
| `heure_debut` | Début | Heure (HH:MM) | Oui |  |  |
| `heure_fin` | Fin | Heure (HH:MM) | Oui |  |  |
| `type` | Type | Liste de valeurs | Oui | valeurs : `reservation_libre`, `blocage`, `maintenance`, `indisponibilite` |  |
| `statut` | Statut | Liste de valeurs | Oui | valeurs : `reserve`, `realise`, `annule`, `no_show` |  |
| `nb_joueurs` | Joueurs | Nombre entier | Non |  |  |
| `reference_externe` | Référence ABS / application | Texte | Non |  |  |
| `commentaire` | Commentaire | Texte | Non |  |  |
| `archive` | Archivé | Booléen (TRUE/FALSE) | Non | TRUE = ligne archivée (jamais supprimée). |  |
| `import_id` | Import d'origine | Référence (ID) | Non |  | → Imports.id |
| `cree_le` | Créé le | Texte | Non |  |  |
| `cree_par` | Créé par | Texte | Non |  |  |
| `modifie_le` | Modifié le | Texte | Non |  |  |
| `modifie_par` | Modifié par | Texte | Non |  |  |

## Indicateurs_Club

Feuille ajoutée : chiffres du club transmis par Power BI (membres, joueurs de padel, réservations, âge moyen…), une ligne par indicateur et par période. Sert au taux de pénétration et aux rapports pour Laurent. Rien n'est estimé : une période sans ligne est « donnée indisponible ».

Clé de détection des doublons : `indicateur + segment + date_debut + date_fin`

| Colonne | Libellé | Type | Obligatoire | Règle de validation | Relation |
|---|---|---|---|---|---|
| `id` | ID | Identifiant (texte unique) | Oui |  |  |
| `date_debut` | Début de la période | Date (AAAA-MM-JJ) | Oui |  |  |
| `date_fin` | Fin de la période | Date (AAAA-MM-JJ) | Oui |  |  |
| `indicateur` | Indicateur | Liste de valeurs | Oui | valeurs configurables (Paramètres → `indicateur_club`) |  |
| `segment` | Segment | Liste de valeurs | Oui | valeurs : `total`, `adulte`, `junior` |  |
| `valeur` | Valeur | Nombre décimal | Oui |  |  |
| `source` | Source | Texte | Non | Ex. Power BI – rapport Membres, export du 05/12/2026. |  |
| `commentaire` | Commentaire | Texte | Non |  |  |
| `archive` | Archivé | Booléen (TRUE/FALSE) | Non | TRUE = ligne archivée (jamais supprimée). |  |
| `import_id` | Import d'origine | Référence (ID) | Non |  | → Imports.id |
| `cree_le` | Créé le | Texte | Non |  |  |
| `cree_par` | Créé par | Texte | Non |  |  |
| `modifie_le` | Modifié le | Texte | Non |  |  |
| `modifie_par` | Modifié par | Texte | Non |  |  |

## Imports

Traçabilité de chaque import (source, date, auteur, résultat). Annuler un import archive toutes ses lignes.

Clé de détection des doublons : `id`

| Colonne | Libellé | Type | Obligatoire | Règle de validation | Relation |
|---|---|---|---|---|---|
| `id` | ID | Identifiant (texte unique) | Oui |  |  |
| `date` | Date et heure | Texte | Oui |  |  |
| `utilisateur` | Utilisateur | Texte | Oui |  |  |
| `source` | Source | Texte | Oui | ABS, application, planning académie, présences, factures coach, inscriptions événement… |  |
| `feuille_cible` | Feuille cible | Texte | Oui |  |  |
| `fichier` | Nom du fichier | Texte | Non |  |  |
| `nb_lignes` | Lignes lues | Nombre entier | Non |  |  |
| `nb_importees` | Lignes importées | Nombre entier | Non |  |  |
| `nb_doublons` | Doublons ignorés | Nombre entier | Non |  |  |
| `nb_erreurs` | Lignes en erreur | Nombre entier | Non |  |  |
| `statut` | Statut | Liste de valeurs | Oui | valeurs : `importe`, `annule` |  |
| `rapport` | Rapport (JSON) | Texte long | Non |  |  |
| `annule_le` | Annulé le | Texte | Non |  |  |
| `annule_par` | Annulé par | Texte | Non |  |  |
| `archive` | Archivé | Booléen (TRUE/FALSE) | Non | TRUE = ligne archivée (jamais supprimée). |  |
| `import_id` | Import d'origine | Référence (ID) | Non |  | → Imports.id |
| `cree_le` | Créé le | Texte | Non |  |  |
| `cree_par` | Créé par | Texte | Non |  |  |
| `modifie_le` | Modifié le | Texte | Non |  |  |
| `modifie_par` | Modifié par | Texte | Non |  |  |

## Journal_Audit

Historique des accès et modifications sensibles. Feuille en ajout seul : ne jamais la modifier.

Clé de détection des doublons : `id`

| Colonne | Libellé | Type | Obligatoire | Règle de validation | Relation |
|---|---|---|---|---|---|
| `id` | ID | Identifiant (texte unique) | Oui |  |  |
| `date` | Date et heure | Texte | Oui |  |  |
| `utilisateur` | Utilisateur | Texte | Oui |  |  |
| `role` | Rôle | Texte | Non |  |  |
| `action` | Action | Texte | Oui |  |  |
| `feuille` | Feuille | Texte | Non |  |  |
| `ligne_id` | Ligne | Texte | Non |  |  |
| `avant` | Avant (JSON) | Texte long | Non |  |  |
| `apres` | Après (JSON) | Texte long | Non |  |  |
| `motif` | Motif | Texte | Non |  |  |

## Valeurs initiales de « Paramètres »

Chargées par `setupSpreadsheet()` depuis le cadrage du 01/11/2026. Les valeurs vides sont à fournir.

| Catégorie | Clé | Référence | Valeur | Source / remarque |
|---|---|---|---|---|
| general | `nom_club` |  | David Lloyd Brussels Uccle | Cadrage 01/11/2026 |
| general | `date_ouverture_indoor` |  | 2026-08-31 | Confirmé par Anthony (01/11/2026) – Ouverture des 3 terrains indoor. Début de l'historique. |
| general | `date_debut_historique` |  | *(vide)* | Cadrage 01/11/2026 – Vide = date d'ouverture indoor. |
| general | `duree_creneau_libre_min` |  | 90 | Cadrage 01/11/2026 – Réservation libre : 1 h 30, jusqu'à 4 joueurs. |
| general | `delai_conversion_taster_jours` |  | 14 | Cadrage 01/11/2026 – Conversion Taster : autre activité dans les N jours. |
| general | `base_reconnaissance` |  | attendu | Cadrage 01/11/2026 – « attendu » : revenu reconnu = montant attendu ÷ séances prévues × séances consommées. « encaisse » : sur le montant encaissé. |
| general | `inclure_cours_prives` |  | non | Cadrage 01/11/2026 – Cours privés d'Anthony exclus du P&L (paiement direct). |
| general | `inclure_cout_terrains` |  | non | Cadrage 01/11/2026 – Coût théorique des terrains exclu sauf activation explicite. |
| general | `cout_horaire_terrain` |  | *(vide)* | Non fourni – Utilisé seulement si inclure_cout_terrains = oui. |
| general | `montants_tva` |  | TVAC | Confirmé par Anthony (01/11/2026) – Tous les montants sont saisis TVAC ; aucun retraitement de TVA. |
| general | `nb_seances_cycle_conseille` |  | 15 ou 20 | Confirmé par Anthony (01/11/2026) – Cycles flexibles : le nombre de séances se fixe par cycle (idéalement 15 ou 20). |
| general | `seuil_echantillon_nps` |  | 30 | Proposition – En dessous, le NPS est signalé comme peu fiable. |
| taux_coach | `taux_horaire` | USR-GILLES | 35 | Confirmé par Anthony (01/11/2026) : seul coach, 35 €/h – Taux de Gilles depuis l'ouverture. Un nouveau taux s'ajoute avec sa date d'effet. |
| niveau | `1` |  | Rookie | Cadrage 01/11/2026 |
| niveau | `2` |  | Control | Cadrage 01/11/2026 |
| niveau | `3` |  | Strategy | Cadrage 01/11/2026 |
| niveau | `4` |  | Performance | Cadrage 01/11/2026 |
| niveau | `5` |  | Challenge | Cadrage 01/11/2026 |
| niveau | `6` |  | Competition P300 | Cadrage 01/11/2026 |
| niveau | `7` |  | Competition P400/P500 | Cadrage 01/11/2026 |
| niveau | `8` |  | Elite | Cadrage 01/11/2026 |
| type_activite | `padel_taster` |  | Padel Taster | Cadrage 01/11/2026 |
| type_activite | `new_to_padel` |  | New to Padel Social Session | Cadrage 01/11/2026 |
| type_activite | `afterwork` |  | Afterwork | Cadrage 01/11/2026 |
| type_activite | `collectif_adulte` |  | Académie / collectif adulte | Cadrage 01/11/2026 |
| type_activite | `collectif_junior` |  | Académie / collectif junior | Cadrage 01/11/2026 |
| type_activite | `padel_squad` |  | Padel Squad (8-11 ans) | Cadrage 01/11/2026 |
| type_activite | `tournoi` |  | Tournoi | Cadrage 01/11/2026 |
| type_activite | `padel_physical` |  | Padel + Physical Training | Cadrage 01/11/2026 – Ponctuel ; anciennes références à ne pas généraliser. |
| type_activite | `clinic` |  | Clinic | Cadrage 01/11/2026 – Pas encore actives : ne rien annoncer avant publication. (archivé) |
| type_activite | `cours_prive` |  | Cours privé (hors P&L) | Cadrage 01/11/2026 |
| indicateur_club | `membres_club_total` |  | Membres du club (total) | Liste proposée – à aligner sur Power BI |
| indicateur_club | `membres_padel_actifs` |  | Membres ayant joué au padel sur la période | Liste proposée – à aligner sur Power BI |
| indicateur_club | `membres_reservants` |  | Membres ayant réservé un terrain sur la période | Liste proposée – à aligner sur Power BI |
| indicateur_club | `reservations_terrains` |  | Réservations de terrains | Liste proposée – à aligner sur Power BI |
| indicateur_club | `heures_reservees` |  | Heures de terrain réservées | Liste proposée – à aligner sur Power BI |
| indicateur_club | `nouveaux_membres_club` |  | Nouveaux membres du club | Liste proposée – à aligner sur Power BI |
| indicateur_club | `nouveaux_membres_padel` |  | Nouveaux membres ayant joué au padel | Liste proposée – à aligner sur Power BI |
| indicateur_club | `nouveaux_joueurs_padel` |  | Membres existants ayant commencé le padel | Liste proposée – à aligner sur Power BI |
| indicateur_club | `age_moyen_padel` |  | Âge moyen des joueurs de padel | Liste proposée – à aligner sur Power BI |
| indicateur_club | `age_moyen_club` |  | Âge moyen des membres du club | Liste proposée – à aligner sur Power BI |
| indicateur_club | `participants_evenements` |  | Participants aux événements padel | Liste proposée – à aligner sur Power BI |
| indicateur_club | `taux_penetration_powerbi` |  | Taux de pénétration (calculé par Power BI) | Liste proposée – à aligner sur Power BI |
| objectif | `seances_semaine` | padel_taster | 4 | Confirmé par Anthony (01/11/2026) |
| objectif | `seances_semaine` | afterwork | 2 | Confirmé par Anthony (01/11/2026) |
| objectif | `seances_semaine` | new_to_padel | 2 | Confirmé par Anthony (01/11/2026) |
| objectif | `taux_penetration` |  | *(vide)* | À FIXER – Cible à atteindre, en %. |
| categorie_depense | `materiel` |  | Matériel | Cadrage 01/11/2026 |
| categorie_depense | `prix_recompenses` |  | Prix et récompenses | Cadrage 01/11/2026 |
| categorie_depense | `catering` |  | Catering | Cadrage 01/11/2026 |
| categorie_depense | `evenement` |  | Coûts d'événement | Cadrage 01/11/2026 |
| categorie_depense | `autre` |  | Autre | Cadrage 01/11/2026 |
| categorie_revenu | `autre` |  | Autres revenus | Cadrage 01/11/2026 |
| categorie_revenu | `cours_prive` |  | Cours privés (exclus par défaut) | Cadrage 01/11/2026 |
