CREATE TYPE "PublicationMode" AS ENUM ('DISABLED', 'DRAFT', 'AUTOMATIC');
CREATE TYPE "SummaryStatus" AS ENUM ('PENDING', 'DRAFT', 'PUBLISHING', 'PUBLISHED', 'FAILED');

ALTER TABLE "users"
ADD COLUMN "telegram_mention_consent" BOOLEAN NOT NULL DEFAULT false;

CREATE TABLE "telegram_announcements" (
  "id" UUID NOT NULL,
  "title" TEXT NOT NULL,
  "post_url" TEXT NOT NULL,
  "channel_username" TEXT NOT NULL,
  "channel_chat_id" TEXT NOT NULL,
  "channel_message_id" INTEGER NOT NULL,
  "discussion_chat_id" TEXT,
  "discussion_message_id" INTEGER,
  "mode" "PublicationMode" NOT NULL DEFAULT 'DRAFT',
  "is_active" BOOLEAN NOT NULL DEFAULT true,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "telegram_announcements_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "game_summaries" (
  "id" UUID NOT NULL,
  "game_id" UUID NOT NULL,
  "announcement_id" UUID,
  "status" "SummaryStatus" NOT NULL DEFAULT 'PENDING',
  "headline" TEXT,
  "body" TEXT,
  "facts" JSONB NOT NULL DEFAULT '{}',
  "source_sequence" INTEGER NOT NULL DEFAULT 0,
  "generation_version" INTEGER NOT NULL DEFAULT 1,
  "visible_on_site" BOOLEAN NOT NULL DEFAULT false,
  "site_published_at" TIMESTAMP(3),
  "telegram_message_id" INTEGER,
  "telegram_chat_id" TEXT,
  "published_at" TIMESTAMP(3),
  "attempts" INTEGER NOT NULL DEFAULT 0,
  "last_error" TEXT,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "game_summaries_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "game_summaries_game_id_key" ON "game_summaries"("game_id");
CREATE INDEX "telegram_announcements_is_active_created_at_idx" ON "telegram_announcements"("is_active", "created_at");
CREATE INDEX "game_summaries_status_created_at_idx" ON "game_summaries"("status", "created_at");
CREATE INDEX "game_summaries_visible_on_site_site_published_at_idx" ON "game_summaries"("visible_on_site", "site_published_at");
CREATE INDEX "game_summaries_announcement_id_idx" ON "game_summaries"("announcement_id");

ALTER TABLE "game_summaries"
ADD CONSTRAINT "game_summaries_game_id_fkey"
FOREIGN KEY ("game_id") REFERENCES "games"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "game_summaries"
ADD CONSTRAINT "game_summaries_announcement_id_fkey"
FOREIGN KEY ("announcement_id") REFERENCES "telegram_announcements"("id") ON DELETE SET NULL ON UPDATE CASCADE;
