import "server-only";
import { createHash } from "node:crypto";
import { Pool } from "pg";
import { env } from "@/server/config/env";
import { AppError } from "@/server/api/errors/app-error";

let pool: Pool | undefined;

/** Shared fixed-window limiter stored in PostgreSQL, safe across app instances. */
export async function enforceRateLimit(scope: string, identity: string, limit: number, windowSeconds = 60): Promise<void> {
  if (!env.DATABASE_URL) {
    if (env.NODE_ENV === "production") throw new AppError("Rate limiting is unavailable.", 503, "RATE_LIMIT_UNAVAILABLE");
    return;
  }
  pool ??= new Pool({ connectionString: env.DATABASE_URL, max: 3 });
  const bucketKey = createHash("sha256").update(`${scope}:${identity}`).digest("hex");
  const result = await pool.query<{ hits: number; retry_after: number }>(
    `INSERT INTO public.rate_limit_buckets (bucket_key, window_started_at, hits)
     VALUES ($1, now(), 1)
     ON CONFLICT (bucket_key) DO UPDATE SET
       hits = CASE WHEN rate_limit_buckets.window_started_at <= now() - ($2::int * interval '1 second') THEN 1 ELSE rate_limit_buckets.hits + 1 END,
       window_started_at = CASE WHEN rate_limit_buckets.window_started_at <= now() - ($2::int * interval '1 second') THEN now() ELSE rate_limit_buckets.window_started_at END
     RETURNING hits, GREATEST(1, CEIL(EXTRACT(EPOCH FROM (window_started_at + ($2::int * interval '1 second') - now())))::int) AS retry_after`,
    [bucketKey, windowSeconds],
  );
  if (result.rows[0].hits > limit) {
    throw new AppError("Too many requests. Try again later.", 429, "RATE_LIMITED", { retryAfter: result.rows[0].retry_after });
  }
  // Opportunistic retention cleanup; bound the work to old expired rows.
  if (Math.random() < 0.01) await pool.query("DELETE FROM public.rate_limit_buckets WHERE window_started_at < now() - interval '1 day'");
}
