import { failure, success } from "@/server/api/responses/json";
import { authenticate } from "@/server/auth/authorization";
import { prisma } from "@/server/database/prisma";

export async function GET(request: Request): Promise<Response> {
  try {
    const user = await authenticate(request);
    const memberships = await prisma.membership.findMany({
      where: { userId: user.id },
      select: { role: true, tenant: { select: { id: true, name: true } } },
      orderBy: { createdAt: "asc" },
    });
    return success({ user, tenants: memberships.map(({ role, tenant }) => ({ ...tenant, role })) });
  } catch (error) { return failure(error); }
}
