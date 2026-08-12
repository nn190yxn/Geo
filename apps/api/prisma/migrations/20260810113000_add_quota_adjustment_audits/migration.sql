ALTER TABLE "quota_accounts" ADD COLUMN "frozen" BOOLEAN NOT NULL DEFAULT false;
CREATE TABLE "quota_adjustment_audits" (
    "id" TEXT NOT NULL,
    "actor_id" TEXT NOT NULL,
    "scope_type" TEXT NOT NULL,
    "scope_id" TEXT NOT NULL,
    "reason" TEXT NOT NULL,
    "before_amount" DECIMAL(12,6) NOT NULL,
    "after_amount" DECIMAL(12,6) NOT NULL,
    "delta_amount" DECIMAL(12,6) NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "quota_adjustment_audits_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "quota_adjustment_audits_scope_type_scope_id_created_at_idx" ON "quota_adjustment_audits"("scope_type", "scope_id", "created_at");
CREATE INDEX "quota_adjustment_audits_actor_id_created_at_idx" ON "quota_adjustment_audits"("actor_id", "created_at");
