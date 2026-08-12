CREATE TABLE "diagnostic_score_snapshots" (
  "id" TEXT NOT NULL,
  "brand_id" TEXT NOT NULL,
  "website_url" TEXT NOT NULL,
  "raw_checks" JSONB NOT NULL,
  "dimension_scores" JSONB NOT NULL,
  "normalized_weights" JSONB NOT NULL,
  "policy" JSONB NOT NULL,
  "rule_version" TEXT NOT NULL,
  "total_score" DOUBLE PRECISION NOT NULL,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "diagnostic_score_snapshots_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "diagnostic_score_snapshots_brand_id_created_at_idx"
ON "diagnostic_score_snapshots"("brand_id", "created_at");

CREATE INDEX "diagnostic_score_snapshots_rule_version_idx"
ON "diagnostic_score_snapshots"("rule_version");

ALTER TABLE "diagnostic_score_snapshots"
ADD CONSTRAINT "diagnostic_score_snapshots_brand_id_fkey"
FOREIGN KEY ("brand_id") REFERENCES "brands"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
