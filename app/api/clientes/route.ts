import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getSession } from "@/lib/auth/get-session";
import { getEffectiveTenantId } from "@/lib/auth/get-effective-tenant";
import { createClienteSchema } from "@/lib/validations/clientes";

export async function GET(request: Request) {
  const session = await getSession(request);
  if (!session) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }
  if (session.role === "REPARTIDOR") {
    return NextResponse.json({ error: "Sin permiso" }, { status: 403 });
  }

  const { searchParams } = new URL(request.url);
  const nombreQuery = searchParams.get("nombre")?.trim();
  const documentoQuery = searchParams.get("documento")?.trim();
  const telefonoQuery = searchParams.get("telefono")?.trim();
  const pageParam = searchParams.get("page");
  const pageSizeParam = searchParams.get("pageSize");

  const tenantId = getEffectiveTenantId(request, session) ?? session.tenantId;
  const where = {
    tenantId,
    ...(nombreQuery && { name: { contains: nombreQuery, mode: "insensitive" as const } }),
    ...(documentoQuery && { documento: { contains: documentoQuery, mode: "insensitive" as const } }),
    ...(telefonoQuery && { telefono: { contains: telefonoQuery } }),
  };

  const PAGE_SIZE = 100;
  const page = pageParam ? Math.max(1, parseInt(pageParam, 10) || 1) : 1;
  const pageSize = pageSizeParam ? Math.min(100, Math.max(10, parseInt(pageSizeParam, 10) || 100)) : PAGE_SIZE;
  const skip = (page - 1) * pageSize;

  const [total, clientes] = await Promise.all([
    prisma.cliente.count({ where }),
    prisma.cliente.findMany({
      where,
      orderBy: { createdAt: "desc" },
      skip: pageParam ? skip : 0,
      take: pageParam ? pageSize : PAGE_SIZE,
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
    }),
  ]);

  if (pageParam) {
    return NextResponse.json({ clientes, total, page, pageSize });
  }
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
    const nameTrim = data.name?.trim() ?? "";
    const tenantId = getEffectiveTenantId(request, session) ?? session.tenantId;
    const count = await prisma.cliente.count({ where: { tenantId } });
    const name = nameTrim ? nameTrim : `Cliente ${count + 1}`;

    const cliente = await prisma.cliente.create({
      data: {
        tenantId,
        name,
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

    const direccionesAdicionales = data.direccionesAdicionales ?? [];
    if (direccionesAdicionales.length > 0) {
      await prisma.clienteDireccion.createMany({
        data: direccionesAdicionales.map((d) => ({
          clienteId: cliente.id,
          nombre: d.nombre.trim(),
          direccion: d.direccion.trim(),
          distrito: d.distrito?.trim() ?? null,
          tipoValvula: d.tipoValvula?.trim() ?? null,
        })),
      });
    }

    return NextResponse.json(cliente, { status: 201 });
  } catch {
    return NextResponse.json({ error: "Error interno" }, { status: 500 });
  }
}
