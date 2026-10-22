"use client";

import { useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useAuth } from "@/features/auth/context/auth-context";

export default function HomePage() {
  const { isAuthenticated, isLoading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!isLoading && isAuthenticated) {
      router.replace("/dashboard");
    }
  }, [isLoading, isAuthenticated, router]);

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-zinc-50 dark:bg-zinc-950">
        <span className="w-6 h-6 border-2 border-emerald-600/30 border-t-emerald-600 rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col bg-linear-to-b from-zinc-50 via-white to-zinc-100 dark:from-zinc-950 dark:via-zinc-900 dark:to-black">
      {/* Navbar */}
      <header className="w-full border-b border-zinc-200/60 dark:border-zinc-800/60 py-4 px-6 sm:px-12 backdrop-blur-md">
        <div className="max-w-6xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-linear-to-br from-emerald-500 to-teal-700 text-white flex items-center justify-center shadow-xs shadow-emerald-500/20">
              <span className="text-lg">🌱</span>
            </div>
            <span className="text-xl font-bold tracking-tight text-zinc-900 dark:text-zinc-50">
              Ingredia
            </span>
          </div>

          <div className="flex items-center gap-3">
            <Link
              href="/login"
              className="px-4 py-2 text-sm font-semibold text-zinc-700 dark:text-zinc-300 hover:text-zinc-950 dark:hover:text-white transition-colors"
            >
              Iniciar sesión
            </Link>
            <Link
              href="/register"
              className="px-4 py-2 text-sm font-semibold text-white bg-emerald-600 hover:bg-emerald-700 active:bg-emerald-800 rounded-xl shadow-xs transition-colors"
            >
              Registrarse
            </Link>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <main className="flex-1 flex flex-col items-center justify-center text-center px-4 py-16 sm:py-24">
        <div className="max-w-3xl mx-auto">
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-emerald-50 dark:bg-emerald-950/60 border border-emerald-200 dark:border-emerald-800/60 text-emerald-800 dark:text-emerald-300 text-xs font-semibold uppercase tracking-wider mb-6">
            <span>🍽️</span>
            <span>Gestión Gastronómica Multi-Inquilino</span>
          </div>

          <h1 className="text-4xl sm:text-6xl font-extrabold tracking-tight text-zinc-900 dark:text-zinc-50 leading-tight sm:leading-none">
            Control de insumos, compras y escandallos culinarios
          </h1>

          <p className="mt-6 text-base sm:text-lg text-zinc-600 dark:text-zinc-400 max-w-2xl mx-auto leading-relaxed">
            Plataforma profesional para restaurantes que buscan rentabilidad y consistencia. Aislamiento total de datos por restaurante, trazabilidad de compras y fichas técnicas.
          </p>

          <div className="mt-10 flex flex-col sm:flex-row items-center justify-center gap-4">
            <Link
              href="/register"
              className="w-full sm:w-auto px-8 py-3.5 text-base font-semibold text-white bg-emerald-600 hover:bg-emerald-700 active:bg-emerald-800 rounded-2xl shadow-lg shadow-emerald-600/25 transition-all"
            >
              Comenzar gratis
            </Link>
            <Link
              href="/login"
              className="w-full sm:w-auto px-8 py-3.5 text-base font-semibold text-zinc-800 dark:text-zinc-200 bg-white dark:bg-zinc-900 hover:bg-zinc-100 dark:hover:bg-zinc-800 border border-zinc-200 dark:border-zinc-800 rounded-2xl transition-all"
            >
              Ya tengo una cuenta
            </Link>
          </div>
        </div>

        {/* Feature Highlights */}
        <div className="max-w-5xl mx-auto grid grid-cols-1 sm:grid-cols-3 gap-6 mt-20 text-left">
          <div className="p-6 bg-white/70 dark:bg-zinc-900/60 border border-zinc-200/80 dark:border-zinc-800/80 rounded-2xl">
            <div className="text-2xl mb-2">🔒</div>
            <h2 className="text-sm font-bold text-zinc-900 dark:text-zinc-100 mb-1">
              Aislamiento de Restaurante
            </h2>
            <p className="text-xs text-zinc-600 dark:text-zinc-400">
              Cada restaurante cuenta con su propio esquema dinámico e independiente en PostgreSQL.
            </p>
          </div>

          <div className="p-6 bg-white/70 dark:bg-zinc-900/60 border border-zinc-200/80 dark:border-zinc-800/80 rounded-2xl">
            <div className="text-2xl mb-2">🥕</div>
            <h2 className="text-sm font-bold text-zinc-900 dark:text-zinc-100 mb-1">
              Insumos e Idempotencia
            </h2>
            <p className="text-xs text-zinc-600 dark:text-zinc-400">
              Catálogo estricto con unidades de medida y protección contra duplicados en la red.
            </p>
          </div>

          <div className="p-6 bg-white/70 dark:bg-zinc-900/60 border border-zinc-200/80 dark:border-zinc-800/80 rounded-2xl">
            <div className="text-2xl mb-2">🧾</div>
            <h2 className="text-sm font-bold text-zinc-900 dark:text-zinc-100 mb-1">
              Ciclo de Compras
            </h2>
            <p className="text-xs text-zinc-600 dark:text-zinc-400">
              Borradores, cotizaciones de proveedores y albaranes confirmados con precios históricos.
            </p>
          </div>
        </div>
      </main>

      <footer className="w-full border-t border-zinc-200/60 dark:border-zinc-800/60 py-6 text-center text-xs text-zinc-500">
        © 2026 Ingredia. Arquitectura empresarial con Next.js y PostgreSQL.
      </footer>
    </div>
  );
}
