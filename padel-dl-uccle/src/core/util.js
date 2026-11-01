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
