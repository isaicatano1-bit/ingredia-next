CREATE TABLE "public"."rate_limit_buckets" (
  "bucket_key" TEXT NOT NULL,
  "window_started_at" TIMESTAMPTZ NOT NULL,
  "hits" INTEGER NOT NULL,
  CONSTRAINT "rate_limit_buckets_pkey" PRIMARY KEY ("bucket_key"),
  CONSTRAINT "rate_limit_buckets_hits_check" CHECK ("hits" > 0)
);
CREATE INDEX "rate_limit_buckets_window_started_at_idx"
  ON "public"."rate_limit_buckets"("window_started_at");
