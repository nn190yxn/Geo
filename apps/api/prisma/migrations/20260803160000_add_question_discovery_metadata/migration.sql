ALTER TABLE "test_question_candidates"
ADD COLUMN "discovery_dimension" TEXT,
ADD COLUMN "business_value" TEXT,
ADD COLUMN "recommendation_probability" DOUBLE PRECISION,
ADD COLUMN "user_stage" TEXT,
ADD COLUMN "generation_rationale" TEXT,
ADD COLUMN "generation_method" TEXT,
ADD COLUMN "merged_from" JSONB NOT NULL DEFAULT '[]';

CREATE INDEX "test_question_candidates_discovery_dimension_idx"
ON "test_question_candidates"("discovery_dimension");
