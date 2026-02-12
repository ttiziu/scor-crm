import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getSession } from "@/lib/auth/get-session";
import { getEffectiveTenantId } from "@/lib/auth/get-effective-tenant";
import { updatePedidoSchema } from "@/lib/validations/pedidos";

type RouteParams = { params: Promise<{ id: string }> };

export async function GET(request: Request, { params }: RouteParams) {
  const session = await getSession(request);
  if (!session) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }

  const tenantId = getEffectiveTenantId(request, session) ?? session.tenantId;
  const { id } = await params;
  const where: { id: string; tenantId: string; repartidorId?: string } = { id, tenantId };
  if (session.role === "REPARTIDOR") {
    where.repartidorId = session.userId;
  }
  const pedido = await prisma.pedido.findFirst({
    where,
    select: {
      id: true,
      clienteId: true,
      clienteDireccionId: true,
      estado: true,
      cantidad: true,
      fechaPedido: true,
      fechaProgramada: true,
      repartidorId: true,
      asignadoEn: true,
      formaPago: true,
      efectivoCon: true,
      motivoCancelacion: true,
      observaciones: true,
      createdAt: true,
      updatedAt: true,
      cliente: { select: { id: true, name: true, documento: true, direccion: true, telefono: true, distrito: true } },
      clienteDireccion: { select: { id: true, nombre: true, direccion: true, distrito: true } },
      repartidor: { select: { id: true, name: true } },
      items: {
        select: {
          id: true,
          productoId: true,
          marcaId: true,
          cantidad: true,
          precioUnitario: true,
          producto: { select: { id: true, name: true } },
          marca: { select: { id: true, name: true } },
        },
      },
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

  const tenantId = getEffectiveTenantId(request, session) ?? session.tenantId;
  const { id } = await params;
  const wherePatch: { id: string; tenantId: string; repartidorId?: string } = { id, tenantId };
  if (session.role === "REPARTIDOR") wherePatch.repartidorId = session.userId;
  const existing = await prisma.pedido.findFirst({ where: wherePatch });
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

    if (data.repartidorId !== undefined && data.repartidorId !== null && data.repartidorId !== "") {
      const repartidor = await prisma.user.findFirst({
        where: { id: data.repartidorId, tenantId, role: "REPARTIDOR" },
      });
      if (!repartidor) {
        return NextResponse.json({ error: "Repartidor no encontrado o no tiene rol REPARTIDOR" }, { status: 400 });
      }
    }

    if (data.clienteDireccionId !== undefined && data.clienteDireccionId !== null && data.clienteDireccionId !== "") {
      const dir = await prisma.clienteDireccion.findFirst({
        where: {
          id: data.clienteDireccionId,
          clienteId: existing.clienteId,
          cliente: { tenantId },
        },
      });
      if (!dir) {
        return NextResponse.json({ error: "La dirección no pertenece al cliente del pedido" }, { status: 400 });
      }
    }

    if (data.items && data.items.length > 0) {
      const productoIds = [...new Set(data.items.map((i) => i.productoId))];
      const productos = await prisma.producto.findMany({
        where: { id: { in: productoIds }, tenantId },
        select: { id: true },
      });
      if (productos.length !== productoIds.length) {
        return NextResponse.json({ error: "Uno o más productos no existen o no pertenecen al tenant" }, { status: 400 });
      }
      const marcaIds = [...new Set(data.items.map((i) => i.marcaId).filter(Boolean))] as string[];
      if (marcaIds.length > 0) {
        const marcas = await prisma.marca.findMany({
          where: { id: { in: marcaIds }, tenantId },
          select: { id: true },
        });
        if (marcas.length !== marcaIds.length) {
          return NextResponse.json({ error: "Una o más marcas no existen o no pertenecen al tenant" }, { status: 400 });
        }
      }
    }

    let updateData: Parameters<typeof prisma.pedido.update>[0]["data"];
    if (session.role === "REPARTIDOR") {
      if (data.estado !== undefined && data.estado !== "IN_ROUTE" && data.estado !== "DELIVERED") {
        return NextResponse.json(
          { error: "El repartidor solo puede marcar En ruta o Entregado" },
          { status: 403 }
        );
      }
      updateData = { ...(data.estado !== undefined && { estado: data.estado }) };
    } else {
      const newRepartidorId = data.repartidorId === "" ? null : data.repartidorId ?? undefined;
      const isAssigningRepartidor = newRepartidorId !== undefined && newRepartidorId !== null && newRepartidorId !== existing.repartidorId;
      updateData = {
        ...(data.estado !== undefined && { estado: data.estado }),
        ...(data.cantidad !== undefined && { cantidad: data.cantidad }),
        ...(data.observaciones !== undefined && { observaciones: data.observaciones }),
        ...(data.motivoCancelacion !== undefined && { motivoCancelacion: data.motivoCancelacion }),
        ...(data.repartidorId !== undefined && {
          repartidorId: data.repartidorId === "" ? null : data.repartidorId,
          ...(isAssigningRepartidor && newRepartidorId ? { asignadoEn: new Date() } : data.repartidorId === "" ? { asignadoEn: null } : {}),
        }),
        ...(data.clienteDireccionId !== undefined && { clienteDireccionId: data.clienteDireccionId === "" ? null : data.clienteDireccionId }),
        ...(data.formaPago !== undefined && { formaPago: data.formaPago }),
        ...(data.efectivoCon !== undefined && { efectivoCon: data.efectivoCon }),
        ...(data.fechaProgramada !== undefined && {
          fechaProgramada: data.fechaProgramada ? new Date(data.fechaProgramada + "T00:00:00") : null,
        }),
      };
      if (data.items !== undefined) {
        await prisma.pedidoItem.deleteMany({ where: { pedidoId: id } });
        if (data.items.length > 0) {
          updateData.items = {
            create: data.items.map((item) => ({
              productoId: item.productoId,
              marcaId: item.marcaId && item.marcaId !== "" ? item.marcaId : null,
              cantidad: item.cantidad,
              precioUnitario: item.precioUnitario,
            })),
          };
        }
      }
    }

    const pedido = await prisma.pedido.update({
      where: { id },
      data: updateData,
      select: {
        id: true,
        clienteId: true,
        clienteDireccionId: true,
        estado: true,
        cantidad: true,
        fechaPedido: true,
        fechaProgramada: true,
        repartidorId: true,
        asignadoEn: true,
        formaPago: true,
        efectivoCon: true,
        motivoCancelacion: true,
        observaciones: true,
        createdAt: true,
        updatedAt: true,
        cliente: { select: { id: true, name: true } },
        clienteDireccion: { select: { id: true, nombre: true, direccion: true, distrito: true } },
        repartidor: { select: { id: true, name: true } },
        items: {
          select: {
            id: true,
            productoId: true,
            marcaId: true,
            cantidad: true,
            precioUnitario: true,
            producto: { select: { id: true, name: true } },
            marca: { select: { id: true, name: true } },
          },
        },
      },
    });
    return NextResponse.json(pedido);
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
    return NextResponse.json({ error: "Solo administradores pueden eliminar pedidos" }, { status: 403 });
  }

  const tenantId = getEffectiveTenantId(request, session) ?? session.tenantId;
  const { id } = await params;
  const existing = await prisma.pedido.findFirst({
    where: { id, tenantId },
  });
  if (!existing) {
    return NextResponse.json({ error: "Pedido no encontrado" }, { status: 404 });
  }

  await prisma.pedido.delete({ where: { id } });
  return new NextResponse(null, { status: 204 });
}
