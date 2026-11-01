/**
 * Moteur de calcul : occupation, séances, académies, coachs, P&L, événements,
 * satisfaction et engagement des membres.
 *
 * Toutes les fonctions sont pures : elles reçoivent la base (objet { feuille: lignes })
 * et renvoient des mesures { v, gaps } (voir util.js). Chaque montant financier est
 * accompagné de ses lignes sources (traçabilité jusqu'à la ligne Google Sheets).
 *
 * Les formules sont documentées dans docs/FORMULES_FINANCIERES.md.
 */
(function (root, factory) {
  var u = (typeof require === 'function' && typeof module === 'object') ? require('./util.js') : root.Padel.util;
  var mod = factory(u);
  if (typeof module === 'object' && module.exports) module.exports = mod;
  root.Padel = root.Padel || {};
  root.Padel.calc = mod;
})(typeof globalThis !== 'undefined' ? globalThis : this, function (u) {
  'use strict';

  var DAY_COLS = ['horaires_lun', 'horaires_mar', 'horaires_mer', 'horaires_jeu', 'horaires_ven', 'horaires_sam', 'horaires_dim'];
  var CANCELLED_SEANCE = { annulee_club: 1, annulee_meteo: 1, annulee_participants: 1 };

  function isArchived(r) { return r.archive === true || String(r.archive).toUpperCase() === 'TRUE'; }
  function live(rows) { return (rows || []).filter(function (r) { return !isArchived(r); }); }

  // ================================================================ contexte
  /**
   * Prépare les index utilisés par tous les calculs.
   * @param {object} db    { parametres: [...], seances: [...], ... }
   * @param {string} today 'AAAA-MM-JJ' (date de référence, injectée pour des tests reproductibles)
   */
  function context(db, today) {
    var ctx = { db: {}, today: today || u.parseDate(new Date()) };
    ['parametres', 'utilisateurs', 'terrains', 'membres', 'offres', 'cycles', 'seances', 'inscriptions', 'presences',
      'heures', 'paiements', 'depenses', 'evenements', 'satisfaction', 'occupation', 'indicateurs', 'imports', 'audit']
      .forEach(function (k) { ctx.db[k] = live(db[k]); });
    var D = ctx.db;
    ctx.params = D.parametres.filter(function (p) { return p.statut !== 'archive'; });
    ctx.terrains = u.indexBy(D.terrains, 'id');
    ctx.cycles = u.indexBy(D.cycles, 'id');
    ctx.offres = u.indexBy(D.offres, 'id');
    ctx.seancesById = u.indexBy(D.seances, 'id');
    ctx.evenements = u.indexBy(D.evenements, 'id');
    ctx.inscriptionsById = u.indexBy(D.inscriptions, 'id');
    ctx.users = u.indexBy(D.utilisateurs, 'id');
    ctx.presencesBySeance = u.groupBy(D.presences, function (p) { return p.seance_id; });
    ctx.seancesByCycle = u.groupBy(D.seances, function (s) { return s.cycle_id || '_'; });
    ctx.inscriptionsByCycle = u.groupBy(D.inscriptions, function (i) { return i.cycle_id || '_'; });
    ctx.paiementsByInscription = u.groupBy(D.paiements, function (p) { return p.inscription_id || '_'; });
    // Types d'activité (catégorie type_activite), y compris archivés pour l'affichage.
    ctx.types = {};
    D.parametres.filter(function (p) { return p.categorie === 'type_activite'; }).forEach(function (p) {
      ctx.types[p.cle] = { code: p.cle, label: p.libelle || p.valeur || p.cle, attrs: parseAttrs(p.attributs), actif: p.statut !== 'archive' };
    });
    var debut = param(ctx, 'date_debut_historique') || param(ctx, 'date_ouverture_indoor');
    ctx.histStart = u.parseDate(debut);
    ctx.includePrivate = u.bool(param(ctx, 'inclure_cours_prives')) === true;
    ctx.recoBase = (param(ctx, 'base_reconnaissance') || 'attendu').trim().toLowerCase();
    return ctx;
  }

  function parseAttrs(s) {
    var out = {};
    String(s || '').split(';').forEach(function (kv) {
      var i = kv.indexOf('='); if (i < 0) return;
      out[kv.slice(0, i).trim()] = kv.slice(i + 1).trim();
    });
    return out;
  }

  /** Valeur d'un paramètre général en vigueur à une date (dernière date d'effet ≤ date). */
  function param(ctx, cle, date, categorie) {
    var best = null;
    ctx.params.forEach(function (p) {
      if ((p.categorie || 'general') !== (categorie || 'general') || p.cle !== cle) return;
      var de = u.parseDate(p.date_effet), df = u.parseDate(p.date_fin);
      if (date && de && de > date) return;
      if (date && df && df < date) return;
      if (!best || (de || '') >= (u.parseDate(best.date_effet) || '')) best = p;
    });
    if (!best || u.isBlank(best.valeur)) return null;
    return String(best.valeur).trim();
  }

  function typeInfo(ctx, code) { return ctx.types[code] || { code: code, label: code || 'Non renseigné', attrs: {}, actif: true }; }
  function typeLabel(ctx, code) { return typeInfo(ctx, code).label; }
  function famille(ctx, code) { return typeInfo(ctx, code).attrs.famille || 'autre'; }
  function isPrivate(ctx, code) { return famille(ctx, code) === 'prive' || code === 'cours_prive'; }

  /** Public (adulte/junior/mixte) d'une séance : offre du cycle, sinon type d'activité. */
  function seancePublic(ctx, s) {
    var cy = s.cycle_id && ctx.cycles[s.cycle_id];
    var of = cy && ctx.offres[cy.offre_id];
    if (of && of.public) return of.public;
    return typeInfo(ctx, s.type_activite).attrs.public || null;
  }
  /** Gratuit / payant : champ de la séance, sinon attribut du type. null = inconnu. */
  function seancePayant(ctx, s) {
    var v = u.bool(s.payant);
    if (v !== null) return v;
    if (s.cycle_id) return true;
    return u.bool(typeInfo(ctx, s.type_activite).attrs.payant);
  }

  // ================================================================ taux coachs
  /** Taux horaire applicable à un coach à une date (historisé par date d'effet). */
  function coachRate(ctx, coachId, date) {
    var best = null;
    ctx.params.forEach(function (p) {
      if (p.categorie !== 'taux_coach' || String(p.reference).trim() !== String(coachId)) return;
      var de = u.parseDate(p.date_effet), df = u.parseDate(p.date_fin);
      if (de && de > date) return;
      if (df && df < date) return;
      if (!best || (de || '') >= (u.parseDate(best.date_effet) || '')) best = p;
    });
    var name = coachName(ctx, coachId);
    if (!best) return u.missing('Taux horaire absent pour ' + name + ' au ' + u.fmtDate(date));
    var v = u.num(best.valeur);
    if (v === null) return u.missing('Taux horaire vide pour ' + name);
    return u.m(v, u.parseDate(best.date_effet) ? [] : ['Taux de ' + name + ' sans date d\'effet (à vérifier)']);
  }
  function coachName(ctx, id) { var x = ctx.users[id]; return x ? (x.nom_affiche || x.email) : (id || 'coach non renseigné'); }

  // ================================================================ intervalles
  function parseRanges(s) {
    if (u.isBlank(s)) return null;
    var str = String(s).trim().toLowerCase();
    if (str === 'fermé' || str === 'ferme' || str === 'closed' || str === '-') return [];
    var out = [];
    var parts = str.split(/[;,]/);
    for (var i = 0; i < parts.length; i++) {
      var m = parts[i].trim().match(/^(\d{1,2}[:h.]?\d{0,2})\s*[-–à]\s*(\d{1,2}[:h.]?\d{0,2})$/);
      if (!m) return null;
      var a = u.toMinutes(m[1]), b = u.toMinutes(m[2]);
      if (a === null || b === null || b <= a) return null;
      out.push([a, b]);
    }
    return out;
  }
  function union(list) {
    var s = list.filter(function (x) { return x && x[1] > x[0]; }).slice().sort(function (a, b) { return a[0] - b[0]; });
    var out = [];
    s.forEach(function (iv) {
      var last = out[out.length - 1];
      if (last && iv[0] <= last[1]) last[1] = Math.max(last[1], iv[1]); else out.push([iv[0], iv[1]]);
    });
    return out;
  }
  function intersect(a, b) {
    var out = [];
    a.forEach(function (x) { b.forEach(function (y) { var s = Math.max(x[0], y[0]), e = Math.min(x[1], y[1]); if (e > s) out.push([s, e]); }); });
    return union(out);
  }
  function subtract(a, b) {
    var res = union(a);
    union(b).forEach(function (y) {
      var next = [];
      res.forEach(function (x) {
        if (y[1] <= x[0] || y[0] >= x[1]) { next.push(x); return; }
        if (y[0] > x[0]) next.push([x[0], y[0]]);
        if (y[1] < x[1]) next.push([y[1], x[1]]);
      });
      res = next;
    });
    return res;
  }
  function total(list) { return list.reduce(function (t, x) { return t + (x[1] - x[0]); }, 0); }
  function interval(a, b) { var x = u.toMinutes(a), y = u.toMinutes(b); return (x === null || y === null || y <= x) ? null : [x, y]; }

  function openingFor(terrain, date) { return parseRanges(terrain[DAY_COLS[u.weekday(date) - 1]]); }

  /** Heures de pointe d'un jour (Paramètres, catégorie heures_pointe, référence = 1..7 ou « tous »). null = non défini. */
  function peakFor(ctx, date) {
    var rows = ctx.params.filter(function (p) { return p.categorie === 'heures_pointe'; });
    if (!rows.length) return null;
    var wd = String(u.weekday(date));
    var out = [];
    rows.forEach(function (p) {
      var ref = String(p.reference || p.cle || '').trim().toLowerCase();
      if (ref !== wd && ref !== 'tous') return;
      var de = u.parseDate(p.date_effet); if (de && de > date) return;
      var r = parseRanges(p.valeur); if (r) out = out.concat(r);
    });
    return union(out);
  }

  // ================================================================ filtres
  /**
   * Filtres : { from, to, terrains:[id], lieu, type, niveau, coach, public, payant }
   * Les filtres d'activité ne s'appliquent qu'aux activités encadrées.
   */
  function seanceMatches(ctx, s, f) {
    f = f || {};
    if (!u.inRange(u.parseDate(s.date), f.from, f.to)) return false;
    var ts = u.splitList(s.terrains);
    if (f.terrains && f.terrains.length && !ts.some(function (t) { return f.terrains.indexOf(t) >= 0; })) return false;
    if (f.lieu && !ts.some(function (t) { return ctx.terrains[t] && ctx.terrains[t].lieu === f.lieu; })) return false;
    if (f.type && s.type_activite !== f.type) return false;
    if (f.coach && s.coach_id !== f.coach && s.coach_remplacant_id !== f.coach) return false;
    if (f.niveau && String(s.niveau || '').split(/[-,\s]+/).indexOf(String(f.niveau)) < 0) return false;
    if (f.public && seancePublic(ctx, s) !== f.public) return false;
    if (f.payant) { var p = seancePayant(ctx, s); if (p === null || (f.payant === 'payant') !== p) return false; }
    return true;
  }
  function hasActivityFilter(f) { return !!(f && (f.type || f.coach || f.niveau || f.public || f.payant)); }

  // ================================================================ occupation
  function emptyBucket() { return { availMin: 0, reservedMin: 0, usedMin: 0, orgMin: 0, libreMin: 0, blockedMin: 0, unknown: {} }; }

  /**
   * Occupation des terrains sur la période.
   * Taux d'occupation = heures utilisées ÷ heures disponibles (jamais calculé si les horaires manquent).
   */
  function occupancy(ctx, f) {
    f = f || {};
    var from = f.from, to = f.to;
    if (ctx.histStart && from < ctx.histStart) from = ctx.histStart;
    var terrains = ctx.db.terrains.filter(function (t) {
      if (t.statut === 'archive') return false;
      if (f.terrains && f.terrains.length && f.terrains.indexOf(t.id) < 0) return false;
      if (f.lieu && t.lieu !== f.lieu) return false;
      return true;
    }).sort(function (a, b) { return (+a.numero || 0) - (+b.numero || 0); });
    var actFilter = hasActivityFilter(f);
    var days = u.eachDay(from, to);
    var occByKey = u.groupBy(ctx.db.occupation, function (o) { return o.terrain_id + '|' + u.parseDate(o.date); });
    var seByKey = {};
    ctx.db.seances.forEach(function (s) {
      if (!seanceMatches(ctx, s, { type: f.type, coach: f.coach, niveau: f.niveau, public: f.public, payant: f.payant })) return;
      u.splitList(s.terrains).forEach(function (t) { var k = t + '|' + u.parseDate(s.date); (seByKey[k] = seByKey[k] || []).push(s); });
    });
    var evByKey = {};
    if (!actFilter) ctx.db.evenements.forEach(function (e) {
      u.splitList(e.terrains).forEach(function (t) { var k = t + '|' + u.parseDate(e.date); (evByKey[k] = evByKey[k] || []).push(e); });
    });

    var peakDefined = ctx.params.some(function (p) { return p.categorie === 'heures_pointe'; });
    var all = emptyBucket(), lieux = { indoor: emptyBucket(), outdoor: emptyBucket() };
    var peak = { availMin: 0, usedMin: 0 }, offpeak = { availMin: 0, usedMin: 0 };
    var heat = []; for (var w = 0; w < 7; w++) { heat.push([]); for (var h = 0; h < 24; h++) heat[w].push({ avail: 0, used: 0 }); }
    var byTerrain = [];

    terrains.forEach(function (t) {
      var b = emptyBucket(); var unknownDays = 0;
      var service = u.parseDate(t.date_mise_en_service);
      days.forEach(function (d) {
        if (service && d < service) return;
        var open = openingFor(t, d);
        if (open === null) { unknownDays++; return; }
        var key = t.id + '|' + d;
        var occ = occByKey[key] || [];
        var unavail = occ.filter(function (o) { return (o.type === 'maintenance' || o.type === 'indisponibilite') && o.statut !== 'annule'; })
          .map(function (o) { return interval(o.heure_debut, o.heure_fin); }).filter(Boolean);
        var avail = subtract(open, unavail);
        var orgRes = [], orgUsed = [], libRes = [], libUsed = [], blocked = [];
        (seByKey[key] || []).forEach(function (s) {
          var iv = interval(s.heure_debut, s.heure_fin); if (!iv) return;
          if (CANCELLED_SEANCE[s.statut]) return;
          orgRes.push(iv); if (s.statut === 'realisee') orgUsed.push(iv);
        });
        (evByKey[key] || []).forEach(function (e) {
          var iv = interval(e.heure_debut, e.heure_fin); if (!iv || e.statut === 'annule') return;
          orgRes.push(iv); if (e.statut === 'realise') orgUsed.push(iv);
        });
        if (!actFilter) occ.forEach(function (o) {
          var iv = interval(o.heure_debut, o.heure_fin); if (!iv || o.statut === 'annule') return;
          if (o.type === 'reservation_libre') {
            libRes.push(iv);
            if (o.statut === 'realise' || (o.statut === 'reserve' && d < ctx.today)) libUsed.push(iv);
          } else if (o.type === 'blocage') blocked.push(iv);
        });
        var reserved = intersect(union(orgRes.concat(libRes, blocked)), avail);
        var used = intersect(union(orgUsed.concat(libUsed)), avail);
        var orgU = intersect(union(orgUsed), avail), libU = subtract(intersect(union(libUsed), avail), orgU);
        var bl = subtract(intersect(union(blocked), avail), union(orgRes.concat(libRes)));
        b.availMin += total(avail); b.reservedMin += total(reserved); b.usedMin += total(used);
        b.orgMin += total(orgU); b.libreMin += total(libU); b.blockedMin += total(bl);
        var wd = u.weekday(d) - 1;
        for (var hh = 0; hh < 24; hh++) {
          var slot = [[hh * 60, hh * 60 + 60]];
          heat[wd][hh].avail += total(intersect(avail, slot));
          heat[wd][hh].used += total(intersect(used, slot));
        }
        if (peakDefined) {
          var pk = peakFor(ctx, d) || [];
          var pa = intersect(avail, pk);
          peak.availMin += total(pa); peak.usedMin += total(intersect(used, pk));
          offpeak.availMin += total(avail) - total(pa); offpeak.usedMin += total(used) - total(intersect(used, pk));
        }
      });
      var label = (t.nom || ('Terrain ' + t.numero));
      byTerrain.push(finishBucket(b, unknownDays ? [label + ' : horaires d\'ouverture manquants (' + unknownDays + ' jour(s))'] : [], t));
      [all, lieux[t.lieu] || emptyBucket()].forEach(function (agg) {
        agg.availMin += b.availMin; agg.reservedMin += b.reservedMin; agg.usedMin += b.usedMin;
        agg.orgMin += b.orgMin; agg.libreMin += b.libreMin; agg.blockedMin += b.blockedMin;
        if (unknownDays) agg.unknown[label] = unknownDays;
      });
    });

    function gapsOf(agg) { return Object.keys(agg.unknown).map(function (k) { return k + ' : horaires d\'ouverture manquants (' + agg.unknown[k] + ' jour(s))'; }); }
    var res = finishBucket(all, gapsOf(all));
    if (!terrains.length) { res.available = u.missing('Aucun terrain renseigné'); res.rate = u.missing('Aucun terrain renseigné'); }
    if (!days.length) { res.available = u.missing('Période antérieure au début de l\'historique'); res.rate = res.available; }
    res.byTerrain = byTerrain;
    res.byLieu = { indoor: finishBucket(lieux.indoor, gapsOf(lieux.indoor)), outdoor: finishBucket(lieux.outdoor, gapsOf(lieux.outdoor)) };
    var gp = gapsOf(all);
    var peakGap = peakDefined ? [] : ['Heures de pointe non définies (Paramètres → heures_pointe)'];
    res.peak = { available: avail(peak.availMin, gp.concat(peakGap)), used: hours(peak.usedMin, peakGap) };
    res.peak.rate = u.ratio(res.peak.used, res.peak.available, 'Occupation en heures de pointe');
    res.offpeak = { available: avail(offpeak.availMin, gp.concat(peakGap)), used: hours(offpeak.usedMin, peakGap) };
    res.offpeak.rate = u.ratio(res.offpeak.used, res.offpeak.available, 'Occupation en heures creuses');
    res.heatmap = heat.map(function (row) { return row.map(function (c) { return { avail: c.avail / 60, used: c.used / 60, rate: c.avail ? c.used / c.avail : null }; }); });
    res.activityFilter = actFilter;
    if (actFilter) res.note = 'Filtre d\'activité actif : seules les activités encadrées correspondantes sont comptées (réservations libres exclues).';
    return res;

    function avail(min, gaps) { return gaps.length ? u.m(null, gaps) : u.known(min / 60); }
    function hours(min, gaps) { return gaps.length ? u.m(null, gaps) : u.known(min / 60); }
  }

  function finishBucket(b, gaps, terrain) {
    var available = gaps.length ? u.m(null, gaps) : u.known(b.availMin / 60);
    var out = {
      available: available,
      reserved: u.known(b.reservedMin / 60), used: u.known(b.usedMin / 60),
      organised: u.known(b.orgMin / 60), libre: u.known(b.libreMin / 60), blocked: u.known(b.blockedMin / 60)
    };
    out.rate = u.ratio(out.used, available, 'Occupation');
    out.rateReserved = u.ratio(out.reserved, available, 'Taux de réservation');
    out.rateOrganised = u.ratio(out.organised, available, 'Occupation activités encadrées');
    out.rateLibre = u.ratio(out.libre, available, 'Occupation réservations libres');
    if (terrain) { out.terrain = terrain; out.id = terrain.id; out.label = terrain.nom || ('Terrain ' + terrain.numero); out.lieu = terrain.lieu; }
    return out;
  }

  // ================================================================ séances
  function cycleActiveInscriptions(ctx, cycleId, date) {
    return (ctx.inscriptionsByCycle[cycleId] || []).filter(function (i) {
      if (i.statut !== 'inscrit') return false;
      var start = u.parseDate(i.date_premiere_seance) || (ctx.cycles[cycleId] && u.parseDate(ctx.cycles[cycleId].date_debut));
      return !start || !date || start <= date;
    });
  }

  /** Compteurs d'une séance : liste nominative si elle existe, sinon compteurs déclarés. */
  function seanceCounts(ctx, s) {
    var rows = ctx.presencesBySeance[s.id] || [];
    var cy = s.cycle_id && ctx.cycles[s.cycle_id];
    var cap = u.num(s.capacite); if (cap === null && cy) cap = u.num(cy.capacite);
    var r = { mode: 'inconnu', capacite: cap, inscrits: null, presents: null, absents: null, noShows: null, annulations: null, membres: [] };
    if (rows.length) {
      r.mode = 'detail';
      r.presents = 0; r.absents = 0; r.noShows = 0; r.annulations = 0;
      rows.forEach(function (p) {
        if (p.statut === 'present') { r.presents++; r.membres.push(p.membre_id); }
        else if (p.statut === 'absent') r.absents++;
        else if (p.statut === 'no_show') r.noShows++;
        else if (p.statut === 'annule') r.annulations++;
      });
      r.inscrits = r.presents + r.absents + r.noShows;
      return r;
    }
    var decl = ['nb_inscrits', 'nb_presents', 'nb_absents', 'nb_no_shows', 'nb_annulations'].map(function (k) { return u.num(s[k]); });
    if (decl.some(function (x) { return x !== null; })) {
      r.mode = 'declare';
      r.inscrits = decl[0]; r.presents = decl[1]; r.absents = decl[2]; r.noShows = decl[3]; r.annulations = decl[4];
      if (r.inscrits === null && r.presents !== null && r.absents !== null && r.noShows !== null) r.inscrits = r.presents + r.absents + r.noShows;
      return r;
    }
    if (s.cycle_id) { r.inscrits = cycleActiveInscriptions(ctx, s.cycle_id, u.parseDate(s.date)).length; r.mode = 'inscriptions'; }
    return r;
  }

  function seanceRates(c) {
    function M(x, label) { return x === null || x === undefined ? u.missing(label) : u.known(x); }
    return {
      fill: u.ratio(M(c.inscrits, 'inscrits inconnus'), M(c.capacite, 'capacité absente'), 'Remplissage'),
      presence: u.ratio(M(c.presents, 'présences non encodées'), M(c.inscrits, 'inscrits inconnus'), 'Présence'),
      cancel: (c.annulations === null || c.inscrits === null) ? u.missing('annulations non encodées')
        : u.ratio(c.annulations, c.inscrits + c.annulations, 'Annulation'),
      noShow: u.ratio(M(c.noShows, 'no-shows non encodés'), M(c.inscrits, 'inscrits inconnus'), 'No-show')
    };
  }

  /** Synthèse des séances d'une période (activités organisées, remplissage, présence…). */
  function seancesSummary(ctx, f) {
    var list = ctx.db.seances.filter(function (s) { return seanceMatches(ctx, s, f); });
    var done = list.filter(function (s) { return s.statut === 'realisee'; });
    var planned = list.filter(function (s) { return s.statut === 'planifiee'; });
    var cancelled = list.filter(function (s) { return CANCELLED_SEANCE[s.statut]; });
    var agg = { ins: 0, cap: 0, pres: 0, insP: 0, ann: 0, insA: 0, ns: 0, insN: 0, nCap: 0, nPres: 0, nAnn: 0, nNs: 0, participations: 0 };
    var members = {}, declaredOnly = 0, unknown = 0, rows = [];
    done.forEach(function (s) {
      var c = seanceCounts(ctx, s);
      rows.push({ seance: s, counts: c, rates: seanceRates(c) });
      if (c.mode === 'declare' || c.mode === 'inscriptions') declaredOnly++;
      if (c.mode === 'inconnu' || c.mode === 'inscriptions') unknown++;
      if (c.inscrits !== null && c.capacite !== null) { agg.ins += c.inscrits; agg.cap += c.capacite; } else agg.nCap++;
      if (c.presents !== null && c.inscrits !== null) { agg.pres += c.presents; agg.insP += c.inscrits; } else agg.nPres++;
      if (c.annulations !== null && c.inscrits !== null) { agg.ann += c.annulations; agg.insA += c.inscrits + c.annulations; } else agg.nAnn++;
      if (c.noShows !== null && c.inscrits !== null) { agg.ns += c.noShows; agg.insN += c.inscrits; } else agg.nNs++;
      if (c.presents !== null) agg.participations += c.presents;
      c.membres.forEach(function (m) { members[m] = (members[m] || 0) + 1; });
    });
    function excl(n, what) { return n ? [n + ' séance(s) exclue(s) du ' + what + ' (données manquantes)'] : []; }
    function rate(a, b, n, what) {
      if (!b) return u.m(null, excl(n, what).concat(['Aucune séance exploitable pour le ' + what]));
      return u.m(a / b, excl(n, what));
    }
    var uniq = Object.keys(members).length;
    return {
      list: list, rows: rows,
      count: { total: list.length, realisees: done.length, planifiees: planned.length, annulees: cancelled.length },
      fill: rate(agg.ins, agg.cap, agg.nCap, 'remplissage'),
      presence: rate(agg.pres, agg.insP, agg.nPres, 'taux de présence'),
      cancel: rate(agg.ann, agg.insA, agg.nAnn, 'taux d\'annulation'),
      noShow: rate(agg.ns, agg.insN, agg.nNs, 'taux de no-show'),
      seanceCancelRate: u.ratio(cancelled.length, done.length + cancelled.length, 'Annulation de séances'),
      participations: u.m(done.length ? agg.participations : 0, agg.nPres ? [agg.nPres + ' séance(s) sans présences encodées'] : []),
      uniqueParticipants: u.m(uniq, declaredOnly ? [declaredOnly + ' séance(s) sans liste nominative : participants uniques partiels'] : []),
      members: members, unknownCount: unknown
    };
  }

  // ================================================================ académies
  function cycleOffre(ctx, cycle) { return cycle && ctx.offres[cycle.offre_id]; }

  /** État financier et d'assiduité d'une inscription à un cycle, à une date donnée. */
  function inscriptionState(ctx, ins, asOf) {
    var cycle = ctx.cycles[ins.cycle_id], offre = cycleOffre(ctx, cycle);
    var gaps = [];
    var label = (offre ? offre.nom : 'offre inconnue');
    if (!cycle) gaps.push('Inscription ' + ins.id + ' : cycle introuvable');
    else if (!offre) gaps.push('Cycle ' + (cycle.nom || cycle.id) + ' : offre introuvable');
    var offreNb = offre ? u.num(offre.nb_seances) : null;
    var prevues = u.num(ins.nb_seances_prevues);
    if (prevues === null && cycle) prevues = u.num(cycle.nb_seances);
    if (prevues === null) prevues = offreNb;
    if (prevues === null) gaps.push('Nombre de séances inconnu (' + label + ')');
    var attendu = u.num(ins.montant_attendu);
    if (attendu === null && offre) {
      var tarif = u.num(offre.tarif_seance), prixCycle = u.num(offre.prix_cycle);
      if (tarif !== null && prevues !== null) attendu = tarif * prevues;
      else if (prixCycle !== null && prevues !== null && offreNb) attendu = prixCycle * prevues / offreNb;
      else gaps.push('Tarif manquant : « ' + label + ' » (calcul bloqué)');
    }
    var start = u.parseDate(ins.date_premiere_seance) || (cycle && u.parseDate(cycle.date_debut)) || null;
    var seances = (ctx.seancesByCycle[ins.cycle_id] || []).filter(function (s) {
      var d = u.parseDate(s.date); return (!start || d >= start);
    }).sort(function (a, b) { return (a.date + a.heure_debut) < (b.date + b.heure_debut) ? -1 : 1; });
    var consumed = seances.filter(function (s) { return s.statut === 'realisee'; });
    if (prevues !== null) consumed = consumed.slice(0, prevues);
    var active = ins.statut === 'inscrit';
    if (!active) consumed = [];
    var consumedToDate = consumed.filter(function (s) { return !asOf || u.parseDate(s.date) <= asOf; });
    var pres = 0, abs = 0, unknownPres = 0;
    consumedToDate.forEach(function (s) {
      var p = (ctx.presencesBySeance[s.id] || []).filter(function (x) { return x.membre_id === ins.membre_id; })[0];
      if (!p) unknownPres++;
      else if (p.statut === 'present') pres++;
      else abs++;
    });
    var encaisse = 0;
    (ctx.paiementsByInscription[ins.id] || []).forEach(function (p) {
      if (asOf && u.parseDate(p.date_paiement) > asOf) return;
      if (p.statut === 'encaisse') encaisse += u.num(p.montant) || 0;
      if (p.statut === 'rembourse') encaisse -= u.num(p.montant) || 0;
    });
    var baseAmount = ctx.recoBase === 'encaisse' ? encaisse : attendu;
    var unit = (baseAmount !== null && prevues) ? baseAmount / prevues : null;
    var reconnu = unit === null ? null : unit * consumedToDate.length;
    return {
      inscription: ins, cycle: cycle, offre: offre, gaps: gaps, active: active,
      prevues: prevues, realisees: consumedToDate.length, presences: pres, absences: abs, presencesInconnues: unknownPres,
      attendu: attendu, encaisse: encaisse, solde: attendu === null ? null : attendu - encaisse,
      unit: unit, consumed: consumed,
      reconnu: reconnu,
      aDelivrer: reconnu === null ? null : Math.max(0, encaisse - reconnu),
      valeurConsommee: reconnu,
      valeurRestante: (unit === null || prevues === null || !active) ? (active ? null : 0) : unit * Math.max(0, prevues - consumedToDate.length),
      assiduite: consumedToDate.length && !unknownPres ? pres / consumedToDate.length : null
    };
  }

  // ================================================================ revenus
  /** Catégorie P&L d'une ligne de revenu. */
  function revenueCategory(ctx, typeCode, publicHint) {
    var fam = famille(ctx, typeCode);
    if (fam === 'prive') return 'cours_prives';
    if (fam === 'academie') return (publicHint || typeInfo(ctx, typeCode).attrs.public) === 'junior' ? 'academie_junior' : 'academie_adulte';
    if (fam === 'tournoi') return 'tournois';
    if (fam === 'evenement' || fam === 'social' || fam === 'decouverte') return 'evenements';
    return 'autres';
  }
  var REVENUE_LABELS = {
    academie_adulte: 'Académies adultes', academie_junior: 'Académies juniors', evenements: 'Événements et activités payantes',
    tournois: 'Tournois payants', autres: 'Autres revenus', cours_prives: 'Cours privés'
  };

  /** Résout la cible d'un paiement : cycle, séance, événement ou autre. */
  function paymentTarget(ctx, p) {
    var ins = p.inscription_id && ctx.inscriptionsById[p.inscription_id];
    if (ins && ins.cycle_id) return { kind: 'cycle', inscription: ins, cycle: ctx.cycles[ins.cycle_id] };
    var sid = (ins && ins.seance_id) || p.seance_id, eid = (ins && ins.evenement_id) || p.evenement_id;
    if (sid && ctx.seancesById[sid]) return { kind: 'seance', seance: ctx.seancesById[sid] };
    if (eid && ctx.evenements[eid]) return { kind: 'evenement', evenement: ctx.evenements[eid] };
    if (p.inscription_id && !ins) return { kind: 'orphelin' };
    if (!u.isBlank(p.categorie_revenu)) return { kind: 'autre' };
    return { kind: 'orphelin' };
  }

  function paymentMeta(ctx, p) {
    var t = paymentTarget(ctx, p), type = null, pub = null;
    if (t.kind === 'cycle') { var of = cycleOffre(ctx, t.cycle); type = of ? of.type_activite : null; pub = of ? of.public : null; }
    if (t.kind === 'seance') type = t.seance.type_activite;
    if (t.kind === 'evenement') type = t.evenement.type_activite;
    var cat = t.kind === 'autre' ? (p.categorie_revenu === 'cours_prive' ? 'cours_prives' : 'autres') : revenueCategory(ctx, type, pub);
    if (t.kind === 'orphelin') cat = 'autres';
    return { target: t, type: type, categorie: cat };
  }

  /** Encaissements : sommes réellement reçues (encaissé +, remboursé −) par date de paiement. */
  function cashLines(ctx, from, to) {
    var out = [];
    ctx.db.paiements.forEach(function (p) {
      var d = u.parseDate(p.date_paiement);
      if (!u.inRange(d, from, to) || (p.statut !== 'encaisse' && p.statut !== 'rembourse')) return;
      var meta = paymentMeta(ctx, p);
      if (meta.categorie === 'cours_prives' && !ctx.includePrivate) return;
      var amt = u.num(p.montant);
      out.push({ source: 'Paiements', id: p.id, date: d, montant: amt === null ? null : (p.statut === 'rembourse' ? -amt : amt),
        categorie: meta.categorie, type_activite: meta.type, cycle_id: meta.target.cycle ? meta.target.cycle.id : null,
        evenement_id: meta.target.evenement ? meta.target.evenement.id : null,
        libelle: 'Paiement ' + (p.reference || p.id) + (meta.target.kind === 'orphelin' ? ' (non rattaché)' : '') });
    });
    return out;
  }

  /** Revenus reconnus : valeur des séances/événements réellement délivrés sur la période. */
  function recognizedLines(ctx, from, to) {
    var out = [], gaps = [];
    ctx.db.inscriptions.forEach(function (ins) {
      if (!ins.cycle_id) return;
      var st = inscriptionState(ctx, ins, to);
      var of = st.offre, type = of ? of.type_activite : null;
      var cat = revenueCategory(ctx, type, of && of.public);
      if (cat === 'cours_prives' && !ctx.includePrivate) return;
      st.consumed.forEach(function (s) {
        var d = u.parseDate(s.date);
        if (!u.inRange(d, from, to)) return;
        if (st.unit === null) { gaps = gaps.concat(st.gaps.length ? st.gaps : ['Valeur unitaire inconnue (inscription ' + ins.id + ')']); }
        out.push({ source: 'Inscriptions', id: ins.id, seance_id: s.id, date: d, montant: st.unit, gaps: st.unit === null ? st.gaps : [], categorie: cat,
          type_activite: type, cycle_id: ins.cycle_id, membre_id: ins.membre_id,
          libelle: 'Séance du ' + u.fmtDate(d) + ' – ' + (st.cycle ? st.cycle.nom : '') + ' – membre ' + ins.membre_id });
      });
    });
    var evPaid = {};
    ctx.db.paiements.forEach(function (p) {
      if (p.statut !== 'encaisse' && p.statut !== 'rembourse') return;
      var meta = paymentMeta(ctx, p), t = meta.target, d = null, ok = false;
      if (t.kind === 'cycle' || t.kind === 'orphelin') return;
      if (t.kind === 'seance') { d = u.parseDate(t.seance.date); ok = t.seance.statut === 'realisee'; }
      if (t.kind === 'evenement') { d = u.parseDate(t.evenement.date); ok = t.evenement.statut === 'realise'; evPaid[t.evenement.id] = true; }
      if (t.kind === 'autre') { d = u.parseDate(p.date_paiement); ok = true; }
      if (!ok || !u.inRange(d, from, to)) return;
      if (meta.categorie === 'cours_prives' && !ctx.includePrivate) return;
      var amt = u.num(p.montant);
      out.push({ source: 'Paiements', id: p.id, date: d, montant: amt === null ? null : (p.statut === 'rembourse' ? -amt : amt),
        categorie: meta.categorie, type_activite: meta.type, evenement_id: t.evenement ? t.evenement.id : null,
        seance_id: t.seance ? t.seance.id : null, libelle: 'Paiement ' + (p.reference || p.id) });
    });
    ctx.db.evenements.forEach(function (e) {
      var d = u.parseDate(e.date);
      if (evPaid[e.id] || e.statut !== 'realise' || !u.inRange(d, from, to)) return;
      var decl = u.num(e.revenu_declare);
      if (decl === null) {
        if (u.bool(e.payant) === true) { gaps.push('Événement payant « ' + e.nom + ' » sans paiement ni revenu déclaré'); out.push({ source: 'Événements', id: e.id, date: d, montant: null, categorie: revenueCategory(ctx, e.type_activite), type_activite: e.type_activite, evenement_id: e.id, libelle: e.nom + ' (revenu inconnu)' }); }
        return;
      }
      out.push({ source: 'Événements', id: e.id, date: d, montant: decl, categorie: revenueCategory(ctx, e.type_activite),
        type_activite: e.type_activite, evenement_id: e.id, libelle: e.nom + ' (revenu déclaré)' });
    });
    return { lines: out, gaps: u.uniq(gaps) };
  }

  /** Revenus payés d'avance restant à délivrer, à une date. */
  function deferredAt(ctx, asOf) {
    var v = 0, gaps = [], lines = [];
    ctx.db.inscriptions.forEach(function (ins) {
      if (!ins.cycle_id) return;
      var st = inscriptionState(ctx, ins, asOf);
      if (st.encaisse <= 0) return;
      if (st.aDelivrer === null) { gaps = gaps.concat(st.gaps); return; }
      if (st.aDelivrer > 0) { v += st.aDelivrer; lines.push({ source: 'Inscriptions', id: ins.id, montant: st.aDelivrer, cycle_id: ins.cycle_id, libelle: 'Solde à délivrer – membre ' + ins.membre_id }); }
    });
    ctx.db.paiements.forEach(function (p) {
      if (p.statut !== 'encaisse' || u.parseDate(p.date_paiement) > asOf) return;
      var t = paymentTarget(ctx, p);
      var pending = (t.kind === 'seance' && (t.seance.statut !== 'realisee' || u.parseDate(t.seance.date) > asOf)) ||
        (t.kind === 'evenement' && (t.evenement.statut !== 'realise' || u.parseDate(t.evenement.date) > asOf));
      if (pending) { var a = u.num(p.montant) || 0; v += a; lines.push({ source: 'Paiements', id: p.id, montant: a, libelle: 'Paiement pour activité future ' + (p.reference || p.id) }); }
    });
    return { value: u.m(u.round(v, 2), u.uniq(gaps)), lines: lines };
  }

  // ================================================================ coûts
  function heureDuree(h) {
    var iv = interval(h.heure_debut, h.heure_fin);
    if (iv) return (iv[1] - iv[0]) / 60;
    return u.num(h.duree_h);
  }

  /** Lignes de coût coach (durée × taux historisé). confirmed = validé ou payé. */
  function coachCostLines(ctx, from, to) {
    var out = [];
    ctx.db.heures.forEach(function (h) {
      var d = u.parseDate(h.date);
      if (!u.inRange(d, from, to)) return;
      var se = h.seance_id && ctx.seancesById[h.seance_id];
      var type = h.type_activite || (se && se.type_activite);
      if (isPrivate(ctx, type) && !ctx.includePrivate) return;
      var duree = heureDuree(h);
      var rate = coachRate(ctx, h.coach_id, d);
      var cost = (duree === null || rate.v === null) ? null : duree * rate.v;
      var gaps = rate.gaps.slice(); if (duree === null) gaps.push('Durée inconnue (heure ' + h.id + ')');
      out.push({ source: 'Heures_Coachs', id: h.id, date: d, coach_id: h.coach_id, duree: duree, taux: rate.v, montant: cost, gaps: gaps,
        statut: h.statut, confirmed: h.statut === 'valide' || h.statut === 'paye', type_activite: type,
        cycle_id: h.cycle_id || (se && se.cycle_id) || null, evenement_id: h.evenement_id || (se && se.evenement_id) || null,
        nb_presents: u.num(h.nb_presents), libelle: coachName(ctx, h.coach_id) + ' – ' + u.fmtDate(d) + ' ' + (h.heure_debut || '') + '-' + (h.heure_fin || '') });
    });
    return out;
  }

  /** Lignes de dépenses directes (hors dépenses annulées). */
  function expenseLines(ctx, from, to) {
    var out = [];
    ctx.db.depenses.forEach(function (x) {
      var d = u.parseDate(x.date);
      if (!u.inRange(d, from, to) || x.statut === 'annulee') return;
      var ev = x.evenement_id && ctx.evenements[x.evenement_id];
      var cy = x.cycle_id && ctx.cycles[x.cycle_id];
      var se = x.seance_id && ctx.seancesById[x.seance_id];
      var type = x.type_activite || (ev && ev.type_activite) || (cy && cycleOffre(ctx, cy) && cycleOffre(ctx, cy).type_activite) || (se && se.type_activite) || null;
      out.push({ source: 'Dépenses', id: x.id, date: d, montant: u.num(x.montant), categorie: x.categorie, type_activite: type,
        evenement_id: x.evenement_id || null, cycle_id: x.cycle_id || (se && se.cycle_id) || null,
        libelle: (x.fournisseur || x.categorie || 'Dépense') + ' – ' + u.fmtDate(d), justificatif: x.justificatif });
    });
    return out;
  }

  function sumLines(lines, label) {
    var v = 0, gaps = [];
    lines.forEach(function (l) {
      if (l.montant === null || l.montant === undefined) gaps = gaps.concat(l.gaps && l.gaps.length ? l.gaps : [label + ' : montant inconnu (' + l.source + ' ' + l.id + ')']);
      else v += l.montant;
      if (l.gaps && l.montant !== null) gaps = gaps.concat(l.gaps);
    });
    var anyKnown = lines.some(function (l) { return l.montant !== null && l.montant !== undefined; });
    if (lines.length && !anyKnown) return u.m(null, gaps);
    return u.m(u.round(v, 2), gaps);
  }

  // ================================================================ P&L
  /**
   * Compte de résultat padel sur une période.
   * Marge brute = revenus reconnus − coûts coachs validés − coûts directs (− coût terrains si activé).
   */
  function pnl(ctx, f) {
    f = f || {};
    var from = f.from, to = f.to;
    var cash = cashLines(ctx, from, to);
    var reco = recognizedLines(ctx, from, to);
    var coach = coachCostLines(ctx, from, to);
    var exp = expenseLines(ctx, from, to);
    function keep(l) {
      if (f.type && l.type_activite !== f.type) return false;
      if (f.public) { var pub = typeInfo(ctx, l.type_activite).attrs.public; if (l.categorie === 'academie_junior') pub = 'junior'; if (l.categorie === 'academie_adulte') pub = 'adulte'; if (pub !== f.public) return false; }
      if (f.coach && l.coach_id !== undefined && l.coach_id !== f.coach) return false;
      return true;
    }
    if (f.type || f.public || f.coach) { cash = cash.filter(keep); reco.lines = reco.lines.filter(keep); coach = coach.filter(keep); exp = exp.filter(keep); }
    var confirmed = coach.filter(function (l) { return l.confirmed; });
    var pending = coach.filter(function (l) { return !l.confirmed && l.statut !== 'brouillon'; });
    var revenue = sumLines(reco.lines, 'Revenu reconnu'); revenue.gaps = u.uniq(revenue.gaps.concat(reco.gaps));
    var coachCost = sumLines(confirmed, 'Coût coach');
    var direct = sumLines(exp, 'Dépense');
    var terrainCost = u.known(0), terrainNote = 'Coût théorique des terrains exclu (non activé dans les paramètres).';
    if (u.bool(param(ctx, 'inclure_cout_terrains')) === true) {
      var rate = u.num(param(ctx, 'cout_horaire_terrain', to));
      var occ = occupancy(ctx, { from: from, to: to });
      terrainCost = rate === null ? u.missing('Coût horaire des terrains non renseigné') : u.known(u.round(occ.organised.v * rate, 2));
      terrainNote = 'Coût théorique des terrains inclus : heures d\'activités encadrées × coût horaire.';
    }
    var margin = u.sub(u.sub(u.sub(revenue, coachCost), direct), terrainCost);
    var byCat = {};
    Object.keys(REVENUE_LABELS).forEach(function (k) { byCat[k] = sumLines(reco.lines.filter(function (l) { return l.categorie === k; }), REVENUE_LABELS[k]); });
    var cashByCat = {};
    Object.keys(REVENUE_LABELS).forEach(function (k) { cashByCat[k] = sumLines(cash.filter(function (l) { return l.categorie === k; }), REVENUE_LABELS[k]); });
    var directByCat = u.groupBy(exp, function (l) { return l.categorie || 'autre'; });
    Object.keys(directByCat).forEach(function (k) { directByCat[k] = sumLines(directByCat[k], 'Dépense'); });

    // Marge par activité, avec participants pour la marge par participant.
    var ss = seancesSummary(ctx, f);
    var partByType = {};
    ss.rows.forEach(function (r) {
      var t = r.seance.type_activite;
      partByType[t] = partByType[t] || { participations: 0, members: {}, unknown: 0 };
      if (r.counts.presents !== null) partByType[t].participations += r.counts.presents; else partByType[t].unknown++;
      r.counts.membres.forEach(function (m) { partByType[t].members[m] = 1; });
    });
    var types = u.uniq([].concat(reco.lines, confirmed, exp).map(function (l) { return l.type_activite || ''; }));
    var byActivity = types.map(function (t) {
      function only(list) { return list.filter(function (l) { return (l.type_activite || '') === t; }); }
      var rv = sumLines(only(reco.lines), 'Revenu'), cc = sumLines(only(confirmed), 'Coût coach'), dc = sumLines(only(exp), 'Dépense');
      var mg = u.sub(u.sub(rv, cc), dc);
      var part = partByType[t];
      var nUniq = part ? Object.keys(part.members).length : 0;
      return { type: t, label: t ? typeLabel(ctx, t) : 'Non rattaché', revenue: rv, coachCost: cc, direct: dc, margin: mg,
        participations: part ? part.participations : 0,
        marginPerParticipation: u.ratio(mg, part ? part.participations : 0, 'Marge par participation') };
    }).sort(function (a, b) { return (b.revenue.v || 0) - (a.revenue.v || 0); });

    var cycleIds = u.uniq([].concat(reco.lines, confirmed, exp).map(function (l) { return l.cycle_id; }).filter(Boolean));
    var byCycle = cycleIds.map(function (id) {
      function only(list) { return list.filter(function (l) { return l.cycle_id === id; }); }
      var cy = ctx.cycles[id];
      var rv = sumLines(only(reco.lines), 'Revenu'), cc = sumLines(only(confirmed), 'Coût coach'), dc = sumLines(only(exp), 'Dépense');
      var ins = cycleActiveInscriptions(ctx, id, to).length;
      var mg = u.sub(u.sub(rv, cc), dc);
      return { id: id, label: cy ? cy.nom : id, offre: cy && ctx.offres[cy.offre_id] ? ctx.offres[cy.offre_id].nom : '', revenue: rv, coachCost: cc, direct: dc,
        margin: mg, participants: ins, marginPerParticipant: u.ratio(mg, ins, 'Marge par participant') };
    });

    var deferred = deferredAt(ctx, to);
    var participants = ss.uniqueParticipants;
    return {
      period: { from: from, to: to },
      encaissements: sumLines(cash, 'Encaissement'), encaissementsByCat: cashByCat,
      revenusReconnus: revenue, revenusByCat: byCat,
      aDelivrer: deferred.value,
      coutsCoachs: coachCost, coutsCoachsProvisoires: sumLines(pending, 'Coût coach'),
      coutsDirects: direct, coutsDirectsByCat: directByCat,
      coutTerrains: terrainCost, coutTerrainsNote: terrainNote,
      margeBrute: margin,
      tauxMarge: u.ratio(margin, revenue, 'Taux de marge'),
      margeParParticipant: u.ratio(margin, participants, 'Marge par participant'),
      byActivity: byActivity, byCycle: byCycle,
      budget: budgetFor(ctx, from, to),
      exclusions: [ctx.includePrivate ? 'Cours privés inclus (paramètre activé).' : 'Cours privés exclus du P&L.', terrainNote],
      lines: { cash: cash, recognized: reco.lines, coach: coach, direct: exp, deferred: deferred.lines }
    };
  }

  /** Budget (Paramètres, catégorie budget, référence = AAAA-MM, clé = poste). */
  function budgetFor(ctx, from, to) {
    var rows = ctx.params.filter(function (p) { return p.categorie === 'budget'; });
    if (!rows.length) return null;
    var months = {};
    u.eachDay(from, to).forEach(function (d) { months[d.slice(0, 7)] = 1; });
    var out = {}, any = false;
    rows.forEach(function (p) {
      if (!months[String(p.reference).trim()]) return;
      var v = u.num(p.valeur); if (v === null) return;
      out[p.cle] = (out[p.cle] || 0) + v; any = true;
    });
    var aligned = from === u.startOfMonth(from) && to === u.endOfMonth(to);
    return any ? { values: out, aligned: aligned } : null;
  }

  // ================================================================ coachs
  function coachSummary(ctx, f) {
    var lines = coachCostLines(ctx, f.from, f.to).filter(function (l) { return !f.coach || l.coach_id === f.coach; });
    var by = u.groupBy(lines, function (l) { return l.coach_id || ''; });
    var coaches = Object.keys(by).map(function (id) {
      var ls = by[id];
      function hrs(pred) { return u.round(ls.filter(pred).reduce(function (t, l) { return t + (l.duree || 0); }, 0), 2); }
      var conf = ls.filter(function (l) { return l.confirmed; });
      var presents = conf.reduce(function (t, l) { return t + (l.nb_presents || 0); }, 0);
      var cost = sumLines(conf, 'Coût coach');
      return {
        id: id, nom: coachName(ctx, id),
        heures: { brouillon: hrs(function (l) { return l.statut === 'brouillon'; }), soumis: hrs(function (l) { return l.statut === 'soumis'; }),
          a_corriger: hrs(function (l) { return l.statut === 'a_corriger'; }), valide: hrs(function (l) { return l.statut === 'valide'; }),
          paye: hrs(function (l) { return l.statut === 'paye'; }) },
        coutValide: cost,
        coutValideNonPaye: sumLines(ls.filter(function (l) { return l.statut === 'valide'; }), 'Coût coach'),
        coutPaye: sumLines(ls.filter(function (l) { return l.statut === 'paye'; }), 'Coût coach'),
        coutEnAttente: sumLines(ls.filter(function (l) { return l.statut === 'soumis' || l.statut === 'a_corriger'; }), 'Coût coach'),
        coutParParticipant: u.ratio(cost, presents, 'Coût par participant'),
        lines: ls
      };
    });
    var byType = u.groupBy(lines.filter(function (l) { return l.confirmed; }), function (l) { return l.type_activite || ''; });
    var types = Object.keys(byType).map(function (t) {
      return { type: t, label: typeLabel(ctx, t), heures: u.round(byType[t].reduce(function (s, l) { return s + (l.duree || 0); }, 0), 2), cout: sumLines(byType[t], 'Coût coach') };
    });
    return { coaches: coaches, byType: types, lines: lines,
      totalValide: sumLines(lines.filter(function (l) { return l.confirmed; }), 'Coût coach'),
      totalEnAttente: sumLines(lines.filter(function (l) { return l.statut === 'soumis' || l.statut === 'a_corriger'; }), 'Coût coach') };
  }

  // ================================================================ événements
  function eventSummary(ctx, e) {
    var pay = ctx.db.paiements.filter(function (p) { var t = paymentTarget(ctx, p); return t.kind === 'evenement' && t.evenement.id === e.id && (p.statut === 'encaisse' || p.statut === 'rembourse'); });
    var revenue;
    if (pay.length) revenue = u.known(pay.reduce(function (t, p) { return t + (p.statut === 'rembourse' ? -1 : 1) * (u.num(p.montant) || 0); }, 0));
    else if (u.num(e.revenu_declare) !== null) revenue = u.known(u.num(e.revenu_declare));
    else if (u.bool(e.payant) === false) revenue = u.known(0);
    else revenue = u.missing('Revenu inconnu pour « ' + e.nom + ' »');
    var exp = ctx.db.depenses.filter(function (x) { return x.evenement_id === e.id && x.statut !== 'annulee'; });
    var direct = sumLines(exp.map(function (x) { return { montant: u.num(x.montant), source: 'Dépenses', id: x.id }; }), 'Dépense');
    var hrs = coachCostLines(ctx, null, null).filter(function (l) { return l.evenement_id === e.id && l.confirmed; });
    var coach = sumLines(hrs, 'Coût coach');
    var costs = u.sum([direct, coach]);
    var presents = u.num(e.nb_presents), inscrits = u.num(e.nb_inscrits), cap = u.num(e.capacite);
    var sat = ctx.db.satisfaction.filter(function (s) { return s.evenement_id === e.id; });
    var notes = sat.map(function (s) { return u.num(s.note_globale); }).filter(function (x) { return x !== null; });
    return {
      evenement: e, inscrits: inscrits, presents: presents, capacite: cap,
      fill: u.ratio(inscrits === null ? u.missing('inscrits inconnus') : inscrits, cap === null ? u.missing('capacité absente') : cap, 'Remplissage'),
      presence: u.ratio(presents === null ? u.missing('présents inconnus') : presents, inscrits === null ? u.missing('inscrits inconnus') : inscrits, 'Présence'),
      revenue: revenue, direct: direct, coach: coach, costs: costs, margin: u.sub(revenue, costs),
      costPerParticipant: u.ratio(costs, presents === null ? u.missing('présents inconnus') : presents, 'Coût par participant'),
      satisfaction: { n: notes.length, moyenne: notes.length ? notes.reduce(function (a, b) { return a + b; }, 0) / notes.length : null }
    };
  }

  // ================================================================ satisfaction
  /** NPS = % promoteurs (9-10) − % détracteurs (0-6). Toujours renvoyé avec n. */
  function nps(rows) {
    var scores = rows.map(function (r) { return u.num(r.recommandation); }).filter(function (x) { return x !== null && x >= 0 && x <= 10; });
    var n = scores.length;
    var pro = scores.filter(function (x) { return x >= 9; }).length;
    var det = scores.filter(function (x) { return x <= 6; }).length;
    var pas = n - pro - det;
    function avg(k) { var xs = rows.map(function (r) { return u.num(r[k]); }).filter(function (x) { return x !== null; }); return { n: xs.length, v: xs.length ? xs.reduce(function (a, b) { return a + b; }, 0) / xs.length : null }; }
    return {
      n: n, promoteurs: pro, passifs: pas, detracteurs: det,
      score: n ? u.known(u.round((pro / n - det / n) * 100, 1)) : u.missing('Aucune réponse sur la période'),
      noteGlobale: avg('note_globale'), noteTerrains: avg('note_terrains'), noteOrganisation: avg('note_organisation')
    };
  }
  function satisfactionRows(ctx, f) {
    return ctx.db.satisfaction.filter(function (s) {
      if (!u.inRange(u.parseDate(s.date), f.from, f.to)) return false;
      if (f.type && s.type_activite !== f.type) return false;
      return true;
    });
  }

  // ================================================================ engagement
  /** Récurrence, taux de retour, nouveaux participants et conversion des Tasters. */
  function engagement(ctx, f) {
    var delay = u.num(param(ctx, 'delai_conversion_taster_jours')) || null;
    var hist = [];
    ctx.db.seances.forEach(function (s) {
      if (s.statut !== 'realisee') return;
      (ctx.presencesBySeance[s.id] || []).forEach(function (p) {
        if (p.statut === 'present') hist.push({ m: p.membre_id, d: u.parseDate(s.date), t: s.type_activite, s: s });
      });
    });
    hist.sort(function (a, b) { return a.d < b.d ? -1 : 1; });
    var inPeriod = hist.filter(function (h) { return u.inRange(h.d, f.from, f.to) && seanceMatches(ctx, h.s, f); });
    var counts = {};
    inPeriod.forEach(function (h) { counts[h.m] = (counts[h.m] || 0) + 1; });
    var members = Object.keys(counts);
    var first = {};
    hist.forEach(function (h) { if (!first[h.m]) first[h.m] = h.d; });
    var returning = members.filter(function (m) { return first[m] < f.from; }).length;
    var nouveaux = members.length - returning;
    var recurrent = members.filter(function (m) { return counts[m] >= 2; }).length;
    // Conversion Taster : premier Taster sur la période, autre activité dans le délai.
    var tasters = {}, converted = 0;
    hist.forEach(function (h) {
      if (h.t !== 'padel_taster') return;
      if (!tasters[h.m]) tasters[h.m] = h.d;
    });
    var cohort = Object.keys(tasters).filter(function (m) { return u.inRange(tasters[m], f.from, f.to); });
    cohort.forEach(function (m) {
      var d0 = tasters[m];
      if (hist.some(function (h) { return h.m === m && h.t !== 'padel_taster' && h.d > d0 && delay !== null && u.daysBetween(d0, h.d) <= delay; })) converted++;
    });
    var gaps = [];
    if (ctx.db.seances.some(function (s) { return s.statut === 'realisee' && u.inRange(u.parseDate(s.date), f.from, f.to) && !(ctx.presencesBySeance[s.id] || []).length; }))
      gaps.push('Certaines séances n\'ont pas de liste nominative : indicateurs de fidélité partiels');
    return {
      participants: u.m(members.length, gaps), nouveaux: u.m(nouveaux, gaps), retour: u.ratio(u.m(returning, gaps), members.length, 'Taux de retour'),
      recurrence: u.ratio(u.m(recurrent, gaps), members.length, 'Récurrence'),
      tasters: cohort.length, convertis: converted,
      conversion: delay === null ? u.missing('Délai de conversion non paramétré') : u.ratio(u.m(converted, gaps), cohort.length, 'Conversion Taster'),
      delai: delay
    };
  }

  // ================================================================ tableau de bord
  function dashboard(ctx, f) {
    var occ = occupancy(ctx, f);
    var ss = seancesSummary(ctx, f);
    var p = pnl(ctx, f);
    var sat = nps(satisfactionRows(ctx, f));
    var eng = engagement(ctx, f);
    var nbEvents = ctx.db.evenements.filter(function (e) { return e.statut !== 'annule' && u.inRange(u.parseDate(e.date), f.from, f.to) && (!f.type || e.type_activite === f.type); }).length;
    return {
      occupancy: occ, seances: ss, pnl: p, nps: sat, engagement: eng,
      kpis: {
        heuresDisponibles: occ.available, heuresReservees: occ.reserved, heuresUtilisees: occ.used, occupation: occ.rate,
        occupationIndoor: occ.byLieu.indoor.rate, occupationOutdoor: occ.byLieu.outdoor.rate,
        participantsUniques: ss.uniqueParticipants, participations: ss.participations,
        activites: u.known(ss.count.realisees + nbEvents), remplissage: ss.fill, presence: ss.presence,
        annulation: ss.cancel, noShow: ss.noShow, encaissements: p.encaissements, revenusReconnus: p.revenusReconnus,
        coutsCoachs: p.coutsCoachs, coutsDirects: p.coutsDirects, margeBrute: p.margeBrute,
        satisfaction: sat.noteGlobale.v === null ? u.missing('Aucune note globale') : u.known(sat.noteGlobale.v), nps: sat.score
      }
    };
  }

  /** Série hebdomadaire (évolution depuis l'ouverture) pour les graphiques. */
  function weeklySeries(ctx, from, to, f) {
    var out = [];
    var start = u.startOfWeek(from);
    for (var d = start; d <= to; d = u.addDays(d, 7)) {
      var r = { from: d < from ? from : d, to: u.addDays(d, 6) > to ? to : u.addDays(d, 6) };
      var ff = Object.assign({}, f || {}, r);
      var occ = occupancy(ctx, ff), ss = seancesSummary(ctx, ff), pl = pnl(ctx, ff);
      out.push({ from: r.from, to: r.to, label: u.fmtDate(d).slice(0, 5), occupation: occ.rate.v, participations: ss.participations.v,
        activites: ss.count.realisees, revenus: pl.revenusReconnus.v, encaissements: pl.encaissements.v, marge: pl.margeBrute.v,
        incomplet: pl.margeBrute.gaps.length > 0 || occ.rate.v === null });
      if (out.length > 60) break;
    }
    return out;
  }

  return {
    live: live, isArchived: isArchived, context: context, param: param, parseAttrs: parseAttrs, typeInfo: typeInfo, typeLabel: typeLabel,
    famille: famille, coachRate: coachRate, coachName: coachName, parseRanges: parseRanges, union: union, intersect: intersect,
    subtract: subtract, total: total, seanceMatches: seanceMatches, seancePublic: seancePublic, seancePayant: seancePayant,
    occupancy: occupancy, seanceCounts: seanceCounts, seanceRates: seanceRates, seancesSummary: seancesSummary,
    cycleActiveInscriptions: cycleActiveInscriptions, inscriptionState: inscriptionState, paymentTarget: paymentTarget,
    cashLines: cashLines, recognizedLines: recognizedLines, deferredAt: deferredAt, heureDuree: heureDuree,
    coachCostLines: coachCostLines, expenseLines: expenseLines, sumLines: sumLines, pnl: pnl, budgetFor: budgetFor,
    coachSummary: coachSummary, eventSummary: eventSummary, nps: nps, satisfactionRows: satisfactionRows,
    engagement: engagement, dashboard: dashboard, weeklySeries: weeklySeries, REVENUE_LABELS: REVENUE_LABELS,
    revenueCategory: revenueCategory, peakFor: peakFor, CANCELLED_SEANCE: CANCELLED_SEANCE
  };
});
