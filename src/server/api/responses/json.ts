import { AppError } from "@/server/api/errors/app-error";

export function success<T>(data: T, status = 200): Response {
  return Response.json({ data }, { status });
}

export function failure(error: unknown): Response {
  if (error instanceof AppError) {
    return Response.json(
      { error: { code: error.code, message: error.message } },
      { status: error.status },
    );
  }

  console.error("Unhandled request error", error);
  return Response.json(
    { error: { code: "INTERNAL_ERROR", message: "An unexpected error occurred." } },
    { status: 500 },
  );
}
