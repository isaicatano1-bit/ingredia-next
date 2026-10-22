-- Reconciliation of the shared schema. 0001_global remains unchanged.
-- Invalid existing roles or tenant schema names intentionally stop this migration.
CREATE TYPE "public"."MembershipRole" AS ENUM ('OWNER', 'ADMIN', 'MEMBER');

ALTER TABLE "public"."users"
  ADD COLUMN "updated_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP;

ALTER TABLE "public"."tenants"
  ADD CONSTRAINT "tenants_schema_name_format_check"
  CHECK ("schema_name" ~ '^tenant_[0-9a-f]{32}$');

ALTER TABLE "public"."memberships"
  ALTER COLUMN "role" TYPE "public"."MembershipRole"
  USING "role"::"public"."MembershipRole";

CREATE INDEX "memberships_tenant_id_idx" ON "public"."memberships"("tenant_id");

ALTER TABLE "public"."idempotency_records"
  ADD CONSTRAINT "idempotency_records_tenant_id_fkey"
    FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id")
    ON DELETE RESTRICT ON UPDATE CASCADE,
  ADD CONSTRAINT "idempotency_records_operation_nonempty_check"
    CHECK (length(btrim("operation")) > 0),
  ADD CONSTRAINT "idempotency_records_key_nonempty_check"
    CHECK (length(btrim("key")) > 0),
  ADD CONSTRAINT "idempotency_records_request_hash_nonempty_check"
    CHECK (length(btrim("request_hash")) > 0),
  ADD CONSTRAINT "idempotency_records_response_status_check"
    CHECK ("response_status" IS NULL OR "response_status" BETWEEN 100 AND 599);

CREATE INDEX "idempotency_records_tenant_id_idx"
  ON "public"."idempotency_records"("tenant_id");

-- Global operations such as tenant creation use a separate non-null scope.
CREATE TABLE "public"."tenant_provisioning_requests" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "owner_user_id" UUID NOT NULL,
  "key" TEXT NOT NULL,
  "request_hash" TEXT NOT NULL,
  "tenant_id" UUID NOT NULL,
  "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "tenant_provisioning_requests_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "tenant_provisioning_requests_owner_user_id_fkey"
    FOREIGN KEY ("owner_user_id") REFERENCES "public"."users"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "tenant_provisioning_requests_tenant_id_fkey"
    FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT "tenant_provisioning_requests_key_nonempty_check" CHECK (length(btrim("key")) BETWEEN 1 AND 200),
  CONSTRAINT "tenant_provisioning_requests_request_hash_check" CHECK ("request_hash" ~ '^[0-9a-f]{64}$')
);
CREATE UNIQUE INDEX "tenant_provisioning_requests_owner_key"
  ON "public"."tenant_provisioning_requests"("owner_user_id", "key");
CREATE UNIQUE INDEX "tenant_provisioning_requests_tenant_id_key"
  ON "public"."tenant_provisioning_requests"("tenant_id");
