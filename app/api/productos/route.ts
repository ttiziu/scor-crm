import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getSession } from "@/lib/auth/get-session";
import { createProductoSchema } from "@/lib/validations/productos";

export async function GET(request: Request) {
  const session = await getSession(request);
  if (!session) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }
  if (session.role === "REPARTIDOR") {
    return NextResponse.json({ error: "Sin permiso" }, { status: 403 });
  }

  const PAGE_SIZE = 100;
  const productos = await prisma.producto.findMany({
    where: { tenantId: session.tenantId },
    orderBy: { name: "asc" },
    take: PAGE_SIZE,
    select: {
      id: true,
      name: true,
      createdAt: true,
    },
  });
  return NextResponse.json(productos);
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
    const parsed = createProductoSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Datos inválidos", details: parsed.error.flatten().fieldErrors },
        { status: 400 }
      );
    }

    const producto = await prisma.producto.create({
      data: {
        tenantId: session.tenantId,
        name: parsed.data.name.trim(),
      },
      select: {
        id: true,
        name: true,
        createdAt: true,
      },
    });
    return NextResponse.json(producto, { status: 201 });
  } catch {
    return NextResponse.json({ error: "Error interno" }, { status: 500 });
  }
}
