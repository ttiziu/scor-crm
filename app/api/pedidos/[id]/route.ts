import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getSession } from "@/lib/auth/get-session";
import { updatePedidoSchema } from "@/lib/validations/pedidos";

type RouteParams = { params: Promise<{ id: string }> };

export async function GET(request: Request, { params }: RouteParams) {
  const session = await getSession(request);
  if (!session) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }

  const { id } = await params;
  const pedido = await prisma.pedido.findFirst({
    where: { id, tenantId: session.tenantId },
    select: {
      id: true,
      clienteId: true,
      estado: true,
      cantidad: true,
      fechaPedido: true,
      observaciones: true,
      createdAt: true,
      updatedAt: true,
      cliente: { select: { id: true, name: true, documento: true, direccion: true, telefono: true } },
    },
  });
  if (!pedido) {
    return NextResponse.json({ error: "Pedido no encontrado" }, { status: 404 });
  }
  return NextResponse.json(pedido);
}

export async function PATCH(request: Request, { params }: RouteParams) {
  const session = await getSession(request);
  if (!session) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }

  const { id } = await params;
  const existing = await prisma.pedido.findFirst({
    where: { id, tenantId: session.tenantId },
  });
  if (!existing) {
    return NextResponse.json({ error: "Pedido no encontrado" }, { status: 404 });
  }

  try {
    const body = await request.json();
    const parsed = updatePedidoSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Datos inválidos", details: parsed.error.flatten().fieldErrors },
        { status: 400 }
      );
    }
    const data = parsed.data;

    const pedido = await prisma.pedido.update({
      where: { id },
      data: {
        ...(data.estado !== undefined && { estado: data.estado }),
        ...(data.cantidad !== undefined && { cantidad: data.cantidad }),
        ...(data.observaciones !== undefined && { observaciones: data.observaciones }),
      },
      select: {
        id: true,
        clienteId: true,
        estado: true,
        cantidad: true,
        fechaPedido: true,
        observaciones: true,
        createdAt: true,
        updatedAt: true,
        cliente: { select: { id: true, name: true } },
      },
    });
    return NextResponse.json(pedido);
  } catch (err) {
    console.error("PATCH /api/pedidos/[id] error:", err);
    return NextResponse.json({ error: "Error interno" }, { status: 500 });
  }
}

export async function DELETE(request: Request, { params }: RouteParams) {
  const session = await getSession(request);
  if (!session) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }

  const { id } = await params;
  const existing = await prisma.pedido.findFirst({
    where: { id, tenantId: session.tenantId },
  });
  if (!existing) {
    return NextResponse.json({ error: "Pedido no encontrado" }, { status: 404 });
  }

  await prisma.pedido.delete({ where: { id } });
  return new NextResponse(null, { status: 204 });
}
