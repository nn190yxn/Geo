CREATE TABLE "quick_start_sessions" (
    "id" TEXT NOT NULL,
    "brand_id" TEXT NOT NULL,
    "current_step" TEXT NOT NULL DEFAULT 'website',
    "status" TEXT NOT NULL DEFAULT 'in_progress',
    "draft" JSONB NOT NULL DEFAULT '{}',
    "version" INTEGER NOT NULL DEFAULT 1,
    "started_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "completed_at" TIMESTAMP(3),
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "quick_start_sessions_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "quick_start_sessions_brand_id_key" ON "quick_start_sessions"("brand_id");
CREATE INDEX "quick_start_sessions_status_idx" ON "quick_start_sessions"("status");

ALTER TABLE "quick_start_sessions" ADD CONSTRAINT "quick_start_sessions_brand_id_fkey"
FOREIGN KEY ("brand_id") REFERENCES "brands"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
