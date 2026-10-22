import "server-only";

export type TenantContext = {
  tenantId: string;
  schemaName: string;
};

const SCHEMA_PATTERN = /^tenant_[a-f0-9]{32}$/;
const TENANT_ID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export function assertTenantId(tenantId: string): string {
  if (!TENANT_ID_PATTERN.test(tenantId)) {
    throw new Error("Invalid internal tenant identifier");
  }
  return tenantId.toLowerCase();
}

export function schemaForTenantId(tenantId: string): string {
  const normalizedId = assertTenantId(tenantId);
  return assertTenantSchema(`tenant_${normalizedId.replaceAll("-", "")}`);
}

export function assertTenantSchema(schemaName: string): string {
  if (!SCHEMA_PATTERN.test(schemaName)) {
    throw new Error("Invalid tenant schema identifier");
  }
  return schemaName;
}
