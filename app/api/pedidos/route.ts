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
  try {
    const session = await getSession(request);
    if (!session) {
      return NextResponse.json({ error: "No autorizado" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const clienteId = searchParams.get("clienteId");
    const estadoParam = searchParams.get("estado");

    const where: Prisma.PedidoWhereInput = {
      tenantId: session.tenantId,
    };
    if (clienteId) where.clienteId = clienteId;
    if (isEstadoValido(estadoParam)) where.estado = estadoParam;

    const pedidos = await prisma.pedido.findMany({
      where,
      orderBy: { fechaPedido: "desc" },
      select: {
        id: true,
        clienteId: true,
        estado: true,
        cantidad: true,
        fechaPedido: true,
        observaciones: true,
        createdAt: true,
        cliente: { select: { id: true, name: true } },
      },
    });
    return NextResponse.json(pedidos);
  } catch (err) {
    console.error("GET /api/pedidos error:", err);
    return NextResponse.json({ error: "Error interno" }, { status: 500 });
  }
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

  try {
    const pedido = await prisma.pedido.create({
      data: {
        tenantId: session.tenantId,
        clienteId: data.clienteId,
        estado: data.estado ?? "CREATED",
        cantidad: data.cantidad ?? null,
        observaciones: data.observaciones ?? null,
      },
      select: {
        id: true,
        clienteId: true,
        estado: true,
        cantidad: true,
        fechaPedido: true,
        observaciones: true,
        createdAt: true,
        cliente: { select: { id: true, name: true } },
      },
    });
    return NextResponse.json(pedido, { status: 201 });
  } catch (err) {
    console.error("POST /api/pedidos error:", err);
    return NextResponse.json({ error: "Error interno" }, { status: 500 });
  }
}
