CREATE TABLE "delivery_bundles" (
  "id" TEXT NOT NULL,
  "brand_id" TEXT NOT NULL,
  "cycle_id" TEXT,
  "report_id" TEXT NOT NULL,
  "snapshot" JSONB NOT NULL,
  "methodology_version" TEXT NOT NULL,
  "manifest" JSONB NOT NULL DEFAULT '[]',
  "generated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "delivery_bundles_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "delivery_bundles_brand_id_generated_at_idx" ON "delivery_bundles"("brand_id", "generated_at");
CREATE INDEX "delivery_bundles_report_id_idx" ON "delivery_bundles"("report_id");
ALTER TABLE "delivery_bundles" ADD CONSTRAINT "delivery_bundles_brand_id_fkey" FOREIGN KEY ("brand_id") REFERENCES "brands"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
