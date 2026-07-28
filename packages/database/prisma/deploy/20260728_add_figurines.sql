ALTER TABLE IF EXISTS "public"."users"
  ADD COLUMN IF NOT EXISTS "figurine" TEXT;

ALTER TABLE IF EXISTS "public"."game_players"
  ADD COLUMN IF NOT EXISTS "figurine" TEXT;

DO $$
BEGIN
  IF to_regclass('"public"."game_players"') IS NOT NULL THEN
    CREATE UNIQUE INDEX IF NOT EXISTS "game_players_game_id_figurine_key"
      ON "public"."game_players"("game_id", "figurine");
  END IF;
END
$$;
