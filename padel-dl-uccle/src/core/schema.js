/**
 * Modèle de données : définition unique des feuilles Google Sheets.
 *
 * Cette définition sert à la fois :
 *   - à créer les onglets, en-têtes et listes déroulantes (Apps Script) ;
 *   - à générer les formulaires et tableaux de l'application ;
 *   - à valider les lignes saisies ou importées ;
 *   - à générer la documentation docs/STRUCTURE_GOOGLE_SHEETS.md.
 *
 * Types : id, text, longtext, number, money, int, date, time, bool, enum,
 *         ref (clé étrangère), refs (liste séparée par des virgules), url, email, rating10.
 * enumParam : liste configurable lue dans « Paramètres » (catégorie indiquée).
 */
(function (root, factory) {
  var mod = factory();
  if (typeof module === 'object' && module.exports) module.exports = mod;
  root.Padel = root.Padel || {};
  root.Padel.schema = mod;
})(typeof globalThis !== 'undefined' ? globalThis : this, function () {
  'use strict';

  var ENUMS = {
    oui_non: { oui: 'Oui', non: 'Non' },
    statut_actif: { actif: 'Actif', archive: 'Archivé' },
    param_categorie: {
      general: 'Règle générale', taux_coach: 'Taux horaire coach', type_activite: "Type d'activité",
      niveau: 'Niveau', heures_pointe: 'Heures de pointe', vacances: 'Vacances scolaires (cycles suspendus)',
      budget: 'Budget', categorie_depense: 'Catégorie de dépense', categorie_revenu: 'Catégorie de revenu',
      permission: 'Permission (surcharge par rôle)'
    },
    role: { admin: 'Administrateur', coach: 'Coach', reception: 'Réception', manager: 'Manager' },
    lieu: { indoor: 'Indoor', outdoor: 'Outdoor' },
    public: { adulte: 'Adulte', junior: 'Junior', mixte: 'Mixte' },
    segment: { adulte: 'Adulte', junior: 'Junior' },
    statut_membre: { actif: 'Actif', inactif: 'Inactif' },
    statut_cycle: { planifie: 'Planifié', en_cours: 'En cours', termine: 'Terminé', annule: 'Annulé' },
    statut_seance: {
      planifiee: 'Planifiée', realisee: 'Réalisée', annulee_club: 'Annulée (club/coach)',
      annulee_meteo: 'Annulée (météo)', annulee_participants: 'Annulée (manque de participants)'
    },
    statut_inscription: { inscrit: 'Inscrit', liste_attente: "Liste d'attente", annule: 'Annulé', transfere: 'Transféré' },
    statut_presence: { present: 'Présent', absent: 'Absent (prévenu)', no_show: 'No-show', annule: 'Désinscrit / annulé' },
    statut_heure: { brouillon: 'Brouillon', soumis: 'Soumis', valide: 'Validé', a_corriger: 'À corriger', paye: 'Payé' },
    statut_paiement: { a_verifier: 'À vérifier', encaisse: 'Encaissé', rembourse: 'Remboursé', annule: 'Annulé' },
    mode_paiement: {
      carte: 'Carte', bancontact: 'Bancontact', virement: 'Virement', especes: 'Espèces',
      compte_membre: 'Compte membre (ABS)', application: 'Application', autre: 'Autre'
    },
    statut_depense: { engagee: 'Engagée', payee: 'Payée', annulee: 'Annulée' },
    type_occupation: {
      reservation_libre: 'Réservation libre', blocage: 'Heures bloquées',
      maintenance: 'Maintenance', indisponibilite: 'Indisponibilité'
    },
    statut_occupation: { reserve: 'Réservé', realise: 'Réalisé', annule: 'Annulé', no_show: 'No-show' },
    statut_evenement: { planifie: 'Planifié', realise: 'Réalisé', annule: 'Annulé' },
    statut_import: { importe: 'Importé', annule: 'Annulé' },
    frequence: {
      jamais: 'Jamais', moins_1_mois: "Moins d'une fois par mois", '1_3_mois': '1 à 3 fois par mois',
      '1_semaine': 'Une fois par semaine', '2_plus_semaine': 'Deux fois ou plus par semaine'
    },
    source_satisfaction: { formulaire: 'Formulaire app', papier: 'Papier', import: 'Import' }
  };

  function c(n, t, req, label, extra) {
    var col = { n: n, t: t, req: !!req, label: label };
    if (extra) for (var k in extra) col[k] = extra[k];
    return col;
  }

  /** Colonnes techniques présentes en fin de chaque feuille. */
  var META = [
    c('archive', 'bool', false, 'Archivé', { meta: true, help: 'TRUE = ligne archivée (jamais supprimée).' }),
    c('import_id', 'ref', false, 'Import d\'origine', { meta: true, ref: 'imports' }),
    c('cree_le', 'text', false, 'Créé le', { meta: true }),
    c('cree_par', 'text', false, 'Créé par', { meta: true }),
    c('modifie_le', 'text', false, 'Modifié le', { meta: true }),
    c('modifie_par', 'text', false, 'Modifié par', { meta: true })
  ];

  var SHEETS = [
    {
      key: 'parametres', tab: 'Paramètres', label: 'Paramètres', prefix: 'PAR',
      desc: 'Règles et valeurs modifiables, toujours historisées par date d\'effet (tarifs de référence, taux coachs, types d\'activité, niveaux, heures de pointe, vacances, budget, permissions).',
      naturalKey: ['categorie', 'cle', 'reference', 'date_effet'],
      cols: [
        c('id', 'id', true, 'ID'),
        c('categorie', 'enum', true, 'Catégorie', { enumName: 'param_categorie' }),
        c('cle', 'text', true, 'Clé', { help: 'Ex. date_ouverture_indoor, tournoi, 3…' }),
        c('reference', 'text', false, 'Référence', { help: 'ID du coach (taux), jour 1-7 (heures de pointe), mois AAAA-MM (budget), rôle (permission).' }),
        c('valeur', 'text', false, 'Valeur', { help: 'Vide = inconnu. Jamais remplacé par 0.' }),
        c('libelle', 'text', false, 'Libellé affiché'),
        c('attributs', 'text', false, 'Attributs', { help: 'Pour un type d\'activité : public=adulte|junior|mixte; payant=oui|non; encadre=oui|non; famille=academie|evenement|tournoi|decouverte|autre' }),
        c('date_effet', 'date', false, 'Date d\'effet', { help: 'Vide = depuis toujours (signalé à vérifier).' }),
        c('date_fin', 'date', false, 'Date de fin'),
        c('statut', 'enum', true, 'Statut', { enumName: 'statut_actif' }),
        c('source', 'text', false, 'Source / confirmation', { help: 'Ex. « Cadrage 01/11/2026 », « À confirmer ».' }),
        c('description', 'longtext', false, 'Description')
      ]
    },
    {
      key: 'utilisateurs', tab: 'Utilisateurs', label: 'Utilisateurs', prefix: 'USR',
      desc: 'Personnes ayant accès à l\'application et leur rôle. Un coach est identifié par son ID utilisateur.',
      naturalKey: ['email'],
      cols: [
        c('id', 'id', true, 'ID'),
        c('email', 'email', true, 'E-mail (compte Google)', { v: 'Adresse e-mail valide, unique' }),
        c('nom_affiche', 'text', true, 'Nom affiché'),
        c('role', 'enum', true, 'Rôle', { enumName: 'role' }),
        c('actif', 'bool', true, 'Actif'),
        c('code_acces_hash', 'text', false, 'Code d\'accès (empreinte)', { secret: true, help: 'Rempli uniquement par la fonction setAccessCode (mode « code »). Jamais lisible dans l\'application.' }),
        c('derniere_connexion', 'text', false, 'Dernière connexion')
      ]
    },
    {
      key: 'terrains', tab: 'Terrains', label: 'Terrains', prefix: 'TER',
      desc: 'Les six terrains, leur type et leurs horaires d\'ouverture (dénominateur du taux d\'occupation). Horaire vide = inconnu ; « fermé » = fermé ce jour-là.',
      naturalKey: ['numero'],
      cols: [
        c('id', 'id', true, 'ID'),
        c('numero', 'int', true, 'Numéro'),
        c('nom', 'text', true, 'Nom'),
        c('lieu', 'enum', true, 'Indoor / outdoor', { enumName: 'lieu' }),
        c('date_mise_en_service', 'date', false, 'Mise en service', { help: 'Indoor : date d\'ouverture (à fournir).' }),
        c('horaires_lun', 'text', false, 'Horaires lundi', { v: 'HH:MM-HH:MM, plusieurs plages séparées par « ; », ou « fermé »' }),
        c('horaires_mar', 'text', false, 'Horaires mardi', { v: 'idem' }),
        c('horaires_mer', 'text', false, 'Horaires mercredi', { v: 'idem' }),
        c('horaires_jeu', 'text', false, 'Horaires jeudi', { v: 'idem' }),
        c('horaires_ven', 'text', false, 'Horaires vendredi', { v: 'idem' }),
        c('horaires_sam', 'text', false, 'Horaires samedi', { v: 'idem' }),
        c('horaires_dim', 'text', false, 'Horaires dimanche', { v: 'idem' }),
        c('statut', 'enum', true, 'Statut', { enumName: 'statut_actif' }),
        c('commentaire', 'longtext', false, 'Commentaire')
      ]
    },
    {
      key: 'membres', tab: 'Membres', label: 'Membres', prefix: 'MBR',
      desc: 'Référentiel minimal (RGPD) : un identifiant membre suffit. Aucun e-mail ni téléphone.',
      naturalKey: ['id'],
      cols: [
        c('id', 'id', true, 'ID membre', { help: 'Idéalement le numéro de membre ABS.' }),
        c('alias', 'text', false, 'Alias (prénom + initiale)', { help: 'Facultatif. Ne pas saisir le nom complet si inutile.' }),
        c('segment', 'enum', true, 'Adulte / junior', { enumName: 'segment' }),
        c('categorie_abonnement', 'text', false, 'Abonnement', { help: 'Ex. Platinum, Diamond.' }),
        c('niveau', 'int', false, 'Niveau (1-8)', { v: 'Entier de 1 à 8 (grille des niveaux)', min: 1, max: 8 }),
        c('date_niveau', 'date', false, 'Date du niveau'),
        c('motif_niveau', 'text', false, 'Motif du dernier changement de niveau'),
        c('statut', 'enum', true, 'Statut', { enumName: 'statut_membre' }),
        c('commentaire', 'longtext', false, 'Commentaire')
      ]
    },
    {
      key: 'offres', tab: 'Offres', label: 'Offres', prefix: 'OFF',
      desc: 'Catalogue des formules (académies, collectifs). Aucun tarif n\'est supposé : un tarif vide bloque le calcul du revenu et est signalé.',
      naturalKey: ['nom', 'date_effet'],
      cols: [
        c('id', 'id', true, 'ID'),
        c('nom', 'text', true, 'Nom de la formule'),
        c('type_activite', 'enum', true, 'Type d\'activité', { enumParam: 'type_activite' }),
        c('public', 'enum', true, 'Adulte / junior', { enumName: 'public' }),
        c('duree_seance_min', 'int', false, 'Durée d\'une séance (min)'),
        c('nb_seances', 'int', false, 'Nombre de séances', { v: 'Entier > 0' }),
        c('tarif_seance', 'money', false, 'Prix par participant et par séance (€)'),
        c('prix_cycle', 'money', false, 'Prix du cycle par participant (€)', { help: 'Si vide : prix par séance × nombre de séances.' }),
        c('taille_min', 'int', false, 'Taille minimale du groupe'),
        c('taille_max', 'int', false, 'Taille maximale du groupe'),
        c('date_effet', 'date', true, 'Date d\'effet'),
        c('date_fin', 'date', false, 'Date de fin'),
        c('statut', 'enum', true, 'Statut', { enumName: 'statut_actif' }),
        c('source', 'text', false, 'Source du tarif'),
        c('commentaire', 'longtext', false, 'Commentaire')
      ]
    },
    {
      key: 'cycles', tab: 'Cycles', label: 'Cycles', prefix: 'CYC',
      desc: 'Groupes payants (un cycle = une offre, un coach, un créneau, des dates).',
      naturalKey: ['offre_id', 'date_debut', 'jour_semaine', 'heure_debut', 'terrain_id'],
      cols: [
        c('id', 'id', true, 'ID'),
        c('nom', 'text', true, 'Nom du groupe'),
        c('offre_id', 'ref', true, 'Offre', { ref: 'offres' }),
        c('coach_id', 'ref', false, 'Coach', { ref: 'utilisateurs', refRole: 'coach' }),
        c('date_debut', 'date', true, 'Date de début'),
        c('date_fin', 'date', false, 'Date de fin'),
        c('jour_semaine', 'int', false, 'Jour (1 = lundi … 7 = dimanche)', { min: 1, max: 7 }),
        c('heure_debut', 'time', false, 'Heure de début'),
        c('heure_fin', 'time', false, 'Heure de fin'),
        c('terrain_id', 'ref', false, 'Terrain', { ref: 'terrains' }),
        c('niveau', 'int', false, 'Niveau', { min: 1, max: 8 }),
        c('capacite', 'int', false, 'Capacité'),
        c('nb_seances', 'int', false, 'Nombre de séances du cycle', { help: 'Cycles flexibles : idéalement 15 ou 20. Obligatoire si l\'offre ne le fixe pas.' }),
        c('statut', 'enum', true, 'Statut', { enumName: 'statut_cycle' }),
        c('commentaire', 'longtext', false, 'Commentaire')
      ]
    },
    {
      key: 'seances', tab: 'Séances', label: 'Séances', prefix: 'SEA',
      desc: 'Planning et réalisation de chaque séance. Les compteurs « déclarés » permettent un encodage rapide sans liste nominative ; la liste « Présences » est prioritaire quand elle existe.',
      naturalKey: ['date', 'heure_debut', 'type_activite', 'terrains'],
      cols: [
        c('id', 'id', true, 'ID'),
        c('date', 'date', true, 'Date'),
        c('heure_debut', 'time', true, 'Début'),
        c('heure_fin', 'time', true, 'Fin'),
        c('type_activite', 'enum', true, 'Type d\'activité', { enumParam: 'type_activite' }),
        c('cycle_id', 'ref', false, 'Cycle (académie)', { ref: 'cycles' }),
        c('evenement_id', 'ref', false, 'Événement', { ref: 'evenements' }),
        c('terrains', 'refs', false, 'Terrain(s)', { ref: 'terrains' }),
        c('coach_id', 'ref', false, 'Coach responsable', { ref: 'utilisateurs', refRole: 'coach' }),
        c('coach_remplacant_id', 'ref', false, 'Coach remplaçant', { ref: 'utilisateurs', refRole: 'coach' }),
        c('niveau', 'text', false, 'Niveau', { help: 'Ex. 2 ou 2-3' }),
        c('capacite', 'int', false, 'Capacité'),
        c('nb_inscrits', 'int', false, 'Inscrits (déclaré)'),
        c('nb_presents', 'int', false, 'Présents (déclaré)'),
        c('nb_absents', 'int', false, 'Absents prévenus (déclaré)'),
        c('nb_no_shows', 'int', false, 'No-shows (déclaré)'),
        c('nb_annulations', 'int', false, 'Annulations (déclaré)'),
        c('payant', 'enum', false, 'Payant', { enumName: 'oui_non', help: 'Vide = selon le type d\'activité.' }),
        c('statut', 'enum', true, 'Statut', { enumName: 'statut_seance' }),
        c('commentaire', 'longtext', false, 'Commentaire'),
        c('incident', 'longtext', false, 'Incident')
      ]
    },
    {
      key: 'inscriptions', tab: 'Inscriptions', label: 'Inscriptions', prefix: 'INS',
      desc: 'Inscription d\'un membre à un cycle (académie), à une séance ponctuelle ou à un événement. Une entrée en cours de cycle ne prévoit que les séances restantes.',
      naturalKey: ['membre_id', 'cycle_id', 'seance_id', 'evenement_id'],
      cols: [
        c('id', 'id', true, 'ID'),
        c('membre_id', 'ref', true, 'Membre', { ref: 'membres' }),
        c('cycle_id', 'ref', false, 'Cycle', { ref: 'cycles' }),
        c('seance_id', 'ref', false, 'Séance ponctuelle', { ref: 'seances' }),
        c('evenement_id', 'ref', false, 'Événement', { ref: 'evenements' }),
        c('date_inscription', 'date', true, 'Date d\'inscription'),
        c('date_premiere_seance', 'date', false, 'Première séance due', { help: 'Entrée en cours de cycle. Vide = début du cycle.' }),
        c('nb_seances_prevues', 'int', false, 'Séances prévues', { help: 'Vide = séances du cycle.' }),
        c('montant_attendu', 'money', false, 'Montant attendu (€)', { help: 'Vide = calculé depuis l\'offre ; bloqué si l\'offre n\'a pas de tarif.' }),
        c('statut', 'enum', true, 'Statut', { enumName: 'statut_inscription' }),
        c('commentaire', 'longtext', false, 'Commentaire')
      ]
    },
    {
      key: 'presences', tab: 'Présences', label: 'Présences', prefix: 'PRE',
      desc: 'Participation réelle, une ligne par membre et par séance.',
      naturalKey: ['seance_id', 'membre_id'],
      cols: [
        c('id', 'id', true, 'ID'),
        c('seance_id', 'ref', true, 'Séance', { ref: 'seances' }),
        c('membre_id', 'ref', true, 'Membre', { ref: 'membres' }),
        c('inscription_id', 'ref', false, 'Inscription', { ref: 'inscriptions' }),
        c('statut', 'enum', true, 'Présence', { enumName: 'statut_presence' }),
        c('motif', 'text', false, 'Motif'),
        c('commentaire', 'text', false, 'Commentaire')
      ]
    },
    {
      key: 'heures', tab: 'Heures_Coachs', label: 'Heures des coachs', prefix: 'HEU',
      desc: 'Interventions des coachs. Coût = durée validée × taux horaire en vigueur à la date (Paramètres, catégorie taux_coach).',
      naturalKey: ['coach_id', 'date', 'heure_debut'],
      cols: [
        c('id', 'id', true, 'ID'),
        c('coach_id', 'ref', true, 'Coach', { ref: 'utilisateurs', refRole: 'coach' }),
        c('date', 'date', true, 'Date'),
        c('heure_debut', 'time', true, 'Début'),
        c('heure_fin', 'time', true, 'Fin'),
        c('duree_h', 'number', false, 'Durée (h)', { help: 'Calculée depuis début/fin.' }),
        c('type_activite', 'enum', true, 'Type de séance', { enumParam: 'type_activite' }),
        c('seance_id', 'ref', false, 'Séance', { ref: 'seances' }),
        c('cycle_id', 'ref', false, 'Académie (cycle)', { ref: 'cycles' }),
        c('evenement_id', 'ref', false, 'Événement', { ref: 'evenements' }),
        c('nb_participants', 'int', false, 'Participants'),
        c('nb_presents', 'int', false, 'Présents'),
        c('remplacement', 'bool', false, 'Remplacement'),
        c('remplace_coach_id', 'ref', false, 'Coach remplacé', { ref: 'utilisateurs', refRole: 'coach' }),
        c('annulation', 'bool', false, 'Séance annulée'),
        c('commentaire', 'longtext', false, 'Commentaire'),
        c('statut', 'enum', true, 'Statut', { enumName: 'statut_heure' }),
        c('motif_correction', 'text', false, 'Motif de correction'),
        c('demande_correction', 'text', false, 'Demande de correction (coach)'),
        c('valide_par', 'text', false, 'Validé par'),
        c('valide_le', 'text', false, 'Validé le'),
        c('paye_le', 'date', false, 'Payé le'),
        c('reference_paiement', 'text', false, 'Référence facture / relevé')
      ]
    },
    {
      key: 'paiements', tab: 'Paiements', label: 'Paiements', prefix: 'PAY',
      desc: 'Encaissements réels. Un paiement doit être rattaché à une inscription, une séance ou un événement, sauf « autres revenus ».',
      naturalKey: ['date_paiement', 'membre_id', 'montant', 'reference'],
      cols: [
        c('id', 'id', true, 'ID'),
        c('date_paiement', 'date', true, 'Date de paiement'),
        c('membre_id', 'ref', false, 'Membre', { ref: 'membres' }),
        c('inscription_id', 'ref', false, 'Inscription', { ref: 'inscriptions' }),
        c('evenement_id', 'ref', false, 'Événement', { ref: 'evenements' }),
        c('seance_id', 'ref', false, 'Séance', { ref: 'seances' }),
        c('categorie_revenu', 'enum', false, 'Catégorie (autres revenus)', { enumParam: 'categorie_revenu' }),
        c('montant', 'money', true, 'Montant (€)', { v: 'Nombre > 0 (un remboursement se saisit avec le statut « Remboursé »)' }),
        c('mode', 'enum', false, 'Mode de paiement', { enumName: 'mode_paiement' }),
        c('reference', 'text', false, 'Référence'),
        c('statut', 'enum', true, 'Statut', { enumName: 'statut_paiement' }),
        c('verifie_par', 'text', false, 'Vérifié par'),
        c('verifie_le', 'text', false, 'Vérifié le'),
        c('commentaire', 'longtext', false, 'Commentaire')
      ]
    },
    {
      key: 'depenses', tab: 'Dépenses', label: 'Dépenses', prefix: 'DEP',
      desc: 'Coûts directs (matériel, prix, catering, événements…). Le justificatif est obligatoire pour la qualité des données.',
      naturalKey: ['date', 'categorie', 'montant', 'fournisseur'],
      cols: [
        c('id', 'id', true, 'ID'),
        c('date', 'date', true, 'Date'),
        c('categorie', 'enum', true, 'Catégorie', { enumParam: 'categorie_depense' }),
        c('montant', 'money', true, 'Montant (€)'),
        c('fournisseur', 'text', false, 'Fournisseur'),
        c('type_activite', 'enum', false, 'Activité concernée', { enumParam: 'type_activite' }),
        c('evenement_id', 'ref', false, 'Événement', { ref: 'evenements' }),
        c('cycle_id', 'ref', false, 'Cycle', { ref: 'cycles' }),
        c('seance_id', 'ref', false, 'Séance', { ref: 'seances' }),
        c('justificatif', 'text', false, 'Justificatif (lien ou n° de pièce)'),
        c('statut', 'enum', true, 'Statut', { enumName: 'statut_depense' }),
        c('commentaire', 'longtext', false, 'Commentaire')
      ]
    },
    {
      key: 'evenements', tab: 'Événements', label: 'Événements', prefix: 'EVT',
      desc: 'Tournois et événements. Revenus = paiements rattachés (+ revenu déclaré si pas de détail) ; coûts = dépenses + heures coachs rattachées.',
      naturalKey: ['nom', 'date'],
      cols: [
        c('id', 'id', true, 'ID'),
        c('nom', 'text', true, 'Nom'),
        c('date', 'date', true, 'Date'),
        c('heure_debut', 'time', false, 'Début'),
        c('heure_fin', 'time', false, 'Fin'),
        c('type_activite', 'enum', true, 'Type', { enumParam: 'type_activite' }),
        c('format', 'text', false, 'Format'),
        c('terrains', 'refs', false, 'Terrains', { ref: 'terrains' }),
        c('nb_terrains', 'int', false, 'Nombre de terrains'),
        c('capacite', 'int', false, 'Capacité (joueurs)'),
        c('nb_inscrits', 'int', false, 'Inscrits'),
        c('nb_presents', 'int', false, 'Présents'),
        c('nb_equipes', 'int', false, 'Équipes'),
        c('payant', 'enum', false, 'Payant', { enumName: 'oui_non' }),
        c('revenu_declare', 'money', false, 'Revenu déclaré (€)', { help: 'Uniquement si les paiements ne sont pas détaillés.' }),
        c('partenaires', 'text', false, 'Partenaires / sponsors'),
        c('materiel', 'text', false, 'Matériel'),
        c('prix', 'text', false, 'Prix / lots'),
        c('catering', 'text', false, 'Catering'),
        c('incidents', 'longtext', false, 'Incidents'),
        c('statut', 'enum', true, 'Statut', { enumName: 'statut_evenement' }),
        c('commentaire', 'longtext', false, 'Commentaire')
      ]
    },
    {
      key: 'satisfaction', tab: 'Satisfaction', label: 'Satisfaction', prefix: 'SAT',
      desc: 'Avis des membres. NPS = % promoteurs (9-10) − % détracteurs (0-6), toujours affiché avec la taille de l\'échantillon.',
      naturalKey: ['date', 'membre_id', 'type_activite', 'seance_id', 'evenement_id'],
      cols: [
        c('id', 'id', true, 'ID'),
        c('date', 'date', true, 'Date'),
        c('membre_id', 'ref', false, 'Membre (facultatif)', { ref: 'membres' }),
        c('type_activite', 'enum', false, 'Activité concernée', { enumParam: 'type_activite' }),
        c('seance_id', 'ref', false, 'Séance', { ref: 'seances' }),
        c('evenement_id', 'ref', false, 'Événement', { ref: 'evenements' }),
        c('note_globale', 'rating10', false, 'Note globale /10'),
        c('note_terrains', 'rating10', false, 'Qualité des terrains /10'),
        c('note_organisation', 'rating10', false, 'Qualité de l\'organisation /10'),
        c('frequence_avant', 'enum', false, 'Fréquence de jeu avant l\'indoor', { enumName: 'frequence' }),
        c('frequence_apres', 'enum', false, 'Fréquence de jeu depuis l\'indoor', { enumName: 'frequence' }),
        c('activite_preferee', 'enum', false, 'Activité préférée', { enumParam: 'type_activite' }),
        c('amelioration', 'text', false, 'Amélioration prioritaire'),
        c('recommandation', 'rating10', true, 'Probabilité de recommandation (0-10)'),
        c('commentaire', 'longtext', false, 'Commentaire libre'),
        c('source', 'enum', false, 'Source', { enumName: 'source_satisfaction' })
      ]
    },
    {
      key: 'occupation', tab: 'Occupation_Terrains', label: 'Occupation des terrains', prefix: 'OCC',
      extra: true,
      desc: 'Feuille ajoutée au modèle demandé : réservations libres (exports ABS / application), heures bloquées, maintenance et indisponibilités. Les activités encadrées viennent de « Séances ».',
      naturalKey: ['terrain_id', 'date', 'heure_debut', 'type', 'reference_externe'],
      cols: [
        c('id', 'id', true, 'ID'),
        c('terrain_id', 'ref', true, 'Terrain', { ref: 'terrains' }),
        c('date', 'date', true, 'Date'),
        c('heure_debut', 'time', true, 'Début'),
        c('heure_fin', 'time', true, 'Fin'),
        c('type', 'enum', true, 'Type', { enumName: 'type_occupation' }),
        c('statut', 'enum', true, 'Statut', { enumName: 'statut_occupation' }),
        c('nb_joueurs', 'int', false, 'Joueurs'),
        c('reference_externe', 'text', false, 'Référence ABS / application'),
        c('commentaire', 'text', false, 'Commentaire')
      ]
    },
    {
      key: 'imports', tab: 'Imports', label: 'Imports', prefix: 'IMP',
      desc: 'Traçabilité de chaque import (source, date, auteur, résultat). Annuler un import archive toutes ses lignes.',
      naturalKey: ['id'],
      cols: [
        c('id', 'id', true, 'ID'),
        c('date', 'text', true, 'Date et heure'),
        c('utilisateur', 'text', true, 'Utilisateur'),
        c('source', 'text', true, 'Source', { help: 'ABS, application, planning académie, présences, factures coach, inscriptions événement…' }),
        c('feuille_cible', 'text', true, 'Feuille cible'),
        c('fichier', 'text', false, 'Nom du fichier'),
        c('nb_lignes', 'int', false, 'Lignes lues'),
        c('nb_importees', 'int', false, 'Lignes importées'),
        c('nb_doublons', 'int', false, 'Doublons ignorés'),
        c('nb_erreurs', 'int', false, 'Lignes en erreur'),
        c('statut', 'enum', true, 'Statut', { enumName: 'statut_import' }),
        c('rapport', 'longtext', false, 'Rapport (JSON)'),
        c('annule_le', 'text', false, 'Annulé le'),
        c('annule_par', 'text', false, 'Annulé par')
      ]
    },
    {
      key: 'audit', tab: 'Journal_Audit', label: 'Journal d\'audit', prefix: 'AUD',
      desc: 'Historique des accès et modifications sensibles. Feuille en ajout seul : ne jamais la modifier.',
      naturalKey: ['id'],
      noMeta: true,
      cols: [
        c('id', 'id', true, 'ID'),
        c('date', 'text', true, 'Date et heure'),
        c('utilisateur', 'text', true, 'Utilisateur'),
        c('role', 'text', false, 'Rôle'),
        c('action', 'text', true, 'Action'),
        c('feuille', 'text', false, 'Feuille'),
        c('ligne_id', 'text', false, 'Ligne'),
        c('avant', 'longtext', false, 'Avant (JSON)'),
        c('apres', 'longtext', false, 'Après (JSON)'),
        c('motif', 'text', false, 'Motif')
      ]
    }
  ];

  SHEETS.forEach(function (s) { if (!s.noMeta) s.cols = s.cols.concat(META); });

  var BY_KEY = {};
  SHEETS.forEach(function (s) { BY_KEY[s.key] = s; });

  function sheet(key) { return BY_KEY[key]; }
  function col(sheetKey, name) {
    var s = BY_KEY[sheetKey]; if (!s) return null;
    for (var i = 0; i < s.cols.length; i++) if (s.cols[i].n === name) return s.cols[i];
    return null;
  }
  function headers(sheetKey) { return BY_KEY[sheetKey].cols.map(function (c) { return c.n; }); }

  /**
   * Valeurs initiales réelles (et non fictives) issues du cadrage du 01/11/2026.
   * Elles sont chargées par setupSpreadsheet() dans la feuille « Paramètres ».
   * Toute valeur inconnue reste vide : elle apparaît dans « Qualité des données ».
   */
  var INITIAL_PARAMETRES = (function () {
    var src = 'Cadrage 01/11/2026';
    var rows = [];
    function p(categorie, cle, valeur, extra) {
      var r = { categorie: categorie, cle: cle, reference: '', valeur: valeur === undefined ? '' : valeur, libelle: '', attributs: '', date_effet: '', date_fin: '', statut: 'actif', source: src, description: '' };
      if (extra) for (var k in extra) r[k] = extra[k];
      rows.push(r);
    }
    p('general', 'nom_club', 'David Lloyd Brussels Uccle');
    p('general', 'date_ouverture_indoor', '2026-08-31', { source: 'Confirmé par Anthony (01/11/2026)', description: 'Ouverture des 3 terrains indoor. Début de l\'historique.' });
    p('general', 'date_debut_historique', '', { description: 'Vide = date d\'ouverture indoor.' });
    p('general', 'duree_creneau_libre_min', '90', { description: 'Réservation libre : 1 h 30, jusqu\'à 4 joueurs.' });
    p('general', 'delai_conversion_taster_jours', '14', { description: 'Conversion Taster : autre activité dans les N jours.' });
    p('general', 'base_reconnaissance', 'attendu', { description: '« attendu » : revenu reconnu = montant attendu ÷ séances prévues × séances consommées. « encaisse » : sur le montant encaissé.' });
    p('general', 'inclure_cours_prives', 'non', { description: 'Cours privés d\'Anthony exclus du P&L (paiement direct).' });
    p('general', 'inclure_cout_terrains', 'non', { description: 'Coût théorique des terrains exclu sauf activation explicite.' });
    p('general', 'cout_horaire_terrain', '', { source: 'Non fourni', description: 'Utilisé seulement si inclure_cout_terrains = oui.' });
    p('general', 'montants_tva', 'TVAC', { source: 'Confirmé par Anthony (01/11/2026)', description: 'Tous les montants sont saisis TVAC ; aucun retraitement de TVA.' });
    p('general', 'nb_seances_cycle_conseille', '15 ou 20', { source: 'Confirmé par Anthony (01/11/2026)', description: 'Cycles flexibles : le nombre de séances se fixe par cycle (idéalement 15 ou 20).' });
    p('general', 'seuil_echantillon_nps', '30', { source: 'Proposition', description: 'En dessous, le NPS est signalé comme peu fiable.' });
    p('taux_coach', 'taux_horaire', '35', { reference: 'USR-GILLES', libelle: 'Gilles', date_effet: '2026-08-31', source: 'Confirmé par Anthony (01/11/2026) : seul coach, 35 €/h', description: 'Taux de Gilles depuis l\'ouverture. Un nouveau taux s\'ajoute avec sa date d\'effet.' });
    var niveaux = [['1', 'Rookie', '-'], ['2', 'Control', '0,5-1,2'], ['3', 'Strategy', '1,2-2,0'], ['4', 'Performance', '2,0-2,8'], ['5', 'Challenge', '2,8-3,6'], ['6', 'Competition P300', '3,6-4,4'], ['7', 'Competition P400/P500', '4,4-5,2'], ['8', 'Elite', '5,2+']];
    niveaux.forEach(function (n) { p('niveau', n[0], n[1], { libelle: n[1], attributs: 'playtomic=' + n[2] }); });
    var types = [
      ['padel_taster', 'Padel Taster', 'public=adulte; payant=non; encadre=oui; famille=decouverte'],
      ['new_to_padel', 'New to Padel Social Session', 'public=adulte; payant=non; encadre=oui; famille=decouverte'],
      ['afterwork', 'Afterwork', 'public=adulte; payant=non; encadre=oui; famille=social'],
      ['collectif_adulte', 'Académie / collectif adulte', 'public=adulte; payant=oui; encadre=oui; famille=academie'],
      ['collectif_junior', 'Académie / collectif junior', 'public=junior; payant=oui; encadre=oui; famille=academie'],
      ['padel_squad', 'Padel Squad (8-11 ans)', 'public=junior; payant=non; encadre=oui; famille=decouverte'],
      ['tournoi', 'Tournoi', 'public=mixte; encadre=oui; famille=tournoi'],
      ['padel_physical', 'Padel + Physical Training', 'public=adulte; encadre=oui; famille=evenement'],
      ['clinic', 'Clinic', 'public=mixte; encadre=oui; famille=academie'],
      ['cours_prive', 'Cours privé (hors P&L)', 'public=mixte; payant=oui; encadre=oui; famille=prive']
    ];
    types.forEach(function (t) {
      p('type_activite', t[0], t[1], { libelle: t[1], attributs: t[2], statut: t[0] === 'clinic' ? 'archive' : 'actif',
        description: t[0] === 'clinic' ? 'Pas encore actives : ne rien annoncer avant publication.' : (t[0] === 'padel_physical' ? 'Ponctuel ; anciennes références à ne pas généraliser.' : '') });
    });
    ['materiel', 'prix_recompenses', 'catering', 'evenement', 'autre'].forEach(function (k) {
      p('categorie_depense', k, { materiel: 'Matériel', prix_recompenses: 'Prix et récompenses', catering: 'Catering', evenement: 'Coûts d\'événement', autre: 'Autre' }[k]);
    });
    ['autre', 'cours_prive'].forEach(function (k) {
      p('categorie_revenu', k, k === 'autre' ? 'Autres revenus' : 'Cours privés (exclus par défaut)');
    });
    return rows;
  })();

  /** Offres initiales confirmées par Anthony (01/11/2026), adultes et enfants, payables à l'avance :
   *  25 €/personne pour une séance d'1 h, 35 €/personne pour une séance d'1 h 30 (même tarif si groupe incomplet).
   *  Le nombre de séances est flexible : il se fixe sur chaque cycle (idéalement 15 ou 20). */
  var INITIAL_OFFRES = (function () {
    var src = 'Confirmé par Anthony (01/11/2026)';
    var com = 'Payable à l\'avance. Même tarif si groupe incomplet. Nombre de séances fixé par cycle (15 ou 20 conseillé).';
    function o(id, nom, type, pub, min, tarif) {
      return { id: id, nom: nom, type_activite: type, public: pub, duree_seance_min: min, nb_seances: '', tarif_seance: tarif, prix_cycle: '',
        taille_min: 2, taille_max: 4, date_effet: '2026-08-31', date_fin: '', statut: 'actif', source: src, commentaire: com };
    }
    return [
      o('OFF-ADULTE-60', 'Collectif adulte 1 h – 25 €/séance', 'collectif_adulte', 'adulte', 60, 25),
      o('OFF-ADULTE-90', 'Collectif adulte 1 h 30 – 35 €/séance', 'collectif_adulte', 'adulte', 90, 35),
      o('OFF-JUNIOR-60', 'Collectif junior 1 h – 25 €/séance', 'collectif_junior', 'junior', 60, 25),
      o('OFF-JUNIOR-90', 'Collectif junior 1 h 30 – 35 €/séance', 'collectif_junior', 'junior', 90, 35)
    ];
  })();
  /** Horaires confirmés : 8 h – 21 h pour les six terrains. */
  var HORAIRES_TERRAINS = '08:00-21:00';

  return { ENUMS: ENUMS, SHEETS: SHEETS, META: META, sheet: sheet, col: col, headers: headers, INITIAL_PARAMETRES: INITIAL_PARAMETRES, INITIAL_OFFRES: INITIAL_OFFRES, HORAIRES_TERRAINS: HORAIRES_TERRAINS };
});
