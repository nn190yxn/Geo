ALTER TABLE "publishing_accounts"
ADD COLUMN "publishing_mode" TEXT NOT NULL DEFAULT 'manual';

ALTER TABLE "publishing_records"
ADD COLUMN "publishing_mode" TEXT NOT NULL DEFAULT 'manual',
ADD COLUMN "external_platform_id" TEXT,
ADD COLUMN "last_attempt_at" TIMESTAMP(3),
ADD COLUMN "published_at" TIMESTAMP(3);
