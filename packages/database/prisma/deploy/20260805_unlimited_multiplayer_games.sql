ALTER TABLE IF EXISTS "games"
  ALTER COLUMN "max_players" DROP NOT NULL,
  ALTER COLUMN "max_players" DROP DEFAULT;

UPDATE "games"
SET "max_players" = NULL
WHERE "mode" = 'MULTIPLAYER';
