"use client";

import { useEffect, useState, type ReactNode } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useAuth } from "@/features/auth/context/auth-context";
import { TenantSelector } from "@/features/auth/components/tenant-selector";

const NAV_ITEMS = [
  { href: "/dashboard", label: "Resumen", icon: "📊" },
  { href: "/ingredients", label: "Insumos", icon: "🥕" },
  { href: "/suppliers", label: "Proveedores", icon: "🚚" },
  { href: "/purchases", label: "Compras", icon: "🧾" },
  { href: "/recipes", label: "Recetas", icon: "📖" },
];

export default function DashboardLayout({ children }: { children: ReactNode }) {
  const { user, isAuthenticated, isLoading, logout } = useAuth();
  const router = useRouter();
  const pathname = usePathname();
  const [isLoggingOut, setIsLoggingOut] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      router.replace("/login");
    }
  }, [isLoading, isAuthenticated, router]);

  const handleLogout = async () => {
    setIsLoggingOut(true);
    try {
      await logout();
      router.replace("/login");
    } finally {
      setIsLoggingOut(false);
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-zinc-50 dark:bg-zinc-950 p-4">
        <div className="flex flex-col items-center gap-4">
          <div className="w-12 h-12 rounded-2xl bg-linear-to-br from-emerald-500 to-teal-700 flex items-center justify-center text-white text-2xl animate-pulse shadow-lg shadow-emerald-500/20">
            🌱
          </div>
          <div className="flex items-center gap-2 text-sm font-medium text-zinc-600 dark:text-zinc-400">
            <span className="w-4 h-4 border-2 border-emerald-600/30 border-t-emerald-600 rounded-full animate-spin" />
            <span>Cargando restaurante y permisos...</span>
          </div>
        </div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return null;
  }

  return (
    <div className="min-h-screen flex flex-col bg-zinc-50 dark:bg-zinc-950 text-zinc-900 dark:text-zinc-100">
      {/* Top Navigation Bar */}
      <header className="sticky top-0 z-40 w-full border-b border-zinc-200/80 dark:border-zinc-800 bg-white/80 dark:bg-zinc-900/80 backdrop-blur-md">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16 gap-4">
            {/* Left: Brand + Restaurant Switcher */}
            <div className="flex items-center gap-4 sm:gap-6 min-w-0">
              <Link
                href="/dashboard"
                className="flex items-center gap-2.5 shrink-0 group focus:outline-hidden"
              >
                <div className="w-9 h-9 rounded-xl bg-linear-to-br from-emerald-500 to-teal-700 text-white flex items-center justify-center shadow-xs shadow-emerald-500/20 group-hover:scale-105 transition-transform">
                  <span className="text-lg">🌱</span>
                </div>
                <span className="font-bold text-lg tracking-tight text-zinc-900 dark:text-zinc-50 hidden sm:inline">
                  Ingredia
                </span>
              </Link>

              <div className="h-6 w-px bg-zinc-200 dark:bg-zinc-800 hidden sm:block" />

              <TenantSelector />
            </div>

            {/* Desktop Navigation Links */}
            <nav className="hidden md:flex items-center gap-1">
              {NAV_ITEMS.map((item) => {
                const isActive = pathname === item.href;
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg transition-colors ${
                      isActive
                        ? "bg-zinc-100 dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100"
                        : "text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-100 hover:bg-zinc-50 dark:hover:bg-zinc-800/50"
                    }`}
                  >
                    <span>{item.icon}</span>
                    <span>{item.label}</span>
                  </Link>
                );
              })}
            </nav>

            {/* Right: User Profile & Logout */}
            <div className="flex items-center gap-3">
              <div className="hidden lg:flex flex-col text-right">
                <span className="text-xs font-semibold text-zinc-800 dark:text-zinc-200 truncate max-w-[160px]">
                  {user?.email}
                </span>
                <span className="text-[10px] text-zinc-400">Sesión activa</span>
              </div>

              <button
                type="button"
                onClick={handleLogout}
                disabled={isLoggingOut}
                title="Cerrar sesión"
                className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-zinc-700 dark:text-zinc-300 hover:text-red-600 dark:hover:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/30 border border-zinc-200 dark:border-zinc-800 rounded-xl transition-all cursor-pointer"
              >
                {isLoggingOut ? (
                  <span className="w-3.5 h-3.5 border-2 border-red-500/30 border-t-red-500 rounded-full animate-spin" />
                ) : (
                  <span>🚪</span>
                )}
                <span className="hidden sm:inline">Salir</span>
              </button>

              {/* Mobile Menu Button */}
              <button
                type="button"
                onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
                aria-label="Abrir menú de navegación"
                className="md:hidden p-2 text-zinc-500 hover:text-zinc-700 dark:hover:text-zinc-300 rounded-xl hover:bg-zinc-100 dark:hover:bg-zinc-800"
              >
                {isMobileMenuOpen ? "✕" : "☰"}
              </button>
            </div>
          </div>
        </div>

        {/* Mobile Navigation Dropdown */}
        {isMobileMenuOpen && (
          <div className="md:hidden border-t border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 px-4 py-3 space-y-1">
            <div className="py-2 border-b border-zinc-100 dark:border-zinc-800 mb-2">
              <p className="text-xs text-zinc-400">Conectado como:</p>
              <p className="text-sm font-semibold text-zinc-800 dark:text-zinc-200 truncate">
                {user?.email}
              </p>
            </div>
            {NAV_ITEMS.map((item) => {
              const isActive = pathname === item.href;
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  onClick={() => setIsMobileMenuOpen(false)}
                  className={`flex items-center gap-2 px-3 py-2 text-sm font-medium rounded-xl transition-colors ${
                    isActive
                      ? "bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 font-semibold"
                      : "text-zinc-700 dark:text-zinc-300 hover:bg-zinc-50 dark:hover:bg-zinc-800"
                  }`}
                >
                  <span className="text-base">{item.icon}</span>
                  <span>{item.label}</span>
                </Link>
              );
            })}
          </div>
        )}
      </header>

      {/* Main Content */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {children}
      </main>
    </div>
  );
}
