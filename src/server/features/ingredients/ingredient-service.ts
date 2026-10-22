import "server-only";
import { createHash } from "node:crypto";
import type { PoolClient } from "pg";
import { AppError } from "@/server/api/errors/app-error";
import { withTenantClient } from "@/server/database/tenant-pool";
import type { AuthorizedTenant, Role } from "@/server/auth/authorization";
import type { CreateIngredientInput } from "@/features/ingredients/types/ingredient";
import { mapIngredient } from "./ingredient-mapper";
import * as repository from "./ingredient-repository";

const OPERATION = "ingredients.create.v1";
const MANAGER_ROLES = new Set<Role>(["OWNER", "ADMIN"]);

function requireManager(tenant: AuthorizedTenant) {
  if (!MANAGER_ROLES.has(tenant.role)) {
    throw new AppError("You do not have permission for this operation.",403,"FORBIDDEN");
  }
}

async function load(client: PoolClient,id: string) {
  const row = await repository.findIngredient(client,id);
  if (!row) throw new AppError("Ingredient not found.",404,"NOT_FOUND");
  return mapIngredient(row);
}

export async function createIngredient(tenant: AuthorizedTenant,input: CreateIngredientInput,idempotencyKey: string) {
  requireManager(tenant);
  return withTenantClient(tenant, async (client) => {
    const hash = createHash("sha256").update(JSON.stringify(input)).digest("hex");
    await repository.lockIdempotencyKey(client,`${tenant.tenantId}:${OPERATION}:${idempotencyKey}`);
    const previous = await repository.findIdempotencyRecord(client,tenant.tenantId,OPERATION,idempotencyKey);
    if (previous?.expires_at > new Date()) {
      if (previous.request_hash !== hash) throw new AppError("Idempotency key was already used with a different request.",409,"IDEMPOTENCY_CONFLICT");
      if (previous.response_body) return {ingredient:previous.response_body,replayed:true,status:previous.response_status??201};
      throw new AppError("An operation with this key is still being processed.",409,"IDEMPOTENCY_IN_PROGRESS");
    }
    if (previous) await repository.deleteIdempotencyRecord(client,tenant.tenantId,OPERATION,idempotencyKey);
    if (!await repository.findPurchaseUnit(client,input.purchaseUnitId)) throw new AppError("Measurement unit not found.",422,"INVALID_UNIT");
    await repository.insertIdempotencyRecord(client,tenant.tenantId,OPERATION,idempotencyKey,hash);
    const id = await repository.insertIngredient(client,input);
    const ingredient = await load(client,id);
    await repository.saveIdempotencyResponse(client,tenant.tenantId,OPERATION,idempotencyKey,ingredient);
    return {ingredient,replayed:false,status:201};
  });
}

export async function listIngredients(tenant: AuthorizedTenant,options: {limit:number;offset:number;search?:string}) {
  return withTenantClient(tenant,async(client)=>{
    const result=await repository.listIngredients(client,options);
    return {items:result.rows.map(mapIngredient),total:result.total};
  });
}

export async function getIngredient(tenant: AuthorizedTenant,id: string) {
  return withTenantClient(tenant,(client)=>load(client,id));
}

export async function updateIngredient(tenant: AuthorizedTenant,id: string,input: {name?:string;purchaseUnitId?:string}) {
  requireManager(tenant);
  return withTenantClient(tenant,async(client)=>{
    if(input.purchaseUnitId&&!await repository.findPurchaseUnit(client,input.purchaseUnitId)) throw new AppError("Measurement unit not found.",422,"INVALID_UNIT");
    if(!await repository.updateIngredient(client,id,input)) throw new AppError("Ingredient not found.",404,"NOT_FOUND");
    return load(client,id);
  });
}

export async function archiveIngredient(tenant: AuthorizedTenant,id: string) {
  requireManager(tenant);
  await withTenantClient(tenant,async(client)=>{
    if(!await repository.archiveIngredient(client,id)) throw new AppError("Ingredient not found.",404,"NOT_FOUND");
  });
}
