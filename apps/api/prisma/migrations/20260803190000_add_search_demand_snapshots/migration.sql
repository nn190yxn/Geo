CREATE TABLE "search_demand_snapshots" (
    "id" TEXT NOT NULL,
    "brand_id" TEXT NOT NULL,
    "seed_term" TEXT NOT NULL,
    "source" TEXT NOT NULL,
    "market" TEXT NOT NULL,
    "captured_at" TIMESTAMP(3) NOT NULL,
    "previous_snapshot_id" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "search_demand_snapshots_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "search_demand_candidates" (
    "id" TEXT NOT NULL,
    "snapshot_id" TEXT NOT NULL,
    "brand_id" TEXT NOT NULL,
    "question" TEXT NOT NULL,
    "normalized_question" TEXT NOT NULL,
    "rising_observation" BOOLEAN NOT NULL DEFAULT false,
    "status" TEXT NOT NULL DEFAULT 'candidate',
    "confirmed_pool_item_id" TEXT,
    "confirmed_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "search_demand_candidates_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "search_demand_snapshots_brand_id_seed_term_source_market_captured_at_idx" ON "search_demand_snapshots"("brand_id", "seed_term", "source", "market", "captured_at");
CREATE UNIQUE INDEX "search_demand_candidates_snapshot_id_normalized_question_key" ON "search_demand_candidates"("snapshot_id", "normalized_question");
CREATE INDEX "search_demand_candidates_brand_id_idx" ON "search_demand_candidates"("brand_id");
CREATE INDEX "search_demand_candidates_snapshot_id_status_idx" ON "search_demand_candidates"("snapshot_id", "status");
CREATE INDEX "search_demand_candidates_confirmed_pool_item_id_idx" ON "search_demand_candidates"("confirmed_pool_item_id");

ALTER TABLE "search_demand_snapshots" ADD CONSTRAINT "search_demand_snapshots_brand_id_fkey" FOREIGN KEY ("brand_id") REFERENCES "brands"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "search_demand_candidates" ADD CONSTRAINT "search_demand_candidates_snapshot_id_fkey" FOREIGN KEY ("snapshot_id") REFERENCES "search_demand_snapshots"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "search_demand_candidates" ADD CONSTRAINT "search_demand_candidates_brand_id_fkey" FOREIGN KEY ("brand_id") REFERENCES "brands"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "search_demand_candidates" ADD CONSTRAINT "search_demand_candidates_confirmed_pool_item_id_fkey" FOREIGN KEY ("confirmed_pool_item_id") REFERENCES "test_question_pool_items"("id") ON DELETE SET NULL ON UPDATE CASCADE;
