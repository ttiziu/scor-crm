import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getSession } from "@/lib/auth/get-session";
import { createClienteSchema } from "@/lib/validations/clientes";

export async function GET(request: Request) {
  const session = await getSession(request);
  if (!session) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }
  if (session.role === "REPARTIDOR") {
    return NextResponse.json({ error: "Sin permiso" }, { status: 403 });
  }

  const PAGE_SIZE = 100;
  const clientes = await prisma.cliente.findMany({
    where: { tenantId: session.tenantId },
    orderBy: { createdAt: "desc" },
    take: PAGE_SIZE,
    select: {
      id: true,
      name: true,
      documento: true,
      direccion: true,
      distrito: true,
      tipoValvula: true,
      telefono: true,
      email: true,
      createdAt: true,
    },
  });
  return NextResponse.json(clientes);
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
    const parsed = createClienteSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Datos inválidos", details: parsed.error.flatten().fieldErrors },
        { status: 400 }
      );
    }
    const data = parsed.data;
    const email = data.email === "" ? undefined : data.email;

    const cliente = await prisma.cliente.create({
      data: {
        tenantId: session.tenantId,
        name: data.name,
        documento: data.documento,
        direccion: data.direccion,
        distrito: data.distrito,
        tipoValvula: data.tipoValvula,
        telefono: data.telefono,
        email,
      },
      select: {
        id: true,
        name: true,
        documento: true,
        direccion: true,
        distrito: true,
        tipoValvula: true,
        telefono: true,
        email: true,
        createdAt: true,
      },
    });
    return NextResponse.json(cliente, { status: 201 });
  } catch {
    return NextResponse.json({ error: "Error interno" }, { status: 500 });
  }
}
