import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getSession } from "@/lib/auth/get-session";
import { createClienteSchema } from "@/lib/validations/clientes";

export async function GET(request: Request) {
  try {
    const session = await getSession(request);
    if (!session) {
      return NextResponse.json({ error: "No autorizado" }, { status: 401 });
    }

    const clientes = await prisma.cliente.findMany({
      where: { tenantId: session.tenantId },
      orderBy: { createdAt: "desc" },
      select: {
        id: true,
        name: true,
        documento: true,
        direccion: true,
        telefono: true,
        email: true,
        createdAt: true,
      },
    });
    return NextResponse.json(clientes);
  } catch (err) {
    console.error("GET /api/clientes error:", err);
    return NextResponse.json({ error: "Error interno" }, { status: 500 });
  }
}

export async function POST(request: Request) {
  const session = await getSession(request);
  if (!session) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
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
        telefono: data.telefono,
        email,
      },
      select: {
        id: true,
        name: true,
        documento: true,
        direccion: true,
        telefono: true,
        email: true,
        createdAt: true,
      },
    });
    return NextResponse.json(cliente, { status: 201 });
  } catch (err) {
    console.error("POST /api/clientes error:", err);
    return NextResponse.json({ error: "Error interno" }, { status: 500 });
  }
}
