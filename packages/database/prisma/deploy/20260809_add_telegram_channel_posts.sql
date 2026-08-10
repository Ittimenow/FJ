CREATE TYPE "TelegramPostKind" AS ENUM ('SINGLE_GAME', 'GAME_SERIES');
CREATE TYPE "TelegramPostStatus" AS ENUM ('DRAFT', 'PUBLISHING', 'PUBLISHED', 'FAILED');

CREATE TABLE "telegram_channel_posts" (
  "id" UUID NOT NULL,
  "kind" "TelegramPostKind" NOT NULL,
  "status" "TelegramPostStatus" NOT NULL DEFAULT 'DRAFT',
  "title" TEXT NOT NULL,
  "body" TEXT NOT NULL,
  "channel_chat_id" TEXT NOT NULL,
  "generation_version" INTEGER NOT NULL DEFAULT 1,
  "telegram_message_id" INTEGER,
  "telegram_chat_id" TEXT,
  "telegram_post_url" TEXT,
  "published_at" TIMESTAMP(3),
  "attempts" INTEGER NOT NULL DEFAULT 0,
  "last_error" TEXT,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "telegram_channel_posts_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "telegram_channel_post_items" (
  "post_id" UUID NOT NULL,
  "summary_id" UUID NOT NULL,
  "position" INTEGER NOT NULL,
  CONSTRAINT "telegram_channel_post_items_pkey" PRIMARY KEY ("post_id", "summary_id")
);

CREATE INDEX "telegram_channel_posts_status_created_at_idx"
ON "telegram_channel_posts"("status", "created_at");
CREATE INDEX "telegram_channel_posts_published_at_idx"
ON "telegram_channel_posts"("published_at");
CREATE UNIQUE INDEX "telegram_channel_post_items_post_id_position_key"
ON "telegram_channel_post_items"("post_id", "position");
CREATE INDEX "telegram_channel_post_items_summary_id_idx"
ON "telegram_channel_post_items"("summary_id");

ALTER TABLE "telegram_channel_post_items"
ADD CONSTRAINT "telegram_channel_post_items_post_id_fkey"
FOREIGN KEY ("post_id") REFERENCES "telegram_channel_posts"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "telegram_channel_post_items"
ADD CONSTRAINT "telegram_channel_post_items_summary_id_fkey"
FOREIGN KEY ("summary_id") REFERENCES "game_summaries"("id") ON DELETE CASCADE ON UPDATE CASCADE;
