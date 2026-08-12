CREATE TABLE "organization_provider_configs" (
  "id" TEXT NOT NULL,
  "organization_id" TEXT NOT NULL,
  "platform_code" TEXT NOT NULL,
  "model_name" TEXT NOT NULL,
  "purpose" TEXT NOT NULL DEFAULT 'generation',
  "credential_ref" TEXT,
  "enabled" BOOLEAN NOT NULL DEFAULT true,
  "priority" INTEGER NOT NULL DEFAULT 100,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "organization_provider_configs_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "organization_provider_configs_organization_id_platform_code_purpose_key"
  ON "organization_provider_configs"("organization_id", "platform_code", "purpose");
CREATE INDEX "organization_provider_configs_organization_id_enabled_priority_idx"
  ON "organization_provider_configs"("organization_id", "enabled", "priority");
