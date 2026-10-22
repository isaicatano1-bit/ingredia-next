import { success } from "@/server/api/responses/json";

export function GET(): Response {
  return success({ status: "ok" });
}
