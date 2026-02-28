const fs = require('fs');
const path = require('path');

const APPENDICES_DIR = 'C:/Users/louis/www/opensource/PHP/doc-fr/appendices';

// Patterns that are clearly English prose (not French, not technical terms)
// We look for sequences that cannot be French
const EN_PATTERNS = [
  // Title words in English
  { re: /\band\b(?!\s*[<&])/i, desc: 'conjunction "and"' },
  { re: /\bor\b\s+[a-z]/i, desc: 'conjunction "or" + word' },
  { re: /\bthe\s+[a-zA-Z]/i, desc: '"the" + word' },
  { re: /\bthis\s+[a-zA-Z]/i, desc: '"this" + word' },
  { re: /\bthat\s+[a-zA-Z]/i, desc: '"that" + word' },
  { re: /\bis\s+[a-z]/i, desc: '"is" + word' },
  { re: /\bare\s+[a-z]/i, desc: '"are" + word' },
  { re: /\bwas\s+[a-z]/i, desc: '"was" + word' },
  { re: /\bwere\s+[a-z]/i, desc: '"were" + word' },
  { re: /\bwill\s+[a-z]/i, desc: '"will" + word' },
  { re: /\bwould\s+[a-z]/i, desc: '"would" + word' },
  { re: /\bhave\s+[a-z]/i, desc: '"have" + word' },
  { re: /\bhas\s+been\b/i, desc: '"has been"' },
  { re: /\bhave\s+been\b/i, desc: '"have been"' },
  { re: /\bwill\s+be\b/i, desc: '"will be"' },
  { re: /\bcan\s+be\b/i, desc: '"can be"' },
  { re: /\bshould\s+be\b/i, desc: '"should be"' },
  { re: /\bmust\s+be\b/i, desc: '"must be"' },
  { re: /\bnote\s+that\b/i, desc: '"note that"' },
  { re: /\bin\s+order\s+to\b/i, desc: '"in order to"' },
  { re: /\bfor\s+example\b/i, desc: '"for example"' },
  { re: /\bfor\s+instance\b/i, desc: '"for instance"' },
  { re: /\bhowever[,\s]/i, desc: '"however"' },
  { re: /\btherefore[,\s]/i, desc: '"therefore"' },
  { re: /\bfurthermore[,\s]/i, desc: '"furthermore"' },
  { re: /\bmoreover[,\s]/i, desc: '"moreover"' },
  { re: /\bwhen\s+[a-z]/i, desc: '"when" + word' },
  { re: /\bwhere\s+[a-z]/i, desc: '"where" + word' },
  { re: /\bwhich\s+[a-z]/i, desc: '"which" + word' },
  { re: /\bif\s+the\b/i, desc: '"if the"' },
  { re: /\bit\s+is\b/i, desc: '"it is"' },
  { re: /\bit\s+was\b/i, desc: '"it was"' },
  { re: /\byou\s+can\b/i, desc: '"you can"' },
  { re: /\byou\s+should\b/i, desc: '"you should"' },
  { re: /\byou\s+must\b/i, desc: '"you must"' },
  { re: /\byou\s+need\b/i, desc: '"you need"' },
  { re: /\byou\s+may\b/i, desc: '"you may"' },
  { re: /\bto\s+use\b/i, desc: '"to use"' },
  { re: /\bto\s+be\b/i, desc: '"to be"' },
  { re: /\bin\s+the\b/i, desc: '"in the"' },
  { re: /\bof\s+the\b/i, desc: '"of the"' },
  { re: /\bfrom\s+the\b/i, desc: '"from the"' },
  { re: /\bwith\s+the\b/i, desc: '"with the"' },
  { re: /\bby\s+the\b/i, desc: '"by the"' },
  { re: /\bsupport\s+for\b/i, desc: '"support for"' },
  { re: /\bnow\s+[a-z]/i, desc: '"now" + word' },
  { re: /\busing\s+[a-z]/i, desc: '"using" + word' },
  { re: /\bbe\s+used\b/i, desc: '"be used"' },
  { re: /\bbe\s+set\b/i, desc: '"be set"' },
  { re: /\breturns\s+[a-z]/i, desc: '"returns" + word' },
  { re: /\bspecified\s+[a-z]/i, desc: '"specified" + word' },
  { re: /\bdefined\s+[a-z]/i, desc: '"defined" + word' },
  { re: /\bpassed\s+[a-z]/i, desc: '"passed" + word' },
  { re: /\bcalled\s+[a-z]/i, desc: '"called" + word' },
  { re: /\bchanged\s+[a-z]/i, desc: '"changed" + word' },
  { re: /\badded\s+[a-z]/i, desc: '"added" + word' },
  { re: /\bremoved\s+[a-z]/i, desc: '"removed" + word' },
  { re: /\bdeprecated\s+[a-z]/i, desc: '"deprecated" + word' },
  { re: /\bintroduced\s+[a-z]/i, desc: '"introduced" + word' },
  { re: /\bimplemented\s+[a-z]/i, desc: '"implemented" + word' },
];

// But exclude these false positives (French words that look like English)
const FR_EXCEPTIONS = [
  /\$this/,  // PHP variable
  /^\s*\/\//, // PHP comment
  /^\s*#/,   // hash comment
  /CDATA/,
];

function walkDir(dir) {
  const files = [];
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  for (let i = 0; i < entries.length; i++) {
    const entry = entries[i];
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      const sub = walkDir(full);
      for (let j = 0; j < sub.length; j++) files.push(sub[j]);
    } else if (entry.isFile() && entry.name.endsWith('.xml')) {
      files.push(full);
    }
  }
  return files;
}

const TARGET_TAGS = ['para', 'simpara', 'title', 'note', 'warning', 'entry', 'refpurpose', 'listitem', 'term', 'member', 'caution', 'important', 'tip'];

const results = [];
const files = walkDir(APPENDICES_DIR).sort();

for (let fi = 0; fi < files.length; fi++) {
  const fpath = files[fi];
  const relpath = fpath.replace(APPENDICES_DIR + path.sep, '').replace(APPENDICES_DIR + '/', '').replace(/\\/g, '/');
  let content = fs.readFileSync(fpath, 'utf-8');

  // Remove blocks to ignore
  content = content.replace(/<!\[CDATA\[[\s\S]*?\]\]>/g, '');
  content = content.replace(/<screen[\s\S]*?<\/screen>/g, '');
  content = content.replace(/<programlisting[\s\S]*?<\/programlisting>/g, '');

  for (let ti = 0; ti < TARGET_TAGS.length; ti++) {
    const tag = TARGET_TAGS[ti];
    const tagStr = '<' + tag;
    const closeStr = '</' + tag + '>';

    let pos = 0;
    while (true) {
      const start = content.indexOf(tagStr, pos);
      if (start === -1) break;

      const charAfterTag = content[start + tagStr.length];
      if (charAfterTag !== '>' && charAfterTag !== ' ' && charAfterTag !== '\n') {
        pos = start + 1;
        continue;
      }

      const tagEnd = content.indexOf('>', start);
      if (tagEnd === -1) break;

      const closeStart = content.indexOf(closeStr, tagEnd);
      if (closeStart === -1) break;

      const inner = content.substring(tagEnd + 1, closeStart);

      // Strip XML tags but keep text
      const plain = inner
        .replace(/<[^>]+>/g, ' ')
        .replace(/&[a-z0-9#]+;/g, ' ')
        .replace(/\s+/g, ' ')
        .trim();

      // Skip if text is very short or is in French
      if (plain.length < 5) {
        pos = closeStart + closeStr.length;
        continue;
      }

      // Skip if it contains French-specific words (clearly French text)
      const hasFrench = /\b(est|sont|était|seront|sera|peut|peuvent|doit|doivent|a été|ont été|les|des|une|cette|ce |celui|celle|aussi|aussi|déjà|même|mais|pour|avec|dans|sur|par|entre|lors|afin|dont|lorsque|quand|ainsi|alors|après|avant|depuis|duquel|lequel|laquelle|lesquels|lesquelles|dont|aucun|aucune|ceux|celles|leurs|notre|votre|avoir|être|faire|ceci|cela|très|bien|tout|tous|toutes|toujours|souvent|jamais|encore|comme|selon|sans|vers|sous|chez|contre|entre|parmi|envers|malgré|sauf|plutôt|voire|sinon|donc|car|soit|ni|où|qu'|c'est|d'un|d'une|d'abord|jusqu'|quelque|chaque|plusieurs|nombreux|certains|autres|nouveau|nouvelle|ancienne|ancien|voici|voilà|afin)\b/i.test(plain);

      if (hasFrench) {
        pos = closeStart + closeStr.length;
        continue;
      }

      // Check for English patterns
      for (let pi = 0; pi < EN_PATTERNS.length; pi++) {
        const pat = EN_PATTERNS[pi];
        if (pat.re.test(plain)) {
          // Check it's not a false positive
          let isFP = false;
          for (const exc of FR_EXCEPTIONS) {
            if (exc.test(plain)) { isFP = true; break; }
          }
          if (!isFP) {
            const lineno = content.substring(0, start).split('\n').length;
            results.push({ file: relpath, line: lineno, tag: tag, match: pat.desc, text: plain.substring(0, 250) });
            break; // only report once per tag occurrence
          }
        }
      }

      pos = closeStart + closeStr.length;
    }
  }
}

const seen = {};
const unique = [];
for (let i = 0; i < results.length; i++) {
  const r = results[i];
  const key = r.file + ':' + r.line + ':' + r.text.substring(0, 50);
  if (!seen[key]) {
    seen[key] = true;
    unique.push(r);
  }
}

unique.sort(function(a, b) {
  if (a.file < b.file) return -1;
  if (a.file > b.file) return 1;
  return a.line - b.line;
});

for (let i = 0; i < unique.length; i++) {
  const r = unique[i];
  console.log(r.file + ':' + r.line + ' [' + r.tag + '] (match: ' + r.match + ') ' + r.text);
}

console.log('\nTotal findings: ' + unique.length);
