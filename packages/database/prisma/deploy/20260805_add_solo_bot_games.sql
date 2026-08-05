DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'GameMode') THEN
    CREATE TYPE "GameMode" AS ENUM ('MULTIPLAYER', 'SOLO');
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'PlayerController') THEN
    CREATE TYPE "PlayerController" AS ENUM ('HUMAN', 'BOT');
  END IF;
END
$$;

ALTER TABLE IF EXISTS "games"
  ADD COLUMN IF NOT EXISTS "mode" "GameMode" NOT NULL DEFAULT 'MULTIPLAYER',
  ADD COLUMN IF NOT EXISTS "bot_lease_token" TEXT,
  ADD COLUMN IF NOT EXISTS "bot_lease_until" TIMESTAMP(3);

ALTER TABLE IF EXISTS "game_players"
  ADD COLUMN IF NOT EXISTS "controller" "PlayerController" NOT NULL DEFAULT 'HUMAN',
  ADD COLUMN IF NOT EXISTS "bot_strategy" TEXT;

CREATE INDEX IF NOT EXISTS "games_mode_status_idx"
  ON "games"("mode", "status");

CREATE INDEX IF NOT EXISTS "game_players_game_controller_status_idx"
  ON "game_players"("game_id", "controller", "status");
