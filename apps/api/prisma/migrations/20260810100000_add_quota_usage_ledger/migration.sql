CREATE TABLE "quota_accounts" (
    "id" TEXT NOT NULL,
    "scope_type" TEXT NOT NULL,
    "scope_id" TEXT NOT NULL,
    "limit_amount" DECIMAL(12,6),
    "reserved_amount" DECIMAL(12,6) NOT NULL DEFAULT 0,
    "consumed_amount" DECIMAL(12,6) NOT NULL DEFAULT 0,
    "enabled" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "quota_accounts_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "quota_accounts_scope_type_scope_id_key" ON "quota_accounts"("scope_type", "scope_id");
CREATE INDEX "quota_accounts_scope_type_idx" ON "quota_accounts"("scope_type");

CREATE TABLE "usage_reservations" (
    "id" TEXT NOT NULL,
    "task_key" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "organization_id" TEXT NOT NULL,
    "brand_id" TEXT NOT NULL,
    "task_type" TEXT NOT NULL,
    "requested_cost" DECIMAL(12,6) NOT NULL,
    "settled_cost" DECIMAL(12,6) NOT NULL DEFAULT 0,
    "status" TEXT NOT NULL DEFAULT 'reserved',
    "rejection_reason" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "usage_reservations_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "usage_reservations_task_key_key" ON "usage_reservations"("task_key");
CREATE INDEX "usage_reservations_organization_id_idx" ON "usage_reservations"("organization_id");
CREATE INDEX "usage_reservations_brand_id_idx" ON "usage_reservations"("brand_id");
CREATE INDEX "usage_reservations_status_idx" ON "usage_reservations"("status");

CREATE TABLE "usage_ledger_entries" (
    "id" TEXT NOT NULL,
    "reservation_id" TEXT NOT NULL,
    "event_type" TEXT NOT NULL,
    "amount" DECIMAL(12,6) NOT NULL DEFAULT 0,
    "provider_code" TEXT,
    "attempt_order" INTEGER,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "usage_ledger_entries_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "usage_ledger_entries_reservation_id_idx" ON "usage_ledger_entries"("reservation_id");
CREATE INDEX "usage_ledger_entries_event_type_idx" ON "usage_ledger_entries"("event_type");
