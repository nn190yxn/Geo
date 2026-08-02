CREATE TABLE "brand_media_assets" (
    "id" TEXT NOT NULL,
    "brand_id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "asset_type" TEXT NOT NULL DEFAULT 'image',
    "applicable_platforms" JSONB NOT NULL DEFAULT '[]',
    "content_usage" TEXT NOT NULL DEFAULT '',
    "source" TEXT NOT NULL DEFAULT '',
    "review_status" TEXT NOT NULL DEFAULT 'pending',
    "related_content_task_id" TEXT,
    "source_url" TEXT,
    "file_ref" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "brand_media_assets_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "media_platform_rules" (
    "id" TEXT NOT NULL,
    "brand_id" TEXT NOT NULL,
    "platform" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "content_formats" JSONB NOT NULL DEFAULT '[]',
    "intent_fit" TEXT NOT NULL DEFAULT '',
    "recommended_frequency" TEXT NOT NULL DEFAULT '',
    "cover_ratio" TEXT NOT NULL DEFAULT '',
    "publishing_note" TEXT NOT NULL DEFAULT '',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "media_platform_rules_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "analysis_findings" (
    "id" TEXT NOT NULL,
    "brand_id" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "optimization_unit_id" TEXT,
    "user_intent" TEXT,
    "platform_code" TEXT,
    "evidence" JSONB NOT NULL DEFAULT '[]',
    "severity" TEXT NOT NULL DEFAULT 'medium',
    "recommended_actions" JSONB NOT NULL DEFAULT '[]',
    "related_task_id" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "analysis_findings_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "brand_media_assets_brand_id_idx" ON "brand_media_assets"("brand_id");
CREATE INDEX "brand_media_assets_asset_type_idx" ON "brand_media_assets"("asset_type");
CREATE INDEX "brand_media_assets_review_status_idx" ON "brand_media_assets"("review_status");
CREATE INDEX "brand_media_assets_related_content_task_id_idx" ON "brand_media_assets"("related_content_task_id");

CREATE UNIQUE INDEX "media_platform_rules_brand_id_platform_key" ON "media_platform_rules"("brand_id", "platform");
CREATE INDEX "media_platform_rules_brand_id_idx" ON "media_platform_rules"("brand_id");

CREATE INDEX "analysis_findings_brand_id_idx" ON "analysis_findings"("brand_id");
CREATE INDEX "analysis_findings_type_idx" ON "analysis_findings"("type");
CREATE INDEX "analysis_findings_severity_idx" ON "analysis_findings"("severity");
CREATE INDEX "analysis_findings_optimization_unit_id_idx" ON "analysis_findings"("optimization_unit_id");
CREATE INDEX "analysis_findings_related_task_id_idx" ON "analysis_findings"("related_task_id");

ALTER TABLE "brand_media_assets" ADD CONSTRAINT "brand_media_assets_brand_id_fkey" FOREIGN KEY ("brand_id") REFERENCES "brands"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "brand_media_assets" ADD CONSTRAINT "brand_media_assets_related_content_task_id_fkey" FOREIGN KEY ("related_content_task_id") REFERENCES "content_generation_tasks"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "media_platform_rules" ADD CONSTRAINT "media_platform_rules_brand_id_fkey" FOREIGN KEY ("brand_id") REFERENCES "brands"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "analysis_findings" ADD CONSTRAINT "analysis_findings_brand_id_fkey" FOREIGN KEY ("brand_id") REFERENCES "brands"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "analysis_findings" ADD CONSTRAINT "analysis_findings_optimization_unit_id_fkey" FOREIGN KEY ("optimization_unit_id") REFERENCES "optimization_units"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "analysis_findings" ADD CONSTRAINT "analysis_findings_related_task_id_fkey" FOREIGN KEY ("related_task_id") REFERENCES "optimization_tasks"("id") ON DELETE SET NULL ON UPDATE CASCADE;
