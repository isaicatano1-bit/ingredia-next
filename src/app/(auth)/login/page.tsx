"use client";

import { useState, type FormEvent, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useAuth } from "@/features/auth/context/auth-context";
import { ApiError } from "@/lib/api-client";

export default function LoginPage() {
  const router = useRouter();
  const { login, isAuthenticated, isLoading: authLoading } = useAuth();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    if (!authLoading && isAuthenticated) {
      router.replace("/dashboard");
    }
  }, [authLoading, isAuthenticated, router]);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);

    const trimmedEmail = email.trim();
    if (!trimmedEmail || !password) {
      setErrorMessage("Por favor, ingresa tu correo y contraseña.");
      return;
    }

    setIsSubmitting(true);
    try {
      await login({ email: trimmedEmail, password });
      router.push("/dashboard");
    } catch (err) {
      if (err instanceof ApiError) {
        if (err.code === "INVALID_CREDENTIALS" || err.status === 401) {
          setErrorMessage("Correo electrónico o contraseña incorrectos.");
        } else if (err.code === "RATE_LIMITED" || err.status === 429) {
          setErrorMessage("Demasiados intentos de inicio de sesión. Por favor, espera 15 minutos antes de volver a intentarlo.");
        } else if (err.code === "VALIDATION_ERROR") {
          setErrorMessage("Formato de correo o credenciales inválido.");
        } else {
          setErrorMessage(err.message || "Error al iniciar sesión.");
        }
      } else {
        setErrorMessage("Ocurrió un error inesperado al conectar con el servidor.");
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-xl font-bold tracking-tight text-zinc-900 dark:text-zinc-50">
          Iniciar sesión
        </h1>
        <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">
          Ingresa a tu cuenta para administrar tus restaurantes
        </p>
      </div>

      {errorMessage && (
        <div
          role="alert"
          aria-live="assertive"
          className="mb-5 p-3.5 text-sm font-medium text-red-800 dark:text-red-300 bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-900/60 rounded-2xl flex items-start gap-2.5"
        >
          <span className="text-base leading-none">⚠️</span>
          <span>{errorMessage}</span>
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-4" noValidate>
        <div>
          <label
            htmlFor="login-email"
            className="block text-xs font-semibold uppercase tracking-wider text-zinc-700 dark:text-zinc-300 mb-1.5"
          >
            Correo electrónico
          </label>
          <input
            id="login-email"
            type="email"
            autoComplete="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            disabled={isSubmitting}
            placeholder="chef@restaurante.com"
            className="w-full px-3.5 py-2.5 text-sm bg-zinc-50 dark:bg-zinc-950 border border-zinc-300 dark:border-zinc-700 rounded-xl focus:outline-hidden focus:ring-2 focus:ring-emerald-500 focus:border-transparent transition-all disabled:opacity-50"
          />
        </div>

        <div>
          <div className="flex items-center justify-between mb-1.5">
            <label
              htmlFor="login-password"
              className="block text-xs font-semibold uppercase tracking-wider text-zinc-700 dark:text-zinc-300"
            >
              Contraseña
            </label>
          </div>
          <input
            id="login-password"
            type="password"
            autoComplete="current-password"
            required
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            disabled={isSubmitting}
            placeholder="••••••••••••"
            className="w-full px-3.5 py-2.5 text-sm bg-zinc-50 dark:bg-zinc-950 border border-zinc-300 dark:border-zinc-700 rounded-xl focus:outline-hidden focus:ring-2 focus:ring-emerald-500 focus:border-transparent transition-all disabled:opacity-50"
          />
        </div>

        <button
          type="submit"
          disabled={isSubmitting}
          className="w-full flex items-center justify-center gap-2 mt-2 py-2.5 px-4 text-sm font-semibold text-white bg-emerald-600 hover:bg-emerald-700 active:bg-emerald-800 disabled:opacity-60 disabled:cursor-not-allowed rounded-xl shadow-xs transition-colors cursor-pointer"
        >
          {isSubmitting ? (
            <>
              <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              <span>Verificando credenciales...</span>
            </>
          ) : (
            <span>Ingresar a Ingredia</span>
          )}
        </button>
      </form>

      <div className="mt-6 pt-5 border-t border-zinc-100 dark:border-zinc-800 text-center">
        <p className="text-sm text-zinc-600 dark:text-zinc-400">
          ¿No tienes una cuenta aún?{" "}
          <Link
            href="/register"
            className="font-semibold text-emerald-600 dark:text-emerald-400 hover:text-emerald-700 dark:hover:text-emerald-300 underline underline-offset-2 transition-colors"
          >
            Regístrate aquí
          </Link>
        </p>
      </div>
    </div>
  );
}
