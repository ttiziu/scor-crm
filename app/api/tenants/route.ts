import { NextResponse } from "next/server";
import * as bcrypt from "bcryptjs";
import { prisma } from "@/lib/db";
import { Role } from "@prisma/client";
import { getSession } from "@/lib/auth/get-session";
import { createTenantSchema } from "@/lib/validations/tenants";

/** Listar todas las empresas. Solo SUPER_ADMIN. */
export async function GET(request: Request) {
  const session = await getSession(request);
  if (!session) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }
  if (session.role !== "SUPER_ADMIN") {
    return NextResponse.json({ error: "Sin permiso" }, { status: 403 });
  }

  try {
    const tenants = await prisma.tenant.findMany({
      where: { slug: { not: "platform" } },
      orderBy: { name: "asc" },
      select: {
        id: true,
        name: true,
        slug: true,
        isActive: true,
        createdAt: true,
        _count: {
          select: { users: true, clientes: true, pedidos: true },
        },
      },
    });
    return NextResponse.json(tenants);
  } catch {
    return NextResponse.json({ error: "Error al listar empresas" }, { status: 500 });
  }
}

/** Crear nueva empresa. Solo SUPER_ADMIN. Requiere primer admin. */
export async function POST(request: Request) {
  const session = await getSession(request);
  if (!session) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }
  if (session.role !== "SUPER_ADMIN") {
    return NextResponse.json({ error: "Sin permiso" }, { status: 403 });
  }

  try {
    const body = await request.json();
    const parsed = createTenantSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Datos inválidos", details: parsed.error.flatten().fieldErrors },
        { status: 400 }
      );
    }
    const { name, slug, firstAdmin } = parsed.data;

    const existing = await prisma.tenant.findUnique({ where: { slug } });
    if (existing) {
      return NextResponse.json({ error: "Ya existe una empresa con ese slug" }, { status: 409 });
    }

    const tenant = await prisma.tenant.create({
      data: { name, slug },
      select: { id: true, name: true, slug: true, createdAt: true },
    });

    const passwordHash = await bcrypt.hash(firstAdmin.password, 10);
    await prisma.user.create({
      data: {
        tenantId: tenant.id,
        username: firstAdmin.username,
        passwordHash,
        name: firstAdmin.name,
        role: Role.ADMIN,
      },
    });

    return NextResponse.json(tenant, { status: 201 });
  } catch {
    return NextResponse.json({ error: "Error al crear empresa" }, { status: 500 });
  }
}