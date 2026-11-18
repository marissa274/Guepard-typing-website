/** Idempotent bootstrap kept compatible with the versioned SQL migrations. */
export const authSchema=`CREATE TABLE IF NOT EXISTS guepard_users (
 id UUID PRIMARY KEY, username TEXT NOT NULL, username_key TEXT NOT NULL UNIQUE,
 password_hash TEXT, avatar TEXT NOT NULL, created_at TIMESTAMPTZ NOT NULL DEFAULT now()
); ALTER TABLE guepard_users ALTER COLUMN password_hash DROP NOT NULL;
CREATE TABLE IF NOT EXISTS guepard_sessions (
 token_hash TEXT PRIMARY KEY, user_id UUID NOT NULL REFERENCES guepard_users(id) ON DELETE CASCADE,
 expires_at TIMESTAMPTZ NOT NULL
); CREATE INDEX IF NOT EXISTS guepard_sessions_user ON guepard_sessions(user_id);
CREATE TABLE IF NOT EXISTS guepard_avatars (
 user_id UUID PRIMARY KEY REFERENCES guepard_users(id) ON DELETE CASCADE,
 data BYTEA NOT NULL, version UUID NOT NULL, updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
 CHECK(octet_length(data)<=2097152)
);
CREATE TABLE IF NOT EXISTS guepard_oauth_accounts (
 provider TEXT NOT NULL CHECK(provider IN ('github','discord')), provider_id TEXT NOT NULL,
 user_id UUID NOT NULL REFERENCES guepard_users(id) ON DELETE CASCADE,
 PRIMARY KEY(provider,provider_id), UNIQUE(provider,user_id)
);
CREATE TABLE IF NOT EXISTS guepard_oauth_states (
 state_hash TEXT PRIMARY KEY, provider TEXT NOT NULL CHECK(provider IN ('github','discord')),
 verifier TEXT NOT NULL, redirect_uri TEXT NOT NULL, expires_at TIMESTAMPTZ NOT NULL
);`;
