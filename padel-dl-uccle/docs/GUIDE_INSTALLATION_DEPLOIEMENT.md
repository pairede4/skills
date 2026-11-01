# Guide d'installation et de déploiement

## A. Essayer la démonstration (aucune installation)

1. Ouvrez le fichier **`dist/demo/index.html`** dans Chrome, Safari ou Edge (double-clic).
2. Le bandeau jaune rappelle que **toutes les données sont fictives**.
3. En haut à droite, « Voir en tant que » permet de passer d'un rôle à l'autre (administrateur, coachs, réception, manager).
4. Les modifications restent dans ce navigateur uniquement. Aide → « Réinitialiser les données fictives » remet la démo à zéro.

Sur iPhone : envoyez-vous le fichier (AirDrop / Fichiers) et ouvrez-le dans Safari, ou servez-le depuis un ordinateur (`npm run serve`, puis `http://<ip-de-l-ordinateur>:8080` sur le même Wi-Fi). La lecture des fichiers Excel (.xlsx) charge une bibliothèque depuis cdnjs ; hors ligne, importez des fichiers CSV.

## B. Mise en production avec Google Sheets

Suivez [`GUIDE_CONNEXION_GOOGLE_SHEETS.md`](GUIDE_CONNEXION_GOOGLE_SHEETS.md) (≈ 20 minutes, sans outil technique). En résumé :

1. Créer le classeur → Extensions → Apps Script.
2. Copier les 4 fichiers de `dist/apps-script/`.
3. Exécuter `setupSpreadsheet` (autoriser).
4. Compléter date d'ouverture, terrains et horaires, utilisateurs, taux des coachs, offres.
5. Déployer en application Web, envoyer l'URL `/exec`.
6. Exécuter `installDailyBackup` (sauvegarde chaque nuit).

**Ajouter l'application sur l'écran d'accueil de l'iPhone** : ouvrir l'URL dans Safari → Partager → « Sur l'écran d'accueil ».

## C. Pour la personne qui maintient le code

Prérequis : Node.js 18 ou plus récent. Aucune dépendance npm n'est nécessaire pour construire ou tester ; Playwright (navigateur) n'est requis que pour les tests d'interface.

```bash
npm run build      # construit dist/demo, dist/apps-script et docs/STRUCTURE_GOOGLE_SHEETS.md, docs/MATRICE_PERMISSIONS.md
npm test           # build + tests unitaires (calculs, qualité, import, droits, serveur simulé)
npm run test:e2e   # tests navigateur : 17 écrans × 4 rôles, iPhone + ordinateur, parcours complets
npm run serve      # démo sur http://localhost:8080
```

Règles de modification :

- La structure des feuilles se change **uniquement** dans `src/core/schema.js` ; relancer `npm run build` régénère la documentation, et `setupSpreadsheet()` ajoute les colonnes manquantes au classeur existant sans toucher aux données.
- Une nouvelle règle de calcul s'ajoute dans `src/core/calc.js` avec son test dans `tests/calc.test.js`, et sa formule dans `docs/FORMULES_FINANCIERES.md`.
- Aucun tarif, horaire, taux ou statut gratuit/payant ne s'écrit dans le code : tout passe par l'onglet Paramètres (ou Offres).
- Après une modification, recopier les fichiers de `dist/apps-script/` dans l'éditeur et publier une **nouvelle version** du déploiement existant.

## D. Limites techniques d'Apps Script à connaître

| Limite | Conséquence | Parade |
|---|---|---|
| Chaque ouverture lit tout le classeur | Quelques secondes de chargement au-delà de ~20 000 lignes | Archiver dans un classeur d'archives les années closes (voir Sauvegarde) |
| Temps d'exécution max. 6 min par appel | Imports de plus de ~5 000 lignes à découper | Importer par mois |
| Quotas Google (consommateur) | Usage d'un club très en dessous des quotas | — |
| Identité hors domaine non transmise | Mode `code` nécessaire pour des comptes Gmail personnels | Voir le guide de connexion |
