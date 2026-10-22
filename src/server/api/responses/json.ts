import "server-only";
import { AppError } from "@/server/api/errors/app-error";
import { randomUUID } from "node:crypto";

export function success<T>(data: T, status = 200): Response {
  return Response.json({ data }, { status });
}

export function failure(error: unknown): Response {
  if (error instanceof SyntaxError) {
    return Response.json({ error: { code: "MALFORMED_JSON", message: "Request body must be valid JSON." } }, { status: 400 });
  }
  if (error instanceof AppError) {
    const headers = new Headers();
    if (error.status === 429 && typeof error.details === "object" && error.details && "retryAfter" in error.details) {
      headers.set("Retry-After", String((error.details as { retryAfter: number }).retryAfter));
    }
    return Response.json(
      { error: { code: error.code, message: error.message, ...(error.details && error.status !== 429 ? { details: error.details } : {}) } },
      { status: error.status, headers },
    );
  }

  if (typeof error === "object" && error !== null && "code" in error) {
    const code = error.code;
    if (code === "P2002" || code === "23505") return Response.json({ error: { code: "CONFLICT", message: "A record with these values already exists." } }, { status: 409 });
    if (code === "P2025") return Response.json({ error: { code: "NOT_FOUND", message: "The requested record was not found." } }, { status: 404 });
    if (code === "23503") return Response.json({ error: { code: "CONSTRAINT_CONFLICT", message: "The record is referenced by other data and cannot be deleted." } }, { status: 409 });
    if (code === "23514" || code === "22P02") return Response.json({ error: { code: "INVALID_DATA", message: "The request violates a data constraint." } }, { status: 422 });
  }
  const requestId = randomUUID();
  console.error(JSON.stringify({ event: "api.unhandled_error", requestId }));
  return Response.json(
    { error: { code: "INTERNAL_ERROR", message: "An unexpected error occurred.", requestId } },
    { status: 500 },
  );
}
