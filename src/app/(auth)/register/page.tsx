"use client";

import { useState, type FormEvent, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useAuth } from "@/features/auth/context/auth-context";
import { ApiError } from "@/lib/api-client";

export default function RegisterPage() {
  const router = useRouter();
  const { register, isAuthenticated, isLoading: authLoading } = useAuth();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
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
    if (!trimmedEmail) {
      setErrorMessage("Por favor, ingresa un correo electrónico.");
      return;
    }

    if (password.length < 12) {
      setErrorMessage("La contraseña debe tener al menos 12 caracteres por seguridad.");
      return;
    }

    if (new TextEncoder().encode(password).byteLength > 72) {
      setErrorMessage("La contraseña no debe superar los 72 bytes.");
      return;
    }

    if (password !== confirmPassword) {
      setErrorMessage("Las contraseñas ingresadas no coinciden.");
      return;
    }

    setIsSubmitting(true);
    try {
      await register({ email: trimmedEmail, password });
      router.push("/dashboard");
    } catch (err) {
      if (err instanceof ApiError) {
        if (err.code === "ACCOUNT_EXISTS" || err.status === 409) {
          setErrorMessage("Ya existe una cuenta con este correo electrónico. Por favor, inicia sesión.");
        } else if (err.code === "RATE_LIMITED" || err.status === 429) {
          setErrorMessage("Demasiados intentos de registro. Por favor, espera antes de reintentar.");
        } else if (err.code === "VALIDATION_ERROR") {
          setErrorMessage("Los datos ingresados no cumplen con los requisitos de seguridad.");
        } else {
          setErrorMessage(err.message || "Error al crear la cuenta.");
        }
      } else {
        setErrorMessage("Ocurrió un error inesperado al conectar con el servidor.");
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  const isPasswordLongEnough = password.length >= 12;
  const doPasswordsMatch = password.length > 0 && password === confirmPassword;

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-xl font-bold tracking-tight text-zinc-900 dark:text-zinc-50">
          Crear cuenta
        </h1>
        <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">
          Comienza a gestionar los costos de tu cocina hoy mismo
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
            htmlFor="register-email"
            className="block text-xs font-semibold uppercase tracking-wider text-zinc-700 dark:text-zinc-300 mb-1.5"
          >
            Correo electrónico
          </label>
          <input
            id="register-email"
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
              htmlFor="register-password"
              className="block text-xs font-semibold uppercase tracking-wider text-zinc-700 dark:text-zinc-300"
            >
              Contraseña
            </label>
            <span
              className={`text-[11px] font-medium transition-colors ${
                isPasswordLongEnough
                  ? "text-emerald-600 dark:text-emerald-400"
                  : "text-zinc-500"
              }`}
            >
              {password.length}/12 caracteres mínimos
            </span>
          </div>
          <input
            id="register-password"
            type="password"
            autoComplete="new-password"
            required
            minLength={12}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            disabled={isSubmitting}
            placeholder="Mínimo 12 caracteres"
            className="w-full px-3.5 py-2.5 text-sm bg-zinc-50 dark:bg-zinc-950 border border-zinc-300 dark:border-zinc-700 rounded-xl focus:outline-hidden focus:ring-2 focus:ring-emerald-500 focus:border-transparent transition-all disabled:opacity-50"
          />
        </div>

        <div>
          <div className="flex items-center justify-between mb-1.5">
            <label
              htmlFor="register-confirm-password"
              className="block text-xs font-semibold uppercase tracking-wider text-zinc-700 dark:text-zinc-300"
            >
              Confirmar contraseña
            </label>
            {confirmPassword.length > 0 && (
              <span
                className={`text-[11px] font-medium transition-colors ${
                  doPasswordsMatch
                    ? "text-emerald-600 dark:text-emerald-400"
                    : "text-red-500"
                }`}
              >
                {doPasswordsMatch ? "Coinciden ✓" : "No coinciden ✕"}
              </span>
            )}
          </div>
          <input
            id="register-confirm-password"
            type="password"
            autoComplete="new-password"
            required
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            disabled={isSubmitting}
            placeholder="Repite tu contraseña"
            className="w-full px-3.5 py-2.5 text-sm bg-zinc-50 dark:bg-zinc-950 border border-zinc-300 dark:border-zinc-700 rounded-xl focus:outline-hidden focus:ring-2 focus:ring-emerald-500 focus:border-transparent transition-all disabled:opacity-50"
          />
        </div>

        <button
          type="submit"
          disabled={isSubmitting || !isPasswordLongEnough || !doPasswordsMatch}
          className="w-full flex items-center justify-center gap-2 mt-2 py-2.5 px-4 text-sm font-semibold text-white bg-emerald-600 hover:bg-emerald-700 active:bg-emerald-800 disabled:opacity-60 disabled:cursor-not-allowed rounded-xl shadow-xs transition-colors cursor-pointer"
        >
          {isSubmitting ? (
            <>
              <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              <span>Creando cuenta segura...</span>
            </>
          ) : (
            <span>Crear cuenta y comenzar</span>
          )}
        </button>
      </form>

      <div className="mt-6 pt-5 border-t border-zinc-100 dark:border-zinc-800 text-center">
        <p className="text-sm text-zinc-600 dark:text-zinc-400">
          ¿Ya tienes una cuenta registrada?{" "}
          <Link
            href="/login"
            className="font-semibold text-emerald-600 dark:text-emerald-400 hover:text-emerald-700 dark:hover:text-emerald-300 underline underline-offset-2 transition-colors"
          >
            Inicia sesión aquí
          </Link>
        </p>
      </div>
    </div>
  );
}
