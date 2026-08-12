ALTER TABLE "monitoring_runs"
  ADD COLUMN "model_name" TEXT NOT NULL DEFAULT 'unknown',
  ADD COLUMN "collection_method" TEXT NOT NULL DEFAULT 'unknown',
  ADD COLUMN "search_enabled" BOOLEAN,
  ADD COLUMN "market" TEXT NOT NULL DEFAULT 'unknown',
  ADD COLUMN "language" TEXT NOT NULL DEFAULT 'unknown',
  ADD COLUMN "evidence_level" TEXT NOT NULL DEFAULT 'unknown',
  ADD COLUMN "manual_confirmed" BOOLEAN,
  ADD COLUMN "baseline_version" TEXT NOT NULL DEFAULT 'unknown';

ALTER TABLE "ai_responses"
  ADD COLUMN "platform_code" TEXT NOT NULL DEFAULT 'unknown',
  ALTER COLUMN "model_name" SET DEFAULT 'unknown',
  ADD COLUMN "collection_method" TEXT NOT NULL DEFAULT 'unknown',
  ADD COLUMN "search_enabled" BOOLEAN,
  ADD COLUMN "market" TEXT NOT NULL DEFAULT 'unknown',
  ADD COLUMN "language" TEXT NOT NULL DEFAULT 'unknown',
  ADD COLUMN "evidence_level" TEXT NOT NULL DEFAULT 'unknown',
  ADD COLUMN "manual_confirmed" BOOLEAN,
  ADD COLUMN "baseline_version" TEXT NOT NULL DEFAULT 'unknown';

UPDATE "ai_responses"
SET "model_name" = 'unknown'
WHERE "model_name" IS NULL OR BTRIM("model_name") = '';

ALTER TABLE "ai_responses"
  ALTER COLUMN "model_name" SET NOT NULL;
