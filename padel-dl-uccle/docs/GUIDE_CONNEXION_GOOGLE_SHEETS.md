# Guide de connexion à Google Sheets

Durée : environ 20 minutes. Aucune compétence technique requise. **Ce branchement n'a pas pu être testé depuis l'environnement de développement** (pas d'accès à un compte Google) : suivez la vérification de l'étape 7 et signalez tout message d'erreur.

## Choisir le mode d'identification (une seule question)

| Situation | Mode | Réglage |
|---|---|---|
| Tous les utilisateurs ont une adresse du **même domaine Google Workspace** (ex. `@davidlloyd.be` gérée par Google) | `google` (défaut) | Accès « Toute personne de *votre domaine* » |
| Certains utilisent une adresse **Gmail personnelle** ou un autre domaine | `code` | Accès « Toute personne disposant d'un compte Google » + un code personnel par utilisateur |

En mode `google`, Google transmet l'adresse de la personne connectée, qui doit figurer dans l'onglet **Utilisateurs**. Hors domaine, Google ne transmet pas l'adresse : le mode `code` ajoute un code personnel (stocké uniquement sous forme d'empreinte).

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
   - En mode `code`, remplacez `"access": "DOMAIN"` par `"access": "ANYONE"`.
5. Enregistrez (icône disquette).

## Étape 4 – Installer les onglets

1. En haut, choisissez la fonction **`setupSpreadsheet`**, puis **Exécuter**.
2. Google demande une autorisation : choisissez le compte d'Anthony → « Paramètres avancés » → « Accéder au projet » → **Autoriser**. (Écran normal pour un script personnel non publié sur le Marketplace.)
3. Le classeur contient désormais 17 onglets, les paramètres initiaux du cadrage, six terrains à compléter et Anthony comme administrateur.

Autorisations demandées et pourquoi :

| Autorisation | Usage |
|---|---|
| Google Sheets | lire et écrire le classeur |
| Adresse e-mail | identifier la personne connectée |
| Google Drive | créer les sauvegardes datées du classeur |
| Exécution de scripts | programmer la sauvegarde quotidienne |

## Étape 5 – Compléter les données indispensables (dans l'application ou dans le classeur)

1. **Paramètres** → `date_ouverture_indoor` : date exacte (AAAA-MM-JJ).
2. **Terrains** : noms, type indoor/outdoor, date de mise en service, horaires de chaque jour (`07:00-23:00`, plusieurs plages séparées par `;`, ou `fermé`).
3. **Utilisateurs** : une ligne par personne (e-mail du compte Google, nom, rôle `admin` / `coach` / `reception` / `manager`, actif coché).
4. **Paramètres → taux_coach** : pour chaque coach, référence = son ID utilisateur, valeur = taux horaire, date d'effet. Corrigez la ligne de Gilles (référence et date d'effet).
5. **Offres** : formules avec leurs tarifs confirmés et nombre de séances.

## Étape 6 – Publier l'application

1. **Déployer → Nouveau déploiement** → type **Application Web**.
2. Description : `v1`. Exécuter en tant que : **Moi**. Qui a accès : **votre domaine** (mode `google`) ou **Toute personne disposant d'un compte Google** (mode `code`).
3. **Déployer**, puis copiez l'**URL de l'application Web** (se termine par `/exec`). C'est le lien à envoyer aux utilisateurs.

Les utilisateurs n'ont **pas** besoin d'accès au classeur : ne le partagez qu'avec les personnes qui doivent le consulter directement (Laurent en lecture seule, par exemple).

### Mode `code` uniquement

1. Paramètres du projet → Propriétés du script → ajoutez `AUTH_MODE` = `code`.
2. Pour chaque utilisateur, dans l'éditeur : remplacez temporairement la fonction exécutée par un appel, ou ouvrez un nouveau fichier `Codes.gs` contenant :
   ```js
   function definirCodes() {
     setAccessCode('coach@exemple.be', 'choisir-un-code-long');
   }
   ```
   Exécutez `definirCodes`, communiquez le code de vive voix, puis **supprimez le fichier `Codes.gs`** (le code n'y est conservé que le temps de l'exécution ; seule son empreinte est stockée).
3. Les sessions durent 6 heures ; 5 essais erronés bloquent l'adresse 15 minutes.

## Étape 7 – Vérifier

1. Ouvrez l'URL `/exec` : le bandeau « Mode démonstration » ne doit **pas** apparaître ; le badge « Google Sheets » est visible sur ordinateur.
2. Encodez une séance de test, vérifiez qu'une ligne apparaît dans l'onglet **Séances** et une entrée dans **Journal_Audit** ; puis archivez-la.
3. Ouvrez l'URL avec un compte coach : seuls Séances, Heures, Événements, Satisfaction (encodage), Membres et Aide sont visibles.
4. En cas d'erreur « Accès non autorisé » : l'e-mail n'est pas (ou mal) saisi dans Utilisateurs, ou la case « actif » n'est pas cochée.
5. En cas d'erreur « Votre compte Google n'est pas transmis » : passez en mode `code`.

## Mettre à jour l'application

Après une nouvelle version : recopiez les fichiers de `dist/apps-script/`, puis **Déployer → Gérer les déploiements → modifier (crayon) → Version : Nouvelle version → Déployer**. L'URL ne change pas.

## Option : déploiement en ligne de commande (clasp)

Pour un profil technique : `npm i -g @google/clasp`, `clasp login`, créer `.clasp.json` (non versionné) avec `{"scriptId":"<CLASP_SCRIPT_ID>","rootDir":"dist/apps-script"}`, puis `npm run build && clasp push && clasp deploy`.
