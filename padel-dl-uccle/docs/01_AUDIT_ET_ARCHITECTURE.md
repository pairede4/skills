# Phase 1 – Audit des sources et architecture

## 1. Sources inspectées

| Source | Contenu exploitable |
|---|---|
| `Cadrage_Dashboard_Gestion_Padel_DL_Uccle.pdf` (14 p., version du 01/11/2026, « règles métier confirmées ») | Règles d'accès, catalogue des activités, parcours membre, grille des 8 niveaux, KPI et formules, P&L, rôles, modèle de données, rapports, contrôles qualité, données encore nécessaires. |
| Consigne de construction (message d'Anthony) | Modules, rôles, structure Google Sheets, livrables, méthode par phases. |
| Dépôts présents dans l'environnement (`ECC`, `impeccable`, `skills`, `superpowers`) | Outils de développement sans rapport avec le club : **aucune donnée réelle** (pas d'export ABS, de planning, de présences, de factures, d'avis, de liste d'utilisateurs). |

Aucun fichier de données réelles n'a été fourni. Tous les chiffres visibles dans l'application de démonstration sont donc **fictifs** et signalés comme tels.

## 2. Informations fiables (reprises comme paramètres initiaux, modifiables)

- 6 terrains : 3 indoor (ouverts en août 2026) + 3 outdoor.
- Padel réservé aux membres Platinum et Diamond ; non-membres uniquement sur invitation.
- Réservation libre : créneaux de 1 h 30, jusqu'à 4 joueurs ; annulation < 24 h = blâme.
- Collectifs : 2 à 4 participants ; **25 €/personne/1 h** ou **35 €/personne/1 h 30**, même tarif si groupe incomplet ; paiement à la réception avant le cycle ; entrée en cours de cycle = séances restantes uniquement.
- Absence du participant = séance perdue (consommée) ; annulation club/coach = séance reportée.
- Cycles suspendus pendant les vacances scolaires FWB.
- Cours privés : payés directement à Anthony, **exclus du P&L**.
- Gratuité : Padel Taster, New to Padel, Afterwork, Padel Squad. Clinics : pas encore actives.
- Grille des 8 niveaux (Rookie → Elite) avec repère Playtomic indicatif ; historique des changements de niveau à conserver.
- Taux de Gilles : 35 €/h.
- Conversion Taster : suivi sur 14 jours.
- KPI et formules (occupation, remplissage, présence, NPS, marge…) et règle fondamentale « ne jamais convertir une donnée inconnue en zéro ».

## 3. Conflits et ambiguïtés relevés

| # | Sujet | Constat | Traitement retenu |
|---|---|---|---|
| C1 | Taux de Gilles | Consigne : « 35 €/h » ; PDF : « à confirmer ». | **Résolu (01/11/2026)** : seul coach, 35 €/h depuis le 31/08/2026. |
| C2 | Tarif des collectifs juniors | Le tarif 25 €/35 € figure dans la ligne « Collectifs » ; le catalogue décrit séparément les collectifs juniors sans tarif. | **Résolu (01/11/2026)** : 25 €/séance/personne pour adultes et enfants, payable à l'avance. Le 35 €/1 h 30 du PDF n'est pas chargé (à reconfirmer). |
| C3 | Nombre de séances d'un cycle | « Cycle variable ». | **Résolu (01/11/2026)** : flexible, idéalement 15 ou 20, fixé sur chaque cycle ; sans lui, revenu bloqué. |
| C4 | Clinics | Listées dans les activités à suivre, mais « pas encore actives ». | Type d'activité créé en statut **archivé** (non proposé) ; réactivable dans Paramètres. |
| C5 | Padel + Physical | « Anciennes références à ne pas généraliser. » | Aucun prix ni format par défaut ; chaque édition se saisit comme un événement. |
| C6 | Tournois | « Un tournoi prévu chaque mois », statut gratuit/payant non précisé. | Aucun tournoi créé ; payant/gratuit à saisir par événement. |
| C7 | Feuilles demandées vs besoins | Les réservations libres, heures bloquées et maintenances n'ont pas de feuille dans la liste demandée. | **Ajout d'une 17e feuille `Occupation_Terrains`**. Les taux coachs, types d'activité, niveaux, heures de pointe, vacances, budget et surcharges de droits vivent dans `Paramètres` (catégories distinctes, historisées par date d'effet). |
| C8 | Historique des niveaux | Demandé, sans feuille dédiée. | Chaque modification d'un membre est tracée (avant/après, auteur, date, motif) dans `Journal_Audit` ; le formulaire exige un motif lors d'un changement de niveau. |
| C9 | Date du cadrage | Version datée du 1er novembre 2026. | Sans incidence. |

## 4. Données manquantes (bloquantes pour l'historique réel, pas pour l'outil)

Voir [`HYPOTHESES_DONNEES_MANQUANTES_LIMITES.md`](HYPOTHESES_DONNEES_MANQUANTES_LIMITES.md), qui intègre aussi les réponses d'Anthony du 01/11/2026. Restent en priorité : exports ABS/application, plannings et présences des académies, heures de Gilles depuis l'ouverture.

## 5. Architecture retenue

```
 Téléphone / ordinateur
        │  HTTPS (compte Google)
        ▼
 Application web Apps Script  ──►  Index.html (interface + calculs, sans dépendance)
        │  google.script.run
        ▼
 Code.gs + Shared.gs (serveur)  ──►  droits par rôle, validation, verrou d'écriture, journal d'audit
        │
        ▼
 Classeur Google Sheets (17 onglets) ──► sauvegarde quotidienne datée dans Drive
```

**Pourquoi Google Apps Script lié au classeur**

- Rien à héberger, rien à payer, aucun serveur à maintenir : l'application est publiée depuis le classeur lui-même.
- **Aucune clé ni identifiant dans le code** : le script s'exécute sous le compte d'Anthony ; les utilisateurs sont identifiés par leur compte Google (ou par un code personnel haché en mode « code »).
- Google Sheets reste la base lisible, exportable et contrôlable ; l'application n'est qu'une interface plus simple par-dessus.
- Les **droits sont appliqués côté serveur** (les utilisateurs n'ont pas besoin d'accès direct au classeur).

**Organisation du code**

| Dossier | Rôle |
|---|---|
| `src/core/` | Logique pure, testée sous Node : utilitaires, schéma des feuilles, permissions, calculs KPI/P&L, qualité des données, import, rapports, règles d'écriture. |
| `src/data/` | Couche d'accès aux données : `SheetsStore` (Apps Script) et `DemoStore` (démonstration locale) ; générateur de données fictives. |
| `src/ui/` | Interface responsive en français (sans framework). |
| `apps-script/` | Serveur `Code.gs` et manifeste. |
| `scripts/build.js` | Assemble `dist/demo/index.html` (démo autonome) et `dist/apps-script/` (fichiers à copier dans Apps Script), génère la documentation de structure et de droits. |
| `tests/` | Tests unitaires des calculs, du serveur (simulation de Google Sheets) et tests navigateur. |

**Mode démonstration** : `dist/demo/index.html` s'ouvre dans un navigateur, sans connexion, avec un jeu de données fictif clairement identifié et un sélecteur de rôle.

## 6. Ce qui a été vérifié, et ce qui ne l'a pas été

| Élément | État |
|---|---|
| Calculs (occupation, taux, reconnaissance des cycles, coûts historisés, P&L, NPS, qualité, import) | Testés : `npm test` (31 tests). |
| Serveur Apps Script (droits, verrouillage des heures, import/annulation, archivage, audit, mode code) | Testé contre une **simulation** de Google Sheets en mémoire. |
| Interface (17 écrans × 4 rôles, iPhone et ordinateur) | Testée dans Chromium : aucune erreur JS, aucun débordement horizontal ; parcours séance rapide, heures coach, validation, paiement, import, rapport. |
| **Connexion au vrai Google Sheets** | **Non testée** (aucun identifiant Google disponible dans cet environnement). À valider lors du premier déploiement en suivant le guide de connexion. |
| Export PDF | Vérifié via l'impression Chromium (exemples dans `docs/exemples/`). Sur iPhone, l'export passe par Partager → Imprimer → PDF. |
