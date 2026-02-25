#!/usr/bin/env node
/**
 * Vérifie les règles de style TRADUCTIONS.txt sur les fichiers XML modifiés.
 *
 * Usage : node check-style-fr.mjs [fichier1.xml fichier2.xml ...]
 *   Sans arguments : vérifie tous les .xml récursivement.
 *
 * Sortie : annotations GitHub Actions (::warning / ::error)
 * Code retour : 1 si des erreurs sont trouvées, 0 sinon.
 */

import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join, relative } from 'node:path';

// ─── Règles ────────────────────────────────────────────────────────────────
// Chaque règle : { id, pattern (regex), message, severity: 'error'|'warning' }
// Les patterns sont appliqués sur le texte hors CDATA / <screen> / <!-- -->

const rules = [
  // === Style impersonnel (TRADUCTIONS.txt : "Évitez de parler directement") ===
  {
    id: 'style/vous-pouvez',
    pattern: /\bVous pouvez\b/gi,
    message: 'Utilisez "Il est possible de" au lieu de "Vous pouvez" (TRADUCTIONS.txt)',
    severity: 'warning',
  },
  {
    id: 'style/vous-devez',
    pattern: /\bVous devez\b/gi,
    message: 'Utilisez "Il faut" au lieu de "Vous devez" (TRADUCTIONS.txt)',
    severity: 'warning',
  },
  {
    id: 'style/vous-devriez',
    pattern: /\bVous devriez\b/gi,
    message: 'Utilisez "Il est recommandé de" au lieu de "Vous devriez" (TRADUCTIONS.txt)',
    severity: 'warning',
  },
  {
    id: 'style/notez-que',
    pattern: /\bNotez que\b/g,
    message: 'Utilisez "Il est à noter que" au lieu de "Notez que" (TRADUCTIONS.txt)',
    severity: 'warning',
  },
  {
    id: 'style/votre',
    pattern: /\b[Vv]otre\b/g,
    message: 'Évitez "votre" — préférez "le/la/du/de la" (TRADUCTIONS.txt)',
    severity: 'warning',
  },
  {
    id: 'style/vos',
    pattern: /\b[Vv]os\b/g,
    message: 'Évitez "vos" — préférez "les/des" (TRADUCTIONS.txt)',
    severity: 'warning',
  },
  {
    id: 'style/reportez-vous',
    pattern: /\b[Rr]eportez-vous\b/g,
    message: 'Utilisez "se reporter" au lieu de "reportez-vous" (TRADUCTIONS.txt)',
    severity: 'warning',
  },
  {
    id: 'style/referez-vous',
    pattern: /\b[Rr]éférez-vous\b/g,
    message: 'Utilisez "se référer" au lieu de "référez-vous" (TRADUCTIONS.txt)',
    severity: 'warning',
  },
  {
    id: 'style/assurez-vous',
    pattern: /\b[Aa]ssurez-vous\b/g,
    message: 'Utilisez "il faut s\'assurer" au lieu de "assurez-vous" (TRADUCTIONS.txt)',
    severity: 'warning',
  },

  // === Points de français (TRADUCTIONS.txt) ===
  {
    id: 'fr/etc-points',
    pattern: /\betc\.\.\./g,
    message: '"etc..." est un pléonasme — écrire "etc." (TRADUCTIONS.txt)',
    severity: 'error',
  },
  {
    id: 'fr/comme-par-exemple',
    pattern: /\bcomme par exemple\b/gi,
    message: '"comme par exemple" est un pléonasme — utiliser "comme" ou "par exemple" (TRADUCTIONS.txt)',
    severity: 'error',
  },
  {
    id: 'fr/si-il',
    pattern: /\bsi il\b/gi,
    message: 'Écrire "s\'il" au lieu de "si il" (TRADUCTIONS.txt)',
    severity: 'error',
  },
  {
    id: 'fr/optionel',
    pattern: /\boptionel\b/gi,
    message: 'Écrire "optionnel" (deux N) (TRADUCTIONS.txt)',
    severity: 'error',
  },
  {
    id: 'fr/abrevier',
    pattern: /\babrévier\b/gi,
    message: 'Écrire "abréger" et non "abrévier" (TRADUCTIONS.txt)',
    severity: 'error',
  },
  {
    id: 'fr/chiffrage',
    pattern: /\bchiffrage\b/gi,
    message: 'Utiliser "chiffrement" et non "chiffrage" (TRADUCTIONS.txt)',
    severity: 'error',
  },

  // === Terminologie (dictionnaire TRADUCTIONS.txt) ===
  {
    id: 'term/library',
    pattern: /\blibrairie\b/gi,
    message: 'Traduire "library" par "bibliothèque", pas "librairie" (faux ami)',
    severity: 'warning',
  },
  {
    id: 'term/encryption',
    pattern: /\bencryption\b/gi,
    message: 'Traduire "encryption" par "cryptographie" ou "chiffrement" (TRADUCTIONS.txt)',
    severity: 'warning',
  },
  {
    id: 'term/decrypt',
    pattern: /\bdecrypt(?:er|é|ée|ées|és)\b/gi,
    message: 'Utiliser "déchiffrer" au lieu de "decrypter" (TRADUCTIONS.txt)',
    severity: 'warning',
  },

  // === Style "should" (TRADUCTIONS.txt) ===
  {
    id: 'style/depuis-version',
    pattern: /\bdepuis PHP [0-9]/g,
    message: 'Préférer "à partir de PHP x.y" au lieu de "depuis PHP x.y" (TRADUCTIONS.txt)',
    severity: 'warning',
  },
];

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

    // Supprime les balises XML restantes mais garde le texte
    const text = line.replace(/<[^>]+>/g, ' ');
    result.push({ lineNo: i + 1, text });
  }

  return result;
}

// ─── Vérification d'un fichier ─────────────────────────────────────────────

function checkFile(filePath) {
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
          severity: rule.severity,
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

const args = process.argv.slice(2);
const files = args.length > 0
  ? args.filter(f => f.endsWith('.xml'))
  : findXmlFiles('.');

let totalIssues = 0;
let totalErrors = 0;

for (const file of files) {
  const relPath = relative('.', file);
  try {
    const issues = checkFile(file);
    for (const issue of issues) {
      const relFile = relative('.', issue.file);
      const prefix = issue.severity === 'error' ? '::error' : '::warning';
      console.log(`${prefix} file=${relFile},line=${issue.line},col=${issue.col}::${issue.message} (trouvé : "${issue.found}")`);
      totalIssues++;
      if (issue.severity === 'error') totalErrors++;
    }
  } catch (e) {
    console.error(`::error file=${relPath}::Erreur de lecture : ${e.message}`);
  }
}

if (totalIssues > 0) {
  console.log(`\n${totalIssues} problème(s) trouvé(s) dont ${totalErrors} erreur(s).`);
}

// Ne fait échouer la CI que sur les erreurs (pas les warnings)
process.exit(totalErrors > 0 ? 1 : 0);
