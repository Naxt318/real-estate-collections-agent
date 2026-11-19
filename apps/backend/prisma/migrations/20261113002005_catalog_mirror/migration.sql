-- CreateEnum
CREATE TYPE "CrmSource" AS ENUM ('DEMO', 'SALESFORCE');

-- CreateTable
CREATE TABLE "projects" (
    "id" UUID NOT NULL,
    "tenant_id" UUID NOT NULL,
    "source" "CrmSource" NOT NULL,
    "external_id" TEXT NOT NULL,
    "last_synced_at" TIMESTAMPTZ(3) NOT NULL,
    "raw_payload" JSONB,
    "name" TEXT NOT NULL,
    "city" TEXT,
    "state" TEXT,
    "rera_registration_no" TEXT,
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "projects_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "towers" (
    "id" UUID NOT NULL,
    "tenant_id" UUID NOT NULL,
    "source" "CrmSource" NOT NULL,
    "external_id" TEXT NOT NULL,
    "last_synced_at" TIMESTAMPTZ(3) NOT NULL,
    "raw_payload" JSONB,
    "project_id" UUID NOT NULL,
    "name" TEXT NOT NULL,
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "towers_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "units" (
    "id" UUID NOT NULL,
    "tenant_id" UUID NOT NULL,
    "source" "CrmSource" NOT NULL,
    "external_id" TEXT NOT NULL,
    "last_synced_at" TIMESTAMPTZ(3) NOT NULL,
    "raw_payload" JSONB,
    "project_id" UUID NOT NULL,
    "tower_id" UUID,
    "unit_number" TEXT NOT NULL,
    "floor" INTEGER,
    "carpet_area_sqft" DECIMAL(10,2),
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "units_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "projects_tenant_id_source_external_id_key" ON "projects"("tenant_id", "source", "external_id");

-- CreateIndex
CREATE UNIQUE INDEX "projects_tenant_id_id_key" ON "projects"("tenant_id", "id");

-- CreateIndex
CREATE INDEX "towers_tenant_id_project_id_idx" ON "towers"("tenant_id", "project_id");

-- CreateIndex
CREATE UNIQUE INDEX "towers_tenant_id_source_external_id_key" ON "towers"("tenant_id", "source", "external_id");

-- CreateIndex
CREATE UNIQUE INDEX "towers_tenant_id_id_key" ON "towers"("tenant_id", "id");

-- CreateIndex
CREATE INDEX "units_tenant_id_project_id_idx" ON "units"("tenant_id", "project_id");

-- CreateIndex
CREATE INDEX "units_tenant_id_tower_id_idx" ON "units"("tenant_id", "tower_id");

-- CreateIndex
CREATE UNIQUE INDEX "units_tenant_id_source_external_id_key" ON "units"("tenant_id", "source", "external_id");

-- CreateIndex
CREATE UNIQUE INDEX "units_tenant_id_id_key" ON "units"("tenant_id", "id");

-- AddForeignKey
ALTER TABLE "projects" ADD CONSTRAINT "projects_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "towers" ADD CONSTRAINT "towers_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "towers" ADD CONSTRAINT "towers_tenant_id_project_id_fkey" FOREIGN KEY ("tenant_id", "project_id") REFERENCES "projects"("tenant_id", "id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "units" ADD CONSTRAINT "units_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "units" ADD CONSTRAINT "units_tenant_id_project_id_fkey" FOREIGN KEY ("tenant_id", "project_id") REFERENCES "projects"("tenant_id", "id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "units" ADD CONSTRAINT "units_tenant_id_tower_id_fkey" FOREIGN KEY ("tenant_id", "tower_id") REFERENCES "towers"("tenant_id", "id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- Tenant isolation, same predicate as the enable_rls migration.

ALTER TABLE "projects" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "projects" FORCE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation ON "projects"
  USING ("tenant_id" = NULLIF(current_setting('app.tenant_id', true), '')::uuid)
  WITH CHECK ("tenant_id" = NULLIF(current_setting('app.tenant_id', true), '')::uuid);

ALTER TABLE "towers" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "towers" FORCE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation ON "towers"
  USING ("tenant_id" = NULLIF(current_setting('app.tenant_id', true), '')::uuid)
  WITH CHECK ("tenant_id" = NULLIF(current_setting('app.tenant_id', true), '')::uuid);

ALTER TABLE "units" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "units" FORCE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation ON "units"
  USING ("tenant_id" = NULLIF(current_setting('app.tenant_id', true), '')::uuid)
  WITH CHECK ("tenant_id" = NULLIF(current_setting('app.tenant_id', true), '')::uuid);
