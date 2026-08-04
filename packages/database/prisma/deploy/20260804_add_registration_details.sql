CREATE TABLE IF NOT EXISTS "cities" (
  "id" UUID NOT NULL,
  "name" TEXT NOT NULL,
  "search_name" TEXT NOT NULL,
  "region" TEXT NOT NULL,
  "region_code" TEXT NOT NULL,
  CONSTRAINT "cities_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "cities_name_region_key"
  ON "cities"("name", "region");
CREATE INDEX IF NOT EXISTS "cities_search_name_idx"
  ON "cities"("search_name");

ALTER TABLE IF EXISTS "users"
  ADD COLUMN IF NOT EXISTS "telegram_channel" TEXT,
  ADD COLUMN IF NOT EXISTS "city_id" UUID;

DO $$
BEGIN
  IF to_regclass('"public"."users"') IS NOT NULL AND NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'users_city_id_fkey'
  ) THEN
    ALTER TABLE "users"
      ADD CONSTRAINT "users_city_id_fkey"
      FOREIGN KEY ("city_id") REFERENCES "cities"("id")
      ON DELETE SET NULL ON UPDATE CASCADE;
  END IF;
END
$$;
