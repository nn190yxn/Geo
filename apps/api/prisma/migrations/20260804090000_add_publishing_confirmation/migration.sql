ALTER TABLE "publishing_records"
  ADD COLUMN "content_version" TEXT,
  ADD COLUMN "material_requirements_confirmed" BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN "retest_plan_at" TIMESTAMP(3),
  ADD COLUMN "confirmed_at" TIMESTAMP(3);

CREATE INDEX "publishing_records_retest_plan_at_idx" ON "publishing_records"("retest_plan_at");
