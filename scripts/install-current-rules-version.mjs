import fs from 'node:fs';

const rulesPath = 'src/pages/Rules.js';
const importLine = "import CurrentRulesVersion from './CurrentRulesVersion';";
const componentLine = '<CurrentRulesVersion />';

if (!fs.existsSync(rulesPath)) {
  throw new Error(`Cannot find ${rulesPath}. Run this script from the project root.`);
}

let source = fs.readFileSync(rulesPath, 'utf8');
let changed = false;

if (!source.includes(importLine)) {
  const importMatches = [...source.matchAll(/^import .*;\s*$/gm)];
  if (!importMatches.length) {
    throw new Error('Could not find the import block in src/pages/Rules.js.');
  }

  const lastImport = importMatches[importMatches.length - 1];
  const insertAt = lastImport.index + lastImport[0].length;
  source = `${source.slice(0, insertAt)}\n${importLine}${source.slice(insertAt)}`;
  changed = true;
}

if (!source.includes(componentLine)) {
  const rulesStart = source.indexOf('const Rules');
  if (rulesStart < 0) {
    throw new Error('Could not find the Rules component in src/pages/Rules.js.');
  }

  let insertAt = -1;
  let indent = '          ';

  const headingClose = source.indexOf('</h2>', rulesStart);
  if (headingClose >= 0) {
    insertAt = headingClose + '</h2>'.length;
    const lineStart = source.lastIndexOf('\n', headingClose) + 1;
    const headingIndent = source.slice(lineStart, headingClose).match(/^\s*/)?.[0] || '';
    indent = headingIndent;
  } else {
    const firstCard = source.indexOf('<div className="card', rulesStart);
    if (firstCard >= 0) {
      insertAt = firstCard;
      const lineStart = source.lastIndexOf('\n', firstCard) + 1;
      indent = source.slice(lineStart, firstCard).match(/^\s*/)?.[0] || indent;
    }
  }

  if (insertAt < 0) {
    throw new Error(
      'Could not find a safe insertion point in Rules.js. No file changes were written.'
    );
  }

  const insertion = `\n${indent}<CurrentRulesVersion />`;
  source = `${source.slice(0, insertAt)}${insertion}${source.slice(insertAt)}`;
  changed = true;
}

if (!changed) {
  console.log('CurrentRulesVersion is already installed in src/pages/Rules.js.');
  process.exit(0);
}

fs.writeFileSync(rulesPath, source);
console.log('Installed CurrentRulesVersion into src/pages/Rules.js.');
console.log('Review with: git diff -- src/pages/Rules.js src/pages/CurrentRulesVersion.js');
