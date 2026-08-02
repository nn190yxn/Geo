ALTER TABLE "inner_test_feedback"
ADD COLUMN "severity" TEXT NOT NULL DEFAULT 'medium';

CREATE INDEX "inner_test_feedback_severity_idx" ON "inner_test_feedback"("severity");
