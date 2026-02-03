import { NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/db";
import { getSession } from "@/lib/auth/get-session";
import { createPedidoSchema } from "@/lib/validations/pedidos";

const ESTADOS_VALIDOS = ["CREATED", "IN_ROUTE", "DELIVERED", "CANCELLED"] as const;

function isEstadoValido(estado: string | null): estado is (typeof ESTADOS_VALIDOS)[number] {
  return estado !== null && (ESTADOS_VALIDOS as readonly string[]).includes(estado);
}

export async function GET(request: Request) {
  const session = await getSession(request);
  if (!session) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const clienteId = searchParams.get("clienteId");
  const clienteQuery = searchParams.get("clienteQuery")?.trim(); // nombre o documento (buscar clientes y filtrar pedidos)
  const estadoParam = searchParams.get("estado");
  const fechaParam = searchParams.get("fecha"); // YYYY-MM-DD: opcional; si no se envía, no filtra por fecha
  const repartidorIdParam = searchParams.get("repartidorId"); // solo para ADMIN/OPERADOR

  const where: Prisma.PedidoWhereInput = {
    tenantId: session.tenantId,
  };
  if (session.role === "REPARTIDOR") {
    where.repartidorId = session.userId;
  } else if (repartidorIdParam) {
    where.repartidorId = repartidorIdParam;
  }
  if (clienteId) where.clienteId = clienteId;
  if (clienteQuery) {
    const clientesMatch = await prisma.cliente.findMany({
      where: {
        tenantId: session.tenantId,
        OR: [
          { name: { contains: clienteQuery, mode: "insensitive" } },
          { documento: { contains: clienteQuery, mode: "insensitive" } },
        ],
      },
      select: { id: true },
    });
    const ids = clientesMatch.map((c) => c.id);
    where.clienteId = ids.length === 0 ? { in: [] } : { in: ids };
  }
  if (isEstadoValido(estadoParam)) where.estado = estadoParam;
  if (fechaParam && /^\d{4}-\d{2}-\d{2}$/.test(fechaParam)) {
    const start = new Date(fechaParam + "T00:00:00");
    const end = new Date(start);
    end.setDate(end.getDate() + 1);
    where.fechaProgramada = { gte: start, lt: end };
  }

  const PAGE_SIZE = 100;
  const pedidos = await prisma.pedido.findMany({
    where,
    orderBy: { fechaPedido: "desc" },
    take: PAGE_SIZE,
    select: {
      id: true,
      clienteId: true,
      clienteDireccionId: true,
      estado: true,
      cantidad: true,
      fechaPedido: true,
      fechaProgramada: true,
      repartidorId: true,
      formaPago: true,
      efectivoCon: true,
      motivoCancelacion: true,
      observaciones: true,
      createdAt: true,
      cliente: { select: { id: true, name: true, direccion: true, distrito: true, telefono: true } },
      clienteDireccion: { select: { id: true, nombre: true, direccion: true, distrito: true } },
      repartidor: { select: { id: true, name: true } },
      items: {
        select: {
          id: true,
          productoId: true,
          cantidad: true,
          precioUnitario: true,
          producto: { select: { id: true, name: true } },
        },
      },
    },
  });
  return NextResponse.json(pedidos);
}

export async function POST(request: Request) {
  const session = await getSession(request);
  if (!session) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Body JSON inválido o vacío" }, { status: 400 });
  }

  const parsed = createPedidoSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Datos inválidos", details: parsed.error.flatten().fieldErrors },
      { status: 400 }
    );
  }
  const data = parsed.data;

  const cliente = await prisma.cliente.findFirst({
    where: { id: data.clienteId, tenantId: session.tenantId },
  });
  if (!cliente) {
    return NextResponse.json({ error: "Cliente no encontrado" }, { status: 404 });
  }

  // Interpretar "YYYY-MM-DD" como medianoche LOCAL (no UTC) para que no cambie de día en Perú/etc.
  const fechaProgramada = data.fechaProgramada
    ? new Date(data.fechaProgramada + "T00:00:00")
    : undefined;
  if (data.repartidorId) {
    const repartidor = await prisma.user.findFirst({
      where: { id: data.repartidorId, tenantId: session.tenantId, role: "REPARTIDOR" },
    });
    if (!repartidor) {
      return NextResponse.json({ error: "Repartidor no encontrado o no tiene rol REPARTIDOR" }, { status: 400 });
    }
  }

  if (data.clienteDireccionId) {
    const dir = await prisma.clienteDireccion.findFirst({
      where: {
        id: data.clienteDireccionId,
        clienteId: data.clienteId,
        cliente: { tenantId: session.tenantId },
      },
    });
    if (!dir) {
      return NextResponse.json({ error: "La dirección no pertenece al cliente seleccionado" }, { status: 400 });
    }
  }

  if (data.items && data.items.length > 0) {
    const productoIds = [...new Set(data.items.map((i) => i.productoId))];
    const productos = await prisma.producto.findMany({
      where: { id: { in: productoIds }, tenantId: session.tenantId },
      select: { id: true },
    });
    if (productos.length !== productoIds.length) {
      return NextResponse.json({ error: "Uno o más productos no existen o no pertenecen al tenant" }, { status: 400 });
    }
  }

  try {
    const pedido = await prisma.pedido.create({
      data: {
        tenantId: session.tenantId,
        clienteId: data.clienteId,
        clienteDireccionId: data.clienteDireccionId && data.clienteDireccionId !== "" ? data.clienteDireccionId : null,
        estado: data.estado ?? "CREATED",
        cantidad: data.cantidad ?? null,
        observaciones: data.observaciones ?? null,
        fechaProgramada: fechaProgramada ?? null,
        repartidorId: data.repartidorId && data.repartidorId !== "" ? data.repartidorId : null,
        formaPago: data.formaPago ?? null,
        efectivoCon: data.efectivoCon != null ? data.efectivoCon : null,
        items:
          data.items && data.items.length > 0
            ? {
                create: data.items.map((item) => ({
                  productoId: item.productoId,
                  cantidad: item.cantidad,
                  precioUnitario: item.precioUnitario,
                })),
              }
            : undefined,
      },
      select: {
        id: true,
        clienteId: true,
        clienteDireccionId: true,
        estado: true,
        cantidad: true,
        fechaPedido: true,
        fechaProgramada: true,
        repartidorId: true,
        formaPago: true,
        efectivoCon: true,
        observaciones: true,
        createdAt: true,
        cliente: { select: { id: true, name: true } },
        clienteDireccion: { select: { id: true, nombre: true, direccion: true, distrito: true } },
        repartidor: { select: { id: true, name: true } },
        items: {
          select: {
            id: true,
            productoId: true,
            cantidad: true,
            precioUnitario: true,
            producto: { select: { id: true, name: true } },
          },
        },
      },
    });
    return NextResponse.json(pedido, { status: 201 });
  } catch {
    return NextResponse.json({ error: "Error interno" }, { status: 500 });
  }
}
