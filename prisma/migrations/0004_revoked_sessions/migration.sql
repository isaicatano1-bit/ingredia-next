CREATE TABLE "public"."revoked_sessions" (
  "token_id" TEXT NOT NULL,
  "user_id" UUID NOT NULL,
  "expires_at" TIMESTAMPTZ NOT NULL,
  "revoked_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "revoked_sessions_pkey" PRIMARY KEY ("token_id"),
  CONSTRAINT "revoked_sessions_user_id_fkey" FOREIGN KEY ("user_id")
    REFERENCES "public"."users"("id") ON DELETE CASCADE ON UPDATE CASCADE
);
CREATE INDEX "revoked_sessions_expires_at_idx" ON "public"."revoked_sessions"("expires_at");
CREATE INDEX "revoked_sessions_user_id_idx" ON "public"."revoked_sessions"("user_id");
