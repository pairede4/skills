# Sauvegarde et restauration

## Ce qui protège déjà les données

1. **Rien n'est supprimé** depuis l'application : « Archiver » met `archive = TRUE`.
2. **Journal_Audit** conserve l'état avant/après de chaque modification, avec l'auteur et la date.
3. **Historique des versions** de Google Sheets : Fichier → Historique des versions → Afficher l'historique (retour à n'importe quel moment, cellule par cellule).
4. **Copies datées automatiques** du classeur (ci-dessous).

## Sauvegarde automatique quotidienne

Une seule fois, dans l'éditeur Apps Script : exécuter **`installDailyBackup`**.

- Chaque nuit vers 2 h, une copie complète `Padel DL Uccle – Pilotage – sauvegarde AAAA-MM-JJ_HH-MM` est créée dans le dossier Drive **« Sauvegardes Padel DL Uccle »**.
- Les 30 plus récentes sont conservées (propriété `BACKUP_KEEP`), les plus anciennes vont à la corbeille Drive (récupérables 30 jours).
- Vérification : Apps Script → Déclencheurs (icône réveil) doit montrer `backupNow`, quotidien.

## Sauvegarde manuelle (avant un import important ou une modification de structure)

- Éditeur Apps Script → exécuter **`backupNow`**, ou
- Dans le classeur : Fichier → **Créer une copie**.
- Pour un export hors Google : Fichier → Télécharger → **Microsoft Excel (.xlsx)** (toutes les feuilles), à ranger sur le serveur du club.

## Restaurer

**Une ligne ou quelques cellules modifiées par erreur**
1. Journal d'audit (dans l'application) → ouvrir l'entrée → copier les valeurs « Avant ».
2. Ou Fichier → Historique des versions dans le classeur.

**Un import erroné**
Imports → Historique → **Annuler l'import** : toutes ses lignes sont archivées.

**Tout le classeur**
1. Ouvrir la sauvegarde voulue dans le dossier « Sauvegardes Padel DL Uccle ».
2. Dans le classeur principal, pour chaque onglet à restaurer : sélectionner tout le contenu de l'onglet de la sauvegarde, copier, puis coller dans l'onglet correspondant du classeur principal (Édition → Coller spécial → Valeurs uniquement).
3. Cette méthode garde le même classeur, donc le même script et la même URL d'application.

> Ne pas simplement « utiliser la copie » comme nouveau classeur : le script et l'URL de l'application sont liés au classeur d'origine. Si c'est malgré tout nécessaire, recopier les fichiers Apps Script dans la copie et redéployer (nouvelle URL à communiquer).

**Tester la restauration** une fois par trimestre : ouvrir la dernière sauvegarde et vérifier qu'elle contient bien les lignes de la veille.

## Mode démonstration

Aide → « Télécharger une sauvegarde (JSON) » / « Restaurer une sauvegarde ». Ces fichiers ne contiennent que des données fictives.

## Archivage annuel (volumétrie)

En fin de saison : créer une copie « Archives 2026-2027 », puis dans le classeur principal supprimer les lignes **archivées** de plus d'un an de Présences, Occupation_Terrains et Journal_Audit (après sauvegarde). Seul l'administrateur le fait, directement dans le classeur.
