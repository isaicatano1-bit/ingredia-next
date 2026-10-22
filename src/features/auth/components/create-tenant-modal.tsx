"use client";

import { useState, type FormEvent } from "react";
import { useAuth } from "../context/auth-context";
import { ApiError } from "@/lib/api-client";

type CreateTenantModalProps = {
  isOpen: boolean;
  onClose: () => void;
  onCreated?: (tenantId: string) => void;
};

export function CreateTenantModal({
  isOpen,
  onClose,
  onCreated,
}: CreateTenantModalProps) {
  const { createTenant } = useAuth();
  const [name, setName] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    const trimmed = name.trim();
    if (trimmed.length < 2 || trimmed.length > 120) {
      setError("El nombre del restaurante debe tener entre 2 y 120 caracteres.");
      return;
    }

    setIsSubmitting(true);
    setError(null);

    try {
      const result = await createTenant(trimmed);
      setName("");
      onClose();
      if (onCreated) onCreated(result.tenantId);
    } catch (err) {
      if (err instanceof ApiError) {
        if (err.code === "RATE_LIMITED") {
          setError("Has alcanzado el límite de creación de restaurantes. Espera antes de intentar de nuevo.");
        } else {
          setError(err.message);
        }
      } else {
        setError("Ocurrió un error inesperado al crear el restaurante.");
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-150"
      role="dialog"
      aria-modal="true"
      aria-labelledby="modal-title"
    >
      <div className="relative w-full max-w-md p-6 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl shadow-2xl">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <div className="flex items-center justify-center w-8 h-8 rounded-lg bg-emerald-100 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-400 font-bold text-sm">
              🏢
            </div>
            <h2 id="modal-title" className="text-lg font-semibold text-zinc-900 dark:text-zinc-50">
              Nuevo Restaurante
            </h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            disabled={isSubmitting}
            aria-label="Cerrar ventana modal"
            className="p-1 text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200 rounded-lg hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors"
          >
            ✕
          </button>
        </div>

        <p className="text-sm text-zinc-600 dark:text-zinc-400 mb-5">
          Crea un nuevo espacio de trabajo aislado para gestionar las operaciones, recetas e insumos de tu restaurante.
        </p>

        {error && (
          <div
            role="alert"
            className="p-3 mb-4 text-sm text-red-700 dark:text-red-300 bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-900/60 rounded-xl"
          >
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label
              htmlFor="tenant-name"
              className="block text-xs font-semibold uppercase tracking-wider text-zinc-700 dark:text-zinc-300 mb-1.5"
            >
              Nombre del Restaurante / Organización
            </label>
            <input
              id="tenant-name"
              type="text"
              required
              minLength={2}
              maxLength={120}
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Ej. Trattoria Bella Vista"
              disabled={isSubmitting}
              className="w-full px-3.5 py-2.5 text-sm bg-zinc-50 dark:bg-zinc-950 border border-zinc-300 dark:border-zinc-700 rounded-xl focus:outline-hidden focus:ring-2 focus:ring-emerald-500 focus:border-transparent transition-all"
            />
          </div>

          <div className="flex items-center justify-end gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              disabled={isSubmitting}
              className="px-4 py-2 text-sm font-medium text-zinc-700 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded-xl transition-colors"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={isSubmitting || name.trim().length < 2}
              className="flex items-center justify-center gap-2 px-5 py-2 text-sm font-semibold text-white bg-emerald-600 hover:bg-emerald-700 active:bg-emerald-800 disabled:opacity-50 disabled:cursor-not-allowed rounded-xl shadow-xs transition-colors"
            >
              {isSubmitting ? (
                <>
                  <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  Aprovisionando...
                </>
              ) : (
                "Crear Restaurante"
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
