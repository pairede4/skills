# Guide de connexion à Google Sheets

Durée : environ 20 minutes. Aucune compétence technique requise. **Ce branchement n'a pas pu être testé depuis l'environnement de développement** (pas d'accès à un compte Google) : suivez la vérification de l'étape 7 et signalez tout message d'erreur.

## Identification des utilisateurs

Le club n'utilise pas Google Workspace : l'application est donc réglée (par défaut) pour fonctionner avec **n'importe quel compte** :

- **Anthony**, propriétaire du classeur, est reconnu automatiquement par son compte Google.
- **Les autres** (Gilles, réception, Laurent…) se connectent avec **leur e-mail + un code personnel** qu'Anthony définit dans l'application (Paramètres → Utilisateurs → ouvrir la personne → « Définir le code d'accès »). Le code n'est jamais stocké en clair ; 5 erreurs bloquent l'adresse 15 minutes ; une session dure 6 heures.

## Étape 1 – Créer le classeur

1. Avec le compte Google d'Anthony, ouvrez <https://sheets.new>.
2. Nommez-le : `Padel DL Uccle – Pilotage`.
3. Fichier → Paramètres : fuseau horaire **(GMT+01:00) Bruxelles**, paramètres régionaux **Belgique**.

## Étape 2 – Ouvrir l'éditeur de script

Menu **Extensions → Apps Script**. Un projet lié au classeur s'ouvre (ainsi, aucun identifiant de classeur n'est à copier).

## Étape 3 – Copier les fichiers

Les fichiers sont dans le dossier `dist/apps-script/` du projet.

1. Dans l'éditeur, remplacez le contenu de `Code.gs` par celui de **`dist/apps-script/Code.gs`**.
2. Cliquez sur **+** → **Script**, nommez-le `Shared` et collez **`dist/apps-script/Shared.gs`**.
3. Cliquez sur **+** → **HTML**, nommez-le `Index` (sans extension) et collez **`dist/apps-script/Index.html`**.
4. Paramètres du projet (roue dentée) → cochez **« Afficher le fichier manifeste appsscript.json »**, puis remplacez le contenu de `appsscript.json` par **`dist/apps-script/appsscript.json`**.
5. Enregistrez (icône disquette).

## Étape 4 – Installer les onglets

1. En haut, choisissez la fonction **`setupSpreadsheet`**, puis **Exécuter**.
2. Google demande une autorisation : choisissez le compte d'Anthony → « Paramètres avancés » → « Accéder au projet » → **Autoriser**. (Écran normal pour un script personnel non publié sur le Marketplace.)
3. Le classeur contient désormais 18 onglets et les valeurs confirmées : ouverture indoor le 31/08/2026, six terrains ouverts de 8 h à 21 h, Gilles (coach, 35 €/h depuis le 31/08/2026), offres collectives adulte et junior à 25 € par personne pour 1 h et 35 € pour 1 h 30, montants TVAC. Anthony est administrateur.

Autorisations demandées et pourquoi :

| Autorisation | Usage |
|---|---|
| Google Sheets | lire et écrire le classeur |
| Adresse e-mail | identifier la personne connectée |
| Google Drive | créer les sauvegardes datées du classeur |
| Exécution de scripts | programmer la sauvegarde quotidienne |

## Étape 5 – Compléter ce qui reste (dans l'application)

1. **Paramètres → Utilisateurs** : ouvrir « Gilles », saisir son e-mail, cocher « actif », puis « Définir le code d'accès ». Ajouter de même la réception et Laurent (rôle `manager`).
2. **Paramètres → Terrains** : ajuster les noms si besoin (créés « Indoor 1-3 » et « Outdoor 4-6 »).
3. **Académies → Cycles** : pour chaque groupe, choisir l'offre (adulte ou junior, 1 h ou 1 h 30), le coach, le créneau et le **nombre de séances (15 ou 20)**, puis « Générer les séances ».
4. Facultatif : périodes de vacances scolaires (Paramètres → Vacances) pour que la génération des séances les saute.

## Étape 6 – Publier l'application

1. **Déployer → Nouveau déploiement** → type **Application Web**.
2. Description : `v1`. Exécuter en tant que : **Moi**. Qui a accès : **Toute personne disposant d'un compte Google** (une adresse Gmail suffit ; la sécurité est assurée par la liste Utilisateurs et les codes personnels : une personne non inscrite ne voit que l'écran de connexion).
3. **Déployer**, puis copiez l'**URL de l'application Web** (se termine par `/exec`). C'est le lien à envoyer aux utilisateurs.

Les utilisateurs n'ont **pas** besoin d'accès au classeur : ne le partagez qu'avec les personnes qui doivent le consulter directement (Laurent en lecture seule, par exemple).

## Étape 7 – Vérifier

1. Ouvrez l'URL `/exec` : le bandeau « Mode démonstration » ne doit **pas** apparaître ; le badge « Google Sheets » est visible sur ordinateur.
2. Encodez une séance de test, vérifiez qu'une ligne apparaît dans l'onglet **Séances** et une entrée dans **Journal_Audit** ; puis archivez-la.
3. Ouvrez l'URL avec un compte coach : seuls Séances, Heures, Événements, Satisfaction (encodage), Membres et Aide sont visibles.
4. Ouvrez l'URL dans une fenêtre de navigation privée : l'écran de connexion (e-mail + code) doit apparaître ; connectez-vous avec le code défini pour Gilles.
5. En cas d'erreur « Accès non autorisé » : l'e-mail n'est pas (ou mal) saisi dans Utilisateurs, ou la case « actif » n'est pas cochée.

## Mettre à jour l'application

Après une nouvelle version : recopiez les fichiers de `dist/apps-script/`, puis **Déployer → Gérer les déploiements → modifier (crayon) → Version : Nouvelle version → Déployer**. L'URL ne change pas.

## Option : déploiement en ligne de commande (clasp)

Pour un profil technique : `npm i -g @google/clasp`, `clasp login`, créer `.clasp.json` (non versionné) avec `{"scriptId":"<CLASP_SCRIPT_ID>","rootDir":"dist/apps-script"}`, puis `npm run build && clasp push && clasp deploy`.
