export type ApiErrorBody = {
  error?: { code?: string; message?: string; details?: unknown; requestId?: string };
};

export class ApiError extends Error {
  constructor(
    message: string,
    readonly status: number,
    readonly code?: string,
    readonly details?: unknown,
    readonly requestId?: string,
  ) {
    super(message);
    this.name = "ApiError";
  }
}

export type Page<T> = { data: T[]; meta: { page: number; limit: number; total: number } };

export async function apiRequest<T>(
  path: string,
  options: RequestInit & { tenantId?: string } = {},
): Promise<T> {
  const headers = new Headers(options.headers);
  if (options.tenantId) headers.set("x-tenant-id", options.tenantId);
  if (options.body !== undefined && !headers.has("Content-Type")) {
    headers.set("Content-Type", "application/json");
  }

  const response = await fetch(path, {
    ...options,
    headers,
    credentials: "same-origin",
  });
  if (response.status === 204) return undefined as T;

  const body = (await response.json()) as T & ApiErrorBody;
  if (!response.ok) {
    throw new ApiError(
      body.error?.message ?? "The request could not be completed.",
      response.status,
      body.error?.code,
      body.error?.details,
      body.error?.requestId,
    );
  }
  return body;
}

export function queryString(values: Record<string, string | number | undefined>): string {
  const query = new URLSearchParams();
  for (const [key, value] of Object.entries(values)) {
    if (value !== undefined) query.set(key, String(value));
  }
  const encoded = query.toString();
  return encoded ? `?${encoded}` : "";
}
