CREATE TABLE IF NOT EXISTS "personal_data_consents" (
  "id" UUID NOT NULL,
  "user_id" UUID NOT NULL,
  "consent_type" TEXT NOT NULL DEFAULT 'personal_data',
  "version" TEXT NOT NULL,
  "document_hash" TEXT NOT NULL,
  "source" TEXT NOT NULL DEFAULT 'registration',
  "ip_address" TEXT,
  "user_agent" TEXT,
  "accepted_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "revoked_at" TIMESTAMP(3),
  CONSTRAINT "personal_data_consents_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "personal_data_consents_user_id_fkey"
    FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE INDEX IF NOT EXISTS "personal_data_consents_user_id_consent_type_accepted_at_idx"
  ON "personal_data_consents"("user_id", "consent_type", "accepted_at");
