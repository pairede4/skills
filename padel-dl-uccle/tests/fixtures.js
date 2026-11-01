/**
 * Jeu de test minimal, construit à la main pour vérifier les calculs.
 * DONNÉES FICTIVES – aucune donnée réelle.
 */
function p(categorie, cle, valeur, extra) {
  return Object.assign({ id: 'P-' + categorie + '-' + cle + '-' + (extra && extra.reference || '') + (extra && extra.date_effet || ''), categorie, cle, valeur, reference: '', statut: 'actif', date_effet: '', attributs: '' }, extra || {});
}
const ALL_DAYS = { horaires_lun: '08:00-22:00', horaires_mar: '08:00-22:00', horaires_mer: '08:00-22:00', horaires_jeu: '08:00-22:00', horaires_ven: '08:00-22:00', horaires_sam: '08:00-22:00', horaires_dim: '08:00-22:00' };

function build() {
  return {
    parametres: [
      p('general', 'date_ouverture_indoor', '2026-08-17'),
      p('general', 'delai_conversion_taster_jours', '14'),
      p('general', 'base_reconnaissance', 'attendu'),
      ...[1, 2, 3, 4, 5].map((d) => p('heures_pointe', 'soir', '17:00-22:00', { reference: String(d) })),
      p('taux_coach', 'taux_horaire', '35', { reference: 'U-C1', date_effet: '2026-08-01' }),
      p('taux_coach', 'taux_horaire', '40', { reference: 'U-C1', date_effet: '2026-10-01' }),
      p('type_activite', 'collectif_adulte', 'Collectif adulte', { libelle: 'Collectif adulte', attributs: 'public=adulte; payant=oui; famille=academie' }),
      p('type_activite', 'collectif_junior', 'Collectif junior', { libelle: 'Collectif junior', attributs: 'public=junior; payant=oui; famille=academie' }),
      p('type_activite', 'padel_taster', 'Padel Taster', { libelle: 'Padel Taster', attributs: 'public=adulte; payant=non; famille=decouverte' }),
      p('type_activite', 'tournoi', 'Tournoi', { libelle: 'Tournoi', attributs: 'famille=tournoi' })
    ],
    utilisateurs: [
      { id: 'U-A', email: 'admin@demo.invalid', nom_affiche: 'Admin démo', role: 'admin', actif: true },
      { id: 'U-C1', email: 'coach1@demo.invalid', nom_affiche: 'Coach Démo 1', role: 'coach', actif: true },
      { id: 'U-C2', email: 'coach2@demo.invalid', nom_affiche: 'Coach Démo 2', role: 'coach', actif: true }
    ],
    terrains: [
      Object.assign({ id: 'T1', numero: 1, nom: 'Indoor 1', lieu: 'indoor', date_mise_en_service: '2026-08-17', statut: 'actif' }, ALL_DAYS),
      { id: 'T2', numero: 4, nom: 'Outdoor 4', lieu: 'outdoor', statut: 'actif', horaires_lun: '09:00-21:00', horaires_mar: '09:00-21:00', horaires_mer: '09:00-21:00', horaires_jeu: '09:00-21:00', horaires_ven: '09:00-21:00', horaires_sam: 'fermé', horaires_dim: '' }
    ],
    membres: [{ id: 'M1', segment: 'adulte', statut: 'actif' }, { id: 'M2', segment: 'adulte', statut: 'actif' }, { id: 'M3', segment: 'adulte', statut: 'actif' }],
    offres: [
      { id: 'O1', nom: 'Collectif 1h', type_activite: 'collectif_adulte', public: 'adulte', nb_seances: 4, tarif_seance: 25, date_effet: '2026-08-01', statut: 'actif' },
      { id: 'O2', nom: 'Collectif junior (tarif inconnu)', type_activite: 'collectif_junior', public: 'junior', nb_seances: 4, tarif_seance: '', date_effet: '2026-08-01', statut: 'actif' }
    ],
    cycles: [
      { id: 'C1', nom: 'Groupe mardi', offre_id: 'O1', coach_id: 'U-C1', date_debut: '2026-09-01', capacite: 4, statut: 'en_cours' },
      { id: 'C2', nom: 'Groupe junior', offre_id: 'O2', coach_id: 'U-C1', date_debut: '2026-09-01', capacite: '', statut: 'en_cours' }
    ],
    seances: [
      { id: 'S1', date: '2026-09-01', heure_debut: '18:00', heure_fin: '19:00', type_activite: 'collectif_adulte', cycle_id: 'C1', terrains: 'T1', coach_id: 'U-C1', statut: 'realisee' },
      { id: 'S2', date: '2026-09-08', heure_debut: '18:00', heure_fin: '19:00', type_activite: 'collectif_adulte', cycle_id: 'C1', terrains: 'T1', coach_id: 'U-C1', statut: 'realisee' },
      { id: 'S3', date: '2026-09-15', heure_debut: '18:00', heure_fin: '19:00', type_activite: 'collectif_adulte', cycle_id: 'C1', terrains: 'T1', coach_id: 'U-C1', statut: 'annulee_club' },
      { id: 'S4', date: '2026-09-22', heure_debut: '18:00', heure_fin: '19:00', type_activite: 'collectif_adulte', cycle_id: 'C1', terrains: 'T1', coach_id: 'U-C1', statut: 'realisee' },
      { id: 'S5', date: '2026-09-29', heure_debut: '18:00', heure_fin: '19:00', type_activite: 'collectif_adulte', cycle_id: 'C1', terrains: 'T1', coach_id: 'U-C1', statut: 'realisee' },
      { id: 'S6', date: '2026-09-07', heure_debut: '10:00', heure_fin: '11:30', type_activite: 'padel_taster', terrains: 'T1', capacite: 4, nb_inscrits: 4, nb_presents: 3, nb_absents: 0, nb_no_shows: 1, nb_annulations: 0, statut: 'realisee' },
      { id: 'S7', date: '2026-09-02', heure_debut: '17:00', heure_fin: '18:00', type_activite: 'collectif_junior', cycle_id: 'C2', terrains: 'T1', coach_id: 'U-C1', statut: 'realisee' },
      { id: 'S8', date: '2026-09-10', heure_debut: '11:00', heure_fin: '12:00', type_activite: 'padel_taster', terrains: 'T1', capacite: 4, statut: 'realisee' }
    ],
    inscriptions: [
      { id: 'I1', membre_id: 'M1', cycle_id: 'C1', date_inscription: '2026-08-25', statut: 'inscrit' },
      { id: 'I2', membre_id: 'M2', cycle_id: 'C1', date_inscription: '2026-09-05', date_premiere_seance: '2026-09-08', nb_seances_prevues: 3, statut: 'inscrit' },
      { id: 'I3', membre_id: 'M3', cycle_id: 'C2', date_inscription: '2026-08-25', statut: 'inscrit' }
    ],
    presences: [
      { id: 'PR1', seance_id: 'S1', membre_id: 'M1', statut: 'present' },
      { id: 'PR2', seance_id: 'S2', membre_id: 'M1', statut: 'absent' },
      { id: 'PR3', seance_id: 'S2', membre_id: 'M2', statut: 'present' },
      { id: 'PR4', seance_id: 'S8', membre_id: 'M3', statut: 'present' },
      { id: 'PR5', seance_id: 'S7', membre_id: 'M3', statut: 'present' }
    ],
    heures: [
      { id: 'H1', coach_id: 'U-C1', date: '2026-09-28', heure_debut: '18:00', heure_fin: '19:30', type_activite: 'collectif_adulte', cycle_id: 'C1', statut: 'valide', nb_presents: 2 },
      { id: 'H2', coach_id: 'U-C1', date: '2026-10-05', heure_debut: '18:00', heure_fin: '19:00', type_activite: 'collectif_adulte', statut: 'paye' },
      { id: 'H3', coach_id: 'U-C1', date: '2026-09-29', heure_debut: '18:00', heure_fin: '19:00', type_activite: 'collectif_adulte', statut: 'soumis' },
      { id: 'H4', coach_id: 'U-C2', date: '2026-09-20', heure_debut: '10:00', heure_fin: '11:00', type_activite: 'padel_taster', statut: 'valide' }
    ],
    paiements: [
      { id: 'PA1', date_paiement: '2026-08-28', membre_id: 'M1', inscription_id: 'I1', montant: 100, statut: 'encaisse' },
      { id: 'PA2', date_paiement: '2026-09-05', membre_id: 'M2', inscription_id: 'I2', montant: 75, statut: 'encaisse' },
      { id: 'PA3', date_paiement: '2026-09-12', membre_id: 'M3', montant: 20, statut: 'encaisse' }
    ],
    depenses: [
      { id: 'D1', date: '2026-09-10', categorie: 'materiel', montant: 30, type_activite: 'collectif_adulte', statut: 'payee', justificatif: 'F-1' },
      { id: 'D2', date: '2026-09-11', categorie: 'catering', montant: 12.5, statut: 'payee', justificatif: '' }
    ],
    evenements: [],
    satisfaction: [10, 9, 8, 7, 6, 0, 10].map((s, i) => ({ id: 'SA' + i, date: '2026-09-15', recommandation: s, note_globale: 8 })),
    occupation: [
      { id: 'OC1', terrain_id: 'T1', date: '2026-09-07', heure_debut: '11:00', heure_fin: '12:30', type: 'reservation_libre', statut: 'reserve' },
      { id: 'OC2', terrain_id: 'T1', date: '2026-09-07', heure_debut: '20:00', heure_fin: '22:00', type: 'maintenance', statut: 'reserve' },
      { id: 'OC3', terrain_id: 'T1', date: '2026-09-07', heure_debut: '13:00', heure_fin: '14:30', type: 'reservation_libre', statut: 'annule' }
    ],
    imports: [], audit: []
  };
}
module.exports = { build };
