CREATE TABLE IF NOT EXISTS "card_sets" (
  "id" UUID NOT NULL,
  "name" TEXT NOT NULL,
  "is_default" BOOLEAN NOT NULL DEFAULT false,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "card_sets_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "card_sets_name_key"
  ON "card_sets"("name");
INSERT INTO "card_sets" ("id", "name", "is_default", "updated_at")
VALUES ('00000000-0000-0000-0000-000000000001', 'Основной', true, CURRENT_TIMESTAMP)
ON CONFLICT ("id") DO UPDATE SET "is_default" = true;

ALTER TABLE "card_sets" ALTER COLUMN "updated_at" DROP DEFAULT;

DO $$
BEGIN
  IF to_regclass('public.cards') IS NOT NULL THEN
    ALTER TABLE "cards" ADD COLUMN IF NOT EXISTS "card_set_id" UUID;
    UPDATE "cards"
      SET "card_set_id" = '00000000-0000-0000-0000-000000000001'
      WHERE "card_set_id" IS NULL;
    ALTER TABLE "cards" ALTER COLUMN "card_set_id" SET NOT NULL;
    DROP INDEX IF EXISTS "cards_slug_key";
    CREATE UNIQUE INDEX IF NOT EXISTS "cards_card_set_id_slug_key"
      ON "cards"("card_set_id", "slug");
    CREATE INDEX IF NOT EXISTS "cards_card_set_id_card_type_idx"
      ON "cards"("card_set_id", "card_type");
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'cards_card_set_id_fkey') THEN
      ALTER TABLE "cards"
        ADD CONSTRAINT "cards_card_set_id_fkey"
        FOREIGN KEY ("card_set_id") REFERENCES "card_sets"("id")
        ON DELETE RESTRICT ON UPDATE CASCADE;
    END IF;
  END IF;

  IF to_regclass('public.games') IS NOT NULL THEN
    ALTER TABLE "games" ADD COLUMN IF NOT EXISTS "card_set_id" UUID;
    UPDATE "games"
      SET "card_set_id" = '00000000-0000-0000-0000-000000000001'
      WHERE "card_set_id" IS NULL;
    ALTER TABLE "games" ALTER COLUMN "card_set_id" SET NOT NULL;
    CREATE INDEX IF NOT EXISTS "games_card_set_id_idx"
      ON "games"("card_set_id");
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'games_card_set_id_fkey') THEN
      ALTER TABLE "games"
        ADD CONSTRAINT "games_card_set_id_fkey"
        FOREIGN KEY ("card_set_id") REFERENCES "card_sets"("id")
        ON DELETE RESTRICT ON UPDATE CASCADE;
    END IF;
  END IF;
END
$$;
