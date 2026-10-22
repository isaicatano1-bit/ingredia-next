import "server-only";
import type { SupplierDto } from "./supplier-types";

export type SupplierRow = {
  id: string; name: string; contact_name: string | null; email: string | null;
  phone: string | null; created_at: Date;
};

export function mapSupplier(row: SupplierRow): SupplierDto {
  return {
    id: row.id,
    name: row.name,
    contactName: row.contact_name ?? undefined,
    email: row.email ?? undefined,
    phone: row.phone ?? undefined,
    createdAt: row.created_at.toISOString(),
  };
}
