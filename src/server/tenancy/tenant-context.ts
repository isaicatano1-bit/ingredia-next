import "server-only";

export type TenantContext = {
  tenantId: string;
  schemaName: string;
};

const SCHEMA_PATTERN = /^tenant_[a-f0-9]{32}$/;

export function assertTenantSchema(schemaName: string): string {
  if (!SCHEMA_PATTERN.test(schemaName)) {
    throw new Error("Invalid tenant schema identifier");
  }
  return schemaName;
}
