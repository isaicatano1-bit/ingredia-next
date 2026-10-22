CREATE TABLE "public"."users" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "email" TEXT NOT NULL,
  "password_hash" TEXT NOT NULL,
  "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "users_email_key" ON "public"."users"("email");

CREATE TABLE "public"."tenants" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "name" TEXT NOT NULL,
  "schema_name" TEXT NOT NULL,
  "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "tenants_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "tenants_schema_name_key" ON "public"."tenants"("schema_name");

CREATE TABLE "public"."memberships" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "user_id" UUID NOT NULL,
  "tenant_id" UUID NOT NULL,
  "role" TEXT NOT NULL,
  "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "memberships_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "memberships_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "memberships_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE
);
CREATE UNIQUE INDEX "memberships_user_id_tenant_id_key" ON "public"."memberships"("user_id", "tenant_id");

CREATE TABLE "public"."idempotency_records" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "tenant_id" UUID NOT NULL,
  "operation" TEXT NOT NULL,
  "key" TEXT NOT NULL,
  "request_hash" TEXT NOT NULL,
  "response_status" INTEGER,
  "response_body" JSONB,
  "expires_at" TIMESTAMPTZ NOT NULL,
  "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "idempotency_records_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "idempotency_records_scope_key" ON "public"."idempotency_records"("tenant_id", "operation", "key");
CREATE INDEX "idempotency_records_expires_at_idx" ON "public"."idempotency_records"("expires_at");
