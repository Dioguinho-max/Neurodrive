'use strict';
const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');
const { execFileSync } = require('node:child_process');
const root = path.resolve(__dirname, '..');
const target = path.join(root, 'NeuroDrive-Pendrive');
async function build() {
  if (process.platform !== 'win32' || process.arch !== 'x64' || process.versions.node.split('.')[0] !== '22')
    throw new Error('Gere este pacote com Node.js 22 para Windows x64.');
  fs.mkdirSync(target, { recursive: true });
  const copy = (from, to) => {
    const dest = path.join(target, to); fs.mkdirSync(path.dirname(dest), { recursive: true });
    fs.copyFileSync(path.join(root, from), dest);
  };
  // Explicit allowlist: never copy credentials, .git, tests or existing player databases.
  for (const name of fs.readdirSync(path.join(root, 'output')))
    if (/\.(html|css|js)$/.test(name)) copy('output/' + name, 'output/' + name);
  for (const name of ['assets', 'vendor']) fs.cpSync(path.join(root, 'output', name), path.join(target, 'output', name), { recursive: true });
  for (const name of ['server.cjs','lan.cjs','online.cjs','online-clock.cjs','catalog.cjs','pilot.cjs','records.cjs','rewards.cjs','drift.cjs','drift-worker.cjs']) copy('server/' + name, 'server/' + name);
  fs.cpSync(path.join(root, 'node_modules/ws'), path.join(target, 'node_modules/ws'), { recursive: true });
  fs.mkdirSync(path.join(target, 'runtime'), { recursive: true });
  const licensePath = path.join(target, 'runtime', `NODE-LICENSE-${process.version}.txt`);
  if (!fs.existsSync(licensePath)) {
    const response = await fetch(`https://raw.githubusercontent.com/nodejs/node/${process.version}/LICENSE`, { signal: AbortSignal.timeout(30000) });
    if (!response.ok) throw new Error('Nao foi possivel obter a licenca do Node.js.');
    fs.writeFileSync(licensePath, await response.text());
  }
  fs.copyFileSync(process.execPath, path.join(target, 'runtime/node.exe'));
  if (process.argv.includes('--linux')) {
    const cache = path.join(root, '.portable-cache');
    fs.mkdirSync(cache, { recursive: true });
    const folder = `node-${process.version}-linux-x64`, archive = folder + '.tar.gz';
    const base = `https://nodejs.org/dist/${process.version}/`;
    const sums = await fetch(base + 'SHASUMS256.txt', { signal: AbortSignal.timeout(30000) });
    if (!sums.ok) throw new Error('Falha ao baixar checksums oficiais do Node Linux.');
    const expected = (await sums.text()).split('\n').find(line => line.trim().endsWith('  ' + archive))?.split(/\s+/)[0];
    if (!/^[a-f0-9]{64}$/.test(expected || '')) throw new Error('Checksum do Node Linux nao encontrado.');
    const archivePath = path.join(cache, archive);
    const digest = file => crypto.createHash('sha256').update(fs.readFileSync(file)).digest('hex');
    if (!fs.existsSync(archivePath) || digest(archivePath) !== expected) {
      console.log('Baixando Node.js portatil para Linux x64...');
      const response = await fetch(base + archive, { signal: AbortSignal.timeout(180000) });
      if (!response.ok) throw new Error('Falha ao baixar Node Linux.');
      fs.writeFileSync(archivePath, Buffer.from(await response.arrayBuffer()));
    }
    if (digest(archivePath) !== expected) throw new Error('Checksum incorreto: Node Linux nao foi incluido.');
    execFileSync('tar', ['-xzf', archivePath, '-C', cache, folder + '/bin/node', folder + '/LICENSE']);
    fs.mkdirSync(path.join(target, 'runtime/linux-x64'), { recursive: true });
    fs.copyFileSync(path.join(cache, folder, 'bin/node'), path.join(target, 'runtime/linux-x64/node'));
    fs.copyFileSync(path.join(cache, folder, 'LICENSE'), path.join(target, 'runtime/linux-x64/LICENSE'));
  }
  fs.writeFileSync(path.join(target, 'INICIAR-JOGO-LINUX.sh'), fs.readFileSync(path.join(root, 'scripts/INICIAR-JOGO-LINUX.sh'), 'utf8').replace(/\r\n/g, '\n'), { mode: 0o755 });
  fs.writeFileSync(path.join(target, 'INICIAR-JOGO.cmd'), '@echo off\r\nsetlocal\r\ncd /d "%~dp0"\r\ntitle NeuroDrive - Servidor local\r\n"%~dp0runtime\\node.exe" "%~dp0server\\lan.cjs"\r\necho.\r\npause\r\n');
  copy('JOGAR-NO-PENDRIVE.md', 'LEIA-ME.md');
  console.log(`Pronto: ${target}\nCopie a pasta inteira para o pendrive. O banco existente nessa pasta foi preservado.`);
}
build().catch(error => { console.error(error.message); process.exitCode = 1; });
