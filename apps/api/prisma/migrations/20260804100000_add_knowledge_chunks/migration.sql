CREATE TABLE "knowledge_chunks" (
  "id" TEXT NOT NULL,
  "brand_id" TEXT NOT NULL,
  "source_id" TEXT NOT NULL,
  "source_url" TEXT,
  "source_version" INTEGER NOT NULL,
  "chunk_index" INTEGER NOT NULL,
  "content" TEXT NOT NULL,
  "content_hash" TEXT NOT NULL,
  "review_status" TEXT NOT NULL DEFAULT 'pending',
  "search_vector" tsvector GENERATED ALWAYS AS (to_tsvector('simple', "content")) STORED,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "knowledge_chunks_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "knowledge_chunks_brand_id_source_id_source_version_chunk_index_key" ON "knowledge_chunks"("brand_id", "source_id", "source_version", "chunk_index");
CREATE INDEX "knowledge_chunks_brand_id_review_status_idx" ON "knowledge_chunks"("brand_id", "review_status");
CREATE INDEX "knowledge_chunks_source_id_source_version_idx" ON "knowledge_chunks"("source_id", "source_version");
CREATE INDEX "knowledge_chunks_search_vector_idx" ON "knowledge_chunks" USING GIN ("search_vector");

ALTER TABLE "knowledge_chunks" ADD CONSTRAINT "knowledge_chunks_brand_id_fkey" FOREIGN KEY ("brand_id") REFERENCES "brands"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "knowledge_chunks" ADD CONSTRAINT "knowledge_chunks_source_id_fkey" FOREIGN KEY ("source_id") REFERENCES "knowledge_sources"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
