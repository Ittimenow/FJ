BEGIN;
ALTER TABLE users ADD COLUMN IF NOT EXISTS time_zone TEXT;
ALTER TABLE users ADD COLUMN IF NOT EXISTS open_game_notifications BOOLEAN NOT NULL DEFAULT true;
ALTER TABLE games ADD COLUMN IF NOT EXISTS is_public BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE games ADD COLUMN IF NOT EXISTS scheduled_at TIMESTAMP(3);
ALTER TABLE games ADD COLUMN IF NOT EXISTS schedule_time_zone TEXT;
ALTER TABLE games ADD COLUMN IF NOT EXISTS schedule_revision INTEGER NOT NULL DEFAULT 0;
CREATE INDEX IF NOT EXISTS games_is_public_status_scheduled_at_idx ON games (is_public, status, scheduled_at);
CREATE TABLE IF NOT EXISTS user_notifications (
  id UUID PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  game_id UUID NOT NULL REFERENCES games(id) ON DELETE CASCADE,
  kind TEXT NOT NULL,
  dedupe_key TEXT NOT NULL,
  read_at TIMESTAMP(3),
  created_at TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT user_notifications_user_id_dedupe_key_key UNIQUE (user_id, dedupe_key)
);
CREATE INDEX IF NOT EXISTS user_notifications_user_id_created_at_idx ON user_notifications (user_id, created_at);
COMMIT;
