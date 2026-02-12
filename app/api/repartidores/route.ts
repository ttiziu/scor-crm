import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getSession } from "@/lib/auth/get-session";
import { getEffectiveTenantId } from "@/lib/auth/get-effective-tenant";

export async function GET(request: Request) {
  const session = await getSession(request);
  if (!session) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }
  if (session.role === "REPARTIDOR") {
    return NextResponse.json({ error: "Sin permiso" }, { status: 403 });
  }

  const tenantId = getEffectiveTenantId(request, session) ?? session.tenantId;
  const repartidores = await prisma.user.findMany({
    where: { tenantId, role: "REPARTIDOR" },
    orderBy: { name: "asc" },
    select: {
      id: true,
      name: true,
    },
  });
  return NextResponse.json(repartidores);
}
