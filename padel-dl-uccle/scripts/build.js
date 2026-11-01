#!/usr/bin/env node
/**
 * Construit les livrables à partir de src/ (aucune dépendance npm) :
 *   dist/demo/index.html          application autonome, mode démonstration (données fictives)
 *   dist/apps-script/Index.html   même application, mode Google Sheets
 *   dist/apps-script/*.gs         code serveur Apps Script + modules partagés
 *   dist/apps-script/appsscript.json
 *   docs/STRUCTURE_GOOGLE_SHEETS.md (généré depuis src/core/schema.js)
 */
'use strict';
const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..');
const read = (p) => fs.readFileSync(path.join(ROOT, p), 'utf8');
const write = (p, s) => { const f = path.join(ROOT, p); fs.mkdirSync(path.dirname(f), { recursive: true }); fs.writeFileSync(f, s); };

const CORE = ['src/core/util.js', 'src/core/schema.js', 'src/core/permissions.js', 'src/core/calc.js', 'src/core/quality.js',
  'src/core/community.js', 'src/core/importer.js', 'src/core/reports.js', 'src/core/rules.js'];
const UI = ['src/data/store.js', 'src/ui/components.js', 'src/ui/app.js', 'src/ui/views-ops.js', 'src/ui/views-community.js', 'src/ui/views-admin.js'];

function bundle(files) { return files.map((f) => '/* ---- ' + f + ' ---- */\n' + read(f)).join('\n'); }

function page(mode) {
  const files = CORE.concat(mode === 'demo' ? ['src/data/demo-seed.js'] : [], UI);
  const js = bundle(files).replace(/<\/script/gi, '<\\/script');
  return read('src/ui/index.html')
    .replace('/*__CSS__*/', () => read('src/ui/styles.css'))
    .replace('/*__JS__*/', () => js)
    .replace('__MODE__', mode);
}

write('dist/demo/index.html', page('demo'));
write('dist/apps-script/Index.html', page('sheets'));
// Modules partagés côté serveur (même logique de validation et de droits que l'interface).
write('dist/apps-script/Shared.gs', '// Généré par scripts/build.js – ne pas modifier ici.\n' +
  bundle(['src/core/util.js', 'src/core/schema.js', 'src/core/permissions.js', 'src/core/rules.js']));
write('dist/apps-script/Code.gs', read('apps-script/Code.gs'));
write('dist/apps-script/appsscript.json', read('apps-script/appsscript.json'));

// Documentation de la structure Google Sheets
const schema = require(path.join(ROOT, 'src/core/schema.js'));
const TYPES = { id: 'Identifiant (texte unique)', text: 'Texte', longtext: 'Texte long', number: 'Nombre décimal', money: 'Montant en euros', int: 'Nombre entier',
  date: 'Date (AAAA-MM-JJ)', time: 'Heure (HH:MM)', bool: 'Booléen (TRUE/FALSE)', enum: 'Liste de valeurs', ref: 'Référence (ID)', refs: 'Liste d\'ID séparés par des virgules',
  url: 'Lien', email: 'E-mail', rating10: 'Note de 0 à 10' };
let md = '# Structure Google Sheets\n\n> Fichier généré par `node scripts/build.js` à partir de `src/core/schema.js`. Ne pas modifier à la main.\n\n' +
  'Le classeur contient ' + schema.SHEETS.length + ' onglets. La fonction `setupSpreadsheet()` (Apps Script) les crée avec leurs en-têtes, listes déroulantes et protections.\n\n' +
  'Règles communes :\n\n- la première colonne `id` est l\'identifiant unique de la ligne ;\n- les six dernières colonnes (`archive`, `import_id`, `cree_le`, `cree_par`, `modifie_le`, `modifie_par`) sont techniques ; `archive = TRUE` exclut la ligne des calculs sans la supprimer ;\n' +
  '- une cellule vide signifie « inconnu » : elle n\'est jamais lue comme zéro ;\n- les listes « configurables » sont lues dans l\'onglet Paramètres (catégorie indiquée).\n\n## Sommaire\n\n' +
  schema.SHEETS.map((s) => '- [' + s.tab + '](#' + s.tab.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^a-z0-9_]+/g, '-') + ')' + (s.extra ? ' *(ajoutée au modèle demandé)*' : '')).join('\n') + '\n\n';
schema.SHEETS.forEach((s) => {
  md += '## ' + s.tab + '\n\n' + s.desc + '\n\nClé de détection des doublons : `' + s.naturalKey.join(' + ') + '`\n\n| Colonne | Libellé | Type | Obligatoire | Règle de validation | Relation |\n|---|---|---|---|---|---|\n';
  s.cols.forEach((c) => {
    let rule = c.v || '';
    if (c.enumName) rule = (rule ? rule + ' ; ' : '') + 'valeurs : ' + Object.keys(schema.ENUMS[c.enumName]).map((k) => '`' + k + '`').join(', ');
    if (c.enumParam) rule = (rule ? rule + ' ; ' : '') + 'valeurs configurables (Paramètres → `' + c.enumParam + '`)';
    if (c.min !== undefined || c.max !== undefined) rule = (rule ? rule + ' ; ' : '') + 'entre ' + (c.min !== undefined ? c.min : '…') + ' et ' + (c.max !== undefined ? c.max : '…');
    if (c.t === 'rating10') rule = rule || '0 à 10';
    if (c.t === 'money') rule = rule || '≥ 0, vide = inconnu';
    if (c.help) rule = (rule ? rule + '. ' : '') + c.help;
    const rel = c.ref ? '→ ' + schema.sheet(c.ref).tab + '.id' : '';
    md += '| `' + c.n + '` | ' + c.label + ' | ' + (TYPES[c.t] || c.t) + ' | ' + (c.req ? 'Oui' : 'Non') + ' | ' + rule.replace(/\|/g, '\\|') + ' | ' + rel + ' |\n';
  });
  md += '\n';
});
md += '## Valeurs initiales de « Paramètres »\n\nChargées par `setupSpreadsheet()` depuis le cadrage du 01/11/2026. Les valeurs vides sont à fournir.\n\n| Catégorie | Clé | Référence | Valeur | Source / remarque |\n|---|---|---|---|---|\n' +
  schema.INITIAL_PARAMETRES.map((p) => '| ' + p.categorie + ' | `' + p.cle + '` | ' + (p.reference || '') + ' | ' + (p.valeur === '' ? '*(vide)*' : p.valeur) + ' | ' + (p.source || '') + (p.description ? ' – ' + p.description : '') + (p.statut === 'archive' ? ' (archivé)' : '') + ' |').join('\n') + '\n';
write('docs/STRUCTURE_GOOGLE_SHEETS.md', md);

const size = (p) => (fs.statSync(path.join(ROOT, p)).size / 1024).toFixed(0) + ' Ko';
console.log('dist/demo/index.html', size('dist/demo/index.html'));
console.log('dist/apps-script/Index.html', size('dist/apps-script/Index.html'));
console.log('docs/STRUCTURE_GOOGLE_SHEETS.md généré');

// Matrice des permissions (générée depuis src/core/permissions.js)
const P = require(path.join(ROOT, 'src/core/permissions.js'));
const roles = Object.keys(P.ROLES);
let pm = '# Matrice des permissions\n\n> Généré par `node scripts/build.js` depuis `src/core/permissions.js`. Valeurs par défaut ; chaque case est modifiable dans l\'application (Paramètres → Droits par rôle), ce qui crée une ligne `permission` dans l\'onglet Paramètres. Le serveur Apps Script applique la même matrice.\n\n' +
  '| Permission | Code | ' + roles.map((r) => P.ROLES[r]).join(' | ') + ' |\n|---|---|' + roles.map(() => ':-:').join('|') + '|\n' +
  P.ALL.map((p) => '| ' + P.PERMS[p] + ' | `' + p + '` | ' + roles.map((r) => (P.DEFAULTS[r].includes(p) ? '✓' : '–')).join(' | ') + ' |').join('\n') +
  '\n\n## Règles fines appliquées par le serveur (en plus de la matrice)\n\n' +
  '- Un coach n\'encode que **ses propres** heures, en statut Brouillon ou Soumis.\n- Des heures **Validées** ou **Payées** ne sont plus modifiables par le coach : seule une « demande de correction » (texte) peut être ajoutée.\n' +
  '- « À corriger » exige un motif ; « Payé » exige la permission de paiement ; la validation enregistre qui a validé et quand.\n' +
  '- Un coach ne modifie que ses séances (responsable ou remplaçant) et leurs présences ; il ne change pas le coach responsable.\n' +
  '- Lecture minimisée : un coach ne reçoit que ses heures et son propre taux ; seuls les rôles avec `couts.view` voient les taux ; seuls ceux avec `pnl.view` voient le budget ; les e-mails des utilisateurs ne sont envoyés qu\'à l\'administrateur ; l\'empreinte des codes d\'accès n\'est jamais envoyée.\n' +
  '- Le journal d\'audit est en ajout seul. Rien n\'est supprimé : « Archiver » met `archive = TRUE`.\n';
write('docs/MATRICE_PERMISSIONS.md', pm);
console.log('docs/MATRICE_PERMISSIONS.md généré');
