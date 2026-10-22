'use strict';
const os = require('node:os');
const path = require('node:path');
const { execFile } = require('node:child_process');
const { createApp } = require('./server.cjs');
const addresses = [...new Set(Object.values(os.networkInterfaces()).flat()
  .filter(item => item && item.family === 'IPv4' && !item.internal).map(item => item.address))];
const port = Number(process.env.PORT || 3000);
if (!Number.isInteger(port) || port < 1 || port > 65535) throw new Error('PORT deve ser uma porta entre 1 e 65535.');
const server = createApp({ multiplayer: true, lanHosts: ['localhost', ...addresses],
  database: path.join(__dirname, 'data', 'neurodrive.sqlite') });
server.on('error', error => {
  console.error(error.code === 'EADDRINUSE' ? 'A porta ja esta em uso. Feche a outra janela do NeuroDrive e tente novamente.' : error.message);
  process.exitCode = 1;
});
server.listen(port, '0.0.0.0', () => {
  const local = `http://127.0.0.1:${port}`;
  console.log('\n=== NEURODRIVE - PARTIDAS NA REDE LOCAL ===\n');
  console.log(`Neste computador: ${local}`);
  console.log('\nSeus amigos devem abrir um destes enderecos no navegador:');
  for (const address of addresses) console.log(`  http://${address}:${port}`);
  if (!addresses.length) console.log('Nenhuma rede encontrada. Conecte ao Wi-Fi ou cabo e reinicie.');
  console.log('\nCrie contas locais, abra Online e compartilhe o codigo da sala.');
  console.log('Ate 6 jogadores por sala. Deixe esta janela aberta durante as partidas.');
  console.log(process.platform === 'win32' ? 'Se o Windows perguntar, permita o Node.js na rede privada.' : 'Se houver firewall bloqueando a porta 3000, solicite a liberacao ao responsavel pela rede.');
  console.log('Redes de convidados podem bloquear a comunicacao entre computadores.');
  console.log('\nContas e moedas ficam em server/data, nesta pasta.');
  console.log('Para encerrar com seguranca, pressione Ctrl+C antes de retirar o pendrive.\n');
  if (process.env.NEURODRIVE_NO_BROWSER !== '1') {
    const opener = process.platform === 'win32' ? 'explorer.exe' : process.platform === 'linux' ? 'xdg-open' : null;
    if (opener) execFile(opener, [local], () => {});
  }
});
let stopping = false;
function shutdown() {
  if (stopping) return;
  stopping = true;
  server.closeMultiplayer();
  server.close(() => console.log('Servidor encerrado. Pode retirar o pendrive com seguranca.'));
  server.closeIdleConnections();
}
process.on('SIGINT', shutdown);
process.on('SIGTERM', shutdown);
