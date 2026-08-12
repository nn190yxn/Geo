ALTER TABLE "competitor_candidates"
ADD COLUMN "lifecycle_status" TEXT NOT NULL DEFAULT 'candidate',
ADD COLUMN "evidence_sample_ids" JSONB NOT NULL DEFAULT '[]',
ADD COLUMN "sample_confirmed_at" TIMESTAMP(3),
ADD COLUMN "confirmed_at" TIMESTAMP(3);

UPDATE "competitor_candidates"
SET "lifecycle_status" = CASE
  WHEN "decision_status" = 'confirmed' THEN 'user_confirmed'
  WHEN "decision_status" = 'excluded' THEN 'excluded'
  ELSE 'candidate'
END,
"confirmed_at" = CASE WHEN "decision_status" = 'confirmed' THEN "updated_at" ELSE NULL END;

CREATE INDEX "competitor_candidates_lifecycle_status_idx" ON "competitor_candidates"("lifecycle_status");
