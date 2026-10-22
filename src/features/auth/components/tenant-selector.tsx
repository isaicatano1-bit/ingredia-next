"use client";

import { useEffect, useRef, useState } from "react";
import { useAuth } from "../context/auth-context";
import { CreateTenantModal } from "./create-tenant-modal";

const ROLE_LABELS: Record<string, { label: string; badgeClass: string }> = {
  OWNER: {
    label: "Propietario",
    badgeClass: "bg-emerald-100 text-emerald-800 dark:bg-emerald-950/80 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800",
  },
  ADMIN: {
    label: "Admin",
    badgeClass: "bg-blue-100 text-blue-800 dark:bg-blue-950/80 dark:text-blue-300 border-blue-200 dark:border-blue-800",
  },
  MEMBER: {
    label: "Miembro",
    badgeClass: "bg-zinc-100 text-zinc-800 dark:bg-zinc-800 dark:text-zinc-300 border-zinc-200 dark:border-zinc-700",
  },
};

export function TenantSelector() {
  const { tenants, activeTenant, selectTenant } = useAuth();
  const [isOpen, setIsOpen] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [switchingId, setSwitchingId] = useState<string | null>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") setIsOpen(false);
    };

    if (isOpen) {
      document.addEventListener("mousedown", handleClickOutside);
      document.addEventListener("keydown", handleKeyDown);
    }
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [isOpen]);

  const handleSelect = async (tenantId: string) => {
    if (tenantId === activeTenant?.id) {
      setIsOpen(false);
      return;
    }
    setSwitchingId(tenantId);
    try {
      await selectTenant(tenantId);
      setIsOpen(false);
    } finally {
      setSwitchingId(null);
    }
  };

  const roleInfo = activeTenant ? ROLE_LABELS[activeTenant.role] ?? ROLE_LABELS.MEMBER : null;

  return (
    <>
      <div className="relative inline-block text-left" ref={dropdownRef}>
        <button
          type="button"
          onClick={() => setIsOpen(!isOpen)}
          aria-haspopup="true"
          aria-expanded={isOpen}
          className="flex items-center gap-2.5 px-3 py-1.5 text-sm font-medium text-zinc-800 dark:text-zinc-200 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 hover:border-zinc-300 dark:hover:border-zinc-700 rounded-xl shadow-2xs hover:shadow-xs transition-all cursor-pointer"
        >
          <div className="flex items-center justify-center w-6 h-6 rounded-md bg-zinc-100 dark:bg-zinc-800 text-xs">
            🍽️
          </div>
          <span className="font-semibold text-zinc-900 dark:text-zinc-100 max-w-[140px] truncate sm:max-w-[200px]">
            {activeTenant ? activeTenant.name : "Sin restaurante"}
          </span>
          {roleInfo && (
            <span
              className={`px-1.5 py-0.5 text-[10px] font-semibold tracking-wide uppercase rounded-md border ${roleInfo.badgeClass}`}
            >
              {roleInfo.label}
            </span>
          )}
          <span className="text-zinc-400 text-xs ml-0.5">▼</span>
        </button>

        {isOpen && (
          <div className="absolute left-0 mt-2 w-72 origin-top-left bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl shadow-xl py-2 z-50 animate-in fade-in zoom-in-95 duration-100">
            <div className="px-3.5 py-2 border-b border-zinc-100 dark:border-zinc-800">
              <p className="text-xs font-semibold text-zinc-400 uppercase tracking-wider">
                Restaurantes disponibles
              </p>
            </div>

            <div className="max-h-60 overflow-y-auto py-1">
              {tenants.length === 0 ? (
                <div className="px-4 py-3 text-xs text-zinc-500 dark:text-zinc-400 text-center">
                  Aún no perteneces a ningún restaurante.
                </div>
              ) : (
                tenants.map((tenant) => {
                  const isSelected = tenant.id === activeTenant?.id;
                  const isSwitching = switchingId === tenant.id;
                  const tRole = ROLE_LABELS[tenant.role] ?? ROLE_LABELS.MEMBER;

                  return (
                    <button
                      key={tenant.id}
                      type="button"
                      disabled={isSwitching}
                      onClick={() => handleSelect(tenant.id)}
                      className={`w-full flex items-center justify-between px-3.5 py-2 text-left text-sm transition-colors cursor-pointer ${
                        isSelected
                          ? "bg-zinc-50 dark:bg-zinc-800/80 font-medium text-emerald-600 dark:text-emerald-400"
                          : "text-zinc-700 dark:text-zinc-300 hover:bg-zinc-50 dark:hover:bg-zinc-800/50"
                      }`}
                    >
                      <div className="flex flex-col min-w-0 pr-2">
                        <span className="truncate">{tenant.name}</span>
                        <span className="text-[11px] text-zinc-400">
                          Rol: {tRole.label}
                        </span>
                      </div>
                      <div className="shrink-0 flex items-center">
                        {isSwitching ? (
                          <span className="w-3.5 h-3.5 border-2 border-emerald-500/30 border-t-emerald-500 rounded-full animate-spin" />
                        ) : isSelected ? (
                          <span className="text-emerald-500 font-bold">✓</span>
                        ) : null}
                      </div>
                    </button>
                  );
                })
              )}
            </div>

            <div className="mt-1 pt-1 border-t border-zinc-100 dark:border-zinc-800 px-2">
              <button
                type="button"
                onClick={() => {
                  setIsOpen(false);
                  setIsModalOpen(true);
                }}
                className="w-full flex items-center gap-2 px-3 py-2 text-xs font-semibold text-emerald-700 dark:text-emerald-400 hover:bg-emerald-50 dark:hover:bg-emerald-950/40 rounded-xl transition-colors cursor-pointer"
              >
                <span>➕</span>
                <span>Crear nuevo restaurante</span>
              </button>
            </div>
          </div>
        )}
      </div>

      <CreateTenantModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
      />
    </>
  );
}
