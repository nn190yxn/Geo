CREATE TABLE "client_read_grants" (
  "id" TEXT NOT NULL,
  "brand_id" TEXT NOT NULL,
  "client_id" TEXT NOT NULL,
  "expires_at" TIMESTAMP(3) NOT NULL,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "client_read_grants_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "client_read_grants_brand_id_client_id_key" ON "client_read_grants"("brand_id", "client_id");
CREATE INDEX "client_read_grants_client_id_expires_at_idx" ON "client_read_grants"("client_id", "expires_at");
ALTER TABLE "client_read_grants" ADD CONSTRAINT "client_read_grants_brand_id_fkey" FOREIGN KEY ("brand_id") REFERENCES "brands"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
