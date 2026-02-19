import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getSession } from "@/lib/auth/get-session";
import { getEffectiveTenantId } from "@/lib/auth/get-effective-tenant";
import { updateMarcaSchema } from "@/lib/validations/marcas";

type RouteParams = { params: Promise<{ id: string }> };

export async function PATCH(request: Request, { params }: RouteParams) {
  const session = await getSession(request);
  if (!session) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }
  if (session.role === "REPARTIDOR") {
    return NextResponse.json({ error: "Sin permiso" }, { status: 403 });
  }

  const tenantId = getEffectiveTenantId(request, session) ?? session.tenantId;
  const { id } = await params;
  const existing = await prisma.marca.findFirst({
    where: { id, tenantId },
  });
  if (!existing) {
    return NextResponse.json({ error: "Marca no encontrada" }, { status: 404 });
  }

  try {
    const body = await request.json();
    const parsed = updateMarcaSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Datos inválidos", details: parsed.error.flatten().fieldErrors },
        { status: 400 }
      );
    }

    const marca = await prisma.marca.update({
      where: { id },
      data: {
        ...(parsed.data.name !== undefined && { name: parsed.data.name.trim() }),
      },
      select: { id: true, name: true, createdAt: true, updatedAt: true },
    });
    return NextResponse.json(marca);
  } catch {
    return NextResponse.json({ error: "Error interno" }, { status: 500 });
  }
}

export async function DELETE(request: Request, { params }: RouteParams) {
  const session = await getSession(request);
  if (!session) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }
  if (session.role === "REPARTIDOR") {
    return NextResponse.json({ error: "Sin permiso" }, { status: 403 });
  }

  const tenantId = getEffectiveTenantId(request, session) ?? session.tenantId;
  const { id } = await params;
  const existing = await prisma.marca.findFirst({
    where: { id, tenantId },
  });
  if (!existing) {
    return NextResponse.json({ error: "Marca no encontrada" }, { status: 404 });
  }

  await prisma.marca.delete({ where: { id } });
  return new NextResponse(null, { status: 204 });
}
