const crypto = require('node:crypto');
const path = require('node:path');
const { Worker } = require('node:worker_threads');
const fail = (status, message) => Object.assign(new Error(message), { status });
const tracks = ['serra', 'veloz', 'tecnico', 'arena'];
function createDriftService(store, clock = Date.now) {
  const sessions = new Map();
  let busy = 0;
  return {
    start(id, data) {
      if (!data || typeof data !== 'object') throw fail(400, 'Configuração de Drift inválida.');
      if (!tracks.includes(data.track) || !['stable', 'loose'].includes(data.setup)) throw fail(400, 'Configuração de Drift inválida.');
      for (const [key, value] of sessions) if (clock() - value.at > 1800000) sessions.delete(key);
      if (!sessions.has(String(id)) && sessions.size >= 512) throw fail(503, 'Tente novamente mais tarde.');
      const attempt = { token: crypto.randomBytes(24).toString('hex'), at: clock(), track: data.track, setup: data.setup };
      sessions.set(String(id), attempt);
      return { token: attempt.token };
    },
    async finish(id, data) {
      if (!data || typeof data !== 'object') throw fail(400, 'Tentativa inválida.');
      const attempt = sessions.get(String(id));
      if (!attempt || attempt.token !== data.token || clock() - attempt.at < 120000 || clock() - attempt.at > 1800000) throw fail(409, 'Tentativa expirada ou incompleta.');
      if (busy >= 2) throw fail(503, 'Validação ocupada. Tente novamente.');
      if (!Array.isArray(data.frames) || data.frames.length > 7450) throw fail(400, 'Tentativa inválida.');
      sessions.delete(String(id)); busy++;
      try {
        const result = await new Promise((resolve, reject) => {
          const worker = new Worker(path.join(__dirname, 'drift-worker.cjs'), { workerData: { ...attempt, frames: data.frames } });
          const timer = setTimeout(() => { worker.terminate(); reject(fail(408, 'Validação excedeu o tempo.')); }, 15000);
          worker.once('message', value => { clearTimeout(timer); resolve(value); });
          worker.once('error', () => { clearTimeout(timer); reject(fail(400, 'Não foi possível validar.')); });
          worker.once('exit', code => { clearTimeout(timer); if (code !== 0) reject(fail(400, 'Validação interrompida.')); });
        });
        if (result.error) throw fail(400, 'Tentativa inválida.');
        await store.saveDrift(id, { ...result, track: attempt.track, setup: attempt.setup });
        return result;
      } finally { busy--; }
    },
  };
}
module.exports = { createDriftService, tracks };
