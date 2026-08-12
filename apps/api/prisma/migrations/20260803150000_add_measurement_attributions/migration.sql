CREATE TABLE "measurement_attributions" (
  "id" TEXT NOT NULL,
  "brand_id" TEXT NOT NULL,
  "baseline_window_start" TIMESTAMP(3) NOT NULL,
  "baseline_window_end" TIMESTAMP(3) NOT NULL,
  "observation_window_start" TIMESTAMP(3) NOT NULL,
  "observation_window_end" TIMESTAMP(3) NOT NULL,
  "control_questions" JSONB NOT NULL DEFAULT '[]',
  "external_events" JSONB NOT NULL DEFAULT '[]',
  "conclusion_type" TEXT NOT NULL DEFAULT 'observational_correlation',
  "conclusion" TEXT NOT NULL DEFAULT '',
  "updated_by" TEXT NOT NULL,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL,

  CONSTRAINT "measurement_attributions_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "measurement_attributions_brand_id_updated_at_idx" ON "measurement_attributions"("brand_id", "updated_at");

ALTER TABLE "measurement_attributions"
  ADD CONSTRAINT "measurement_attributions_brand_id_fkey"
  FOREIGN KEY ("brand_id") REFERENCES "brands"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
