const fs = require('node:fs');
const path = require('node:path');
const source = path.join(__dirname, '../output');
const target = path.join(__dirname, '../dist');
fs.mkdirSync(target, { recursive: true });
for (const file of fs.readdirSync(source)) {
  if (/\.(html|js|css)$/.test(file)) fs.copyFileSync(path.join(source, file), path.join(target, file));
}
fs.cpSync(path.join(source, 'vendor'), path.join(target, 'vendor'), { recursive: true });
fs.copyFileSync(path.join(source, 'corrida.html'), path.join(target, 'index.html'));
console.log('Frontend criado em dist, sem banco, backend ou testes.');
