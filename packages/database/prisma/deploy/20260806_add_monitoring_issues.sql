CREATE TABLE IF NOT EXISTS "monitoring_issues" (
  "id" UUID NOT NULL,
  "fingerprint" TEXT NOT NULL,
  "status" TEXT NOT NULL DEFAULT 'OPEN',
  "severity" TEXT NOT NULL,
  "source" TEXT NOT NULL,
  "kind" TEXT NOT NULL,
  "message" TEXT NOT NULL,
  "stack" TEXT,
  "details" JSONB NOT NULL DEFAULT '{}',
  "occurrences" INTEGER NOT NULL DEFAULT 1,
  "release" TEXT,
  "first_seen_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "last_seen_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "resolved_at" TIMESTAMP(3),
  CONSTRAINT "monitoring_issues_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "monitoring_issues_fingerprint_key"
  ON "monitoring_issues"("fingerprint");
CREATE INDEX IF NOT EXISTS "monitoring_issues_status_last_seen_at_idx"
  ON "monitoring_issues"("status", "last_seen_at");
CREATE INDEX IF NOT EXISTS "monitoring_issues_source_kind_idx"
  ON "monitoring_issues"("source", "kind");
