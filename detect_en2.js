const fs = require('fs');
const path = require('path');

const APPENDICES_DIR = 'C:/Users/louis/www/opensource/PHP/doc-fr/appendices';

// Words that strongly indicate English prose (not technical terms, not French)
// These must appear together to flag a sentence as English
const STRONG_EN = [
  'the ', 'this ', 'that ', 'these ', 'those ', 'which ', 'when ', 'where ',
  'is a ', 'is an ', 'is the ', 'are the ', 'are a ', 'was a ', 'were ',
  'has been ', 'have been ', 'will be ', 'can be ', 'should be ', 'must be ',
  'in order to ', 'as a result', 'for example', 'for instance', 'in this ',
  'in addition', 'furthermore', 'however,', 'therefore,', 'moreover,',
  'note that ', 'note: ', 'please ', 'it is ', 'it was ', 'it can ', 'it will ',
  'they are ', 'they were ', 'they have ', 'they can ',
  ' of the ', ' to the ', ' from the ', ' in the ', ' on the ', ' at the ',
  ' with the ', ' by the ', ' for the ', ' and the ', ' or the ',
  ' of a ', ' of an ', ' to a ', ' to an ',
  ' is not ', ' are not ', ' was not ', ' were not ', ' do not ', ' does not ',
  ' did not ', ' will not ', ' would not ', ' could not ', ' should not ',
  ' if the ', ' if a ', ' when the ', ' when a ', ' where the ',
  ' than the ', ' than a ', ' than an ',
  'it should ', 'it must ', 'it may ', 'it might ',
  'this is ', 'this was ', 'this can ', 'this will ',
  'that is ', 'that was ', 'that can ',
  'be used ', 'be set ', 'be passed ', 'be called ', 'be returned ',
  'returns a ', 'returns an ', 'returns the ',
  'specifies a ', 'specifies the ', 'specifies an ',
  'indicates a ', 'indicates the ',
  'provides a ', 'provides the ', 'provides an ',
  'allows a ', 'allows the ', 'allows an ',
  'requires a ', 'requires the ', 'requires an ',
  'contains a ', 'contains the ', 'contains an ',
  'defined as ', 'defined in ', 'used as ', 'used in ', 'used for ',
  'passed as ', 'passed to ', 'passed by ',
  'called with ', 'called from ',
];

function containsEnglishPhrase(text) {
  const lower = text.toLowerCase();
  for (const phrase of STRONG_EN) {
    if (lower.includes(phrase)) {
      return phrase;
    }
  }
  return null;
}

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

const TARGET_TAGS = ['para', 'simpara', 'title', 'note', 'warning', 'entry', 'refpurpose', 'listitem', 'term', 'member'];

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
  content = content.replace(/<(constant|function|classname|methodname|parameter|type|varname|filename|option|command|replaceable|interfacename|enumname|uri|link|emphasis|acronym|abbrev|userinput|envar|systemitem|sgmltag|tag|markup)>[\s\S]*?<\/\1>/g, '');

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
      const plain = inner
        .replace(/<[^>]+>/g, ' ')
        .replace(/&[a-z0-9#]+;/g, ' ')
        .replace(/\s+/g, ' ')
        .trim();

      if (plain.length > 10) {
        const phrase = containsEnglishPhrase(plain);
        if (phrase) {
          const lineno = content.substring(0, start).split('\n').length;
          results.push({ file: relpath, line: lineno, tag: tag, match: phrase, text: plain.substring(0, 250) });
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
  console.log(r.file + ':' + r.line + ' [' + r.tag + '] (match: "' + r.match.trim() + '") ' + r.text);
}

console.log('\nTotal findings: ' + unique.length);
