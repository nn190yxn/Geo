ALTER TABLE "brand_prompts" ADD COLUMN "prompt_kind" TEXT NOT NULL DEFAULT 'discovery';
ALTER TABLE "test_question_candidates" ADD COLUMN "prompt_kind" TEXT NOT NULL DEFAULT 'discovery';
ALTER TABLE "monitoring_runs" ADD COLUMN "prompt_kind" TEXT NOT NULL DEFAULT 'discovery';
ALTER TABLE "monitoring_runs" ADD COLUMN "client_surface" TEXT NOT NULL DEFAULT 'unknown';
ALTER TABLE "ai_responses" ADD COLUMN "client_surface" TEXT NOT NULL DEFAULT 'unknown';

CREATE INDEX "brand_prompts_prompt_kind_idx" ON "brand_prompts"("prompt_kind");
CREATE INDEX "test_question_candidates_prompt_kind_idx" ON "test_question_candidates"("prompt_kind");
CREATE INDEX "monitoring_runs_prompt_kind_client_surface_idx" ON "monitoring_runs"("prompt_kind", "client_surface");
CREATE INDEX "ai_responses_client_surface_idx" ON "ai_responses"("client_surface");
