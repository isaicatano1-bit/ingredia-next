import "server-only";
export type PurchaseStatus = "DRAFT" | "CONFIRMED" | "CANCELLED";

export type PurchaseLineInput = { ingredientId: string; quantity: number; unitId: string; unitPrice: number };
export type PurchaseInput = {
  supplierId: string;
  purchaseDate: string;
  invoiceNumber?: string;
  currencyCode: string;
  notes?: string;
  lines: PurchaseLineInput[];
};
export type PurchaseDraftUpdate = {
  purchaseDate?: string;
  invoiceNumber?: string | null;
  currencyCode?: string;
  notes?: string | null;
  lines?: PurchaseLineInput[];
};
export type PurchaseDto = {
  id: string;
  supplier: { id: string; name: string };
  purchaseDate: string;
  invoiceNumber: string | null;
  status: PurchaseStatus;
  currencyCode: string;
  notes: string | null;
  lines: Array<{
    id: string;
    ingredientId: string;
    ingredientName: string;
    quantity: string;
    unit: { id: string; name: string; abbreviation: string };
    unitPrice: string;
    lineTotal: string;
  }>;
  createdAt: string;
  updatedAt: string;
  finalizedAt: string | null;
};
