"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from "react";
import {
  createTenant as apiCreateTenant,
  getCurrentUser,
  login as apiLogin,
  logout as apiLogout,
  register as apiRegister,
  selectTenant as apiSelectTenant,
  type Credentials,
  type SessionUser,
  type TenantMembership,
} from "../services/auth-api";

export type AuthContextValue = {
  user: SessionUser | null;
  tenants: TenantMembership[];
  activeTenant: TenantMembership | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  login: (credentials: Credentials) => Promise<void>;
  register: (credentials: Credentials) => Promise<void>;
  logout: () => Promise<void>;
  selectTenant: (tenantId: string) => Promise<void>;
  createTenant: (name: string) => Promise<{ tenantId: string; schemaName: string }>;
  refreshUser: () => Promise<void>;
};

const AuthContext = createContext<AuthContextValue | null>(null);

const TENANT_STORAGE_KEY = "ingredia_tenant_id";

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<SessionUser | null>(null);
  const [tenants, setTenants] = useState<TenantMembership[]>([]);
  const [activeTenant, setActiveTenant] = useState<TenantMembership | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  const resolveActiveTenant = useCallback(
    (tenantList: TenantMembership[]): TenantMembership | null => {
      if (tenantList.length === 0) return null;
      const storedId =
        typeof window !== "undefined"
          ? localStorage.getItem(TENANT_STORAGE_KEY)
          : null;
      if (storedId) {
        const found = tenantList.find((t) => t.id === storedId);
        if (found) return found;
      }
      const fallback = tenantList[0];
      if (typeof window !== "undefined") {
        localStorage.setItem(TENANT_STORAGE_KEY, fallback.id);
      }
      return fallback;
    },
    [],
  );

  const refreshUser = useCallback(async () => {
    try {
      const data = await getCurrentUser();
      setUser(data.user);
      setTenants(data.tenants);
      setActiveTenant(resolveActiveTenant(data.tenants));
    } catch {
      setUser(null);
      setTenants([]);
      setActiveTenant(null);
      if (typeof window !== "undefined") {
        localStorage.removeItem(TENANT_STORAGE_KEY);
      }
    }
  }, [resolveActiveTenant]);

  useEffect(() => {
    let mounted = true;
    const init = async () => {
      try {
        const data = await getCurrentUser();
        if (!mounted) return;
        setUser(data.user);
        setTenants(data.tenants);
        setActiveTenant(resolveActiveTenant(data.tenants));
      } catch {
        if (!mounted) return;
        setUser(null);
        setTenants([]);
        setActiveTenant(null);
      } finally {
        if (mounted) setIsLoading(false);
      }
    };
    void init();
    return () => {
      mounted = false;
    };
  }, [resolveActiveTenant]);

  const login = useCallback(
    async (credentials: Credentials) => {
      setIsLoading(true);
      try {
        await apiLogin(credentials);
        await refreshUser();
      } finally {
        setIsLoading(false);
      }
    },
    [refreshUser],
  );

  const register = useCallback(
    async (credentials: Credentials) => {
      setIsLoading(true);
      try {
        await apiRegister(credentials);
        await refreshUser();
      } finally {
        setIsLoading(false);
      }
    },
    [refreshUser],
  );

  const logout = useCallback(async () => {
    setIsLoading(true);
    try {
      await apiLogout();
    } finally {
      setUser(null);
      setTenants([]);
      setActiveTenant(null);
      if (typeof window !== "undefined") {
        localStorage.removeItem(TENANT_STORAGE_KEY);
      }
      setIsLoading(false);
    }
  }, []);

  const selectTenant = useCallback(
    async (tenantId: string) => {
      const selected = await apiSelectTenant(tenantId);
      setActiveTenant(selected);
      if (typeof window !== "undefined") {
        localStorage.setItem(TENANT_STORAGE_KEY, selected.id);
      }
    },
    [],
  );

  const createTenant = useCallback(
    async (name: string) => {
      const idempotencyKey = crypto.randomUUID();
      const result = await apiCreateTenant(name, idempotencyKey);
      await refreshUser();
      if (typeof window !== "undefined") {
        localStorage.setItem(TENANT_STORAGE_KEY, result.tenantId);
      }
      return result;
    },
    [refreshUser],
  );

  return (
    <AuthContext.Provider
      value={{
        user,
        tenants,
        activeTenant,
        isLoading,
        isAuthenticated: Boolean(user),
        login,
        register,
        logout,
        selectTenant,
        createTenant,
        refreshUser,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}
