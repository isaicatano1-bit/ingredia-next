import "server-only";
import type { PurchaseDto, PurchaseStatus } from "./purchase-types";

export type PurchaseHeaderRow = {
  id: string; supplier_id: string; supplier_name: string; purchase_date: Date;
  invoice_number: string | null; status: PurchaseStatus; currency_code: string;
  notes: string | null; created_at: Date; updated_at: Date; finalized_at: Date | null;
};
export type PurchaseLineRow = {
  id: string; ingredient_id: string; ingredient_name: string; quantity: string;
  unit_id: string; unit_name: string; unit_abbreviation: string;
  unit_price: string; line_total: string;
};

export function mapPurchase(header: PurchaseHeaderRow, lines: PurchaseLineRow[]): PurchaseDto {
  return {
    id: header.id,
    supplier: { id: header.supplier_id, name: header.supplier_name },
    purchaseDate: header.purchase_date.toISOString(),
    invoiceNumber: header.invoice_number,
    status: header.status,
    currencyCode: header.currency_code,
    notes: header.notes,
    lines: lines.map((line) => ({
      id: line.id,
      ingredientId: line.ingredient_id,
      ingredientName: line.ingredient_name,
      quantity: line.quantity,
      unit: { id: line.unit_id, name: line.unit_name, abbreviation: line.unit_abbreviation },
      unitPrice: line.unit_price,
      lineTotal: line.line_total,
    })),
    createdAt: header.created_at.toISOString(),
    updatedAt: header.updated_at.toISOString(),
    finalizedAt: header.finalized_at?.toISOString() ?? null,
  };
}
