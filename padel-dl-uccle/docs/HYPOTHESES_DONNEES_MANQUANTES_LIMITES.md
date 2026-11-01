# Hypothèses, données manquantes et limites

## 1. Données manquantes

L'application fonctionne sans elles, mais les chiffres concernés restent « donnée indisponible » ou « incomplet » tant qu'elles ne sont pas saisies ou importées. L'écran **Qualité des données** les liste en permanence.

| Priorité | Donnée | Où la saisir | Effet tant qu'elle manque |
|---|---|---|---|
| 1 | **Date exacte d'ouverture des terrains indoor** | Paramètres → `date_ouverture_indoor` ; Terrains → mise en service | Pas de point de départ de l'historique ; anomalie bloquante |
| 1 | Exports ABS / application depuis l'ouverture (réservations, annulations) | Imports → « Export ABS / application » | Occupation limitée aux activités encadrées |
| 1 | Plannings et présences des académies | Imports ou Séances / Présences | Revenu reconnu, assiduité, participants uniques incomplets |
| 1 | Heures et factures des coachs | Imports ou Heures coachs | Coûts coachs et marge incomplets |
| 1 | **Nombre de séances par cycle** et tarifs confirmés des formules (notamment **juniors**) | Académies → Offres | Revenu des cycles bloqué |
| 1 | Taux horaires des autres coachs ; date d'effet du taux de Gilles | Paramètres → Taux des coachs | Coût des heures bloqué / signalé |
| 2 | Inscriptions et dépenses des événements | Événements, Paiements, Dépenses | Remplissage, coût et marge des événements |
| 2 | **Horaires d'ouverture des six terrains** | Paramètres → Terrains | Taux d'occupation non calculé (jamais estimé) |
| 2 | Définition heures pleines / creuses | Paramètres → Heures de pointe | Occupation pointe/creuse indisponible |
| 2 | Calendrier des vacances scolaires FWB | Paramètres → Vacances | La génération des séances de cycle ne saute pas les congés |
| 2 | Convention **HTVA / TVAC** des montants | Paramètres → `montants_tva` | P&L non utilisable en comptabilité sans précision |
| 3 | Avis membres et enquêtes | Satisfaction / Imports | Satisfaction et NPS indisponibles |
| 3 | Liste des utilisateurs, e-mails et rôles | Paramètres → Utilisateurs | Accès à l'application |
| 3 | Budget mensuel | Paramètres → Budget | Pas de comparaison budget/réel |
| 3 | Format exact des exports ABS / application | — | L'assistant d'import associe les colonnes à la main la première fois |
| 3 | Numérotation réelle des terrains (1-3 indoor ?) | Paramètres → Terrains | Noms provisoires « Terrain n (à nommer) » |
| 3 | Le club dispose-t-il de Google Workspace ? | Choix du mode `google` / `code` | Voir le guide de connexion |

## 2. Hypothèses retenues (toutes modifiables)

| # | Hypothèse | Où la changer |
|---|---|---|
| H1 | Revenu reconnu sur la base du **montant attendu** (prix contractuel) ; l'écart avec l'encaissé apparaît comme solde dû. | Paramètres → `base_reconnaissance` = `encaisse` |
| H2 | Une réservation libre non annulée et non marquée no-show est considérée **utilisée** une fois sa date passée (les exports ABS ne confirment pas toujours la présence). | — (règle documentée, `calc.js`) |
| H3 | Les heures bloquées comptent comme réservées, pas comme utilisées. | — |
| H4 | Le P&L n'inclut que les heures coachs **validées ou payées** ; les heures soumises sont montrées à part. | — |
| H5 | Les montants sont saisis tels qu'ils sont encaissés ou facturés, sans retraitement de TVA. | À confirmer (`montants_tva`) |
| H6 | Le type « famille » d'une activité (académie, découverte, tournoi, événement, privé) détermine sa ligne de revenu dans le P&L. | Paramètres → Types d'activité → attributs |
| H7 | « Absent » = absence prévenue ; « No-show » = absence sans prévenir ; « Désinscrit » = annulation avant la séance. Les trois premiers comptent dans les inscrits. | — |
| H8 | Taux de retour : la période de référence est tout l'historique antérieur au début de la période. | — |
| H9 | Une 17e feuille `Occupation_Terrains` est ajoutée au modèle demandé (réservations libres, blocages, maintenance). | — |
| H10 | Seuil de fiabilité du NPS : 30 réponses (proposition). | Paramètres → `seuil_echantillon_nps` |

## 3. Limites connues

- **Connexion Google Sheets non testée en réel** : la logique serveur est testée contre une simulation ; le premier déploiement doit suivre l'étape « Vérifier » du guide de connexion.
- Les participants uniques, la récurrence, le taux de retour et la conversion Taster exigent des **listes nominatives** ; les séances encodées en compteurs seuls les rendent partiels (signalé).
- Le PDF s'obtient par l'impression du navigateur (pas de génération côté serveur).
- La lecture des fichiers Excel s'appuie sur la bibliothèque SheetJS chargée depuis cdnjs ; sans Internet, utiliser le CSV.
- Les brouillons de texte des rapports (priorités, décisions) sont conservés dans le navigateur de la personne qui rédige, pas dans le classeur : exportez ou imprimez le rapport une fois rédigé.
- Pas de notifications automatiques (e-mail) aux coachs ou à Anthony : les files « À valider » et « Qualité » servent de boîte de réception.
- Volumétrie : conçue pour un club (quelques dizaines de milliers de lignes). Au-delà, archiver les années closes.
- L'univers visuel reprend des couleurs sobres (marine, bordeaux) et un monogramme « DL » ; aucun logo ni ressource protégée David Lloyd n'est utilisé. Remplaçable si le club fournit sa charte.
