import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getSession } from "@/lib/auth/get-session";
import { getEffectiveTenantId } from "@/lib/auth/get-effective-tenant";
import { updateClienteDireccionSchema } from "@/lib/validations/clientes";

type RouteParams = { params: Promise<{ id: string; dirId: string }> };

export async function PATCH(request: Request, { params }: RouteParams) {
  const session = await getSession(request);
  if (!session) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }
  if (session.role === "REPARTIDOR") {
    return NextResponse.json({ error: "Sin permiso" }, { status: 403 });
  }

  const tenantId = getEffectiveTenantId(request, session) ?? session.tenantId;
  const { id: clienteId, dirId } = await params;
  const existing = await prisma.clienteDireccion.findFirst({
    where: { id: dirId, cliente: { id: clienteId, tenantId } },
  });
  if (!existing) {
    return NextResponse.json({ error: "Dirección no encontrada" }, { status: 404 });
  }

  try {
    const body = await request.json();
    const parsed = updateClienteDireccionSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Datos inválidos", details: parsed.error.flatten().fieldErrors },
        { status: 400 }
      );
    }
    const data = parsed.data;

    const dir = await prisma.clienteDireccion.update({
      where: { id: dirId },
      data: {
        ...(data.nombre !== undefined && { nombre: data.nombre.trim() }),
        ...(data.direccion !== undefined && { direccion: data.direccion.trim() }),
        ...(data.distrito !== undefined && { distrito: data.distrito?.trim() ?? null }),
        ...(data.tipoValvula !== undefined && { tipoValvula: data.tipoValvula?.trim() ?? null }),
      },
      select: {
        id: true,
        nombre: true,
        direccion: true,
        distrito: true,
        tipoValvula: true,
      },
    });
    return NextResponse.json(dir);
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
  const { id: clienteId, dirId } = await params;
  const existing = await prisma.clienteDireccion.findFirst({
    where: { id: dirId, cliente: { id: clienteId, tenantId } },
  });
  if (!existing) {
    return NextResponse.json({ error: "Dirección no encontrada" }, { status: 404 });
  }

  await prisma.clienteDireccion.delete({ where: { id: dirId } });
  return new NextResponse(null, { status: 204 });
}
