CREATE TABLE "public_brand_profiles" (
  "id" TEXT NOT NULL,
  "brand_id" TEXT NOT NULL,
  "status" TEXT NOT NULL DEFAULT 'draft',
  "public_data" JSONB NOT NULL DEFAULT '{}',
  "published_at" TIMESTAMP(3),
  "withdrawn_at" TIMESTAMP(3),
  "view_count" INTEGER NOT NULL DEFAULT 0,
  CONSTRAINT "public_brand_profiles_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "public_brand_profiles_brand_id_key" ON "public_brand_profiles"("brand_id");
CREATE INDEX "public_brand_profiles_status_idx" ON "public_brand_profiles"("status");
ALTER TABLE "public_brand_profiles" ADD CONSTRAINT "public_brand_profiles_brand_id_fkey" FOREIGN KEY ("brand_id") REFERENCES "brands"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
