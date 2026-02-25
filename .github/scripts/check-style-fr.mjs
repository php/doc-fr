#!/usr/bin/env node
/**
 * Vérifie les règles de style définies dans TRADUCTIONS.txt.
 *
 * Toutes les règles sont lues dynamiquement depuis les lignes
 *   INTERDIT : "X" → "Y"
 * de TRADUCTIONS.txt. Aucune règle n'est codée en dur dans ce script.
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

// ─── Lecture des règles depuis TRADUCTIONS.txt ──────────────────────────────
//
// Format attendu :
//   INTERDIT : "texte interdit" → "remplacement suggéré"
//
// Le texte interdit devient un pattern regex (\b...\b, case-insensitive).
// Le remplacement devient le message d'erreur.

function parseRules() {
  const txt = readFileSync(join(rootDir, 'TRADUCTIONS.txt'), 'utf-8');
  const rules = [];
  const lineRegex = /INTERDIT\s*:\s*"([^"]+)"\s*→\s*"([^"]+)"(.*)/g;
  let match;

  while ((match = lineRegex.exec(txt)) !== null) {
    const forbidden = match[1];
    const replacement = match[2];
    const extra = match[3].trim();

    // Construire le message
    let message;
    if (extra.startsWith('ou "')) {
      // Ex: INTERDIT : "X" → "Y" ou "Z"
      message = `« ${forbidden} » → « ${replacement} » ${extra}`;
    } else {
      message = `« ${forbidden} » → « ${replacement} »`;
    }

    // Construire le pattern regex
    const escaped = escapeRegex(forbidden);
    // "depuis PHP" → match "depuis PHP" suivi d'un chiffre
    const patternStr = forbidden.toLowerCase() === 'depuis php'
      ? `\\b${escaped} [0-9]`
      : `\\b${escaped}\\b`;

    rules.push({
      id: slugify(forbidden),
      pattern: new RegExp(patternStr, 'gi'),
      message,
    });
  }

  if (rules.length === 0) {
    console.error('::error::Aucune règle INTERDIT trouvée dans TRADUCTIONS.txt');
    process.exit(2);
  }

  return rules;
}

function escapeRegex(str) {
  return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function slugify(str) {
  return str.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
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

const rules = parseRules();

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
