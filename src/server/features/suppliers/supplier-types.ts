import "server-only";
export type SupplierInput = { name: string; contactName?: string; email?: string; phone?: string };
export type SupplierDto = SupplierInput & { id: string; createdAt: string };
