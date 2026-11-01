# Hypothèses, données manquantes et limites

## 1. Informations confirmées par Anthony (01/11/2026)

| Sujet | Réponse | Intégration |
|---|---|---|
| Ouverture des terrains indoor | **31 août 2026** | `date_ouverture_indoor` ; mise en service des terrains indoor ; début de l'historique |
| Coachs | **Gilles est le seul coach, 35 €/h** | Utilisateur `USR-GILLES` (e-mail à saisir) ; taux 35 €/h, date d'effet 31/08/2026 |
| Tarif des collectifs | **25 € par personne pour 1 h, 35 € par personne pour 1 h 30, enfants et adultes, payable à l'avance** (même tarif si groupe incomplet) | Quatre offres : adulte et junior, 1 h à 25 €, 1 h 30 à 35 € |
| Nombre de séances | **Cycles flexibles, idéalement 15 ou 20** | Fixé sur chaque cycle (champ « Nombre de séances du cycle ») ; sans lui, le revenu du cycle est bloqué et signalé |
| Horaires des terrains | **8 h – 21 h** ; terrains gratuits pour les membres | Six terrains 08:00-21:00 tous les jours ; aucun coût de terrain ; pas d'heures de pointe définies (indicateur pointe/creuse affiché « indisponible », sans gravité) |
| Programme gratuit | **4 Padel Tasters d'1 h, 2 Afterworks d'1 h 30, 2 New to Padel d'1 h par semaine** ; inscriptions via l'application des membres | Objectifs hebdomadaires (Paramètres → Objectifs) ; suivi dans « Communauté & pénétration » |
| Mission d'Anthony | Augmenter les réservations et le **taux de pénétration** (nouveaux membres et membres qui ne jouaient pas) | Écran « Communauté & pénétration », tableau de bord et rapports pour Laurent |
| Google Workspace | **Non** | Connexion : compte Google pour Anthony, e-mail + code personnel pour les autres (défini dans l'application) |
| TVA | **Ne pas en tenir compte, tout est TVAC** | `montants_tva = TVAC` ; aucun retraitement |

### Exports Power BI reçus (rapport « Court Occupancy »)

Les noms des indicateurs de l'application sont alignés sur ce rapport (Paramètres → Indicateurs Power BI). Aucun chiffre réel n'est stocké dans le code : ils s'importent dans le classeur ou se saisissent dans « Communauté & pénétration ».

Points à éclaircir, relevés dans ces exports :

| # | Constat | Pourquoi c'est important |
|---|---|---|
| B1 | Le filtre « Club = Brussels » correspond-il bien au site d'Uccle ? | Éviter d'importer les chiffres d'un autre site |
| B2 | La page « Racquets – Court Usage » était filtrée Sport = Tout (tous les sports de raquette) | Ses chiffres n'ont pas été repris ; réexporter avec Sport = Padel |
| B3 | Taux de no-show très élevé dans l'export | Probablement des joueurs non pointés à l'arrivée plutôt que de vrais absents |
| B4 | La courbe horaire montre de l'occupation avant 8 h et après 21 h | Le dénominateur de l'occupation dépend des horaires réels |
| B5 | Pointe Power BI : 17:00 – 20:59 en semaine (week-end non visible) | Reprise comme heures de pointe ; compléter le week-end |
| B6 | Type « tennis stars » sur des réservations padel | Probable classement par défaut à corriger dans ABS |
| B7 | Les courbes (par heure, par mois) sont des images | Exporter les données des visuels (… → Exporter les données) en CSV ou Excel |
| B8 | Nombre total de membres du club absent | Indispensable au taux de pénétration |

## 2. Données encore manquantes

| Priorité | Donnée | Où la saisir | Effet tant qu'elle manque |
|---|---|---|---|
| 1 | Exports ABS / application depuis le 31/08/2026 (réservations, annulations) – *annoncés* | Imports → « Export ABS / application » | Occupation limitée aux activités encadrées |
| 1 | Plannings et présences des académies – *annoncés* | Imports ou Académies / Séances / Présences | Revenu reconnu, assiduité, participants uniques incomplets |
| 1 | Heures et factures de Gilles depuis l'ouverture | Imports ou Heures coachs | Coûts coachs et marge incomplets |
| 1 | **Chiffres Power BI** : un premier mois reçu en partie ; manquent le nombre total de membres du club, les réservations et heures padel uniquement, les nouveaux membres, l'âge moyen et l'historique mensuel – *annoncés* | Communauté & pénétration → « Saisir les chiffres Power BI d'un mois », ou Imports → Power BI | Taux de pénétration et indicateurs de réservation indisponibles |
| 1 | Définition Power BI de « membre actif padel » et, si elle existe, de leur taux de pénétration | Paramètres → Indicateurs Power BI | Le taux recalculé pourrait différer de celui de Power BI |
| 2 | Objectif chiffré de taux de pénétration | Paramètres → Objectifs → `taux_penetration` | Pas de comparaison à l'objectif |
| 2 | E-mails des utilisateurs (Gilles, réception, Laurent) | Paramètres → Utilisateurs | Accès à l'application |
| 2 | Inscriptions et dépenses des événements | Événements, Paiements, Dépenses | Remplissage, coût et marge des événements |
| 3 | Calendrier des vacances scolaires FWB (si les cycles doivent les sauter) | Paramètres → Vacances | La génération des séances ne saute pas les congés |
| 3 | Avis membres et enquêtes | Satisfaction / Imports | Satisfaction et NPS indisponibles |
| 3 | Budget mensuel (facultatif) | Paramètres → Budget | Pas de comparaison budget/réel |
| 3 | Format exact des exports ABS / application | — | L'association des colonnes se fait à la main au premier import |

## 3. Hypothèses retenues (toutes modifiables)

| # | Hypothèse | Où la changer |
|---|---|---|
| H1 | Revenu reconnu sur la base du **montant attendu** (prix contractuel) ; l'écart avec l'encaissé apparaît comme solde dû. | Paramètres → `base_reconnaissance` = `encaisse` |
| H2 | Une réservation libre non annulée et non marquée no-show est considérée **utilisée** une fois sa date passée (les exports ABS ne confirment pas toujours la présence). | — (règle documentée, `calc.js`) |
| H3 | Les heures bloquées comptent comme réservées, pas comme utilisées. | — |
| H4 | Le P&L n'inclut que les heures coachs **validées ou payées** ; les heures soumises sont montrées à part. | — |
| H5 | Les montants sont TVAC, sans retraitement de TVA (confirmé). | `montants_tva` |
| H6 | Le type « famille » d'une activité (académie, découverte, tournoi, événement, privé) détermine sa ligne de revenu dans le P&L. | Paramètres → Types d'activité → attributs |
| H7 | « Absent » = absence prévenue ; « No-show » = absence sans prévenir ; « Désinscrit » = annulation avant la séance. Les trois premiers comptent dans les inscrits. | — |
| H8 | Taux de retour : la période de référence est tout l'historique antérieur au début de la période. | — |
| H9 | Une 17e feuille `Occupation_Terrains` est ajoutée au modèle demandé (réservations libres, blocages, maintenance). | — |
| H10 | Seuil de fiabilité du NPS : 30 réponses (proposition). | Paramètres → `seuil_echantillon_nps` |

## 4. Limites connues

- **Connexion Google Sheets non testée en réel** : la logique serveur est testée contre une simulation ; le premier déploiement doit suivre l'étape « Vérifier » du guide de connexion.
- Les participants uniques, la récurrence, le taux de retour et la conversion Taster exigent des **listes nominatives** ; les séances encodées en compteurs seuls les rendent partiels (signalé).
- Le PDF s'obtient par l'impression du navigateur (pas de génération côté serveur).
- La lecture des fichiers Excel s'appuie sur la bibliothèque SheetJS chargée depuis cdnjs ; sans Internet, utiliser le CSV.
- Les brouillons de texte des rapports (priorités, décisions) sont conservés dans le navigateur de la personne qui rédige, pas dans le classeur : exportez ou imprimez le rapport une fois rédigé.
- Pas de notifications automatiques (e-mail) aux coachs ou à Anthony : les files « À valider » et « Qualité » servent de boîte de réception.
- Volumétrie : conçue pour un club (quelques dizaines de milliers de lignes). Au-delà, archiver les années closes.
- L'univers visuel reprend des couleurs sobres (marine, bordeaux) et un monogramme « DL » ; aucun logo ni ressource protégée David Lloyd n'est utilisé. Remplaçable si le club fournit sa charte.
