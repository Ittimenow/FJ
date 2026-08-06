CREATE TABLE IF NOT EXISTS "baby_gifts" (
  "id" UUID NOT NULL,
  "game_id" UUID NOT NULL,
  "birth_event_id" UUID NOT NULL,
  "sender_game_player_id" UUID NOT NULL,
  "recipient_game_player_id" UUID NOT NULL,
  "amount_cents" BIGINT NOT NULL,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "baby_gifts_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "baby_gifts_game_id_fkey" FOREIGN KEY ("game_id") REFERENCES "games"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "baby_gifts_birth_event_id_fkey" FOREIGN KEY ("birth_event_id") REFERENCES "game_events"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "baby_gifts_sender_game_player_id_fkey" FOREIGN KEY ("sender_game_player_id") REFERENCES "game_players"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "baby_gifts_recipient_game_player_id_fkey" FOREIGN KEY ("recipient_game_player_id") REFERENCES "game_players"("id") ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE UNIQUE INDEX IF NOT EXISTS "baby_gifts_birth_event_id_sender_game_player_id_key"
  ON "baby_gifts"("birth_event_id", "sender_game_player_id");

CREATE INDEX IF NOT EXISTS "baby_gifts_game_id_created_at_idx"
  ON "baby_gifts"("game_id", "created_at");

CREATE INDEX IF NOT EXISTS "baby_gifts_recipient_game_player_id_idx"
  ON "baby_gifts"("recipient_game_player_id");
