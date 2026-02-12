import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getSession } from "@/lib/auth/get-session";
import { getEffectiveTenantId } from "@/lib/auth/get-effective-tenant";

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

  const ultimo = await prisma.pedido.findFirst({
    where: { clienteId, tenantId },
    orderBy: { fechaPedido: "desc" },
    select: {
      formaPago: true,
      efectivoCon: true,
      clienteDireccionId: true,
      observaciones: true,
      items: {
        select: {
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

  if (!ultimo) {
    return NextResponse.json(null);
  }

  return NextResponse.json({
    formaPago: ultimo.formaPago,
    efectivoCon: ultimo.efectivoCon != null ? Number(ultimo.efectivoCon) : null,
    clienteDireccionId: ultimo.clienteDireccionId ?? "",
    observaciones: ultimo.observaciones ?? "",
    items: ultimo.items.map((i) => ({
      productoId: i.productoId,
      marcaId: i.marcaId ?? "",
      cantidad: i.cantidad,
      precioUnitario: Number(i.precioUnitario),
      producto: i.producto,
      marca: i.marca,
    })),
  });
}
