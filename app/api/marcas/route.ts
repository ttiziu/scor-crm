import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getSession } from "@/lib/auth/get-session";
import { getEffectiveTenantId } from "@/lib/auth/get-effective-tenant";
import { createMarcaSchema } from "@/lib/validations/marcas";

export async function GET(request: Request) {
  const session = await getSession(request);
  if (!session) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }

  const tenantId = getEffectiveTenantId(request, session) ?? session.tenantId;
  const marcas = await prisma.marca.findMany({
    where: { tenantId },
    orderBy: { name: "asc" },
    select: { id: true, name: true },
  });
  return NextResponse.json(marcas);
}

export async function POST(request: Request) {
  const session = await getSession(request);
  if (!session) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }
  if (session.role === "REPARTIDOR") {
    return NextResponse.json({ error: "Sin permiso" }, { status: 403 });
  }

  try {
    const body = await request.json();
    const parsed = createMarcaSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Datos inválidos", details: parsed.error.flatten().fieldErrors },
        { status: 400 }
      );
    }

    const tenantId = getEffectiveTenantId(request, session) ?? session.tenantId;
    const marca = await prisma.marca.create({
      data: {
        tenantId,
        name: parsed.data.name.trim(),
      },
      select: { id: true, name: true, createdAt: true },
    });
    return NextResponse.json(marca, { status: 201 });
  } catch {
    return NextResponse.json({ error: "Error interno" }, { status: 500 });
  }
}
