# Formules financières et KPI

Toutes les formules sont implémentées dans `src/core/calc.js` et vérifiées par `tests/calc.test.js`.

## Règle fondamentale

Une donnée inconnue n'est **jamais** remplacée par zéro.

- Un ratio dont le numérateur ou le dénominateur est inconnu (ou dont le dénominateur vaut 0) affiche **« donnée indisponible »**.
- Une somme dont certaines lignes sont inconnues affiche la somme des lignes connues avec le badge **« incomplet »** ; le survol (ou l'écran Détail) liste les données manquantes.
- Une somme dont **toutes** les lignes sont inconnues est « donnée indisponible ».
- Une ligne archivée (`archive = TRUE`) est exclue de tous les calculs.

## 1. Encaissements (trésorerie)

```
Encaissements(période) = Σ montant des Paiements de statut « encaissé » dont date_paiement ∈ période
                        − Σ montant des Paiements de statut « remboursé » dont date_paiement ∈ période
```

Les paiements « à vérifier » et « annulé » ne comptent pas. Les cours privés (catégorie `cours_prive`) sont exclus sauf si `inclure_cours_prives = oui`.

## 2. Revenus reconnus (performance réellement délivrée)

### Académies (cycles)

Pour chaque inscription active à un cycle :

```
séances prévues     = nb_seances_prevues de l'inscription, sinon nb_seances du cycle, sinon nb_seances de l'offre
montant attendu     = montant_attendu de l'inscription, sinon tarif_seance × séances prévues,
                      sinon prix_cycle × séances prévues ÷ nb_seances de l'offre (prorata)
valeur unitaire     = montant attendu ÷ séances prévues      (paramètre base_reconnaissance = attendu, défaut)
                    = montant encaissé ÷ séances prévues      (base_reconnaissance = encaisse)
séances consommées  = séances « réalisées » du cycle, datées à partir de la première séance due
                      de l'inscription, dans la limite des séances prévues
revenu reconnu      = valeur unitaire × séances consommées dont la date ∈ période
```

- **Absence du membre** (absent, no-show) : la séance est consommée, le revenu est reconnu.
- **Annulation club / coach / météo** : la séance n'est pas « réalisée », aucun revenu reconnu ; elle reste due (report).
- **Entrée en cours de cycle** : `date_premiere_seance` et `nb_seances_prevues` de l'inscription ; seules les séances restantes sont dues.
- **Tarif manquant** : montant attendu inconnu → revenu « indisponible », anomalie **bloquante** dans Qualité des données. Aucun tarif n'est supposé.

### Séances ponctuelles et événements payants

Le revenu d'un paiement rattaché à une séance ou à un événement est reconnu **à la date de la séance / de l'événement**, et seulement s'il est réalisé. Pour un événement sans paiements détaillés, le champ `revenu_declare` est utilisé ; un événement payant sans paiement ni revenu déclaré est signalé « revenu inconnu ».

### Autres revenus

Paiement non rattaché mais avec une `categorie_revenu` : reconnu à la date de paiement. Paiement sans rattachement ni catégorie : compté en encaissement, **signalé** comme « paiement sans inscription », non reconnu.

## 3. Revenus restant à délivrer (payés d'avance)

À la date de fin de période :

```
Pour chaque inscription : max(0, encaissé jusqu'à la date − revenu reconnu cumulé jusqu'à la date)
+ paiements encaissés pour des séances ou événements pas encore réalisés à cette date
```

Valeurs complémentaires par inscription : **valeur des séances consommées** (= revenu reconnu cumulé), **valeur des séances restantes** (= valeur unitaire × séances non encore consommées), **solde dû** (= montant attendu − encaissé).

## 4. Coûts des coachs

```
durée (h)        = heure_fin − heure_debut
taux applicable  = ligne Paramètres (catégorie taux_coach, référence = ID du coach)
                   dont la date d'effet est la plus récente ≤ date de l'intervention (et date de fin non dépassée)
coût             = durée × taux applicable
```

- Le P&L ne retient que les heures **Validées** et **Payées**. Les heures Soumises / À corriger sont affichées à part (« en attente », provisoires). Les brouillons sont ignorés.
- Coach sans taux à la date → coût inconnu, anomalie bloquante. Taux sans date d'effet → appliqué mais signalé « à vérifier ».
- Un changement de taux ne modifie jamais le passé : on ajoute une nouvelle ligne avec sa date d'effet.
- **Coût réel par participant** = coût validé ÷ présents déclarés sur les interventions validées.

## 5. Coûts directs

```
Coûts directs = Σ Dépenses (statut ≠ annulée) dont la date ∈ période
```
Par catégorie (matériel, prix et récompenses, catering, événement, autre… configurables). Une dépense sans justificatif est comptée mais signalée.

## 6. Marge brute

```
Marge brute = Revenus reconnus − Coûts coachs validés − Coûts directs [− Coût théorique des terrains]
Taux de marge = Marge brute ÷ Revenus reconnus
Marge par participant = Marge brute ÷ participants uniques (listes nominatives)
Marge par participation (par activité) = Marge de l'activité ÷ présences de l'activité
Marge par académie = Revenu reconnu du cycle − coûts coachs du cycle − dépenses du cycle ; ÷ inscrits actifs
```
Le **coût théorique des terrains** n'est inclus que si `inclure_cout_terrains = oui` **et** `cout_horaire_terrain` est renseigné ; il vaut alors heures d'activités encadrées utilisées × coût horaire.

## 7. Budget / réel

Paramètres, catégorie `budget`, référence `AAAA-MM`, clé parmi `revenus_reconnus`, `encaissements`, `couts_coachs`, `couts_directs`, `marge_brute`. Les budgets des mois touchés par la période sont additionnés ; si la période ne couvre pas des mois entiers, l'écart est signalé comme non aligné.

## 8. KPI opérationnels

| KPI | Formule | Règle |
|---|---|---|
| Heures disponibles | Σ plages d'ouverture (Terrains) − maintenance − indisponibilités, à partir de la mise en service | Horaire vide = inconnu → taux du terrain (et global) indisponible |
| Heures réservées | Union des séances non annulées, événements, réservations libres non annulées et heures bloquées, dans les heures disponibles | Les chevauchements ne sont comptés qu'une fois |
| Heures utilisées | Union des séances réalisées, événements réalisés, réservations libres réalisées (ou réservées et passées, hors no-show) | idem |
| Taux d'occupation | Heures utilisées ÷ heures disponibles | Jamais calculé sans heures disponibles |
| Pointe / creuse | Même calcul limité aux plages `heures_pointe` / au reste | Indisponible si aucune plage de pointe n'est paramétrée |
| Remplissage | Inscrits ÷ capacité | Séances sans capacité exclues et signalées |
| Présence | Présents ÷ inscrits | Inscrits = présents + absents + no-shows |
| Annulation | Annulations ÷ (inscrits + annulations) | |
| No-show | No-shows ÷ inscrits | |
| Participants uniques | Nombre d'ID membres distincts présents | Partiel si des séances n'ont que des compteurs déclarés |
| Participations | Σ présents | |
| Taux de retour | Participants de la période déjà vus avant la période ÷ participants de la période | Période de référence = tout l'historique antérieur |
| Récurrence | Participants avec ≥ 2 présences dans la période ÷ participants | |
| Conversion Taster | Membres dont le premier Taster tombe dans la période et qui participent à une autre activité dans les N jours (paramètre, 14) ÷ ces membres | |
| Assiduité cycle | Présences ÷ séances dues réalisées | |
| NPS | % de notes 9-10 − % de notes 0-6 (sur la recommandation) | Toujours affiché avec **n** ; « échantillon faible » sous le seuil paramétré (30) |

Les compteurs d'une séance viennent de la liste nominative (feuille Présences) si elle existe, sinon des compteurs déclarés de la séance (encodage rapide), sinon — pour un cycle — du nombre d'inscrits actifs (présences alors inconnues).

## 9. Traçabilité

Chaque montant du P&L est construit à partir de lignes portant `source` (feuille) et `id` (ligne). L'écran **P&L → Détail** liste ces lignes et les exporte en CSV.

## 10. Communauté et pénétration (`src/core/community.js`)

### Programme gratuit

Activités suivies : celles qui ont un objectif hebdomadaire (Paramètres → Objectifs) et toutes les activités encadrées gratuites. Objectifs confirmés le 01/11/2026 : **4 Padel Tasters d'1 h**, **2 Afterworks d'1 h 30** et **2 New to Padel Social Sessions d'1 h** par semaine.

```
semaines écoulées      = (jours entre le début de la période et min(fin de période, aujourd'hui) + 1) ÷ 7
objectif de la période = objectif hebdomadaire × semaines écoulées
atteinte               = séances réalisées ÷ objectif de la période
atteinte globale       = séances réalisées des activités avec objectif ÷ Σ objectifs (les activités sans objectif sont listées à part)
heures de terrain      = Σ durée de chaque séance réalisée × nombre de terrains utilisés
part de l'occupation   = heures de terrain du programme ÷ heures disponibles des terrains
nouveaux joueurs       = membres dont la toute première présence (toutes activités encadrées) est une activité gratuite de la période
```
Remplissage, présence, no-show, participations et participants uniques suivent les formules de la section 8.

### Indicateurs Power BI (feuille Indicateurs_Club)

Une ligne par indicateur, segment et période. Pour une période donnée, seules les lignes **entièrement comprises** dans la période sont retenues :

- indicateur « stock » (`agregation=dernier` : membres du club, membres actifs padel, membres qui réservent, âge moyen) → valeur de la période la plus récente ;
- indicateur « flux » (`agregation=somme` : réservations, heures réservées, nouveaux membres, participants aux événements) → somme des périodes, avec signalement si la période n'est que partiellement couverte.

### Ratios

| Indicateur | Formule |
|---|---|
| **Taux de pénétration padel** | membres ayant joué au padel sur la période ÷ membres du club |
| Part des membres qui réservent | membres ayant réservé un terrain ÷ membres du club |
| Pénétration des nouveaux membres | nouveaux membres ayant joué au padel ÷ nouveaux membres du club |
| Réservations par membre | réservations de terrains ÷ membres ayant réservé |
| Participation aux événements | participants aux événements ÷ membres actifs padel |
| Nouveaux joueurs venus du programme gratuit | nouveaux joueurs recrutés par le programme (application) ÷ (nouveaux membres padel + membres existants ayant commencé, Power BI) |

Sans chiffre Power BI pour la période, chaque ratio est « donnée indisponible ». Si Power BI fournit déjà son propre taux (`taux_penetration_powerbi`), il est affiché à côté du taux recalculé pour contrôle.

> **À confirmer avec Power BI** : la définition exacte de « membre actif padel » (a réservé ? a joué au moins une fois ? sur quelle période ?). La liste des indicateurs est modifiable dans Paramètres → Indicateurs Power BI pour s'aligner sur les noms du rapport Power BI.
