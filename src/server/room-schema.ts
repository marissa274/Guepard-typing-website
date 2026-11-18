export const membershipSchema=`
CREATE UNIQUE INDEX IF NOT EXISTS guepard_rooms_code_unique ON guepard_rooms((data->>'code'));
CREATE TABLE IF NOT EXISTS guepard_room_memberships (
 identity_key TEXT PRIMARY KEY,
 room_id TEXT NOT NULL REFERENCES guepard_rooms(id) ON DELETE CASCADE,
 person_id TEXT NOT NULL,
 UNIQUE(room_id,person_id)
);
CREATE TABLE IF NOT EXISTS guepard_code_attempts (
 ip_hash TEXT PRIMARY KEY,window_started BIGINT NOT NULL,
 attempts INTEGER NOT NULL CHECK(attempts>=0)
);`;
