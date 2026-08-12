ALTER TABLE "brands" ADD COLUMN "organization_id" TEXT;

UPDATE "brands"
SET "organization_id" = (
  SELECT "id"
  FROM "organizations"
  ORDER BY "created_at" ASC
  LIMIT 1
)
WHERE "organization_id" IS NULL;

ALTER TABLE "brands" ALTER COLUMN "organization_id" SET NOT NULL;
ALTER TABLE "brands" ADD CONSTRAINT "brands_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
CREATE INDEX "brands_organization_id_idx" ON "brands"("organization_id");

CREATE TABLE "product_events" (
  "id" TEXT NOT NULL,
  "organization_id" TEXT NOT NULL,
  "brand_id" TEXT NOT NULL,
  "actor_user_id" TEXT,
  "event_type" TEXT NOT NULL,
  "entity_type" TEXT,
  "entity_id" TEXT,
  "failure_category" TEXT,
  "metadata" JSONB NOT NULL DEFAULT '{}',
  "idempotency_key" TEXT NOT NULL,
  "occurred_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "product_events_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "product_events_brand_id_event_type_idempotency_key_key" ON "product_events"("brand_id", "event_type", "idempotency_key");
CREATE INDEX "product_events_organization_id_occurred_at_idx" ON "product_events"("organization_id", "occurred_at");
CREATE INDEX "product_events_brand_id_occurred_at_idx" ON "product_events"("brand_id", "occurred_at");
CREATE INDEX "product_events_brand_id_event_type_occurred_at_idx" ON "product_events"("brand_id", "event_type", "occurred_at");
ALTER TABLE "product_events" ADD CONSTRAINT "product_events_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "product_events" ADD CONSTRAINT "product_events_brand_id_fkey" FOREIGN KEY ("brand_id") REFERENCES "brands"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
