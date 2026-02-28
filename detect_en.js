const fs = require('fs');
const path = require('path');

const APPENDICES_DIR = 'C:/Users/louis/www/opensource/PHP/doc-fr/appendices';

const EN_WORDS = new Set([
  'the','this','that','these','those','is','are','was','were','be','been','being',
  'have','has','had','do','does','did','will','would','could','should','may','might',
  'shall','must','can','a','an','in','on','at','by','for','with','about','against',
  'between','into','through','during','before','after','above','below','to','from',
  'of','and','or','not','but','if','when','where','which','who','whom','whose',
  'it','its','they','them','their','there','here','now','then','than','so','as',
  'up','out','you','your','we','our','he','his','she','her','also','only','just',
  'all','any','both','each','few','more','most','other','some','such','no','nor',
  'however','therefore','thus','hence','although','though','because','since','while',
  'used','using','use','note','see','following','specified','defined','new','old',
  'same','different','first','last','next','previous','current','true','false',
  'enabled','disabled','default','value','values','returns','return','passed',
  'pass','called','call','supported','available','possible','required','optional',
  'whether','either','neither','every','many','much','less','least','little',
  'several','enough','already','still','again','once','twice','often','always',
  'never','sometimes','usually','generally','typically','commonly','normally',
  'simply','easily','quickly','directly','automatically','manually','explicitly',
  'implicitly','respectively','additionally','furthermore','moreover',
  'consequently','otherwise','previously','subsequently','simultaneously',
  'independently','based','given','within','without','along','across','behind',
  'beyond','despite','except','instead','regarding','upon','via','versus','per',
  'allows','provides','requires','creates','generates','contains','includes',
  'represents','specifies','indicates','determines','control','controls','flag',
  'mode','option','setting','type','class','object','instance','method',
  'variable','constant','what','how','why','get','set','yet'
]);

function looksEnglish(text) {
  let clean = text
    .replace(/<[^>]+>/g, ' ')
    .replace(/&[a-z0-9#]+;/g, ' ')
    .replace(/https?:\/\/\S+/g, ' ')
    .replace(/\b[a-z]+_[a-z_]+\b/g, ' ')
    .replace(/\b[A-Z][a-z]+[A-Z][a-zA-Z]+\b/g, ' ')
    .replace(/\b\d[\d.,]*\b/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();

  const words = clean.split(/\s+/).filter(function(w) { return w.length > 1; });
  if (words.length < 4) return false;

  const enCount = words.filter(function(w) { return EN_WORDS.has(w.toLowerCase()); }).length;
  const ratio = enCount / words.length;

  return ratio > 0.45 && enCount >= 3;
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

const TARGET_TAGS = ['para', 'simpara', 'title', 'note', 'warning', 'entry', 'refpurpose', 'listitem', 'term'];

const results = [];
const files = walkDir(APPENDICES_DIR).sort();

for (let fi = 0; fi < files.length; fi++) {
  const fpath = files[fi];
  const relpath = fpath.replace(APPENDICES_DIR + path.sep, '').replace(APPENDICES_DIR + '/', '');
  let content = fs.readFileSync(fpath, 'utf-8');

  // Remove blocks to ignore
  content = content.replace(/<!\[CDATA\[[\s\S]*?\]\]>/g, '');
  content = content.replace(/<screen[\s\S]*?<\/screen>/g, '');
  content = content.replace(/<programlisting[\s\S]*?<\/programlisting>/g, '');
  content = content.replace(/<literal>[\s\S]*?<\/literal>/g, '');
  content = content.replace(/<(constant|function|classname|methodname|parameter|type|varname|filename|option|command|replaceable)>[^<]*<\/\1>/g, '');
  content = content.replace(/<link[^>]*>[^<]*<\/link>/g, '');
  content = content.replace(/<acronym>[^<]*<\/acronym>/g, '');

  for (let ti = 0; ti < TARGET_TAGS.length; ti++) {
    const tag = TARGET_TAGS[ti];
    const tagStr = '<' + tag;
    const closeStr = '</' + tag + '>';

    let pos = 0;
    while (true) {
      const start = content.indexOf(tagStr, pos);
      if (start === -1) break;

      // Make sure it's actually this tag (not e.g. <parameter> vs <para>)
      const charAfterTag = content[start + tagStr.length];
      if (charAfterTag !== '>' && charAfterTag !== ' ') {
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

      if (plain && looksEnglish(plain)) {
        const lineno = content.substring(0, start).split('\n').length;
        results.push({ file: relpath, line: lineno, tag: tag, text: plain.substring(0, 200) });
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
  console.log(r.file + ':' + r.line + ' [' + r.tag + '] ' + r.text);
}

console.log('\nTotal findings: ' + unique.length);
