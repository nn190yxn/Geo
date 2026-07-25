-- CreateTable
CREATE TABLE "visibility_sprints" (
    "id" TEXT NOT NULL,
    "brand_id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "goal" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'draft',
    "current_step" TEXT NOT NULL,
    "steps" JSONB NOT NULL DEFAULT '[]',
    "metric_summary" JSONB NOT NULL DEFAULT '{}',
    "related_question_ids" JSONB NOT NULL DEFAULT '[]',
    "related_test_plan_ids" JSONB NOT NULL DEFAULT '[]',
    "related_monitoring_run_ids" JSONB NOT NULL DEFAULT '[]',
    "related_standard_answer_ids" JSONB NOT NULL DEFAULT '[]',
    "related_content_task_ids" JSONB NOT NULL DEFAULT '[]',
    "related_publishing_record_ids" JSONB NOT NULL DEFAULT '[]',
    "related_retest_task_ids" JSONB NOT NULL DEFAULT '[]',
    "created_by" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "visibility_sprints_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "visibility_sprints_brand_id_idx" ON "visibility_sprints"("brand_id");

-- CreateIndex
CREATE INDEX "visibility_sprints_status_idx" ON "visibility_sprints"("status");

-- CreateIndex
CREATE INDEX "visibility_sprints_current_step_idx" ON "visibility_sprints"("current_step");

-- CreateIndex
CREATE INDEX "visibility_sprints_updated_at_idx" ON "visibility_sprints"("updated_at");

-- AddForeignKey
ALTER TABLE "visibility_sprints" ADD CONSTRAINT "visibility_sprints_brand_id_fkey" FOREIGN KEY ("brand_id") REFERENCES "brands"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
