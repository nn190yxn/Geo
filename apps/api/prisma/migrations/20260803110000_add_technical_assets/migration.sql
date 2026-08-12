ALTER TABLE "content_assets"
ADD COLUMN "source_facts" JSONB NOT NULL DEFAULT '[]',
ADD COLUMN "review_status" TEXT NOT NULL DEFAULT 'pending';

CREATE TABLE "technical_asset_versions" (
  "id" TEXT NOT NULL,
  "content_asset_id" TEXT NOT NULL,
  "version" INTEGER NOT NULL,
  "body" TEXT NOT NULL,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "technical_asset_versions_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "technical_asset_versions_content_asset_id_idx"
ON "technical_asset_versions"("content_asset_id");

CREATE UNIQUE INDEX "unique_technical_asset_version"
ON "technical_asset_versions"("content_asset_id", "version");

ALTER TABLE "technical_asset_versions"
ADD CONSTRAINT "technical_asset_versions_content_asset_id_fkey"
FOREIGN KEY ("content_asset_id") REFERENCES "content_assets"("id") ON DELETE CASCADE ON UPDATE CASCADE;
