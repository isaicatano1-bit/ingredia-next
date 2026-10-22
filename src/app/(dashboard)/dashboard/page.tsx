"use client";

import { useState } from "react";
import Link from "next/link";
import { useAuth } from "@/features/auth/context/auth-context";
import { CreateTenantModal } from "@/features/auth/components/create-tenant-modal";

const MODULES = [
  {
    title: "Insumos e Ingredientes",
    href: "/ingredients",
    icon: "🥕",
    description: "Catálogo maestro de ingredientes por restaurante con control estricto de idempotencia y unidades de medida.",
    apiStatus: "API v1 Lista",
    badgeColor: "bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300",
  },
  {
    title: "Proveedores y Cotizaciones",
    href: "/suppliers",
    icon: "🚚",
    description: "Gestión de proveedores, catálogo de insumos cotizados, factores de conversión y precios unitarios.",
    apiStatus: "API v1 Lista",
    badgeColor: "bg-blue-100 text-blue-800 dark:bg-blue-950/60 dark:text-blue-300",
  },
  {
    title: "Compras y Albaranes",
    href: "/purchases",
    icon: "🧾",
    description: "Ciclo de vida de compras: creación de borradores, cálculo de importes y confirmación inmutable.",
    apiStatus: "API v1 Lista",
    badgeColor: "bg-purple-100 text-purple-800 dark:bg-purple-950/60 dark:text-purple-300",
  },
  {
    title: "Recetas y Escandallos",
    href: "/recipes",
    icon: "📖",
    description: "Fichas técnicas culinarias, rendimiento por porciones/lotes y composición de ingredientes.",
    apiStatus: "API v1 Lista",
    badgeColor: "bg-amber-100 text-amber-800 dark:bg-amber-950/60 dark:text-amber-300",
  },
];

export default function DashboardPage() {
  const { user, activeTenant, tenants } = useAuth();
  const [isModalOpen, setIsModalOpen] = useState(false);

  return (
    <div className="space-y-8 animate-in fade-in duration-200">
      {/* Welcome Banner */}
      <div className="relative overflow-hidden rounded-3xl bg-linear-to-r from-emerald-900 via-teal-900 to-zinc-900 p-8 text-white shadow-xl">
        <div className="relative z-10 max-w-2xl">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/10 backdrop-blur-md text-emerald-300 text-xs font-semibold uppercase tracking-wider mb-3">
            <span>✨</span>
            <span>Sesión verificada</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight">
            Hola, {user?.email?.split("@")[0]}
          </h1>
          <p className="mt-2 text-sm sm:text-base text-zinc-300 leading-relaxed">
            Bienvenido al panel central de Ingredia. Tu sesión está activa y conectada a la base de datos PostgreSQL multinquilino.
          </p>
        </div>

        {/* Decorative background shape */}
        <div className="absolute -right-8 -bottom-8 w-64 h-64 rounded-full bg-emerald-500/10 blur-2xl pointer-events-none" />
      </div>

      {/* Tenant State / Onboarding Section */}
      {tenants.length === 0 ? (
        <div className="p-8 border-2 border-dashed border-zinc-300 dark:border-zinc-800 rounded-3xl bg-white dark:bg-zinc-900 text-center">
          <div className="w-16 h-16 mx-auto mb-4 rounded-2xl bg-emerald-100 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-400 flex items-center justify-center text-3xl">
            🍽️
          </div>
          <h2 className="text-xl font-bold text-zinc-900 dark:text-zinc-50">
            Aún no tienes ningún restaurante asignado
          </h2>
          <p className="mt-2 text-sm text-zinc-600 dark:text-zinc-400 max-w-md mx-auto">
            Para comenzar a gestionar insumos y recetas, crea el espacio de trabajo de tu primer restaurante. Se creará automáticamente un esquema PostgreSQL aislado y seguro.
          </p>
          <button
            type="button"
            onClick={() => setIsModalOpen(true)}
            className="mt-6 inline-flex items-center gap-2 px-6 py-3 text-sm font-semibold text-white bg-emerald-600 hover:bg-emerald-700 active:bg-emerald-800 rounded-xl shadow-md shadow-emerald-600/20 transition-all cursor-pointer"
          >
            <span>➕</span>
            <span>Crear mi primer restaurante</span>
          </button>
        </div>
      ) : activeTenant ? (
        <div className="p-6 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-3xl shadow-xs">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <div className="flex items-center gap-3">
                <h2 className="text-xl font-bold text-zinc-900 dark:text-zinc-50">
                  {activeTenant.name}
                </h2>
                <span className="px-2.5 py-0.5 text-xs font-semibold rounded-md bg-emerald-100 dark:bg-emerald-950/80 text-emerald-800 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800">
                  Rol: {activeTenant.role}
                </span>
              </div>
              <p className="mt-1 text-xs text-zinc-500 dark:text-zinc-400 font-mono">
                ID Inquilino: {activeTenant.id}
              </p>
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setIsModalOpen(true)}
                className="px-4 py-2 text-xs font-semibold text-zinc-700 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-xl transition-colors cursor-pointer"
              >
                + Añadir otro restaurante
              </button>
            </div>
          </div>
        </div>
      ) : null}

      {/* Feature Modules Cards */}
      <div>
        <div className="mb-4">
          <h2 className="text-lg font-bold text-zinc-900 dark:text-zinc-50">
            Módulos Operativos
          </h2>
          <p className="text-xs text-zinc-500 dark:text-zinc-400">
            Conectados a los Route Handlers versionados de la API de Ingredia
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {MODULES.map((module) => (
            <Link
              key={module.title}
              href={module.href}
              className="p-6 bg-white dark:bg-zinc-900 border border-zinc-200/80 dark:border-zinc-800 rounded-2xl hover:border-zinc-300 dark:hover:border-zinc-700 hover:shadow-md transition-all group block focus:outline-hidden focus:ring-2 focus:ring-emerald-500"
            >
              <div className="flex items-start justify-between mb-3">
                <span className="text-2xl p-2.5 rounded-xl bg-zinc-50 dark:bg-zinc-800 group-hover:scale-110 transition-transform">
                  {module.icon}
                </span>
                <span
                  className={`px-2 py-0.5 text-[10px] font-semibold tracking-wide uppercase rounded-md ${module.badgeColor}`}
                >
                  {module.apiStatus}
                </span>
              </div>
              <h3 className="text-base font-bold text-zinc-900 dark:text-zinc-100 mb-1.5">
                {module.title}
              </h3>
              <p className="text-xs text-zinc-600 dark:text-zinc-400 leading-relaxed mb-4">
                {module.description}
              </p>
              <div className="pt-3 border-t border-zinc-100 dark:border-zinc-800 flex items-center justify-between text-xs font-semibold text-emerald-600 dark:text-emerald-400">
                <span>Explorar módulo</span>
                <span className="group-hover:translate-x-1 transition-transform">→</span>
              </div>
            </Link>
          ))}
        </div>
      </div>

      <CreateTenantModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
      />
    </div>
  );
}
