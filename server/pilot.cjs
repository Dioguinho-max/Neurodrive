const fail = (status, message) => Object.assign(new Error(message), { status });
function details(data) {
  const nickname = typeof data.nickname === 'string' ? data.nickname.trim().normalize('NFC') : '';
  if (!/^[\p{L}\p{N}_ .-]{3,24}$/u.test(nickname)) throw fail(400, 'Nick: use 3 a 24 letras, números, espaços, ponto, traço ou _.');
  if (!Number.isInteger(data.number) || data.number < 0 || data.number > 99) throw fail(400, 'Escolha um número de 0 a 99.');
  return { nickname, number: data.number };
}
function avatar(value) {
  if (value === null) return null;
  if (typeof value !== 'string' || !/^data:image\/jpeg;base64,[A-Za-z0-9+/]+=*$/.test(value)) throw fail(400, 'Envie uma foto JPEG.');
  const bytes = Buffer.from(value.split(',')[1], 'base64');
  if (bytes.length > 200000) throw fail(413, 'A foto deve ter até 200 KB.');
  if (bytes.length < 10 || bytes.readUInt16BE(0) !== 0xffd8 || bytes.readUInt16BE(bytes.length - 2) !== 0xffd9) throw fail(400, 'Foto inválida.');
  // Inspect JPEG dimensions before storing; only small square avatars are accepted.
  let offset = 2;
  while (offset + 9 < bytes.length) {
    if (bytes[offset] !== 0xff) break;
    const marker = bytes[offset + 1], length = bytes.readUInt16BE(offset + 2);
    if (length < 2 || offset + length + 2 > bytes.length) break;
    if ([0xc0, 0xc1, 0xc2].includes(marker)) {
      const height = bytes.readUInt16BE(offset + 5), width = bytes.readUInt16BE(offset + 7);
      if (width < 32 || width > 512 || width !== height) break;
      return bytes;
    }
    offset += length + 2;
  }
  throw fail(400, 'Escolha uma foto quadrada de até 512 pixels.');
}
function publicPilot(player) {
  return { username: player.username, nickname: player.nickname || player.username, number: player.number ?? 0,
    avatar: player.avatar || null, equipped: player.equipped, stats: player.stats, bestLaps: player.bestLaps || [], achievements: player.achievements || [] };
}
function storage(env = process.env, request = fetch) {
  const root = env.SUPABASE_URL?.replace(/\/$/, ''), key = env.SUPABASE_SERVICE_ROLE_KEY;
  const bucket = 'neurodrive-avatars';
  return { async upload(id, bytes) {
    if (!root || !key) throw fail(503, 'O envio de fotos ainda não foi configurado no servidor.');
    const object = `${id}/avatar.jpg`;
    const response = await request(`${root}/storage/v1/object/${bucket}/${object}`, {
      method: 'POST', headers: { apikey: key, Authorization: `Bearer ${key}`, 'Content-Type': 'image/jpeg', 'x-upsert': 'true', 'Cache-Control': 'max-age=0' },
      body: bytes, signal: AbortSignal.timeout(10000),
    });
    if (!response.ok) throw fail(503, 'Não foi possível salvar a foto. Confira a configuração do Storage.');
    return `${root}/storage/v1/object/public/${bucket}/${object}?v=${Date.now()}`;
  }, async remove(id) {
    if (!root || !key) throw fail(503, 'O armazenamento de fotos não está configurado.');
    const response = await request(`${root}/storage/v1/object/${bucket}`, { method: 'DELETE',
      headers: { apikey: key, Authorization: `Bearer ${key}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ prefixes: [`${id}/avatar.jpg`] }), signal: AbortSignal.timeout(10000) });
    if (!response.ok) throw fail(503, 'Não foi possível remover a foto. Tente novamente.');
  } };
}
module.exports = { details, avatar, publicPilot, storage };
