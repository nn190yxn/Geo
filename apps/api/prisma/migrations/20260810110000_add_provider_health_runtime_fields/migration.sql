ALTER TABLE "organization_provider_configs" ADD COLUMN "endpoint_url" TEXT;

CREATE TABLE "provider_health_checks" (
    "id" TEXT NOT NULL,
    "provider_config_id" TEXT NOT NULL,
    "status" TEXT NOT NULL,
    "latency_ms" INTEGER,
    "error_category" TEXT,
    "checked_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "expires_at" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "provider_health_checks_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "provider_health_checks_provider_config_id_checked_at_idx" ON "provider_health_checks"("provider_config_id", "checked_at");
