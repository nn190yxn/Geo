ALTER TABLE "async_jobs" ADD COLUMN "idempotency_key" TEXT;
ALTER TABLE "async_jobs" ADD COLUMN "step_code" TEXT;
ALTER TABLE "async_jobs" ADD COLUMN "progress" JSONB NOT NULL DEFAULT '{}';
ALTER TABLE "async_jobs" ADD COLUMN "result_summary" JSONB;
CREATE UNIQUE INDEX "async_jobs_brand_id_idempotency_key_key" ON "async_jobs"("brand_id", "idempotency_key");
