CREATE TABLE "task_acceptance_snapshots" (
  "id" TEXT NOT NULL,
  "brand_id" TEXT NOT NULL,
  "task_id" TEXT NOT NULL,
  "checker_id" TEXT NOT NULL,
  "status" TEXT NOT NULL,
  "progress_value" DOUBLE PRECISION NOT NULL,
  "target_value" DOUBLE PRECISION NOT NULL,
  "evidence" JSONB NOT NULL,
  "checked_at" TIMESTAMP(3) NOT NULL,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "task_acceptance_snapshots_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "task_acceptance_snapshots_brand_id_task_id_checked_at_idx"
ON "task_acceptance_snapshots"("brand_id", "task_id", "checked_at");

CREATE INDEX "task_acceptance_snapshots_checker_id_status_idx"
ON "task_acceptance_snapshots"("checker_id", "status");

ALTER TABLE "task_acceptance_snapshots"
ADD CONSTRAINT "task_acceptance_snapshots_brand_id_fkey"
FOREIGN KEY ("brand_id") REFERENCES "brands"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "task_acceptance_snapshots"
ADD CONSTRAINT "task_acceptance_snapshots_task_id_fkey"
FOREIGN KEY ("task_id") REFERENCES "optimization_tasks"("id") ON DELETE CASCADE ON UPDATE CASCADE;
