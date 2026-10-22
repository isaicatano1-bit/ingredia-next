import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  createTenant,
  getCurrentUser,
  login,
  logout,
  register,
  selectTenant,
} from "../../src/features/auth/services/auth-api";
import { ApiError, apiRequest } from "../../src/lib/api-client";

describe("api-client and auth-api services", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("apiRequest attaches Content-Type and x-tenant-id headers", async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => ({ data: { success: true } }),
    });
    vi.stubGlobal("fetch", fetchMock);

    const result = await apiRequest<{ data: { success: boolean } }>("/api/test", {
      method: "POST",
      tenantId: "test-tenant-123",
      body: JSON.stringify({ ping: "pong" }),
    });

    expect(fetchMock).toHaveBeenCalledTimes(1);
    const [url, options] = fetchMock.mock.calls[0];
    expect(url).toBe("/api/test");
    expect(options.method).toBe("POST");
    expect(options.credentials).toBe("same-origin");
    expect(options.headers.get("Content-Type")).toBe("application/json");
    expect(options.headers.get("x-tenant-id")).toBe("test-tenant-123");
    expect(result).toEqual({ data: { success: true } });
  });

  it("apiRequest throws structured ApiError on non-ok responses", async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: false,
      status: 401,
      json: async () => ({
        error: {
          code: "INVALID_CREDENTIALS",
          message: "Invalid email or password.",
          requestId: "req-123",
        },
      }),
    });
    vi.stubGlobal("fetch", fetchMock);

    await expect(apiRequest("/api/v1/auth/login", { method: "POST" })).rejects.toThrow(ApiError);
    await expect(apiRequest("/api/v1/auth/login", { method: "POST" })).rejects.toMatchObject({
      status: 401,
      code: "INVALID_CREDENTIALS",
      requestId: "req-123",
    });
  });

  it("login calls /api/v1/auth/login with credentials", async () => {
    const mockUser = { id: "user-1", email: "chef@example.com" };
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => ({ data: { user: mockUser } }),
    });
    vi.stubGlobal("fetch", fetchMock);

    const data = await login({ email: "chef@example.com", password: "password12345" });
    expect(data).toEqual({ user: mockUser });
    expect(fetchMock).toHaveBeenCalledWith(
      "/api/v1/auth/login",
      expect.objectContaining({
        method: "POST",
        body: JSON.stringify({ email: "chef@example.com", password: "password12345" }),
      }),
    );
  });

  it("register calls /api/v1/auth/register with credentials", async () => {
    const mockUser = { id: "user-2", email: "newchef@example.com" };
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      status: 201,
      json: async () => ({ data: { user: mockUser } }),
    });
    vi.stubGlobal("fetch", fetchMock);

    const data = await register({ email: "newchef@example.com", password: "securepassword12" });
    expect(data).toEqual({ user: mockUser });
    expect(fetchMock).toHaveBeenCalledWith(
      "/api/v1/auth/register",
      expect.objectContaining({
        method: "POST",
        body: JSON.stringify({ email: "newchef@example.com", password: "securepassword12" }),
      }),
    );
  });

  it("logout calls /api/v1/auth/logout", async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      status: 204,
    });
    vi.stubGlobal("fetch", fetchMock);

    await logout();
    expect(fetchMock).toHaveBeenCalledWith(
      "/api/v1/auth/logout",
      expect.objectContaining({ method: "POST" }),
    );
  });

  it("getCurrentUser calls /api/v1/auth/me", async () => {
    const mockProfile = {
      user: { id: "u-1", email: "test@example.com" },
      tenants: [{ id: "t-1", name: "Bistrot", role: "OWNER" as const }],
    };
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => ({ data: mockProfile }),
    });
    vi.stubGlobal("fetch", fetchMock);

    const profile = await getCurrentUser();
    expect(profile).toEqual(mockProfile);
    expect(fetchMock).toHaveBeenCalledWith("/api/v1/auth/me", expect.anything());
  });

  it("selectTenant calls /api/v1/tenants/switch with tenantId", async () => {
    const mockSelected = { id: "tenant-xyz", name: "La Trattoria", role: "ADMIN" as const };
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => ({ data: { tenant: mockSelected } }),
    });
    vi.stubGlobal("fetch", fetchMock);

    const tenant = await selectTenant("tenant-xyz");
    expect(tenant).toEqual(mockSelected);
    expect(fetchMock).toHaveBeenCalledWith(
      "/api/v1/tenants/switch",
      expect.objectContaining({
        method: "POST",
        body: JSON.stringify({ tenantId: "tenant-xyz" }),
      }),
    );
  });

  it("createTenant calls /api/v1/tenants with name and Idempotency-Key", async () => {
    const mockCreated = { tenantId: "t-new", schemaName: "tenant_tnew" };
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      status: 201,
      json: async () => ({ data: mockCreated }),
    });
    vi.stubGlobal("fetch", fetchMock);

    const created = await createTenant("Trattoria Roma", "idem-key-12345");
    expect(created).toEqual(mockCreated);
    expect(fetchMock).toHaveBeenCalledWith(
      "/api/v1/tenants",
      expect.objectContaining({
        method: "POST",
        body: JSON.stringify({ name: "Trattoria Roma" }),
      }),
    );
    const [, options] = fetchMock.mock.calls[0];
    expect(options.headers.get("Idempotency-Key")).toBe("idem-key-12345");
  });
});
