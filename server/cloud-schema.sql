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
ALTER TABLE neurodrive.players ADD COLUMN IF NOT EXISTS nickname TEXT;
ALTER TABLE neurodrive.players ADD COLUMN IF NOT EXISTS driver_number INTEGER NOT NULL DEFAULT 0 CHECK(driver_number BETWEEN 0 AND 99);
ALTER TABLE neurodrive.players ADD COLUMN IF NOT EXISTS avatar TEXT;
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
ALTER TABLE neurodrive.results ADD COLUMN IF NOT EXISTS track TEXT;
ALTER TABLE neurodrive.results ADD COLUMN IF NOT EXISTS best_lap DOUBLE PRECISION;
ALTER TABLE neurodrive.results ADD COLUMN IF NOT EXISTS pole BOOLEAN NOT NULL DEFAULT FALSE;
CREATE TABLE IF NOT EXISTS neurodrive.record_seasons (
  id TEXT PRIMARY KEY, name TEXT NOT NULL
);
INSERT INTO neurodrive.record_seasons VALUES('beta-1', 'Beta 1 · voltas limpas') ON CONFLICT DO NOTHING;
CREATE TABLE IF NOT EXISTS neurodrive.lap_records (
  season TEXT NOT NULL REFERENCES neurodrive.record_seasons(id),
  track TEXT NOT NULL CHECK(track IN ('serra','veloz','tecnico')),
  player_id BIGINT NOT NULL REFERENCES neurodrive.players(id) ON DELETE CASCADE,
  milliseconds INTEGER NOT NULL CHECK(milliseconds BETWEEN 1000 AND 1800000),
  achieved BIGINT NOT NULL, skin TEXT NOT NULL,
  PRIMARY KEY(season,track,player_id)
);
CREATE INDEX IF NOT EXISTS lap_records_ranking ON neurodrive.lap_records(track,season,milliseconds,achieved,player_id);
ALTER TABLE neurodrive.record_seasons ENABLE ROW LEVEL SECURITY;
ALTER TABLE neurodrive.lap_records ENABLE ROW LEVEL SECURITY;
ALTER TABLE neurodrive.players ENABLE ROW LEVEL SECURITY;
ALTER TABLE neurodrive.inventory ENABLE ROW LEVEL SECURITY;
ALTER TABLE neurodrive.sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE neurodrive.results ENABLE ROW LEVEL SECURITY;
ALTER TABLE neurodrive.auth_limits ENABLE ROW LEVEL SECURITY;
-- Sem políticas públicas: acesso somente pelo backend via conexão PostgreSQL.
REVOKE ALL ON ALL TABLES IN SCHEMA neurodrive FROM PUBLIC;
REVOKE ALL ON ALL SEQUENCES IN SCHEMA neurodrive FROM PUBLIC;
