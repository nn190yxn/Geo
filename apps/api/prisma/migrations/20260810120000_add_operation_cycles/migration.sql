CREATE TABLE "operation_cycles" (
  "id" TEXT NOT NULL,
  "brand_id" TEXT NOT NULL,
  "status" TEXT NOT NULL DEFAULT 'queued',
  "current_step" TEXT NOT NULL DEFAULT 'site_audit',
  "progress" JSONB NOT NULL DEFAULT '{}',
  "failure_reason" TEXT,
  "retry_status" TEXT NOT NULL DEFAULT 'not_retried',
  "confirmation_items" JSONB NOT NULL DEFAULT '[]',
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "operation_cycles_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "operation_cycles_brand_id_status_idx" ON "operation_cycles"("brand_id", "status");
ALTER TABLE "operation_cycles" ADD CONSTRAINT "operation_cycles_brand_id_fkey" FOREIGN KEY ("brand_id") REFERENCES "brands"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
