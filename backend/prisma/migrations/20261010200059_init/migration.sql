-- CreateExtension
CREATE EXTENSION IF NOT EXISTS "citext";

-- CreateEnum
CREATE TYPE "handover_category_enum" AS ENUM ('Note', 'Task', 'Monitoring');

-- CreateEnum
CREATE TYPE "routine_status_enum" AS ENUM ('Open', 'Closed', 'ReOpen', 'Pending');

-- CreateEnum
CREATE TYPE "monitoring_result_enum" AS ENUM ('OK', 'NOK');

-- CreateEnum
CREATE TYPE "ticket_status_enum" AS ENUM ('Open', 'Closed', 'Activity', 'Meeting', 'Pending', 'ReOpen');

-- CreateTable
CREATE TABLE "users" (
    "id" BIGSERIAL NOT NULL,
    "name" VARCHAR(255) NOT NULL,
    "nik" VARCHAR(255),
    "email" CITEXT NOT NULL,
    "role_id" BIGINT,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "password" VARCHAR(100),
    "photo_url" VARCHAR(500),
    "department" VARCHAR(255),
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "user_role" (
    "id" BIGSERIAL NOT NULL,
    "name" CITEXT NOT NULL,
    "description" VARCHAR(500),
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "user_role_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "permissions" (
    "key" VARCHAR(100) NOT NULL,
    "description" TEXT,
    "obsolete_at" TIMESTAMPTZ(6),
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "permissions_pkey" PRIMARY KEY ("key")
);

-- CreateTable
CREATE TABLE "role_permissions" (
    "role_id" BIGINT NOT NULL,
    "permission_key" VARCHAR(100) NOT NULL,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "role_permissions_pkey" PRIMARY KEY ("role_id","permission_key")
);

-- CreateTable
CREATE TABLE "tenants" (
    "id" BIGSERIAL NOT NULL,
    "name" VARCHAR(255) NOT NULL,
    "detail_info" TEXT,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "tenants_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "projects" (
    "id" BIGSERIAL NOT NULL,
    "name" VARCHAR(255) NOT NULL,
    "tenant_id" BIGINT NOT NULL,
    "code_prefix" VARCHAR(100),
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "projects_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "clients" (
    "id" BIGSERIAL NOT NULL,
    "name" VARCHAR(255) NOT NULL,
    "detail_info" TEXT,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "clients_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ticket_logs" (
    "id" BIGSERIAL NOT NULL,
    "third_party_ticket_id" VARCHAR(100),
    "project_id" BIGINT NOT NULL,
    "client_id" BIGINT,
    "tenant_id" BIGINT,
    "user_id" BIGINT,
    "severity_id" BIGINT,
    "category_id" BIGINT,
    "requester" VARCHAR(100),
    "subject" VARCHAR(500) NOT NULL,
    "description" TEXT,
    "status" "ticket_status_enum" NOT NULL DEFAULT 'Open',
    "open_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "closed_at" TIMESTAMPTZ(6),
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ticket_logs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ticket_categories" (
    "id" BIGSERIAL NOT NULL,
    "name" CITEXT NOT NULL,
    "description" TEXT,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ticket_categories_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ticket_severities" (
    "id" BIGSERIAL NOT NULL,
    "code_name" CITEXT NOT NULL,
    "name" VARCHAR(100) NOT NULL,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ticket_severities_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "handover" (
    "id" BIGSERIAL NOT NULL,
    "updated_user_id" BIGINT,
    "acknowledge_user_id" BIGINT,
    "project_id" BIGINT,
    "content" TEXT,
    "status" "routine_status_enum" DEFAULT 'Open',
    "category" "handover_category_enum",
    "is_repeatable" BOOLEAN NOT NULL DEFAULT false,
    "monitoring_check_id" BIGINT,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "handover_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "routine_meetings" (
    "id" BIGSERIAL NOT NULL,
    "project_id" BIGINT,
    "pic_user_id" BIGINT,
    "meeting_name" VARCHAR(255),
    "start_at" TIMESTAMPTZ(6),
    "target_completed_at" TIMESTAMPTZ(6),
    "status_update" VARCHAR(500),
    "meeting_room_url" TEXT,
    "status" "routine_status_enum" DEFAULT 'Open',
    "is_temporary" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "routine_meetings_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "routine_reports" (
    "id" BIGSERIAL NOT NULL,
    "project_id" BIGINT,
    "pic_user_id" BIGINT,
    "report_name" VARCHAR(255),
    "start_at" TIMESTAMPTZ(6),
    "target_completed_at" TIMESTAMPTZ(6),
    "status_update" VARCHAR(500),
    "doc_url" TEXT,
    "status" "routine_status_enum" DEFAULT 'Open',
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "routine_reports_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "monitoring_checkpoints" (
    "id" BIGSERIAL NOT NULL,
    "project_id" BIGINT NOT NULL,
    "name" VARCHAR(255) NOT NULL,
    "instructions" TEXT,
    "times" TEXT[],
    "timezone" VARCHAR(64) NOT NULL DEFAULT 'Asia/Jakarta',
    "is_temporary" BOOLEAN NOT NULL DEFAULT false,
    "active_from" DATE,
    "active_until" DATE,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "client_id" BIGINT,
    "created_by" BIGINT,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "monitoring_checkpoints_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "monitoring_checks" (
    "id" BIGSERIAL NOT NULL,
    "checkpoint_id" BIGINT NOT NULL,
    "scheduled_at" TIMESTAMPTZ(6) NOT NULL,
    "checked_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "checked_by" BIGINT NOT NULL,
    "result" "monitoring_result_enum" NOT NULL,
    "note" TEXT,
    "evidence_url" TEXT,
    "ticket_id" BIGINT,
    "reviewed_by" BIGINT,
    "reviewed_at" TIMESTAMPTZ(6),
    "review_note" TEXT,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "monitoring_checks_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "users_nik_key" ON "users"("nik");

-- CreateIndex
CREATE UNIQUE INDEX "users_email_key" ON "users"("email");

-- CreateIndex
CREATE INDEX "users_role_id_idx" ON "users"("role_id");

-- CreateIndex
CREATE UNIQUE INDEX "user_role_name_key" ON "user_role"("name");

-- CreateIndex
CREATE INDEX "role_permissions_permission_key_idx" ON "role_permissions"("permission_key");

-- CreateIndex
CREATE INDEX "projects_tenant_id_idx" ON "projects"("tenant_id");

-- CreateIndex
CREATE INDEX "ticket_logs_open_at_idx" ON "ticket_logs"("open_at" DESC);

-- CreateIndex
CREATE INDEX "ticket_logs_status_idx" ON "ticket_logs"("status");

-- CreateIndex
CREATE INDEX "ticket_logs_project_id_open_at_idx" ON "ticket_logs"("project_id", "open_at" DESC);

-- CreateIndex
CREATE INDEX "ticket_logs_user_id_idx" ON "ticket_logs"("user_id");

-- CreateIndex
CREATE INDEX "ticket_logs_tenant_id_idx" ON "ticket_logs"("tenant_id");

-- CreateIndex
CREATE INDEX "ticket_logs_client_id_idx" ON "ticket_logs"("client_id");

-- CreateIndex
CREATE INDEX "ticket_logs_severity_id_idx" ON "ticket_logs"("severity_id");

-- CreateIndex
CREATE INDEX "ticket_logs_category_id_idx" ON "ticket_logs"("category_id");

-- CreateIndex
CREATE UNIQUE INDEX "ticket_categories_name_key" ON "ticket_categories"("name");

-- CreateIndex
CREATE UNIQUE INDEX "ticket_severities_code_name_key" ON "ticket_severities"("code_name");

-- CreateIndex
CREATE INDEX "handover_project_id_idx" ON "handover"("project_id");

-- CreateIndex
CREATE INDEX "handover_updated_user_id_idx" ON "handover"("updated_user_id");

-- CreateIndex
CREATE INDEX "handover_acknowledge_user_id_idx" ON "handover"("acknowledge_user_id");

-- CreateIndex
CREATE INDEX "handover_monitoring_check_id_idx" ON "handover"("monitoring_check_id");

-- CreateIndex
CREATE INDEX "routine_meetings_project_id_idx" ON "routine_meetings"("project_id");

-- CreateIndex
CREATE INDEX "routine_meetings_pic_user_id_idx" ON "routine_meetings"("pic_user_id");

-- CreateIndex
CREATE INDEX "routine_reports_project_id_idx" ON "routine_reports"("project_id");

-- CreateIndex
CREATE INDEX "routine_reports_pic_user_id_idx" ON "routine_reports"("pic_user_id");

-- CreateIndex
CREATE INDEX "monitoring_checkpoints_project_id_idx" ON "monitoring_checkpoints"("project_id");

-- CreateIndex
CREATE INDEX "monitoring_checkpoints_is_active_idx" ON "monitoring_checkpoints"("is_active");

-- CreateIndex
CREATE INDEX "monitoring_checkpoints_client_id_idx" ON "monitoring_checkpoints"("client_id");

-- CreateIndex
CREATE INDEX "monitoring_checkpoints_created_by_idx" ON "monitoring_checkpoints"("created_by");

-- CreateIndex
CREATE INDEX "monitoring_checks_scheduled_at_idx" ON "monitoring_checks"("scheduled_at");

-- CreateIndex
CREATE INDEX "monitoring_checks_checked_by_idx" ON "monitoring_checks"("checked_by");

-- CreateIndex
CREATE INDEX "monitoring_checks_reviewed_by_idx" ON "monitoring_checks"("reviewed_by");

-- CreateIndex
CREATE INDEX "monitoring_checks_result_idx" ON "monitoring_checks"("result");

-- CreateIndex
CREATE INDEX "monitoring_checks_ticket_id_idx" ON "monitoring_checks"("ticket_id");

-- CreateIndex
CREATE UNIQUE INDEX "monitoring_checks_checkpoint_id_scheduled_at_key" ON "monitoring_checks"("checkpoint_id", "scheduled_at");

-- AddForeignKey
ALTER TABLE "users" ADD CONSTRAINT "users_role_id_fkey" FOREIGN KEY ("role_id") REFERENCES "user_role"("id") ON DELETE SET NULL ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "role_permissions" ADD CONSTRAINT "role_permissions_role_id_fkey" FOREIGN KEY ("role_id") REFERENCES "user_role"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "role_permissions" ADD CONSTRAINT "role_permissions_permission_key_fkey" FOREIGN KEY ("permission_key") REFERENCES "permissions"("key") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "projects" ADD CONSTRAINT "projects_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "ticket_logs" ADD CONSTRAINT "ticket_logs_project_id_fkey" FOREIGN KEY ("project_id") REFERENCES "projects"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "ticket_logs" ADD CONSTRAINT "ticket_logs_client_id_fkey" FOREIGN KEY ("client_id") REFERENCES "clients"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "ticket_logs" ADD CONSTRAINT "ticket_logs_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "ticket_logs" ADD CONSTRAINT "ticket_logs_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "ticket_logs" ADD CONSTRAINT "ticket_logs_severity_id_fkey" FOREIGN KEY ("severity_id") REFERENCES "ticket_severities"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "ticket_logs" ADD CONSTRAINT "ticket_logs_category_id_fkey" FOREIGN KEY ("category_id") REFERENCES "ticket_categories"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "handover" ADD CONSTRAINT "handover_updated_user_id_fkey" FOREIGN KEY ("updated_user_id") REFERENCES "users"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "handover" ADD CONSTRAINT "handover_acknowledge_user_id_fkey" FOREIGN KEY ("acknowledge_user_id") REFERENCES "users"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "handover" ADD CONSTRAINT "handover_project_id_fkey" FOREIGN KEY ("project_id") REFERENCES "projects"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "handover" ADD CONSTRAINT "handover_monitoring_check_id_fkey" FOREIGN KEY ("monitoring_check_id") REFERENCES "monitoring_checks"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "routine_meetings" ADD CONSTRAINT "routine_meetings_pic_user_id_fkey" FOREIGN KEY ("pic_user_id") REFERENCES "users"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "routine_meetings" ADD CONSTRAINT "routine_meetings_project_id_fkey" FOREIGN KEY ("project_id") REFERENCES "projects"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "routine_reports" ADD CONSTRAINT "routine_reports_pic_user_id_fkey" FOREIGN KEY ("pic_user_id") REFERENCES "users"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "routine_reports" ADD CONSTRAINT "routine_reports_project_id_fkey" FOREIGN KEY ("project_id") REFERENCES "projects"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "monitoring_checkpoints" ADD CONSTRAINT "monitoring_checkpoints_project_id_fkey" FOREIGN KEY ("project_id") REFERENCES "projects"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "monitoring_checkpoints" ADD CONSTRAINT "monitoring_checkpoints_client_id_fkey" FOREIGN KEY ("client_id") REFERENCES "clients"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "monitoring_checkpoints" ADD CONSTRAINT "monitoring_checkpoints_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "users"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "monitoring_checks" ADD CONSTRAINT "monitoring_checks_checkpoint_id_fkey" FOREIGN KEY ("checkpoint_id") REFERENCES "monitoring_checkpoints"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "monitoring_checks" ADD CONSTRAINT "monitoring_checks_checked_by_fkey" FOREIGN KEY ("checked_by") REFERENCES "users"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "monitoring_checks" ADD CONSTRAINT "monitoring_checks_reviewed_by_fkey" FOREIGN KEY ("reviewed_by") REFERENCES "users"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "monitoring_checks" ADD CONSTRAINT "monitoring_checks_ticket_id_fkey" FOREIGN KEY ("ticket_id") REFERENCES "ticket_logs"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;
