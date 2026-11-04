'use strict';
const fs = require('node:fs');
const path = require('node:path');
const { spawnSync } = require('node:child_process');
const root = path.resolve(__dirname, '..');
const directory = path.join(root, 'output/tests');
const files = fs.readdirSync(directory).filter(name => name.endsWith('.cjs') && !name.endsWith('.tmp.cjs')).sort();
const failed = [];
for (const file of files) {
  console.log(`\n--- ${file} ---`);
  const result = spawnSync(process.execPath, [path.join(directory, file)], {
    cwd: root, encoding: 'utf8', timeout: 180000, windowsHide: true, maxBuffer: 8 * 1024 * 1024,
  });
  if (result.stdout) process.stdout.write(result.stdout);
  if (result.stderr) process.stderr.write(result.stderr);
  if (result.error || result.status !== 0) {
    failed.push(file);
    if (result.error) console.error(result.error.message);
  }
}
console.log(`\n${files.length - failed.length}/${files.length} testes passaram.`);
if (failed.length) console.error('Falhas: ' + failed.join(', '));
process.exitCode = failed.length ? 1 : 0;
