// Généré par scripts/build.js – ne pas modifier ici.
/* ---- src/core/util.js ---- */
/**
 * Utilitaires partagés : dates, nombres, formatage FR et « mesures »
 * (une valeur numérique accompagnée de la liste des données manquantes).
 *
 * Règle fondamentale du cadrage : une donnée inconnue n'est JAMAIS convertie
 * en zéro. Toute fonction de calcul renvoie une mesure { v, gaps } :
 *   - v    : nombre, ou null si la valeur ne peut pas être calculée ;
 *   - gaps : raisons lisibles expliquant ce qui manque.
 *
 * Fichier « universel » : utilisable dans le navigateur, dans Apps Script
 * et sous Node (tests).
 */
(function (root, factory) {
  var mod = factory();
  if (typeof module === 'object' && module.exports) module.exports = mod;
  root.Padel = root.Padel || {};
  root.Padel.util = mod;
})(typeof globalThis !== 'undefined' ? globalThis : this, function () {
  'use strict';

  // ---------------------------------------------------------------- valeurs
  function isBlank(v) {
    return v === null || v === undefined || (typeof v === 'string' && v.trim() === '');
  }

  /** Convertit "12,5" / "12.5" / 12.5 / "1 234,50 €" en nombre ; vide -> null. */
  function num(v) {
    if (isBlank(v)) return null;
    if (typeof v === 'number') return isFinite(v) ? v : null;
    var s = String(v).replace(/[€\s %]/g, '');
    if (/^-?\d{1,3}(\.\d{3})+(,\d+)?$/.test(s)) s = s.replace(/\./g, '');
    s = s.replace(',', '.');
    if (!/^-?\d*\.?\d+$/.test(s)) return null;
    var n = parseFloat(s);
    return isFinite(n) ? n : null;
  }

  function bool(v) {
    if (v === true || v === false) return v;
    if (isBlank(v)) return null;
    var s = String(v).trim().toLowerCase();
    if (['true', 'vrai', 'oui', 'yes', '1', 'x'].indexOf(s) >= 0) return true;
    if (['false', 'faux', 'non', 'no', '0'].indexOf(s) >= 0) return false;
    return null;
  }

  function round(n, d) {
    if (n === null || n === undefined) return null;
    var f = Math.pow(10, d === undefined ? 2 : d);
    return Math.round(n * f) / f;
  }

  function splitList(v) {
    if (isBlank(v)) return [];
    if (Array.isArray(v)) return v.filter(function (x) { return !isBlank(x); }).map(String);
    return String(v).split(/[,;|]/).map(function (s) { return s.trim(); }).filter(Boolean);
  }

  // ---------------------------------------------------------------- dates
  function pad(n) { return (n < 10 ? '0' : '') + n; }

  /** Normalise une date en 'AAAA-MM-JJ'. Accepte ISO, JJ/MM/AAAA, Date. */
  function parseDate(v) {
    if (isBlank(v)) return null;
    if (v instanceof Date) {
      if (isNaN(v.getTime())) return null;
      return v.getFullYear() + '-' + pad(v.getMonth() + 1) + '-' + pad(v.getDate());
    }
    var s = String(v).trim();
    var m = s.match(/^(\d{4})-(\d{1,2})-(\d{1,2})/);
    if (m) return valid(+m[1], +m[2], +m[3]);
    m = s.match(/^(\d{1,2})[\/.\-](\d{1,2})[\/.\-](\d{4})/);
    if (m) return valid(+m[3], +m[2], +m[1]);
    m = s.match(/^(\d{1,2})[\/.\-](\d{1,2})[\/.\-](\d{2})$/);
    if (m) return valid(2000 + +m[3], +m[2], +m[1]);
    return null;
    function valid(y, mo, d) {
      var dt = new Date(Date.UTC(y, mo - 1, d));
      if (dt.getUTCFullYear() !== y || dt.getUTCMonth() !== mo - 1 || dt.getUTCDate() !== d) return null;
      return y + '-' + pad(mo) + '-' + pad(d);
    }
  }

  /** Normalise une heure en 'HH:MM'. Accepte "9h30", "09:30", "930", Date. */
  function parseTime(v) {
    if (isBlank(v)) return null;
    if (v instanceof Date) return pad(v.getHours()) + ':' + pad(v.getMinutes());
    var s = String(v).trim().toLowerCase().replace(/\s/g, '');
    var m = s.match(/^(\d{1,2})[:hH.](\d{2})?(:\d{2})?$/) || s.match(/^(\d{1,2})h$/);
    if (!m && /^\d{3,4}$/.test(s)) m = [s, s.slice(0, s.length - 2), s.slice(-2)];
    if (!m) return null;
    var h = +m[1], mi = m[2] ? +m[2] : 0;
    if (h === 24 && mi === 0) return '24:00';
    if (h > 23 || mi > 59) return null;
    return pad(h) + ':' + pad(mi);
  }

  function toMinutes(t) {
    var p = parseTime(t);
    if (!p) return null;
    var a = p.split(':');
    return +a[0] * 60 + +a[1];
  }

  function fromMinutes(m) { return pad(Math.floor(m / 60)) + ':' + pad(m % 60); }

  function dateObj(d) { var a = d.split('-'); return new Date(Date.UTC(+a[0], +a[1] - 1, +a[2])); }
  function iso(dt) { return dt.getUTCFullYear() + '-' + pad(dt.getUTCMonth() + 1) + '-' + pad(dt.getUTCDate()); }
  function addDays(d, n) { var dt = dateObj(d); dt.setUTCDate(dt.getUTCDate() + n); return iso(dt); }
  function addMonths(d, n) {
    var dt = dateObj(d); var day = dt.getUTCDate();
    dt.setUTCDate(1); dt.setUTCMonth(dt.getUTCMonth() + n);
    var last = new Date(Date.UTC(dt.getUTCFullYear(), dt.getUTCMonth() + 1, 0)).getUTCDate();
    dt.setUTCDate(Math.min(day, last));
    return iso(dt);
  }
  function daysBetween(a, b) { return Math.round((dateObj(b) - dateObj(a)) / 86400000); }
  /** 1 = lundi … 7 = dimanche */
  function weekday(d) { var w = dateObj(d).getUTCDay(); return w === 0 ? 7 : w; }
  function eachDay(from, to) {
    var out = [];
    if (!from || !to || from > to) return out;
    for (var d = from; d <= to; d = addDays(d, 1)) out.push(d);
    return out;
  }
  function inRange(d, from, to) { return !!d && (!from || d >= from) && (!to || d <= to); }
  function startOfWeek(d) { return addDays(d, 1 - weekday(d)); }
  function startOfMonth(d) { return d.slice(0, 8) + '01'; }
  function endOfMonth(d) { return addDays(addMonths(startOfMonth(d), 1), -1); }
  function startOfQuarter(d) {
    var m = +d.slice(5, 7); var q = Math.floor((m - 1) / 3) * 3 + 1;
    return d.slice(0, 5) + pad(q) + '-01';
  }
  function isoWeek(d) {
    var dt = dateObj(d); var day = weekday(d);
    dt.setUTCDate(dt.getUTCDate() + 4 - day);
    var y = dt.getUTCFullYear();
    var w = Math.ceil(((dt - Date.UTC(y, 0, 1)) / 86400000 + 1) / 7);
    return { year: y, week: w };
  }

  /** Période standard. kind : semaine | mois | trimestre | personnalisee */
  function periodRange(kind, anchor, customTo) {
    if (kind === 'semaine') { var s = startOfWeek(anchor); return { kind: kind, from: s, to: addDays(s, 6) }; }
    if (kind === 'mois') return { kind: kind, from: startOfMonth(anchor), to: endOfMonth(anchor) };
    if (kind === 'trimestre') { var q = startOfQuarter(anchor); return { kind: kind, from: q, to: addDays(addMonths(q, 3), -1) }; }
    return { kind: 'personnalisee', from: anchor, to: customTo || anchor };
  }

  /** Période précédente de même nature (ou de même durée si personnalisée). */
  function previousPeriod(p) {
    if (p.kind === 'semaine') return periodRange('semaine', addDays(p.from, -7));
    if (p.kind === 'mois') return periodRange('mois', addMonths(p.from, -1));
    if (p.kind === 'trimestre') return periodRange('trimestre', addMonths(p.from, -3));
    var len = daysBetween(p.from, p.to) + 1;
    return { kind: 'personnalisee', from: addDays(p.from, -len), to: addDays(p.from, -1) };
  }

  var MOIS = ['janvier', 'février', 'mars', 'avril', 'mai', 'juin', 'juillet', 'août', 'septembre', 'octobre', 'novembre', 'décembre'];
  var JOURS = ['lundi', 'mardi', 'mercredi', 'jeudi', 'vendredi', 'samedi', 'dimanche'];
  var JOURS_COURTS = ['lun', 'mar', 'mer', 'jeu', 'ven', 'sam', 'dim'];

  function fmtDate(d, long) {
    if (!d) return '';
    var a = d.split('-');
    if (long) return +a[2] + ' ' + MOIS[+a[1] - 1] + ' ' + a[0];
    return a[2] + '/' + a[1] + '/' + a[0];
  }
  function periodLabel(p) {
    if (!p) return '';
    if (p.kind === 'mois') return MOIS[+p.from.slice(5, 7) - 1] + ' ' + p.from.slice(0, 4);
    if (p.kind === 'trimestre') return 'T' + (Math.floor((+p.from.slice(5, 7) - 1) / 3) + 1) + ' ' + p.from.slice(0, 4);
    if (p.kind === 'semaine') return 'semaine ' + isoWeek(p.from).week + ' (' + fmtDate(p.from) + ' – ' + fmtDate(p.to) + ')';
    return fmtDate(p.from) + ' – ' + fmtDate(p.to);
  }

  // ---------------------------------------------------------------- format
  var INDISPO = 'donnée indisponible';
  function fmtNum(n, d) {
    if (n === null || n === undefined || !isFinite(n)) return INDISPO;
    return n.toLocaleString('fr-BE', { minimumFractionDigits: d || 0, maximumFractionDigits: d === undefined ? 1 : d });
  }
  function fmtEUR(n, d) {
    if (n === null || n === undefined || !isFinite(n)) return INDISPO;
    return n.toLocaleString('fr-BE', { minimumFractionDigits: d === undefined ? 0 : d, maximumFractionDigits: d === undefined ? 0 : d }) + ' €';
  }
  function fmtPct(r, d) {
    if (r === null || r === undefined || !isFinite(r)) return INDISPO;
    return (r * 100).toLocaleString('fr-BE', { minimumFractionDigits: 0, maximumFractionDigits: d === undefined ? 1 : d }) + ' %';
  }
  function fmtHours(h) {
    if (h === null || h === undefined || !isFinite(h)) return INDISPO;
    return h.toLocaleString('fr-BE', { maximumFractionDigits: 1 }) + ' h';
  }

  // ---------------------------------------------------------------- mesures
  function uniq(list) { var s = {}; return list.filter(function (x) { if (s[x]) return false; s[x] = 1; return true; }); }
  function known(v) { return { v: v, gaps: [] }; }
  function missing(reason) { return { v: null, gaps: [reason] }; }
  function m(v, gaps) { return { v: v === undefined ? null : v, gaps: uniq(gaps || []) }; }
  /** Somme : additionne les valeurs connues, conserve toutes les lacunes. */
  function sum(list) {
    var v = 0, any = false, gaps = [];
    list.forEach(function (x) {
      if (x === null || x === undefined) return;
      if (typeof x === 'number') { v += x; any = true; return; }
      if (x.v !== null && x.v !== undefined) { v += x.v; any = true; }
      gaps = gaps.concat(x.gaps || []);
    });
    if (!any && gaps.length) return m(null, gaps);
    return m(round(v, 6), gaps);
  }
  function sub(a, b) {
    var gaps = (a.gaps || []).concat(b.gaps || []);
    if (a.v === null || b.v === null) return m(null, gaps);
    return m(round(a.v - b.v, 6), gaps);
  }
  function mul(a, k) { return m(a.v === null ? null : round(a.v * k, 6), a.gaps); }
  /** Ratio : null si numérateur/dénominateur inconnu ou dénominateur nul. */
  function ratio(a, b, label) {
    a = typeof a === 'number' ? known(a) : a;
    b = typeof b === 'number' ? known(b) : b;
    var gaps = (a.gaps || []).concat(b.gaps || []);
    if (a.v === null || b.v === null) return m(null, gaps.length ? gaps : [(label || 'ratio') + ' : donnée manquante']);
    if (b.v === 0) return m(null, gaps.concat([(label || 'ratio') + ' : dénominateur nul']));
    return m(a.v / b.v, gaps);
  }
  /** Variation relative entre deux mesures (période vs période précédente). */
  function delta(cur, prev) {
    if (!cur || !prev || cur.v === null || prev.v === null || prev.v === 0) return null;
    return (cur.v - prev.v) / Math.abs(prev.v);
  }

  // ---------------------------------------------------------------- divers
  function groupBy(list, fn) {
    var out = {};
    list.forEach(function (x) { var k = fn(x); (out[k] = out[k] || []).push(x); });
    return out;
  }
  function indexBy(list, key) {
    var out = {};
    list.forEach(function (x) { if (!isBlank(x[key])) out[x[key]] = x; });
    return out;
  }
  function normalize(s) {
    return String(s === null || s === undefined ? '' : s).toLowerCase()
      .normalize('NFD').replace(/[̀-ͯ]/g, '')
      .replace(/[^a-z0-9]+/g, '_').replace(/^_|_$/g, '');
  }
  var counter = 0;
  function newId(prefix) {
    counter = (counter + 1) % 1296;
    return (prefix || 'ID') + '-' + Date.now().toString(36).toUpperCase() + '-' +
      Math.floor(Math.random() * 46656).toString(36).toUpperCase() + counter.toString(36).toUpperCase();
  }
  function escapeHtml(s) {
    return String(s === null || s === undefined ? '' : s)
      .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;').replace(/'/g, '&#39;');
  }

  return {
    INDISPO: INDISPO, MOIS: MOIS, JOURS: JOURS, JOURS_COURTS: JOURS_COURTS,
    isBlank: isBlank, num: num, bool: bool, round: round, splitList: splitList,
    parseDate: parseDate, parseTime: parseTime, toMinutes: toMinutes, fromMinutes: fromMinutes,
    addDays: addDays, addMonths: addMonths, daysBetween: daysBetween, weekday: weekday, eachDay: eachDay,
    inRange: inRange, startOfWeek: startOfWeek, startOfMonth: startOfMonth, endOfMonth: endOfMonth,
    startOfQuarter: startOfQuarter, isoWeek: isoWeek, periodRange: periodRange, previousPeriod: previousPeriod,
    fmtDate: fmtDate, periodLabel: periodLabel, fmtNum: fmtNum, fmtEUR: fmtEUR, fmtPct: fmtPct, fmtHours: fmtHours,
    known: known, missing: missing, m: m, sum: sum, sub: sub, mul: mul, ratio: ratio, delta: delta, uniq: uniq,
    groupBy: groupBy, indexBy: indexBy, normalize: normalize, newId: newId, escapeHtml: escapeHtml
  };
});

/* ---- src/core/schema.js ---- */
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
      permission: 'Permission (surcharge par rôle)', indicateur_club: 'Indicateur club (Power BI)', objectif: 'Objectif (programme gratuit, KPI)'
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
    source_satisfaction: { formulaire: 'Formulaire app', papier: 'Papier', import: 'Import' },
    segment_kpi: { total: 'Total', adulte: 'Adultes', junior: 'Juniors' }
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
      key: 'indicateurs', tab: 'Indicateurs_Club', label: 'Indicateurs club (Power BI)', prefix: 'KPI',
      extra: true,
      desc: 'Feuille ajoutée : chiffres du club transmis par Power BI (membres, joueurs de padel, réservations, âge moyen…), une ligne par indicateur et par période. Sert au taux de pénétration et aux rapports pour Laurent. Rien n\'est estimé : une période sans ligne est « donnée indisponible ».',
      naturalKey: ['indicateur', 'segment', 'date_debut', 'date_fin'],
      cols: [
        c('id', 'id', true, 'ID'),
        c('date_debut', 'date', true, 'Début de la période'),
        c('date_fin', 'date', true, 'Fin de la période'),
        c('indicateur', 'enum', true, 'Indicateur', { enumParam: 'indicateur_club' }),
        c('segment', 'enum', true, 'Segment', { enumName: 'segment_kpi' }),
        c('valeur', 'number', true, 'Valeur'),
        c('source', 'text', false, 'Source', { help: 'Ex. Power BI – rapport Membres, export du 05/12/2026.' }),
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
    // Indicateurs club (Power BI). attributs : unite ; agregation = dernier (stock, ex. nombre de membres) ou somme (flux).
    [
      ['membres_club_total', 'Membres du club (total)', 'unite=membres; agregation=dernier'],
      ['membres_padel_actifs', 'Membres ayant joué au padel sur la période', 'unite=membres; agregation=dernier'],
      ['membres_reservants', 'Membres ayant réservé un terrain sur la période', 'unite=membres; agregation=dernier'],
      ['reservations_terrains', 'Réservations de terrains', 'unite=réservations; agregation=somme'],
      ['heures_reservees', 'Heures de terrain réservées', 'unite=heures; agregation=somme'],
      ['nouveaux_membres_club', 'Nouveaux membres du club', 'unite=membres; agregation=somme'],
      ['nouveaux_membres_padel', 'Nouveaux membres ayant joué au padel', 'unite=membres; agregation=somme'],
      ['nouveaux_joueurs_padel', 'Membres existants ayant commencé le padel', 'unite=membres; agregation=somme'],
      ['age_moyen_padel', 'Âge moyen des joueurs de padel', 'unite=ans; agregation=dernier'],
      ['age_moyen_club', 'Âge moyen des membres du club', 'unite=ans; agregation=dernier'],
      ['participants_evenements', 'Participants aux événements padel', 'unite=personnes; agregation=somme'],
      ['taux_penetration_powerbi', 'Taux de pénétration (calculé par Power BI)', 'unite=pourcent; agregation=dernier']
    ].forEach(function (k) { p('indicateur_club', k[0], k[1], { libelle: k[1], attributs: k[2], source: 'Liste proposée – à aligner sur Power BI' }); });
    // Objectifs du programme gratuit (séances par semaine), confirmés par Anthony le 01/11/2026.
    [['padel_taster', '4', '4 Padel Tasters d\'1 h par semaine'], ['afterwork', '2', '2 Afterworks d\'1 h 30 par semaine'], ['new_to_padel', '2', '2 New to Padel Social Sessions d\'1 h par semaine']]
      .forEach(function (o) { p('objectif', 'seances_semaine', o[1], { reference: o[0], libelle: o[2], date_effet: '2026-08-31', source: 'Confirmé par Anthony (01/11/2026)' }); });
    p('objectif', 'taux_penetration', '', { libelle: 'Objectif de taux de pénétration (%)', source: 'À FIXER', description: 'Cible à atteindre, en %.' });
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

/* ---- src/core/permissions.js ---- */
/**
 * Matrice des permissions par rôle.
 *
 * Les valeurs par défaut ci-dessous sont surchargeables dans la feuille
 * « Paramètres » (catégorie « permission », référence = rôle, clé = permission,
 * valeur = oui/non). Le serveur Apps Script applique la même matrice : l'interface
 * ne fait que masquer ce qui est interdit, la sécurité est vérifiée côté serveur.
 */
(function (root, factory) {
  var mod = factory();
  if (typeof module === 'object' && module.exports) module.exports = mod;
  root.Padel = root.Padel || {};
  root.Padel.permissions = mod;
})(typeof globalThis !== 'undefined' ? globalThis : this, function () {
  'use strict';

  var PERMS = {
    'dashboard.view': 'Voir le tableau de bord',
    'terrains.view': 'Voir l\'occupation des terrains',
    'terrains.edit': 'Encoder réservations, maintenance et horaires',
    'seances.view': 'Voir le planning des séances',
    'seances.edit': 'Créer / modifier toutes les séances',
    'seances.edit_own': 'Modifier ses propres séances (coach)',
    'presences.edit': 'Encoder les présences',
    'academies.view': 'Voir offres, cycles et inscriptions',
    'academies.edit': 'Créer / modifier offres et cycles',
    'inscriptions.edit': 'Créer / modifier les inscriptions',
    'membres.view': 'Voir le référentiel membres',
    'membres.edit': 'Modifier le référentiel membres',
    'paiements.view': 'Voir les paiements',
    'paiements.edit': 'Encoder et vérifier les paiements',
    'heures.own': 'Encoder ses propres heures',
    'heures.view_all': 'Voir les heures de tous les coachs',
    'heures.validate': 'Valider / renvoyer en correction les heures',
    'heures.pay': 'Marquer les heures comme payées',
    'couts.view': 'Voir taux horaires et coûts coachs',
    'depenses.view': 'Voir les dépenses',
    'depenses.edit': 'Encoder les dépenses',
    'evenements.view': 'Voir les événements',
    'evenements.edit': 'Créer / modifier les événements',
    'satisfaction.view': 'Voir satisfaction et NPS',
    'satisfaction.edit': 'Encoder un avis membre',
    'pnl.view': 'Voir le P&L',
    'rapports.view': 'Voir les rapports',
    'rapports.export': 'Exporter les rapports (PDF, CSV)',
    'qualite.view': 'Voir la qualité des données',
    'imports.run': 'Importer des fichiers et annuler un import',
    'indicateurs.edit': 'Saisir les indicateurs club (Power BI)',
    'parametres.view': 'Voir les paramètres',
    'parametres.edit': 'Modifier les paramètres (tarifs, taux, règles)',
    'utilisateurs.edit': 'Gérer les utilisateurs et les rôles',
    'audit.view': 'Consulter le journal d\'audit'
  };

  var ALL = Object.keys(PERMS);

  var DEFAULTS = {
    admin: ALL.slice(),
    coach: ['seances.view', 'seances.edit_own', 'presences.edit', 'membres.view', 'heures.own', 'evenements.view', 'satisfaction.edit'],
    reception: ['seances.view', 'academies.view', 'inscriptions.edit', 'membres.view', 'membres.edit', 'paiements.view',
      'paiements.edit', 'evenements.view', 'satisfaction.edit'],
    manager: ['dashboard.view', 'terrains.view', 'seances.view', 'academies.view', 'paiements.view', 'heures.view_all',
      'couts.view', 'depenses.view', 'evenements.view', 'satisfaction.view', 'pnl.view', 'rapports.view',
      'rapports.export', 'qualite.view']
  };

  var ROLES = { admin: 'Administrateur (Anthony)', coach: 'Coach', reception: 'Réception', manager: 'Manager (lecture)' };

  /** Permissions effectives d'un rôle, surcharges « Paramètres » comprises. */
  function permissionsFor(role, parametres) {
    var set = {};
    (DEFAULTS[role] || []).forEach(function (p) { set[p] = true; });
    (parametres || []).forEach(function (r) {
      if (r.categorie !== 'permission' || r.statut === 'archive' || r.archive === true || r.archive === 'TRUE') return;
      if (String(r.reference || '').trim() !== role || !PERMS[r.cle]) return;
      var v = String(r.valeur || '').trim().toLowerCase();
      if (['oui', 'true', '1', 'vrai'].indexOf(v) >= 0) set[r.cle] = true;
      if (['non', 'false', '0', 'faux'].indexOf(v) >= 0) delete set[r.cle];
    });
    return set;
  }

  function can(perms, p) { return !!(perms && perms[p]); }

  /** Permission requise pour écrire dans une feuille (contrôles fins côté serveur). */
  var WRITE = {
    parametres: ['parametres.edit'], utilisateurs: ['utilisateurs.edit'], terrains: ['terrains.edit'],
    membres: ['membres.edit', 'inscriptions.edit'], offres: ['academies.edit'], cycles: ['academies.edit'],
    seances: ['seances.edit', 'seances.edit_own'], inscriptions: ['inscriptions.edit'], presences: ['presences.edit'],
    heures: ['heures.own', 'heures.validate', 'heures.pay'], paiements: ['paiements.edit'], depenses: ['depenses.edit'],
    evenements: ['evenements.edit'], satisfaction: ['satisfaction.edit'], occupation: ['terrains.edit'],
    imports: ['imports.run'], indicateurs: ['indicateurs.edit'], audit: []
  };
  /** Permission requise pour lire une feuille. */
  var READ = {
    parametres: ['parametres.view', 'dashboard.view', 'seances.view', 'heures.own'], utilisateurs: ['utilisateurs.edit'],
    terrains: ['terrains.view', 'seances.view'], membres: ['membres.view', 'dashboard.view'],
    offres: ['academies.view', 'pnl.view'], cycles: ['academies.view', 'seances.view', 'pnl.view'],
    seances: ['seances.view', 'dashboard.view'], inscriptions: ['academies.view', 'pnl.view', 'presences.edit'],
    presences: ['seances.view', 'dashboard.view'], heures: ['heures.own', 'heures.view_all'],
    paiements: ['paiements.view', 'pnl.view'], depenses: ['depenses.view', 'pnl.view'],
    evenements: ['evenements.view', 'dashboard.view'], satisfaction: ['satisfaction.view'],
    occupation: ['terrains.view'], indicateurs: ['dashboard.view', 'rapports.view'], imports: ['imports.run'], audit: ['audit.view']
  };

  function canRead(perms, sheetKey) { return (READ[sheetKey] || []).some(function (p) { return perms[p]; }); }
  function canWrite(perms, sheetKey) { return (WRITE[sheetKey] || []).some(function (p) { return perms[p]; }); }

  return { PERMS: PERMS, ALL: ALL, DEFAULTS: DEFAULTS, ROLES: ROLES, READ: READ, WRITE: WRITE,
    permissionsFor: permissionsFor, can: can, canRead: canRead, canWrite: canWrite };
});

/* ---- src/core/rules.js ---- */
/**
 * Règles d'écriture et de lecture par rôle, partagées entre le serveur Apps Script
 * (sécurité réelle) et le mode démonstration (même comportement).
 *
 *  - validateRecord : types, champs obligatoires, listes de valeurs ;
 *  - checkWrite     : droits de la personne sur la ligne (ex. un coach ne modifie
 *                     ni les heures d'un autre ni des heures déjà validées) ;
 *  - filterRead     : ce que chaque rôle reçoit (minimisation des données).
 */
(function (root, factory) {
  var isNode = typeof require === 'function' && typeof module === 'object';
  var u = isNode ? require('./util.js') : root.Padel.util;
  var schema = isNode ? require('./schema.js') : root.Padel.schema;
  var perms = isNode ? require('./permissions.js') : root.Padel.permissions;
  var mod = factory(u, schema, perms);
  if (typeof module === 'object' && module.exports) module.exports = mod;
  root.Padel = root.Padel || {};
  root.Padel.rules = mod;
})(typeof globalThis !== 'undefined' ? globalThis : this, function (u, schema, P) {
  'use strict';

  function enumKeys(col, parametres) {
    if (col.enumName) return Object.keys(schema.ENUMS[col.enumName]);
    return (parametres || []).filter(function (p) { return p.categorie === col.enumParam && !(p.archive === true || p.archive === 'TRUE'); }).map(function (p) { return p.cle; });
  }

  /** Normalise et valide une ligne. Renvoie { record, errors[] }. */
  function validateRecord(sheetKey, rec, parametres) {
    var def = schema.sheet(sheetKey);
    if (!def) return { record: null, errors: ['Feuille inconnue : ' + sheetKey] };
    var out = {}, errors = [];
    def.cols.forEach(function (c) {
      var v = rec[c.n];
      if (v === undefined || v === null) v = '';
      if (c.meta) { out[c.n] = v; return; }
      if (u.isBlank(v)) {
        if (c.req && c.n !== 'id' && c.t !== 'bool') errors.push('« ' + c.label + ' » est obligatoire.');
        out[c.n] = c.t === 'bool' ? (c.req ? false : '') : '';
        return;
      }
      switch (c.t) {
        case 'date': { var d = u.parseDate(v); if (!d) errors.push('« ' + c.label + ' » : date invalide.'); out[c.n] = d || ''; break; }
        case 'time': { var t = u.parseTime(v); if (!t) errors.push('« ' + c.label + ' » : heure invalide (HH:MM).'); out[c.n] = t || ''; break; }
        case 'int': case 'number': case 'money': case 'rating10': {
          var n = u.num(v);
          if (n === null) { errors.push('« ' + c.label + ' » : nombre attendu.'); out[c.n] = ''; break; }
          if (c.t === 'int' && Math.round(n) !== n) errors.push('« ' + c.label + ' » : nombre entier attendu.');
          if (c.t === 'rating10' && (n < 0 || n > 10)) errors.push('« ' + c.label + ' » : note de 0 à 10.');
          if ((c.t === 'money' || c.t === 'int') && n < 0) errors.push('« ' + c.label + ' » : valeur négative interdite.');
          if (c.min !== undefined && n < c.min) errors.push('« ' + c.label + ' » : minimum ' + c.min + '.');
          if (c.max !== undefined && n > c.max) errors.push('« ' + c.label + ' » : maximum ' + c.max + '.');
          out[c.n] = n; break;
        }
        case 'bool': { var b = u.bool(v); out[c.n] = b === null ? '' : b; break; }
        case 'email': { var e = String(v).trim().toLowerCase(); if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(e)) errors.push('« ' + c.label + ' » : e-mail invalide.'); out[c.n] = e; break; }
        case 'enum': {
          var keys = enumKeys(c, parametres);
          if (keys.length && keys.indexOf(String(v)) < 0) errors.push('« ' + c.label + ' » : valeur « ' + v + ' » non autorisée.');
          out[c.n] = String(v); break;
        }
        case 'refs': out[c.n] = u.splitList(v).join(','); break;
        default: out[c.n] = typeof v === 'string' ? v.trim() : v;
      }
    });
    // Contrôles croisés
    if (out.heure_debut && out.heure_fin && u.toMinutes(out.heure_fin) <= u.toMinutes(out.heure_debut)) errors.push('L\'heure de fin doit être après l\'heure de début.');
    if (sheetKey === 'heures' && out.heure_debut && out.heure_fin) out.duree_h = u.round((u.toMinutes(out.heure_fin) - u.toMinutes(out.heure_debut)) / 60, 2);
    if (out.date_debut && out.date_fin && out.date_fin < out.date_debut) errors.push('La date de fin précède la date de début.');
    if (sheetKey === 'paiements' && out.montant !== '' && out.montant <= 0) errors.push('Le montant doit être positif.');
    return { record: out, errors: errors };
  }

  var COACH_HOUR_FIELDS = ['date', 'heure_debut', 'heure_fin', 'duree_h', 'type_activite', 'seance_id', 'cycle_id', 'evenement_id', 'nb_participants',
    'nb_presents', 'remplacement', 'remplace_coach_id', 'annulation', 'commentaire', 'statut'];

  /**
   * Vérifie qu'un utilisateur peut écrire cette ligne.
   * @param user   { id, email, role }
   * @param perms  permissions effectives
   * @param before ligne existante (null si création)
   * @param after  ligne proposée (déjà validée)
   * @param ctx    { seancesById } pour les contrôles de séance
   * @return message d'erreur ou null
   */
  function checkWrite(user, perms, sheetKey, before, after, ctx) {
    if (!P.canWrite(perms, sheetKey)) return 'Votre rôle ne permet pas de modifier « ' + schema.sheet(sheetKey).label + ' ».';
    if (sheetKey === 'audit') return 'Le journal d\'audit ne peut pas être modifié.';
    if (sheetKey === 'heures') {
      var admin = perms['heures.validate'] || perms['heures.pay'];
      if (!admin) {
        if (String(after.coach_id) !== String(user.id)) return 'Vous ne pouvez encoder que vos propres heures.';
        if (before && String(before.coach_id) !== String(user.id)) return 'Ces heures appartiennent à un autre coach.';
        if (before && ['valide', 'paye'].indexOf(before.statut) >= 0) {
          // Seule la demande de correction peut être ajoutée sur une ligne validée.
          var changed = COACH_HOUR_FIELDS.filter(function (k) { return String(before[k] === undefined ? '' : before[k]) !== String(after[k] === undefined ? '' : after[k]); });
          if (changed.length) return 'Heures déjà validées : utilisez « Demander une correction ».';
          ['valide_par', 'valide_le', 'paye_le', 'reference_paiement', 'motif_correction'].forEach(function (k) { after[k] = before[k]; });
          return null;
        }
        if (['brouillon', 'soumis'].indexOf(after.statut) < 0) return 'Seul Anthony peut valider ou marquer payées des heures.';
        if (before && before.statut === 'soumis' && after.statut === 'brouillon') return 'Des heures soumises ne repassent pas en brouillon ; demandez une correction.';
      } else {
        if (after.statut === 'paye' && !perms['heures.pay']) return 'Marquer « payé » demande la permission de paiement.';
        if ((after.statut === 'valide' || after.statut === 'paye') && (!before || before.statut !== after.statut)) {
          after.valide_par = after.valide_par || user.email; after.valide_le = after.valide_le || new Date().toISOString();
        }
        if (after.statut === 'a_corriger' && u.isBlank(after.motif_correction)) return 'Indiquez le motif de correction.';
      }
    }
    if ((sheetKey === 'seances' || sheetKey === 'presences') && !perms['seances.edit']) {
      var s = sheetKey === 'seances' ? (before || after) : (ctx && ctx.seancesById[after.seance_id]);
      if (!s) return 'Séance introuvable.';
      var mine = String(s.coach_id) === String(user.id) || String(s.coach_remplacant_id) === String(user.id);
      if (!mine) return 'Vous ne pouvez modifier que vos propres séances.';
      if (sheetKey === 'seances' && after.coach_id !== s.coach_id && before) return 'Le coach responsable ne peut être changé que par Anthony.';
    }
    if (sheetKey === 'utilisateurs' && before && !u.isBlank(before.code_acces_hash)) after.code_acces_hash = before.code_acces_hash;
    if (sheetKey === 'membres' && !perms['membres.edit'] && before) return 'Modification des membres réservée.';
    return null;
  }

  /** Données envoyées à un rôle (lecture). */
  function filterRead(user, perms, db) {
    var out = {};
    schema.SHEETS.forEach(function (s) {
      var rows = db[s.key] || [];
      if (!P.canRead(perms, s.key)) { out[s.key] = []; return; }
      out[s.key] = rows;
    });
    // Utilisateurs : liste réduite (ID, nom, rôle) pour les menus déroulants.
    out.utilisateurs = (db.utilisateurs || []).map(function (r) {
      if (perms['utilisateurs.edit']) { var c = {}; for (var k in r) if (k !== 'code_acces_hash') c[k] = r[k]; c.code_acces_hash = u.isBlank(r.code_acces_hash) ? '' : '•••'; return c; }
      return { id: r.id, nom_affiche: r.nom_affiche, role: r.role, actif: r.actif };
    });
    // Paramètres : taux et budget visibles seulement avec accès aux coûts / P&L.
    out.parametres = (db.parametres || []).filter(function (p) {
      if (p.categorie === 'taux_coach') return perms['couts.view'] || String(p.reference) === String(user.id);
      if (p.categorie === 'budget') return !!perms['pnl.view'];
      if (p.categorie === 'permission') return !!perms['parametres.view'];
      return true;
    });
    // Heures : un coach ne voit que les siennes.
    if (!perms['heures.view_all']) out.heures = (db.heures || []).filter(function (h) { return String(h.coach_id) === String(user.id); });
    return out;
  }

  /** Lignes nécessaires à la synthèse d'audit. */
  function auditEntry(user, action, sheetKey, id, before, after, motif) {
    return { id: u.newId('AUD'), date: new Date().toISOString(), utilisateur: user.email, role: user.role, action: action,
      feuille: sheetKey ? schema.sheet(sheetKey).tab : '', ligne_id: id || '',
      avant: before ? JSON.stringify(before) : '', apres: after ? JSON.stringify(after) : '', motif: motif || '' };
  }

  return { validateRecord: validateRecord, checkWrite: checkWrite, filterRead: filterRead, auditEntry: auditEntry, enumKeys: enumKeys };
});
