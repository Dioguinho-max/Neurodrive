function configError(message) {
  return Object.assign(new Error(message), { safeStartupMessage: message });
}
function databaseUrl(env) {
  if (!env.DATABASE_URL?.trim()) throw configError('DATABASE_URL ausente. Configure a conexão PostgreSQL do Session pooler no Render.');
  let url;
  try { url = new URL(env.DATABASE_URL.trim()); }
  catch { throw configError('DATABASE_URL inválida. Copie a conexão PostgreSQL completa do Supabase; não use a URL pública do projeto.'); }
  if (!['postgres:', 'postgresql:'].includes(url.protocol) || !url.hostname || !url.username || !url.password || url.pathname === '/') {
    throw configError('DATABASE_URL deve ser uma conexão postgres:// ou postgresql:// com usuário, senha, host e banco. A URL https:// do Supabase não serve aqui.');
  }
  return url;
}
function startupConfig(env) {
  const missing = ['FRONTEND_ORIGIN', 'BACKEND_ORIGIN', 'DATABASE_URL'].filter((key) => !env[key]?.trim());
  if (missing.length) throw configError(`Variáveis ausentes no Render: ${missing.join(', ')}. Configure em Environment e faça novo deploy.`);
  const origins = {};
  for (const key of ['FRONTEND_ORIGIN', 'BACKEND_ORIGIN']) {
    let url;
    try { url = new URL(env[key].trim()); } catch { throw configError(`${key} inválida. Use a URL completa, começando com https://.`); }
    if (!['https:', 'http:'].includes(url.protocol) || url.username || url.password || url.pathname !== '/' || url.search || url.hash) throw configError(`${key} deve conter apenas a origem do site, sem caminho, parâmetros ou credenciais.`);
    if (env.NODE_ENV === 'production' && url.protocol !== 'https:') throw configError(`${key} precisa usar HTTPS em produção.`);
    origins[key] = url.origin;
  }
  databaseUrl(env);
  const port = Number(env.PORT || 3000);
  if (!Number.isInteger(port) || port < 1 || port > 65535) throw configError('PORT inválida. Use a porta fornecida pelo Render.');
  return { frontendOrigin: origins.FRONTEND_ORIGIN, backendOrigin: origins.BACKEND_ORIGIN, port };
}
function startupMessage(error) {
  if (error.safeStartupMessage) return error.safeStartupMessage;
  const hints = {
    ENOTFOUND: 'Host do banco não encontrado. Confira o host copiado de Connect → Session pooler.',
    ECONNREFUSED: 'Conexão recusada pelo banco. Confira host, porta e disponibilidade do projeto Supabase.',
    ENETUNREACH: 'Rede do banco inacessível. Use a conexão Session pooler compatível com IPv4.',
    ETIMEDOUT: 'Tempo de conexão com o banco esgotado. Confira o Session pooler e as restrições de rede.',
    '28P01': 'Autenticação PostgreSQL recusada. Confira usuário e senha do banco em DATABASE_URL.',
    '28000': 'Autenticação PostgreSQL recusada. Confira as credenciais do Session pooler.',
    '3D000': 'Banco PostgreSQL não encontrado. Confira o nome do banco na conexão.',
    '42501': 'Permissão insuficiente para criar ou acessar o esquema neurodrive.',
    SELF_SIGNED_CERT_IN_CHAIN: 'Certificado TLS não reconhecido. Configure DATABASE_CA com o certificado CA do Supabase.',
    DEPTH_ZERO_SELF_SIGNED_CERT: 'Certificado TLS não reconhecido. Confira DATABASE_CA.',
    UNABLE_TO_VERIFY_LEAF_SIGNATURE: 'Falha ao verificar o certificado TLS. Confira DATABASE_CA.',
    UNABLE_TO_GET_ISSUER_CERT_LOCALLY: 'CA do banco não encontrada. Configure DATABASE_CA.',
    ERR_TLS_CERT_ALTNAME_INVALID: 'Certificado TLS não corresponde ao host do banco. Confira o host da conexão.',
    EADDRINUSE: 'Porta já em uso. Confira PORT e o processo iniciado.',
  };
  const code = error.code || error.cause?.code || error.errors?.[0]?.code;
  if (hints[code]) return `${code}: ${hints[code]}`;
  if (/timeout|timed out/i.test(error.message || '')) return hints.ETIMEDOUT;
  return 'Falha não identificada. Confira as variáveis e a conectividade do banco. Detalhes sensíveis foram omitidos.';
}
module.exports = { databaseUrl, startupConfig, startupMessage };
