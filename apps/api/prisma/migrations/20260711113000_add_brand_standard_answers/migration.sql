CREATE TABLE "brand_standard_answers" (
    "id" TEXT NOT NULL,
    "brand_id" TEXT NOT NULL,
    "question_id" TEXT NOT NULL,
    "question" TEXT NOT NULL,
    "answer" TEXT NOT NULL,
    "key_points" JSONB NOT NULL DEFAULT '[]',
    "evidence" JSONB NOT NULL DEFAULT '[]',
    "status" TEXT NOT NULL DEFAULT 'draft',
    "reviewed_by" TEXT,
    "reviewed_at" TIMESTAMP(3),
    "created_by" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "brand_standard_answers_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "brand_standard_answers_brand_id_idx" ON "brand_standard_answers"("brand_id");
CREATE INDEX "brand_standard_answers_question_id_idx" ON "brand_standard_answers"("question_id");
CREATE INDEX "brand_standard_answers_status_idx" ON "brand_standard_answers"("status");
CREATE INDEX "brand_standard_answers_updated_at_idx" ON "brand_standard_answers"("updated_at");

ALTER TABLE "brand_standard_answers" ADD CONSTRAINT "brand_standard_answers_brand_id_fkey" FOREIGN KEY ("brand_id") REFERENCES "brands"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
