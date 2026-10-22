import type { ReactNode } from "react";
import Link from "next/link";

export default function AuthLayout({ children }: { children: ReactNode }) {
  return (
    <div className="min-h-screen flex flex-col justify-center items-center px-4 py-12 bg-linear-to-b from-zinc-50 via-white to-zinc-100 dark:from-zinc-950 dark:via-zinc-900 dark:to-black">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <Link
            href="/"
            className="inline-flex items-center gap-2.5 group focus:outline-hidden"
          >
            <div className="flex items-center justify-center w-11 h-11 rounded-2xl bg-linear-to-br from-emerald-500 to-teal-700 text-white shadow-md shadow-emerald-500/20 group-hover:scale-105 transition-transform duration-200">
              <span className="text-2xl font-black">🌱</span>
            </div>
            <span className="text-2xl font-bold tracking-tight text-zinc-900 dark:text-zinc-50">
              Ingredia
            </span>
          </Link>
          <p className="mt-2 text-sm text-zinc-600 dark:text-zinc-400">
            Control de operaciones y escandallos gastronómicos
          </p>
        </div>

        <div className="bg-white dark:bg-zinc-900/90 border border-zinc-200/80 dark:border-zinc-800 rounded-3xl p-8 shadow-xl shadow-zinc-200/40 dark:shadow-none backdrop-blur-md">
          {children}
        </div>

        <p className="mt-8 text-center text-xs text-zinc-500 dark:text-zinc-500">
          Plataforma multi-inquilino segura y aislada para restaurantes.
        </p>
      </div>
    </div>
  );
}
