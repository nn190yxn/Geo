-- CreateSchema
CREATE SCHEMA IF NOT EXISTS "public";

-- CreateTable
CREATE TABLE "brands" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'active',
    "description" TEXT,
    "aliases" JSONB NOT NULL DEFAULT '[]',
    "industry" TEXT,
    "website" TEXT,
    "target_cities" JSONB NOT NULL DEFAULT '[]',
    "business_scope" TEXT,
    "target_audience" TEXT,
    "deleted_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "brands_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "organizations" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'active',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "organizations_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "roles" (
    "id" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "scope" TEXT NOT NULL,
    "permissions" JSONB NOT NULL DEFAULT '[]',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "roles_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "organization_members" (
    "id" TEXT NOT NULL,
    "organization_id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "role_id" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'active',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "organization_members_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "optimization_units" (
    "id" TEXT NOT NULL,
    "brand_id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "target_keywords" JSONB NOT NULL DEFAULT '[]',
    "priority" TEXT NOT NULL DEFAULT 'medium',
    "enabled" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "optimization_units_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "test_themes" (
    "id" TEXT NOT NULL,
    "brand_id" TEXT NOT NULL,
    "optimization_unit_id" TEXT,
    "type" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "business_explanation" TEXT NOT NULL DEFAULT '',
    "priority" TEXT NOT NULL DEFAULT 'medium',
    "estimated_value" TEXT NOT NULL DEFAULT '',
    "source_profile_fields" JSONB NOT NULL DEFAULT '[]',
    "enabled" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "test_themes_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "user_intents" (
    "id" TEXT NOT NULL,
    "brand_id" TEXT NOT NULL,
    "optimization_unit_id" TEXT NOT NULL,
    "category" TEXT NOT NULL,
    "text" TEXT NOT NULL,
    "monitoring_frequency" TEXT NOT NULL DEFAULT 'weekly',
    "enabled" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "user_intents_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "prompt_templates" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "industry" TEXT,
    "category" TEXT NOT NULL,
    "text" TEXT NOT NULL,
    "target_keywords" JSONB NOT NULL DEFAULT '[]',
    "platform_codes" JSONB NOT NULL DEFAULT '[]',
    "frequency" TEXT NOT NULL DEFAULT 'weekly',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "prompt_templates_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "brand_prompts" (
    "id" TEXT NOT NULL,
    "brand_id" TEXT NOT NULL,
    "optimization_unit_id" TEXT NOT NULL,
    "intent_id" TEXT NOT NULL,
    "template_id" TEXT,
    "text" TEXT NOT NULL,
    "category" TEXT NOT NULL,
    "target_keywords" JSONB NOT NULL DEFAULT '[]',
    "platform_codes" JSONB NOT NULL DEFAULT '[]',
    "monitoring_frequency" TEXT NOT NULL DEFAULT 'weekly',
    "enabled" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "brand_prompts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "test_question_candidates" (
    "id" TEXT NOT NULL,
    "brand_id" TEXT NOT NULL,
    "theme_id" TEXT NOT NULL,
    "prompt_id" TEXT,
    "question" TEXT NOT NULL,
    "purposes" JSONB NOT NULL DEFAULT '[]',
    "target_platforms" JSONB NOT NULL DEFAULT '[]',
    "priority" TEXT NOT NULL DEFAULT 'medium',
    "estimated_value" TEXT NOT NULL DEFAULT '',
    "editable" BOOLEAN NOT NULL DEFAULT true,
    "selected" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "test_question_candidates_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "knowledge_sources" (
    "id" TEXT NOT NULL,
    "brand_id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "source_type" TEXT NOT NULL,
    "source_url" TEXT,
    "file_ref" TEXT,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "error_message" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "knowledge_sources_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "brand_profiles" (
    "brand_id" TEXT NOT NULL,
    "intro" TEXT NOT NULL DEFAULT '',
    "value_props" JSONB NOT NULL DEFAULT '[]',
    "offerings" JSONB NOT NULL DEFAULT '[]',
    "proof_points" JSONB NOT NULL DEFAULT '[]',
    "target_customers" JSONB NOT NULL DEFAULT '[]',
    "recommended_expressions" JSONB NOT NULL DEFAULT '[]',
    "blocked_expressions" JSONB NOT NULL DEFAULT '[]',
    "content_rules" JSONB NOT NULL DEFAULT '[]',
    "competitors" JSONB NOT NULL DEFAULT '[]',
    "faqs" JSONB NOT NULL DEFAULT '[]',
    "completeness_score" INTEGER NOT NULL DEFAULT 0,
    "missing_fields" JSONB NOT NULL DEFAULT '[]',
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "brand_profiles_pkey" PRIMARY KEY ("brand_id")
);

-- CreateTable
CREATE TABLE "users" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "avatar_url" TEXT,
    "status" TEXT NOT NULL DEFAULT 'active',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "audit_logs" (
    "id" TEXT NOT NULL,
    "brand_id" TEXT,
    "organization_id" TEXT,
    "actor_user_id" TEXT,
    "action" TEXT NOT NULL,
    "resource_type" TEXT NOT NULL,
    "resource_id" TEXT,
    "result" TEXT NOT NULL,
    "error_code" TEXT,
    "metadata" JSONB NOT NULL DEFAULT '{}',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "audit_logs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "user_brand_permissions" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "brand_id" TEXT NOT NULL,
    "role" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "user_brand_permissions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "denied_access_logs" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "brand_id" TEXT NOT NULL,
    "reason" TEXT NOT NULL,
    "requested_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "denied_access_logs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "platform_configs" (
    "id" TEXT NOT NULL,
    "brand_id" TEXT NOT NULL,
    "platform_key" TEXT NOT NULL,
    "display_name" TEXT NOT NULL,
    "mode" TEXT NOT NULL DEFAULT 'manual',
    "endpoint_url" TEXT,
    "model_name" TEXT,
    "rate_limit_per_minute" INTEGER NOT NULL DEFAULT 60,
    "enabled" BOOLEAN NOT NULL DEFAULT true,
    "credential_ref" TEXT,
    "last_validation" JSONB,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "platform_configs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "browser_connection_sessions" (
    "id" TEXT NOT NULL,
    "brand_id" TEXT NOT NULL,
    "platform_code" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'not_started',
    "login_detected" BOOLEAN NOT NULL DEFAULT false,
    "authorized_scope" JSONB NOT NULL DEFAULT '{}',
    "last_operation" TEXT,
    "last_issue_type" TEXT,
    "last_message" TEXT,
    "last_available_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "browser_connection_sessions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ai_platform_call_audits" (
    "id" TEXT NOT NULL,
    "brand_id" TEXT NOT NULL,
    "platform_code" TEXT NOT NULL,
    "model_name" TEXT,
    "call_type" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'started',
    "duration_ms" INTEGER,
    "input_token_count" INTEGER,
    "output_token_count" INTEGER,
    "cost_estimate" DECIMAL(12,6),
    "error_code" TEXT,
    "error_message" TEXT,
    "retryable" BOOLEAN,
    "started_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "completed_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ai_platform_call_audits_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "async_jobs" (
    "id" TEXT NOT NULL,
    "brand_id" TEXT NOT NULL,
    "job_type" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'queued',
    "entity_id" TEXT NOT NULL,
    "attempt_count" INTEGER NOT NULL DEFAULT 0,
    "max_attempts" INTEGER NOT NULL DEFAULT 3,
    "next_run_at" TIMESTAMP(3),
    "last_error_code" TEXT,
    "last_error_message" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "async_jobs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "llm_task_runs" (
    "id" TEXT NOT NULL,
    "brand_id" TEXT NOT NULL,
    "task_type" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'queued',
    "job_id" TEXT,
    "audit_id" TEXT,
    "input_summary" JSONB NOT NULL DEFAULT '{}',
    "output_summary" JSONB,
    "error_code" TEXT,
    "error_message" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "llm_task_runs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "monitoring_runs" (
    "id" TEXT NOT NULL,
    "brand_id" TEXT NOT NULL,
    "optimization_unit_id" TEXT NOT NULL,
    "intent_id" TEXT NOT NULL,
    "prompt_id" TEXT NOT NULL,
    "test_plan_id" TEXT,
    "platform_code" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "started_at" TIMESTAMP(3),
    "completed_at" TIMESTAMP(3),
    "error_message" TEXT,
    "retry_status" TEXT NOT NULL DEFAULT 'not_retried',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "monitoring_runs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "test_plans" (
    "id" TEXT NOT NULL,
    "brand_id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'draft',
    "questions" JSONB NOT NULL DEFAULT '[]',
    "platform_codes" JSONB NOT NULL DEFAULT '[]',
    "connection_summary" JSONB NOT NULL DEFAULT '[]',
    "execution_method" TEXT NOT NULL DEFAULT 'manual',
    "estimated_duration_minutes" INTEGER NOT NULL DEFAULT 0,
    "confirmation_items" JSONB NOT NULL DEFAULT '[]',
    "created_by" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "test_plans_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ai_responses" (
    "id" TEXT NOT NULL,
    "run_id" TEXT NOT NULL,
    "brand_id" TEXT NOT NULL,
    "raw_text" TEXT NOT NULL,
    "citations" JSONB NOT NULL DEFAULT '[]',
    "model_name" TEXT,
    "responded_at" TIMESTAMP(3) NOT NULL,
    "parse_status" TEXT NOT NULL DEFAULT 'pending',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ai_responses_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "analysis_results" (
    "id" TEXT NOT NULL,
    "response_id" TEXT NOT NULL,
    "run_id" TEXT NOT NULL,
    "brand_id" TEXT NOT NULL,
    "brand_mentioned" BOOLEAN NOT NULL DEFAULT false,
    "brand_rank" INTEGER,
    "sentiment" TEXT NOT NULL DEFAULT 'unknown',
    "accuracy_score" INTEGER NOT NULL DEFAULT 0,
    "citation_score" INTEGER NOT NULL DEFAULT 0,
    "platform_evaluation" TEXT NOT NULL DEFAULT '',
    "recommendation_reason" TEXT NOT NULL DEFAULT '',
    "ranking_reason" TEXT NOT NULL DEFAULT '',
    "expression_completeness" TEXT NOT NULL DEFAULT '',
    "expression_deviation" TEXT NOT NULL DEFAULT '',
    "competitor_mentions" JSONB NOT NULL DEFAULT '[]',
    "review_required" BOOLEAN NOT NULL DEFAULT true,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "analysis_results_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "geo_metric_snapshots" (
    "id" TEXT NOT NULL,
    "brand_id" TEXT NOT NULL,
    "period" TEXT NOT NULL,
    "platform_code" TEXT,
    "optimization_unit_id" TEXT,
    "intent_id" TEXT,
    "category" TEXT,
    "mention_score" INTEGER NOT NULL DEFAULT 0,
    "ranking_score" INTEGER NOT NULL DEFAULT 0,
    "accuracy_score" INTEGER NOT NULL DEFAULT 0,
    "sentiment_score" INTEGER NOT NULL DEFAULT 0,
    "citation_score" INTEGER NOT NULL DEFAULT 0,
    "competitor_score" INTEGER NOT NULL DEFAULT 0,
    "knowledge_completeness_score" INTEGER NOT NULL DEFAULT 0,
    "total_score" INTEGER NOT NULL DEFAULT 0,
    "sample_count" INTEGER NOT NULL DEFAULT 0,
    "insufficient_sample" BOOLEAN NOT NULL DEFAULT true,
    "calculated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "geo_metric_snapshots_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "competitors" (
    "id" TEXT NOT NULL,
    "brand_id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "aliases" JSONB NOT NULL DEFAULT '[]',
    "website" TEXT,
    "industry_tags" JSONB NOT NULL DEFAULT '[]',
    "comparison_note" TEXT NOT NULL DEFAULT '',
    "suppression_rule" JSONB NOT NULL DEFAULT '{}',
    "confirmation_label" TEXT,
    "source_candidate_id" TEXT,
    "source_provider" TEXT,
    "nearest_campus_distance_km" DOUBLE PRECISION,
    "is_national_benchmark" BOOLEAN NOT NULL DEFAULT false,
    "is_campus_focus" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "competitors_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "competitor_discovery_runs" (
    "id" TEXT NOT NULL,
    "brand_id" TEXT NOT NULL,
    "city" TEXT NOT NULL,
    "campus_radius_km" INTEGER NOT NULL,
    "keywords" JSONB NOT NULL DEFAULT '[]',
    "status" TEXT NOT NULL,
    "candidate_count" INTEGER NOT NULL DEFAULT 0,
    "missing_fields" JSONB NOT NULL DEFAULT '[]',
    "source_provider" TEXT NOT NULL,
    "provider_status" TEXT NOT NULL DEFAULT 'fallback',
    "provider_message" TEXT NOT NULL DEFAULT '',
    "cache_hit" BOOLEAN NOT NULL DEFAULT false,
    "created_by" TEXT NOT NULL,
    "failure_reason" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "completed_at" TIMESTAMP(3),

    CONSTRAINT "competitor_discovery_runs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "competitor_candidates" (
    "id" TEXT NOT NULL,
    "run_id" TEXT NOT NULL,
    "brand_id" TEXT NOT NULL,
    "source_provider" TEXT NOT NULL,
    "source_poi_id" TEXT,
    "name" TEXT NOT NULL,
    "address" TEXT,
    "city" TEXT,
    "latitude" DOUBLE PRECISION,
    "longitude" DOUBLE PRECISION,
    "category" TEXT,
    "distance_to_nearest_campus_km" DOUBLE PRECISION,
    "matched_keywords" JSONB NOT NULL DEFAULT '[]',
    "score" INTEGER NOT NULL,
    "suggested_label" TEXT NOT NULL,
    "confirmed_label" TEXT,
    "match_reasons" JSONB NOT NULL DEFAULT '[]',
    "confidence" TEXT NOT NULL,
    "is_campus_focus" BOOLEAN NOT NULL DEFAULT false,
    "decision_status" TEXT NOT NULL DEFAULT 'pending',
    "excluded_reason" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "competitor_candidates_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "citation_sources" (
    "id" TEXT NOT NULL,
    "brand_id" TEXT NOT NULL,
    "response_id" TEXT NOT NULL,
    "content_asset_id" TEXT,
    "title" TEXT NOT NULL,
    "url" TEXT NOT NULL,
    "source_type" TEXT NOT NULL,
    "authority_level" TEXT NOT NULL,
    "citation_count" INTEGER NOT NULL DEFAULT 1,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "citation_sources_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "content_assets" (
    "id" TEXT NOT NULL,
    "brand_id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "platform" TEXT NOT NULL,
    "url" TEXT NOT NULL,
    "target_keywords" JSONB NOT NULL DEFAULT '[]',
    "reuse_of_asset_id" TEXT,
    "brand_adaptation" TEXT,
    "status" TEXT NOT NULL DEFAULT 'draft',
    "published_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "content_assets_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "evaluation_issues" (
    "id" TEXT NOT NULL,
    "brand_id" TEXT NOT NULL,
    "response_id" TEXT NOT NULL,
    "run_id" TEXT NOT NULL,
    "prompt_id" TEXT NOT NULL,
    "prompt_text" TEXT NOT NULL,
    "platform_code" TEXT NOT NULL,
    "issue_type" TEXT NOT NULL,
    "raw_fragment" TEXT NOT NULL,
    "suggested_expression" TEXT NOT NULL,
    "severity" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'open',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "evaluation_issues_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "content_strategies" (
    "id" TEXT NOT NULL,
    "brand_id" TEXT NOT NULL,
    "optimization_unit_id" TEXT NOT NULL,
    "intent_id" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "priority" TEXT NOT NULL DEFAULT 'medium',
    "suggested_title" TEXT NOT NULL,
    "target_platform" TEXT NOT NULL,
    "target_keywords" JSONB NOT NULL DEFAULT '[]',
    "related_prompt_ids" JSONB NOT NULL DEFAULT '[]',
    "status" TEXT NOT NULL DEFAULT 'draft',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "content_strategies_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "content_generation_tasks" (
    "id" TEXT NOT NULL,
    "brand_id" TEXT NOT NULL,
    "strategy_id" TEXT NOT NULL,
    "growth_optimization_plan_id" TEXT,
    "target_platform" TEXT NOT NULL,
    "content_type" TEXT NOT NULL,
    "content_topic" TEXT,
    "target_keywords" JSONB NOT NULL DEFAULT '[]',
    "reference_sources" JSONB NOT NULL DEFAULT '[]',
    "retest_at" TIMESTAMP(3),
    "status" TEXT NOT NULL DEFAULT 'pending',
    "steps" JSONB NOT NULL DEFAULT '[]',
    "draft_ref" TEXT,
    "error_message" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "content_generation_tasks_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "growth_optimization_plans" (
    "id" TEXT NOT NULL,
    "brand_id" TEXT NOT NULL,
    "source_test_plan_id" TEXT,
    "strategy_id" TEXT,
    "source_run_ids" JSONB NOT NULL DEFAULT '[]',
    "summary" TEXT NOT NULL DEFAULT '',
    "reasons" JSONB NOT NULL DEFAULT '[]',
    "priority" TEXT NOT NULL DEFAULT 'medium',
    "owner_id" TEXT,
    "due_date" TIMESTAMP(3) NOT NULL,
    "publishing_platforms" JSONB NOT NULL DEFAULT '[]',
    "retest_at" TIMESTAMP(3) NOT NULL,
    "content_recommendations" JSONB NOT NULL DEFAULT '[]',
    "status" TEXT NOT NULL DEFAULT 'draft',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "growth_optimization_plans_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "content_versions" (
    "id" TEXT NOT NULL,
    "brand_id" TEXT NOT NULL,
    "generation_task_id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "body" TEXT NOT NULL,
    "version" INTEGER NOT NULL,
    "export_format" TEXT NOT NULL DEFAULT 'markdown',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "content_versions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "automation_packages" (
    "id" TEXT NOT NULL,
    "brand_id" TEXT NOT NULL,
    "status" TEXT NOT NULL,
    "source" TEXT NOT NULL,
    "goal" TEXT NOT NULL,
    "target_platforms" JSONB NOT NULL DEFAULT '[]',
    "target_publishing_platforms" JSONB NOT NULL DEFAULT '[]',
    "current_step" TEXT NOT NULL,
    "step_summaries" JSONB NOT NULL DEFAULT '[]',
    "related_test_plan_id" TEXT,
    "related_growth_plan_id" TEXT,
    "related_content_task_ids" JSONB NOT NULL DEFAULT '[]',
    "related_publishing_record_ids" JSONB NOT NULL DEFAULT '[]',
    "created_by" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "automation_packages_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "automation_confirmations" (
    "id" TEXT NOT NULL,
    "package_id" TEXT NOT NULL,
    "brand_id" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "status" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "impact" TEXT NOT NULL,
    "recommendation" TEXT NOT NULL,
    "evidence_summary" TEXT NOT NULL,
    "payload" JSONB NOT NULL DEFAULT '{}',
    "decision" TEXT,
    "decided_by" TEXT,
    "decided_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "automation_confirmations_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "platform_rewrite_versions" (
    "id" TEXT NOT NULL,
    "brand_id" TEXT NOT NULL,
    "content_version_id" TEXT NOT NULL,
    "target_platform" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "body" TEXT NOT NULL,
    "tags" JSONB NOT NULL DEFAULT '[]',
    "rewrite_notes" JSONB NOT NULL DEFAULT '[]',
    "compliance_notes" JSONB NOT NULL DEFAULT '[]',
    "status" TEXT NOT NULL DEFAULT 'draft',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "platform_rewrite_versions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "test_question_pool_items" (
    "id" TEXT NOT NULL,
    "brand_id" TEXT NOT NULL,
    "candidate_id" TEXT,
    "question" TEXT NOT NULL,
    "angle" TEXT NOT NULL,
    "purposes" JSONB NOT NULL DEFAULT '[]',
    "target_platforms" JSONB NOT NULL DEFAULT '[]',
    "priority" TEXT NOT NULL DEFAULT 'medium',
    "estimated_value" TEXT NOT NULL DEFAULT '',
    "source" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'candidate',
    "last_tested_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "test_question_pool_items_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "test_question_source_records" (
    "id" TEXT NOT NULL,
    "pool_item_id" TEXT NOT NULL,
    "brand_id" TEXT NOT NULL,
    "source_type" TEXT NOT NULL,
    "source_id" TEXT,
    "summary" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "test_question_source_records_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "content_export_records" (
    "id" TEXT NOT NULL,
    "brand_id" TEXT NOT NULL,
    "generation_task_id" TEXT NOT NULL,
    "version_id" TEXT NOT NULL,
    "export_format" TEXT NOT NULL DEFAULT 'markdown',
    "file_name" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "created_by" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "content_export_records_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "publishing_accounts" (
    "id" TEXT NOT NULL,
    "brand_id" TEXT NOT NULL,
    "platform" TEXT NOT NULL,
    "account_name" TEXT NOT NULL,
    "login_mode" TEXT NOT NULL,
    "auth_status" TEXT NOT NULL DEFAULT 'connected',
    "error_message" TEXT,
    "last_authorized_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "publishing_accounts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "publishing_records" (
    "id" TEXT NOT NULL,
    "brand_id" TEXT NOT NULL,
    "content_asset_id" TEXT NOT NULL,
    "account_id" TEXT,
    "generation_task_id" TEXT,
    "version_id" TEXT,
    "title" TEXT NOT NULL,
    "body" TEXT NOT NULL DEFAULT '',
    "platform" TEXT NOT NULL,
    "account_name" TEXT,
    "status" TEXT NOT NULL DEFAULT 'draft',
    "published_url" TEXT,
    "error_message" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "publishing_records_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "optimization_tasks" (
    "id" TEXT NOT NULL,
    "brand_id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "type" TEXT NOT NULL DEFAULT 'manual',
    "status" TEXT NOT NULL DEFAULT 'todo',
    "owner_id" TEXT,
    "optimization_unit_id" TEXT,
    "related_prompt_id" TEXT,
    "related_platform_code" TEXT,
    "strategy_id" TEXT,
    "growth_optimization_plan_id" TEXT,
    "source_run_id" TEXT,
    "retest_run_id" TEXT,
    "priority" TEXT DEFAULT 'medium',
    "processing_note" TEXT,
    "content_link" TEXT,
    "review_status" TEXT,
    "retest_plan_at" TIMESTAMP(3),
    "retest_records" JSONB NOT NULL DEFAULT '[]',
    "due_date" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "optimization_tasks_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "reports" (
    "id" TEXT NOT NULL,
    "brand_id" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "period_start" TIMESTAMP(3) NOT NULL,
    "period_end" TIMESTAMP(3) NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "content" TEXT NOT NULL,
    "data_gaps" JSONB NOT NULL DEFAULT '[]',
    "snapshot" JSONB NOT NULL DEFAULT '{}',
    "created_by" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "reports_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "advisor_records" (
    "id" TEXT NOT NULL,
    "brand_id" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "related_report_id" TEXT,
    "follow_up_items" JSONB NOT NULL DEFAULT '[]',
    "created_by" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "advisor_records_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "inner_test_feedback" (
    "id" TEXT NOT NULL,
    "brand_id" TEXT NOT NULL,
    "page" TEXT NOT NULL,
    "module" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'open',
    "reporter_id" TEXT NOT NULL,
    "resolution_note" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "inner_test_feedback_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "brands_status_idx" ON "brands"("status");

-- CreateIndex
CREATE INDEX "brands_industry_idx" ON "brands"("industry");

-- CreateIndex
CREATE INDEX "organizations_status_idx" ON "organizations"("status");

-- CreateIndex
CREATE INDEX "roles_scope_idx" ON "roles"("scope");

-- CreateIndex
CREATE UNIQUE INDEX "roles_code_scope_key" ON "roles"("code", "scope");

-- CreateIndex
CREATE INDEX "organization_members_user_id_idx" ON "organization_members"("user_id");

-- CreateIndex
CREATE INDEX "organization_members_status_idx" ON "organization_members"("status");

-- CreateIndex
CREATE UNIQUE INDEX "organization_members_organization_id_user_id_key" ON "organization_members"("organization_id", "user_id");

-- CreateIndex
CREATE INDEX "optimization_units_brand_id_idx" ON "optimization_units"("brand_id");

-- CreateIndex
CREATE INDEX "optimization_units_type_idx" ON "optimization_units"("type");

-- CreateIndex
CREATE INDEX "optimization_units_enabled_idx" ON "optimization_units"("enabled");

-- CreateIndex
CREATE INDEX "test_themes_brand_id_idx" ON "test_themes"("brand_id");

-- CreateIndex
CREATE INDEX "test_themes_optimization_unit_id_idx" ON "test_themes"("optimization_unit_id");

-- CreateIndex
CREATE INDEX "test_themes_type_idx" ON "test_themes"("type");

-- CreateIndex
CREATE INDEX "test_themes_enabled_idx" ON "test_themes"("enabled");

-- CreateIndex
CREATE INDEX "user_intents_brand_id_idx" ON "user_intents"("brand_id");

-- CreateIndex
CREATE INDEX "user_intents_optimization_unit_id_idx" ON "user_intents"("optimization_unit_id");

-- CreateIndex
CREATE INDEX "user_intents_category_idx" ON "user_intents"("category");

-- CreateIndex
CREATE INDEX "prompt_templates_category_idx" ON "prompt_templates"("category");

-- CreateIndex
CREATE INDEX "prompt_templates_industry_idx" ON "prompt_templates"("industry");

-- CreateIndex
CREATE INDEX "brand_prompts_brand_id_idx" ON "brand_prompts"("brand_id");

-- CreateIndex
CREATE INDEX "brand_prompts_intent_id_idx" ON "brand_prompts"("intent_id");

-- CreateIndex
CREATE INDEX "brand_prompts_enabled_idx" ON "brand_prompts"("enabled");

-- CreateIndex
CREATE INDEX "test_question_candidates_brand_id_idx" ON "test_question_candidates"("brand_id");

-- CreateIndex
CREATE INDEX "test_question_candidates_theme_id_idx" ON "test_question_candidates"("theme_id");

-- CreateIndex
CREATE INDEX "test_question_candidates_prompt_id_idx" ON "test_question_candidates"("prompt_id");

-- CreateIndex
CREATE INDEX "test_question_candidates_selected_idx" ON "test_question_candidates"("selected");

-- CreateIndex
CREATE INDEX "knowledge_sources_brand_id_idx" ON "knowledge_sources"("brand_id");

-- CreateIndex
CREATE INDEX "knowledge_sources_status_idx" ON "knowledge_sources"("status");

-- CreateIndex
CREATE UNIQUE INDEX "users_email_key" ON "users"("email");

-- CreateIndex
CREATE INDEX "users_status_idx" ON "users"("status");

-- CreateIndex
CREATE INDEX "audit_logs_brand_id_idx" ON "audit_logs"("brand_id");

-- CreateIndex
CREATE INDEX "audit_logs_organization_id_idx" ON "audit_logs"("organization_id");

-- CreateIndex
CREATE INDEX "audit_logs_actor_user_id_idx" ON "audit_logs"("actor_user_id");

-- CreateIndex
CREATE INDEX "audit_logs_action_idx" ON "audit_logs"("action");

-- CreateIndex
CREATE INDEX "audit_logs_resource_type_idx" ON "audit_logs"("resource_type");

-- CreateIndex
CREATE INDEX "audit_logs_result_idx" ON "audit_logs"("result");

-- CreateIndex
CREATE INDEX "audit_logs_created_at_idx" ON "audit_logs"("created_at");

-- CreateIndex
CREATE INDEX "user_brand_permissions_brand_id_idx" ON "user_brand_permissions"("brand_id");

-- CreateIndex
CREATE UNIQUE INDEX "user_brand_permissions_user_id_brand_id_key" ON "user_brand_permissions"("user_id", "brand_id");

-- CreateIndex
CREATE INDEX "denied_access_logs_user_id_idx" ON "denied_access_logs"("user_id");

-- CreateIndex
CREATE INDEX "denied_access_logs_brand_id_idx" ON "denied_access_logs"("brand_id");

-- CreateIndex
CREATE INDEX "denied_access_logs_requested_at_idx" ON "denied_access_logs"("requested_at");

-- CreateIndex
CREATE INDEX "platform_configs_brand_id_enabled_idx" ON "platform_configs"("brand_id", "enabled");

-- CreateIndex
CREATE UNIQUE INDEX "platform_configs_brand_id_platform_key_key" ON "platform_configs"("brand_id", "platform_key");

-- CreateIndex
CREATE INDEX "browser_connection_sessions_brand_id_idx" ON "browser_connection_sessions"("brand_id");

-- CreateIndex
CREATE INDEX "browser_connection_sessions_platform_code_idx" ON "browser_connection_sessions"("platform_code");

-- CreateIndex
CREATE INDEX "browser_connection_sessions_status_idx" ON "browser_connection_sessions"("status");

-- CreateIndex
CREATE INDEX "browser_connection_sessions_last_available_at_idx" ON "browser_connection_sessions"("last_available_at");

-- CreateIndex
CREATE INDEX "ai_platform_call_audits_brand_id_idx" ON "ai_platform_call_audits"("brand_id");

-- CreateIndex
CREATE INDEX "ai_platform_call_audits_platform_code_idx" ON "ai_platform_call_audits"("platform_code");

-- CreateIndex
CREATE INDEX "ai_platform_call_audits_call_type_idx" ON "ai_platform_call_audits"("call_type");

-- CreateIndex
CREATE INDEX "ai_platform_call_audits_status_idx" ON "ai_platform_call_audits"("status");

-- CreateIndex
CREATE INDEX "ai_platform_call_audits_started_at_idx" ON "ai_platform_call_audits"("started_at");

-- CreateIndex
CREATE INDEX "async_jobs_brand_id_idx" ON "async_jobs"("brand_id");

-- CreateIndex
CREATE INDEX "async_jobs_job_type_idx" ON "async_jobs"("job_type");

-- CreateIndex
CREATE INDEX "async_jobs_status_idx" ON "async_jobs"("status");

-- CreateIndex
CREATE INDEX "async_jobs_entity_id_idx" ON "async_jobs"("entity_id");

-- CreateIndex
CREATE INDEX "async_jobs_next_run_at_idx" ON "async_jobs"("next_run_at");

-- CreateIndex
CREATE INDEX "llm_task_runs_brand_id_idx" ON "llm_task_runs"("brand_id");

-- CreateIndex
CREATE INDEX "llm_task_runs_task_type_idx" ON "llm_task_runs"("task_type");

-- CreateIndex
CREATE INDEX "llm_task_runs_status_idx" ON "llm_task_runs"("status");

-- CreateIndex
CREATE INDEX "llm_task_runs_job_id_idx" ON "llm_task_runs"("job_id");

-- CreateIndex
CREATE INDEX "llm_task_runs_audit_id_idx" ON "llm_task_runs"("audit_id");

-- CreateIndex
CREATE INDEX "monitoring_runs_brand_id_idx" ON "monitoring_runs"("brand_id");

-- CreateIndex
CREATE INDEX "monitoring_runs_prompt_id_platform_code_idx" ON "monitoring_runs"("prompt_id", "platform_code");

-- CreateIndex
CREATE INDEX "monitoring_runs_test_plan_id_idx" ON "monitoring_runs"("test_plan_id");

-- CreateIndex
CREATE INDEX "monitoring_runs_status_idx" ON "monitoring_runs"("status");

-- CreateIndex
CREATE INDEX "monitoring_runs_created_at_idx" ON "monitoring_runs"("created_at");

-- CreateIndex
CREATE INDEX "test_plans_brand_id_idx" ON "test_plans"("brand_id");

-- CreateIndex
CREATE INDEX "test_plans_status_idx" ON "test_plans"("status");

-- CreateIndex
CREATE INDEX "test_plans_created_by_idx" ON "test_plans"("created_by");

-- CreateIndex
CREATE INDEX "test_plans_created_at_idx" ON "test_plans"("created_at");

-- CreateIndex
CREATE INDEX "ai_responses_run_id_idx" ON "ai_responses"("run_id");

-- CreateIndex
CREATE INDEX "ai_responses_brand_id_idx" ON "ai_responses"("brand_id");

-- CreateIndex
CREATE UNIQUE INDEX "analysis_results_response_id_key" ON "analysis_results"("response_id");

-- CreateIndex
CREATE INDEX "analysis_results_brand_id_idx" ON "analysis_results"("brand_id");

-- CreateIndex
CREATE INDEX "analysis_results_run_id_idx" ON "analysis_results"("run_id");

-- CreateIndex
CREATE INDEX "analysis_results_review_required_idx" ON "analysis_results"("review_required");

-- CreateIndex
CREATE INDEX "geo_metric_snapshots_brand_id_period_idx" ON "geo_metric_snapshots"("brand_id", "period");

-- CreateIndex
CREATE INDEX "geo_metric_snapshots_platform_code_idx" ON "geo_metric_snapshots"("platform_code");

-- CreateIndex
CREATE INDEX "geo_metric_snapshots_optimization_unit_id_idx" ON "geo_metric_snapshots"("optimization_unit_id");

-- CreateIndex
CREATE INDEX "geo_metric_snapshots_intent_id_idx" ON "geo_metric_snapshots"("intent_id");

-- CreateIndex
CREATE INDEX "competitors_brand_id_idx" ON "competitors"("brand_id");

-- CreateIndex
CREATE INDEX "competitors_name_idx" ON "competitors"("name");

-- CreateIndex
CREATE INDEX "competitors_confirmation_label_idx" ON "competitors"("confirmation_label");

-- CreateIndex
CREATE INDEX "competitors_source_candidate_id_idx" ON "competitors"("source_candidate_id");

-- CreateIndex
CREATE INDEX "competitor_discovery_runs_brand_id_idx" ON "competitor_discovery_runs"("brand_id");

-- CreateIndex
CREATE INDEX "competitor_discovery_runs_status_idx" ON "competitor_discovery_runs"("status");

-- CreateIndex
CREATE INDEX "competitor_discovery_runs_source_provider_idx" ON "competitor_discovery_runs"("source_provider");

-- CreateIndex
CREATE INDEX "competitor_discovery_runs_provider_status_idx" ON "competitor_discovery_runs"("provider_status");

-- CreateIndex
CREATE INDEX "competitor_discovery_runs_created_at_idx" ON "competitor_discovery_runs"("created_at");

-- CreateIndex
CREATE INDEX "competitor_candidates_brand_id_idx" ON "competitor_candidates"("brand_id");

-- CreateIndex
CREATE INDEX "competitor_candidates_run_id_idx" ON "competitor_candidates"("run_id");

-- CreateIndex
CREATE INDEX "competitor_candidates_source_provider_source_poi_id_idx" ON "competitor_candidates"("source_provider", "source_poi_id");

-- CreateIndex
CREATE INDEX "competitor_candidates_suggested_label_idx" ON "competitor_candidates"("suggested_label");

-- CreateIndex
CREATE INDEX "competitor_candidates_decision_status_idx" ON "competitor_candidates"("decision_status");

-- CreateIndex
CREATE INDEX "citation_sources_brand_id_idx" ON "citation_sources"("brand_id");

-- CreateIndex
CREATE INDEX "citation_sources_response_id_idx" ON "citation_sources"("response_id");

-- CreateIndex
CREATE INDEX "citation_sources_source_type_idx" ON "citation_sources"("source_type");

-- CreateIndex
CREATE INDEX "citation_sources_content_asset_id_idx" ON "citation_sources"("content_asset_id");

-- CreateIndex
CREATE INDEX "content_assets_brand_id_idx" ON "content_assets"("brand_id");

-- CreateIndex
CREATE INDEX "content_assets_status_idx" ON "content_assets"("status");

-- CreateIndex
CREATE INDEX "content_assets_url_idx" ON "content_assets"("url");

-- CreateIndex
CREATE INDEX "content_assets_reuse_of_asset_id_idx" ON "content_assets"("reuse_of_asset_id");

-- CreateIndex
CREATE INDEX "evaluation_issues_brand_id_idx" ON "evaluation_issues"("brand_id");

-- CreateIndex
CREATE INDEX "evaluation_issues_response_id_idx" ON "evaluation_issues"("response_id");

-- CreateIndex
CREATE INDEX "evaluation_issues_issue_type_idx" ON "evaluation_issues"("issue_type");

-- CreateIndex
CREATE INDEX "evaluation_issues_severity_idx" ON "evaluation_issues"("severity");

-- CreateIndex
CREATE INDEX "evaluation_issues_status_idx" ON "evaluation_issues"("status");

-- CreateIndex
CREATE INDEX "content_strategies_brand_id_idx" ON "content_strategies"("brand_id");

-- CreateIndex
CREATE INDEX "content_strategies_optimization_unit_id_idx" ON "content_strategies"("optimization_unit_id");

-- CreateIndex
CREATE INDEX "content_strategies_intent_id_idx" ON "content_strategies"("intent_id");

-- CreateIndex
CREATE INDEX "content_strategies_status_idx" ON "content_strategies"("status");

-- CreateIndex
CREATE INDEX "content_generation_tasks_brand_id_idx" ON "content_generation_tasks"("brand_id");

-- CreateIndex
CREATE INDEX "content_generation_tasks_strategy_id_idx" ON "content_generation_tasks"("strategy_id");

-- CreateIndex
CREATE INDEX "content_generation_tasks_growth_optimization_plan_id_idx" ON "content_generation_tasks"("growth_optimization_plan_id");

-- CreateIndex
CREATE INDEX "content_generation_tasks_status_idx" ON "content_generation_tasks"("status");

-- CreateIndex
CREATE INDEX "growth_optimization_plans_brand_id_idx" ON "growth_optimization_plans"("brand_id");

-- CreateIndex
CREATE INDEX "growth_optimization_plans_source_test_plan_id_idx" ON "growth_optimization_plans"("source_test_plan_id");

-- CreateIndex
CREATE INDEX "growth_optimization_plans_strategy_id_idx" ON "growth_optimization_plans"("strategy_id");

-- CreateIndex
CREATE INDEX "growth_optimization_plans_owner_id_idx" ON "growth_optimization_plans"("owner_id");

-- CreateIndex
CREATE INDEX "growth_optimization_plans_due_date_idx" ON "growth_optimization_plans"("due_date");

-- CreateIndex
CREATE INDEX "growth_optimization_plans_retest_at_idx" ON "growth_optimization_plans"("retest_at");

-- CreateIndex
CREATE INDEX "growth_optimization_plans_status_idx" ON "growth_optimization_plans"("status");

-- CreateIndex
CREATE INDEX "content_versions_brand_id_idx" ON "content_versions"("brand_id");

-- CreateIndex
CREATE INDEX "content_versions_generation_task_id_idx" ON "content_versions"("generation_task_id");

-- CreateIndex
CREATE UNIQUE INDEX "content_versions_generation_task_id_version_key" ON "content_versions"("generation_task_id", "version");

-- CreateIndex
CREATE INDEX "automation_packages_brand_id_idx" ON "automation_packages"("brand_id");

-- CreateIndex
CREATE INDEX "automation_packages_status_idx" ON "automation_packages"("status");

-- CreateIndex
CREATE INDEX "automation_packages_current_step_idx" ON "automation_packages"("current_step");

-- CreateIndex
CREATE INDEX "automation_confirmations_brand_id_idx" ON "automation_confirmations"("brand_id");

-- CreateIndex
CREATE INDEX "automation_confirmations_package_id_idx" ON "automation_confirmations"("package_id");

-- CreateIndex
CREATE INDEX "automation_confirmations_status_idx" ON "automation_confirmations"("status");

-- CreateIndex
CREATE INDEX "platform_rewrite_versions_brand_id_idx" ON "platform_rewrite_versions"("brand_id");

-- CreateIndex
CREATE INDEX "platform_rewrite_versions_content_version_id_idx" ON "platform_rewrite_versions"("content_version_id");

-- CreateIndex
CREATE INDEX "platform_rewrite_versions_target_platform_idx" ON "platform_rewrite_versions"("target_platform");

-- CreateIndex
CREATE INDEX "platform_rewrite_versions_status_idx" ON "platform_rewrite_versions"("status");

-- CreateIndex
CREATE INDEX "test_question_pool_items_brand_id_idx" ON "test_question_pool_items"("brand_id");

-- CreateIndex
CREATE INDEX "test_question_pool_items_candidate_id_idx" ON "test_question_pool_items"("candidate_id");

-- CreateIndex
CREATE INDEX "test_question_pool_items_angle_idx" ON "test_question_pool_items"("angle");

-- CreateIndex
CREATE INDEX "test_question_pool_items_status_idx" ON "test_question_pool_items"("status");

-- CreateIndex
CREATE INDEX "test_question_source_records_brand_id_idx" ON "test_question_source_records"("brand_id");

-- CreateIndex
CREATE INDEX "test_question_source_records_pool_item_id_idx" ON "test_question_source_records"("pool_item_id");

-- CreateIndex
CREATE INDEX "test_question_source_records_source_type_idx" ON "test_question_source_records"("source_type");

-- CreateIndex
CREATE INDEX "content_export_records_brand_id_idx" ON "content_export_records"("brand_id");

-- CreateIndex
CREATE INDEX "content_export_records_generation_task_id_idx" ON "content_export_records"("generation_task_id");

-- CreateIndex
CREATE INDEX "content_export_records_version_id_idx" ON "content_export_records"("version_id");

-- CreateIndex
CREATE INDEX "publishing_accounts_brand_id_idx" ON "publishing_accounts"("brand_id");

-- CreateIndex
CREATE INDEX "publishing_accounts_platform_idx" ON "publishing_accounts"("platform");

-- CreateIndex
CREATE INDEX "publishing_accounts_auth_status_idx" ON "publishing_accounts"("auth_status");

-- CreateIndex
CREATE INDEX "publishing_records_brand_id_idx" ON "publishing_records"("brand_id");

-- CreateIndex
CREATE INDEX "publishing_records_content_asset_id_idx" ON "publishing_records"("content_asset_id");

-- CreateIndex
CREATE INDEX "publishing_records_account_id_idx" ON "publishing_records"("account_id");

-- CreateIndex
CREATE INDEX "publishing_records_status_idx" ON "publishing_records"("status");

-- CreateIndex
CREATE INDEX "optimization_tasks_brand_id_idx" ON "optimization_tasks"("brand_id");

-- CreateIndex
CREATE INDEX "optimization_tasks_optimization_unit_id_idx" ON "optimization_tasks"("optimization_unit_id");

-- CreateIndex
CREATE INDEX "optimization_tasks_related_prompt_id_idx" ON "optimization_tasks"("related_prompt_id");

-- CreateIndex
CREATE INDEX "optimization_tasks_strategy_id_idx" ON "optimization_tasks"("strategy_id");

-- CreateIndex
CREATE INDEX "optimization_tasks_growth_optimization_plan_id_idx" ON "optimization_tasks"("growth_optimization_plan_id");

-- CreateIndex
CREATE INDEX "optimization_tasks_source_run_id_idx" ON "optimization_tasks"("source_run_id");

-- CreateIndex
CREATE INDEX "optimization_tasks_retest_run_id_idx" ON "optimization_tasks"("retest_run_id");

-- CreateIndex
CREATE INDEX "optimization_tasks_status_idx" ON "optimization_tasks"("status");

-- CreateIndex
CREATE INDEX "reports_brand_id_idx" ON "reports"("brand_id");

-- CreateIndex
CREATE INDEX "reports_type_idx" ON "reports"("type");

-- CreateIndex
CREATE INDEX "reports_status_idx" ON "reports"("status");

-- CreateIndex
CREATE INDEX "advisor_records_brand_id_idx" ON "advisor_records"("brand_id");

-- CreateIndex
CREATE INDEX "advisor_records_type_idx" ON "advisor_records"("type");

-- CreateIndex
CREATE INDEX "advisor_records_related_report_id_idx" ON "advisor_records"("related_report_id");

-- CreateIndex
CREATE INDEX "inner_test_feedback_brand_id_idx" ON "inner_test_feedback"("brand_id");

-- CreateIndex
CREATE INDEX "inner_test_feedback_status_idx" ON "inner_test_feedback"("status");

-- CreateIndex
CREATE INDEX "inner_test_feedback_type_idx" ON "inner_test_feedback"("type");

-- AddForeignKey
ALTER TABLE "organization_members" ADD CONSTRAINT "organization_members_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "organization_members" ADD CONSTRAINT "organization_members_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "organization_members" ADD CONSTRAINT "organization_members_role_id_fkey" FOREIGN KEY ("role_id") REFERENCES "roles"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "optimization_units" ADD CONSTRAINT "optimization_units_brand_id_fkey" FOREIGN KEY ("brand_id") REFERENCES "brands"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "test_themes" ADD CONSTRAINT "test_themes_brand_id_fkey" FOREIGN KEY ("brand_id") REFERENCES "brands"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "test_themes" ADD CONSTRAINT "test_themes_optimization_unit_id_fkey" FOREIGN KEY ("optimization_unit_id") REFERENCES "optimization_units"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "user_intents" ADD CONSTRAINT "user_intents_brand_id_fkey" FOREIGN KEY ("brand_id") REFERENCES "brands"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "user_intents" ADD CONSTRAINT "user_intents_optimization_unit_id_fkey" FOREIGN KEY ("optimization_unit_id") REFERENCES "optimization_units"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "brand_prompts" ADD CONSTRAINT "brand_prompts_brand_id_fkey" FOREIGN KEY ("brand_id") REFERENCES "brands"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "brand_prompts" ADD CONSTRAINT "brand_prompts_optimization_unit_id_fkey" FOREIGN KEY ("optimization_unit_id") REFERENCES "optimization_units"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "brand_prompts" ADD CONSTRAINT "brand_prompts_intent_id_fkey" FOREIGN KEY ("intent_id") REFERENCES "user_intents"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "brand_prompts" ADD CONSTRAINT "brand_prompts_template_id_fkey" FOREIGN KEY ("template_id") REFERENCES "prompt_templates"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "test_question_candidates" ADD CONSTRAINT "test_question_candidates_brand_id_fkey" FOREIGN KEY ("brand_id") REFERENCES "brands"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "test_question_candidates" ADD CONSTRAINT "test_question_candidates_theme_id_fkey" FOREIGN KEY ("theme_id") REFERENCES "test_themes"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "test_question_candidates" ADD CONSTRAINT "test_question_candidates_prompt_id_fkey" FOREIGN KEY ("prompt_id") REFERENCES "brand_prompts"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "knowledge_sources" ADD CONSTRAINT "knowledge_sources_brand_id_fkey" FOREIGN KEY ("brand_id") REFERENCES "brands"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "brand_profiles" ADD CONSTRAINT "brand_profiles_brand_id_fkey" FOREIGN KEY ("brand_id") REFERENCES "brands"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "audit_logs" ADD CONSTRAINT "audit_logs_brand_id_fkey" FOREIGN KEY ("brand_id") REFERENCES "brands"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "audit_logs" ADD CONSTRAINT "audit_logs_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "audit_logs" ADD CONSTRAINT "audit_logs_actor_user_id_fkey" FOREIGN KEY ("actor_user_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "user_brand_permissions" ADD CONSTRAINT "user_brand_permissions_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "user_brand_permissions" ADD CONSTRAINT "user_brand_permissions_brand_id_fkey" FOREIGN KEY ("brand_id") REFERENCES "brands"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "platform_configs" ADD CONSTRAINT "platform_configs_brand_id_fkey" FOREIGN KEY ("brand_id") REFERENCES "brands"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "browser_connection_sessions" ADD CONSTRAINT "browser_connection_sessions_brand_id_fkey" FOREIGN KEY ("brand_id") REFERENCES "brands"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ai_platform_call_audits" ADD CONSTRAINT "ai_platform_call_audits_brand_id_fkey" FOREIGN KEY ("brand_id") REFERENCES "brands"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "async_jobs" ADD CONSTRAINT "async_jobs_brand_id_fkey" FOREIGN KEY ("brand_id") REFERENCES "brands"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "llm_task_runs" ADD CONSTRAINT "llm_task_runs_brand_id_fkey" FOREIGN KEY ("brand_id") REFERENCES "brands"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "monitoring_runs" ADD CONSTRAINT "monitoring_runs_brand_id_fkey" FOREIGN KEY ("brand_id") REFERENCES "brands"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "monitoring_runs" ADD CONSTRAINT "monitoring_runs_prompt_id_fkey" FOREIGN KEY ("prompt_id") REFERENCES "brand_prompts"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "monitoring_runs" ADD CONSTRAINT "monitoring_runs_test_plan_id_fkey" FOREIGN KEY ("test_plan_id") REFERENCES "test_plans"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "test_plans" ADD CONSTRAINT "test_plans_brand_id_fkey" FOREIGN KEY ("brand_id") REFERENCES "brands"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ai_responses" ADD CONSTRAINT "ai_responses_run_id_fkey" FOREIGN KEY ("run_id") REFERENCES "monitoring_runs"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "analysis_results" ADD CONSTRAINT "analysis_results_response_id_fkey" FOREIGN KEY ("response_id") REFERENCES "ai_responses"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "geo_metric_snapshots" ADD CONSTRAINT "geo_metric_snapshots_brand_id_fkey" FOREIGN KEY ("brand_id") REFERENCES "brands"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "competitors" ADD CONSTRAINT "competitors_brand_id_fkey" FOREIGN KEY ("brand_id") REFERENCES "brands"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "competitor_discovery_runs" ADD CONSTRAINT "competitor_discovery_runs_brand_id_fkey" FOREIGN KEY ("brand_id") REFERENCES "brands"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "competitor_candidates" ADD CONSTRAINT "competitor_candidates_brand_id_fkey" FOREIGN KEY ("brand_id") REFERENCES "brands"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "competitor_candidates" ADD CONSTRAINT "competitor_candidates_run_id_fkey" FOREIGN KEY ("run_id") REFERENCES "competitor_discovery_runs"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "citation_sources" ADD CONSTRAINT "citation_sources_brand_id_fkey" FOREIGN KEY ("brand_id") REFERENCES "brands"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "citation_sources" ADD CONSTRAINT "citation_sources_response_id_fkey" FOREIGN KEY ("response_id") REFERENCES "ai_responses"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "citation_sources" ADD CONSTRAINT "citation_sources_content_asset_id_fkey" FOREIGN KEY ("content_asset_id") REFERENCES "content_assets"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "content_assets" ADD CONSTRAINT "content_assets_brand_id_fkey" FOREIGN KEY ("brand_id") REFERENCES "brands"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "content_assets" ADD CONSTRAINT "content_assets_reuse_of_asset_id_fkey" FOREIGN KEY ("reuse_of_asset_id") REFERENCES "content_assets"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "evaluation_issues" ADD CONSTRAINT "evaluation_issues_brand_id_fkey" FOREIGN KEY ("brand_id") REFERENCES "brands"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "evaluation_issues" ADD CONSTRAINT "evaluation_issues_response_id_fkey" FOREIGN KEY ("response_id") REFERENCES "ai_responses"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "content_strategies" ADD CONSTRAINT "content_strategies_brand_id_fkey" FOREIGN KEY ("brand_id") REFERENCES "brands"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "content_strategies" ADD CONSTRAINT "content_strategies_optimization_unit_id_fkey" FOREIGN KEY ("optimization_unit_id") REFERENCES "optimization_units"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "content_strategies" ADD CONSTRAINT "content_strategies_intent_id_fkey" FOREIGN KEY ("intent_id") REFERENCES "user_intents"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "content_generation_tasks" ADD CONSTRAINT "content_generation_tasks_brand_id_fkey" FOREIGN KEY ("brand_id") REFERENCES "brands"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "content_generation_tasks" ADD CONSTRAINT "content_generation_tasks_strategy_id_fkey" FOREIGN KEY ("strategy_id") REFERENCES "content_strategies"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "content_generation_tasks" ADD CONSTRAINT "content_generation_tasks_growth_optimization_plan_id_fkey" FOREIGN KEY ("growth_optimization_plan_id") REFERENCES "growth_optimization_plans"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "growth_optimization_plans" ADD CONSTRAINT "growth_optimization_plans_brand_id_fkey" FOREIGN KEY ("brand_id") REFERENCES "brands"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "growth_optimization_plans" ADD CONSTRAINT "growth_optimization_plans_source_test_plan_id_fkey" FOREIGN KEY ("source_test_plan_id") REFERENCES "test_plans"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "growth_optimization_plans" ADD CONSTRAINT "growth_optimization_plans_strategy_id_fkey" FOREIGN KEY ("strategy_id") REFERENCES "content_strategies"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "content_versions" ADD CONSTRAINT "content_versions_brand_id_fkey" FOREIGN KEY ("brand_id") REFERENCES "brands"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "content_versions" ADD CONSTRAINT "content_versions_generation_task_id_fkey" FOREIGN KEY ("generation_task_id") REFERENCES "content_generation_tasks"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "automation_packages" ADD CONSTRAINT "automation_packages_brand_id_fkey" FOREIGN KEY ("brand_id") REFERENCES "brands"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "automation_confirmations" ADD CONSTRAINT "automation_confirmations_brand_id_fkey" FOREIGN KEY ("brand_id") REFERENCES "brands"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "automation_confirmations" ADD CONSTRAINT "automation_confirmations_package_id_fkey" FOREIGN KEY ("package_id") REFERENCES "automation_packages"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "platform_rewrite_versions" ADD CONSTRAINT "platform_rewrite_versions_brand_id_fkey" FOREIGN KEY ("brand_id") REFERENCES "brands"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "platform_rewrite_versions" ADD CONSTRAINT "platform_rewrite_versions_content_version_id_fkey" FOREIGN KEY ("content_version_id") REFERENCES "content_versions"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "test_question_pool_items" ADD CONSTRAINT "test_question_pool_items_brand_id_fkey" FOREIGN KEY ("brand_id") REFERENCES "brands"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "test_question_pool_items" ADD CONSTRAINT "test_question_pool_items_candidate_id_fkey" FOREIGN KEY ("candidate_id") REFERENCES "test_question_candidates"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "test_question_source_records" ADD CONSTRAINT "test_question_source_records_brand_id_fkey" FOREIGN KEY ("brand_id") REFERENCES "brands"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "test_question_source_records" ADD CONSTRAINT "test_question_source_records_pool_item_id_fkey" FOREIGN KEY ("pool_item_id") REFERENCES "test_question_pool_items"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "content_export_records" ADD CONSTRAINT "content_export_records_brand_id_fkey" FOREIGN KEY ("brand_id") REFERENCES "brands"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "content_export_records" ADD CONSTRAINT "content_export_records_generation_task_id_fkey" FOREIGN KEY ("generation_task_id") REFERENCES "content_generation_tasks"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "content_export_records" ADD CONSTRAINT "content_export_records_version_id_fkey" FOREIGN KEY ("version_id") REFERENCES "content_versions"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "publishing_accounts" ADD CONSTRAINT "publishing_accounts_brand_id_fkey" FOREIGN KEY ("brand_id") REFERENCES "brands"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "publishing_records" ADD CONSTRAINT "publishing_records_brand_id_fkey" FOREIGN KEY ("brand_id") REFERENCES "brands"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "publishing_records" ADD CONSTRAINT "publishing_records_content_asset_id_fkey" FOREIGN KEY ("content_asset_id") REFERENCES "content_assets"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "publishing_records" ADD CONSTRAINT "publishing_records_account_id_fkey" FOREIGN KEY ("account_id") REFERENCES "publishing_accounts"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "publishing_records" ADD CONSTRAINT "publishing_records_generation_task_id_fkey" FOREIGN KEY ("generation_task_id") REFERENCES "content_generation_tasks"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "publishing_records" ADD CONSTRAINT "publishing_records_version_id_fkey" FOREIGN KEY ("version_id") REFERENCES "content_versions"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "optimization_tasks" ADD CONSTRAINT "optimization_tasks_brand_id_fkey" FOREIGN KEY ("brand_id") REFERENCES "brands"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "optimization_tasks" ADD CONSTRAINT "optimization_tasks_optimization_unit_id_fkey" FOREIGN KEY ("optimization_unit_id") REFERENCES "optimization_units"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "optimization_tasks" ADD CONSTRAINT "optimization_tasks_related_prompt_id_fkey" FOREIGN KEY ("related_prompt_id") REFERENCES "brand_prompts"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "optimization_tasks" ADD CONSTRAINT "optimization_tasks_strategy_id_fkey" FOREIGN KEY ("strategy_id") REFERENCES "content_strategies"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "optimization_tasks" ADD CONSTRAINT "optimization_tasks_growth_optimization_plan_id_fkey" FOREIGN KEY ("growth_optimization_plan_id") REFERENCES "growth_optimization_plans"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "reports" ADD CONSTRAINT "reports_brand_id_fkey" FOREIGN KEY ("brand_id") REFERENCES "brands"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "advisor_records" ADD CONSTRAINT "advisor_records_brand_id_fkey" FOREIGN KEY ("brand_id") REFERENCES "brands"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "inner_test_feedback" ADD CONSTRAINT "inner_test_feedback_brand_id_fkey" FOREIGN KEY ("brand_id") REFERENCES "brands"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
