import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getSession } from "@/lib/auth/get-session";

export async function GET(request: Request) {
  const session = await getSession(request);
  if (!session) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }

  const marcas = await prisma.marca.findMany({
    where: { tenantId: session.tenantId },
    orderBy: { name: "asc" },
    select: { id: true, name: true },
  });
  return NextResponse.json(marcas);
}
