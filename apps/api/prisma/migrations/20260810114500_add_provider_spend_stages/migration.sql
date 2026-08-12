CREATE TABLE "provider_spend_stages" (
    "id" TEXT NOT NULL,
    "task_key" TEXT NOT NULL,
    "step_code" TEXT NOT NULL,
    "attempt_order" INTEGER NOT NULL,
    "lease_token" TEXT,
    "lease_expires_at" TIMESTAMP(3),
    "provider_code" TEXT,
    "incurred_cost" DECIMAL(12,6) NOT NULL DEFAULT 0,
    "completed_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "provider_spend_stages_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "provider_spend_stages_task_key_step_code_attempt_order_key" ON "provider_spend_stages"("task_key", "step_code", "attempt_order");
CREATE INDEX "provider_spend_stages_lease_expires_at_idx" ON "provider_spend_stages"("lease_expires_at");
