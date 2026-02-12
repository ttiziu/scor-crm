import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getSession } from "@/lib/auth/get-session";
import { getEffectiveTenantId } from "@/lib/auth/get-effective-tenant";
import { createClienteDireccionSchema } from "@/lib/validations/clientes";

type RouteParams = { params: Promise<{ id: string }> };

export async function GET(request: Request, { params }: RouteParams) {
  const session = await getSession(request);
  if (!session) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }
  if (session.role === "REPARTIDOR") {
    return NextResponse.json({ error: "Sin permiso" }, { status: 403 });
  }

  const tenantId = getEffectiveTenantId(request, session) ?? session.tenantId;
  const { id: clienteId } = await params;
  const cliente = await prisma.cliente.findFirst({
    where: { id: clienteId, tenantId },
    select: { id: true },
  });
  if (!cliente) {
    return NextResponse.json({ error: "Cliente no encontrado" }, { status: 404 });
  }

  const direcciones = await prisma.clienteDireccion.findMany({
    where: { clienteId },
    orderBy: { nombre: "asc" },
    select: {
      id: true,
      nombre: true,
      direccion: true,
      distrito: true,
      tipoValvula: true,
    },
  });
  return NextResponse.json(direcciones);
}

export async function POST(request: Request, { params }: RouteParams) {
  const session = await getSession(request);
  if (!session) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }
  if (session.role === "REPARTIDOR") {
    return NextResponse.json({ error: "Sin permiso" }, { status: 403 });
  }

  const tenantId = getEffectiveTenantId(request, session) ?? session.tenantId;
  const { id: clienteId } = await params;
  const cliente = await prisma.cliente.findFirst({
    where: { id: clienteId, tenantId },
    select: { id: true },
  });
  if (!cliente) {
    return NextResponse.json({ error: "Cliente no encontrado" }, { status: 404 });
  }

  try {
    const body = await request.json();
    const parsed = createClienteDireccionSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Datos inválidos", details: parsed.error.flatten().fieldErrors },
        { status: 400 }
      );
    }

    const dir = await prisma.clienteDireccion.create({
      data: {
        clienteId,
        nombre: parsed.data.nombre.trim(),
        direccion: parsed.data.direccion.trim(),
        distrito: parsed.data.distrito?.trim() ?? null,
        tipoValvula: parsed.data.tipoValvula?.trim() ?? null,
      },
      select: {
        id: true,
        nombre: true,
        direccion: true,
        distrito: true,
        tipoValvula: true,
      },
    });
    return NextResponse.json(dir, { status: 201 });
  } catch {
    return NextResponse.json({ error: "Error interno" }, { status: 500 });
  }
}
