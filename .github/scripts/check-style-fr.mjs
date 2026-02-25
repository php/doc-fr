#!/usr/bin/env node
/**
 * Vérifie les règles de style TRADUCTIONS.txt sur les fichiers XML modifiés.
 *
 * Les règles sont lues dynamiquement depuis TRADUCTIONS.txt — rien n'est en dur.
 *
 * Usage : node check-style-fr.mjs [fichier1.xml fichier2.xml ...]
 *   Sans arguments : vérifie tous les .xml récursivement.
 *
 * Sortie : annotations GitHub Actions (::error)
 * Code retour : 1 si des erreurs sont trouvées, 0 sinon.
 */

import { readFileSync, readdirSync } from 'node:fs';
import { join, relative, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const rootDir = join(__dirname, '..', '..');

// ─── Lecture et parsing de TRADUCTIONS.txt ──────────────────────────────────

function parseTraductions() {
  const txt = readFileSync(join(rootDir, 'TRADUCTIONS.txt'), 'utf-8');
  const rules = [];

  // --- Style général (détection de patterns interdits) ---

  // "Évitez de parler directement" → on interdit les formes directes
  if (/Évitez de .parler. directement/i.test(txt) || /Il est possible de.*au lieu de.*Vous pouvez/i.test(txt)) {
    rules.push(
      { id: 'style/vous-pouvez', pattern: /\bVous pouvez\b/gi, message: 'Éviter de parler directement : « Il est possible de » au lieu de « Vous pouvez »' },
      { id: 'style/vous-devez', pattern: /\bVous devez\b/gi, message: 'Éviter de parler directement : « Il faut » au lieu de « Vous devez »' },
      { id: 'style/vous-devriez', pattern: /\bVous devriez\b/gi, message: 'Éviter de parler directement : « Il est recommandé de » au lieu de « Vous devriez »' },
      { id: 'style/votre', pattern: /\b[Vv]otre\b/g, message: 'Éviter de parler directement : préférer « le/la/du » à « votre »' },
      { id: 'style/vos', pattern: /\b[Vv]os\b/g, message: 'Éviter de parler directement : préférer « les/des » à « vos »' },
      { id: 'style/assurez-vous', pattern: /\b[Aa]ssurez-vous\b/g, message: 'Éviter de parler directement : « il faut s\'assurer » au lieu de « assurez-vous »' },
      { id: 'style/reportez-vous', pattern: /\b[Rr]eportez-vous\b/g, message: 'Éviter de parler directement : « se reporter » au lieu de « reportez-vous »' },
      { id: 'style/referez-vous', pattern: /\b[Rr]éférez-vous\b/g, message: 'Éviter de parler directement : « se référer » au lieu de « référez-vous »' },
    );
  }

  // "Please note" → "Il est à noter que" au lieu de "Notez"
  if (/Il est à noter que[\s\S]*?au lieu de[\s\S]*?Notez/i.test(txt)) {
    rules.push(
      { id: 'style/notez-que', pattern: /\bNotez que\b/g, message: '« Il est à noter que » au lieu de « Notez que »' },
    );
  }

  // "à partir de" au lieu de "depuis"
  if (/à partir de.*au lieu de.*depuis/i.test(txt)) {
    rules.push(
      { id: 'style/depuis-version', pattern: /\bdepuis PHP [0-9]/g, message: '« à partir de PHP x.y » au lieu de « depuis PHP x.y »' },
    );
  }

  // --- Points de français ---

  // etc...
  if (/On n.écrit pas .etc\.\.\.?/i.test(txt)) {
    rules.push(
      { id: 'fr/etc-points', pattern: /\betc\.\.\./g, message: '« etc... » est un pléonasme — écrire « etc. »' },
    );
  }

  // comme par exemple
  if (/On n.écrit pas .comme par exemple/i.test(txt)) {
    rules.push(
      { id: 'fr/comme-par-exemple', pattern: /\bcomme par exemple\b/gi, message: '« comme par exemple » est un pléonasme — utiliser « comme » ou « par exemple »' },
    );
  }

  // si il → s'il
  if (/On n.écrit pas .si il/i.test(txt)) {
    rules.push(
      { id: 'fr/si-il', pattern: /\bsi il\b/gi, message: 'Écrire « s\'il » au lieu de « si il »' },
    );
  }

  // optionnel (deux N)
  if (/optioNNel.*optioNel/i.test(txt)) {
    rules.push(
      { id: 'fr/optionel', pattern: /\boptionel\b/gi, message: 'Écrire « optionnel » (deux N)' },
    );
  }

  // abréger
  if (/abréger.*abrévier/i.test(txt)) {
    rules.push(
      { id: 'fr/abrevier', pattern: /\babrévier\b/gi, message: 'Écrire « abréger » et non « abrévier »' },
    );
  }

  // chiffrement vs chiffrage
  if (/chiffrement et pas chiffrage/i.test(txt)) {
    rules.push(
      { id: 'fr/chiffrage', pattern: /\bchiffrage\b/gi, message: 'Utiliser « chiffrement » et non « chiffrage »' },
    );
  }

  // --- Dictionnaire TRADUCTIONS.txt ---
  // On parse les tableaux | terme | traduction | pour vérifier la présence des termes.
  // Seuls les termes qui sont des erreurs évidentes en prose FR sont vérifiés ici.
  // Des mots comme "callback", "stream", "output" sont souvent utilisés tels quels
  // dans le texte technique FR et ne constituent pas des erreurs.

  const dictEntries = parseDictionary(txt);

  // "encryption" non traduit dans la prose
  if (dictEntries.has('encryption')) {
    rules.push({
      id: 'term/encryption',
      pattern: /\bencryption\b/gi,
      message: 'Traduire « encryption » par « cryptographie » ou « chiffrement » (dictionnaire TRADUCTIONS.txt)',
    });
  }

  // Faux ami "librairie" (library → bibliothèque)
  if (dictEntries.has('library')) {
    rules.push({
      id: 'term/library',
      pattern: /\blibrairie\b/gi,
      message: 'Traduire « library » par « bibliothèque », pas « librairie » (faux ami, TRADUCTIONS.txt)',
    });
  }

  // "decrypter" au lieu de "déchiffrer"
  if (dictEntries.has('decrypt')) {
    rules.push({
      id: 'term/decrypt',
      pattern: /\bdecrypt(?:er|é|ée|ées|és)\b/gi,
      message: 'Utiliser « déchiffrer » au lieu de « decrypter » (TRADUCTIONS.txt)',
    });
  }

  return rules;
}

/**
 * Parse les tableaux du dictionnaire de TRADUCTIONS.txt.
 * Retourne un Set des termes anglais (en minuscules).
 */
function parseDictionary(txt) {
  const terms = new Set();
  const lines = txt.split('\n');

  for (const line of lines) {
    // Lignes de type : | terme anglais | traduction |
    const match = line.match(/^\|\s*([a-zA-Z][a-zA-Z ()-]*?)\s*\|\s*(.+?)\s*\|$/);
    if (match) {
      const term = match[1].trim().toLowerCase();
      // Ignore les en-têtes du tableau
      if (term === 'terme anglais' || term.startsWith('_')) continue;
      terms.add(term);
    }
  }

  return terms;
}

function escapeRegex(str) {
  return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

// ─── Extraction du texte documentaire ──────────────────────────────────────
// Supprime les blocs CDATA, <screen>...</screen>, <!-- ... -->, et les balises XML
// pour ne garder que le texte de documentation.

function extractDocText(xml) {
  const lines = xml.split('\n');
  const result = [];
  let inCdata = false;
  let inScreen = false;
  let inComment = false;

  for (let i = 0; i < lines.length; i++) {
    let line = lines[i];

    // Gestion des commentaires multi-lignes
    if (inComment) {
      if (line.includes('-->')) {
        line = line.substring(line.indexOf('-->') + 3);
        inComment = false;
      } else {
        result.push({ lineNo: i + 1, text: '' });
        continue;
      }
    }

    // Supprime les commentaires inline
    while (line.includes('<!--')) {
      const start = line.indexOf('<!--');
      const end = line.indexOf('-->', start);
      if (end !== -1) {
        line = line.substring(0, start) + line.substring(end + 3);
      } else {
        line = line.substring(0, start);
        inComment = true;
        break;
      }
    }

    // Gestion CDATA
    if (inCdata) {
      if (line.includes(']]>')) {
        line = line.substring(line.indexOf(']]>') + 3);
        inCdata = false;
      } else {
        result.push({ lineNo: i + 1, text: '' });
        continue;
      }
    }
    while (line.includes('<![CDATA[')) {
      const start = line.indexOf('<![CDATA[');
      const end = line.indexOf(']]>', start);
      if (end !== -1) {
        line = line.substring(0, start) + line.substring(end + 3);
      } else {
        line = line.substring(0, start);
        inCdata = true;
        break;
      }
    }

    // Gestion <screen>...</screen>
    if (inScreen) {
      if (line.includes('</screen>')) {
        line = line.substring(line.indexOf('</screen>') + 9);
        inScreen = false;
      } else {
        result.push({ lineNo: i + 1, text: '' });
        continue;
      }
    }
    while (line.includes('<screen>') || line.includes('<screen ')) {
      const startTag = line.indexOf('<screen');
      const endTag = line.indexOf('</screen>', startTag);
      if (endTag !== -1) {
        line = line.substring(0, startTag) + line.substring(endTag + 9);
      } else {
        line = line.substring(0, startTag);
        inScreen = true;
        break;
      }
    }

    // Supprime les entity references XML (&foo.bar;) et les balises
    const text = line.replace(/&[a-zA-Z0-9._-]+;/g, ' ').replace(/<[^>]+>/g, ' ');
    result.push({ lineNo: i + 1, text });
  }

  return result;
}

// ─── Vérification d'un fichier ─────────────────────────────────────────────

function checkFile(filePath, rules) {
  const xml = readFileSync(filePath, 'utf-8');
  const docLines = extractDocText(xml);
  const issues = [];

  for (const { lineNo, text } of docLines) {
    if (!text.trim()) continue;

    for (const rule of rules) {
      let match;
      rule.pattern.lastIndex = 0;
      while ((match = rule.pattern.exec(text)) !== null) {
        issues.push({
          file: filePath,
          line: lineNo,
          col: match.index + 1,
          rule: rule.id,
          message: rule.message,
          found: match[0],
        });
      }
    }
  }

  return issues;
}

// ─── Collecte des fichiers ─────────────────────────────────────────────────

function findXmlFiles(dir) {
  const files = [];
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const fullPath = join(dir, entry.name);
    if (entry.isDirectory() && !entry.name.startsWith('.')) {
      files.push(...findXmlFiles(fullPath));
    } else if (entry.isFile() && entry.name.endsWith('.xml')) {
      files.push(fullPath);
    }
  }
  return files;
}

// ─── Main ──────────────────────────────────────────────────────────────────

const rules = parseTraductions();

const args = process.argv.slice(2);
const files = args.length > 0
  ? args.filter(f => f.endsWith('.xml'))
  : findXmlFiles('.');

let totalIssues = 0;

for (const file of files) {
  const relPath = relative('.', file);
  try {
    const issues = checkFile(file, rules);
    for (const issue of issues) {
      const relFile = relative('.', issue.file);
      console.log(`::error file=${relFile},line=${issue.line},col=${issue.col}::${issue.message} (trouvé : « ${issue.found} »)`);
      totalIssues++;
    }
  } catch (e) {
    console.error(`::error file=${relPath}::Erreur de lecture : ${e.message}`);
  }
}

if (totalIssues > 0) {
  console.log(`\n${totalIssues} erreur(s) trouvée(s).`);
}

process.exit(totalIssues > 0 ? 1 : 0);
