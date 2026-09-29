'use strict';

// Syntax-Prüfung aller JavaScript-Dateien unter src/ und test/

const { execFileSync } = require('child_process');
const fs = require('fs');
const path = require('path');

function walk(dir, out = []) {
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, e.name);
    if (e.isDirectory()) walk(p, out);
    else if (e.name.endsWith('.js')) out.push(p);
  }
  return out;
}

const files = [...walk('src'), ...walk('test'), ...walk('scripts')];
let failed = 0;
for (const f of files) {
  try {
    execFileSync(process.execPath, ['--check', f], { stdio: 'pipe' });
  } catch (err) {
    failed++;
    console.error(`✗ ${f}\n${err.stderr}`);
  }
}
console.log(`${files.length - failed}/${files.length} Dateien ohne Syntaxfehler`);
process.exit(failed ? 1 : 0);
