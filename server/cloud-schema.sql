CREATE SCHEMA IF NOT EXISTS neurodrive;
REVOKE ALL ON SCHEMA neurodrive FROM PUBLIC;
CREATE TABLE IF NOT EXISTS neurodrive.players (
  id BIGSERIAL PRIMARY KEY,
  username TEXT NOT NULL,
  password_hash TEXT NOT NULL,
  salt TEXT NOT NULL,
  coins INTEGER NOT NULL DEFAULT 500 CHECK(coins >= 0),
  equipped TEXT NOT NULL DEFAULT 'original',
  last_bonus BIGINT NOT NULL DEFAULT 0
);
CREATE UNIQUE INDEX IF NOT EXISTS players_name ON neurodrive.players(lower(username));
CREATE TABLE IF NOT EXISTS neurodrive.inventory (
  player_id BIGINT REFERENCES neurodrive.players(id) ON DELETE CASCADE,
  skin TEXT NOT NULL, PRIMARY KEY(player_id, skin)
);
CREATE TABLE IF NOT EXISTS neurodrive.sessions (
  token_hash TEXT PRIMARY KEY,
  player_id BIGINT NOT NULL REFERENCES neurodrive.players(id) ON DELETE CASCADE,
  expires BIGINT NOT NULL
);
CREATE TABLE IF NOT EXISTS neurodrive.results (
  id TEXT NOT NULL, player_id BIGINT REFERENCES neurodrive.players(id) ON DELETE CASCADE,
  reward INTEGER NOT NULL CHECK(reward >= 0), place INTEGER NOT NULL,
  finished BIGINT NOT NULL, PRIMARY KEY(id, player_id)
);
CREATE TABLE IF NOT EXISTS neurodrive.auth_limits (
  key TEXT PRIMARY KEY, attempts INTEGER NOT NULL, expires BIGINT NOT NULL
);
ALTER TABLE neurodrive.players ENABLE ROW LEVEL SECURITY;
ALTER TABLE neurodrive.inventory ENABLE ROW LEVEL SECURITY;
ALTER TABLE neurodrive.sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE neurodrive.results ENABLE ROW LEVEL SECURITY;
ALTER TABLE neurodrive.auth_limits ENABLE ROW LEVEL SECURITY;
-- Sem políticas públicas: acesso somente pelo backend via conexão PostgreSQL.
REVOKE ALL ON ALL TABLES IN SCHEMA neurodrive FROM PUBLIC;
REVOKE ALL ON ALL SEQUENCES IN SCHEMA neurodrive FROM PUBLIC;
