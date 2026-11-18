CREATE TABLE IF NOT EXISTS guepard_users (
 id UUID PRIMARY KEY, username TEXT NOT NULL, username_key TEXT NOT NULL UNIQUE,
 password_hash TEXT, avatar TEXT NOT NULL, created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE TABLE IF NOT EXISTS guepard_sessions (
 token_hash TEXT PRIMARY KEY, user_id UUID NOT NULL REFERENCES guepard_users(id) ON DELETE CASCADE,
 expires_at TIMESTAMPTZ NOT NULL
);
CREATE TABLE IF NOT EXISTS guepard_rooms (id TEXT PRIMARY KEY, data JSONB NOT NULL);
CREATE TABLE IF NOT EXISTS guepard_results (
 id TEXT PRIMARY KEY, user_id UUID NOT NULL, room_id TEXT NOT NULL, started_at BIGINT NOT NULL,
 ended_at BIGINT NOT NULL, result JSONB NOT NULL, snapshot JSONB NOT NULL,
 UNIQUE(user_id,room_id,started_at)
);
CREATE INDEX IF NOT EXISTS guepard_results_user_date ON guepard_results(user_id,ended_at DESC);
CREATE TABLE IF NOT EXISTS guepard_corpus (
 id TEXT PRIMARY KEY, language TEXT NOT NULL CHECK(language IN ('FR','EN')),
 complexity TEXT NOT NULL CHECK(complexity IN ('easy','medium','hard')),
 kind TEXT NOT NULL CHECK(kind IN ('story','words')), content TEXT NOT NULL, source TEXT NOT NULL
);
