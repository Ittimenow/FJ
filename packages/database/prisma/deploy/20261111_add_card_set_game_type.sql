-- Preserve every existing card, set, and game while assigning sets to their rules.
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'card_sets' AND column_name = 'game_type'
  ) THEN
    ALTER TABLE "card_sets" ADD COLUMN "game_type" "GameType" NOT NULL DEFAULT 'CLASSIC_101';
    UPDATE "card_sets" SET "game_type" = 'ADVANCED_202'
    WHERE LOWER(BTRIM("name")) = '202';
    IF to_regclass('public.cards') IS NOT NULL AND to_regclass('public.card_meta') IS NOT NULL THEN
      UPDATE "card_sets" SET "game_type" = 'ADVANCED_202' WHERE "id" IN (
        SELECT DISTINCT c."card_set_id"
        FROM "cards" c
        JOIN "card_meta" m ON m."card_id" = c."id"
        WHERE m."meta_key" = 'game_type' AND m."meta_value" = '202'
      );
    END IF;
  END IF;
END
$$;

DROP INDEX IF EXISTS "card_sets_single_default_idx";
CREATE INDEX IF NOT EXISTS "card_sets_game_type_idx" ON "card_sets"("game_type");

WITH ranked AS (
  SELECT "id", ROW_NUMBER() OVER (
    PARTITION BY "game_type"
    ORDER BY "is_default" DESC,
      CASE WHEN LOWER(BTRIM("name")) IN ('оригинал', '202') THEN 0 ELSE 1 END,
      "created_at", "id"
  ) AS position
  FROM "card_sets"
)
UPDATE "card_sets" s SET "is_default" = (ranked.position = 1)
FROM ranked WHERE ranked."id" = s."id" AND s."is_default" <> (ranked.position = 1);

CREATE UNIQUE INDEX IF NOT EXISTS "card_sets_default_per_game_type_idx"
  ON "card_sets"("game_type") WHERE "is_default" = true;
