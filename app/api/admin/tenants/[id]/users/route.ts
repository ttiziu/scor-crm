import { NextResponse } from "next/server";
import * as bcrypt from "bcryptjs";
import { prisma } from "@/lib/db";
import { getSession } from "@/lib/auth/get-session";
import { createUsuarioSchema } from "@/lib/validations/usuarios";

/** Listar usuarios de una empresa. Solo SUPER_ADMIN. */
export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getSession(request);
  if (!session) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }
  if (session.role !== "SUPER_ADMIN") {
    return NextResponse.json({ error: "Sin permiso" }, { status: 403 });
  }

  const { id: tenantId } = await params;

  const tenant = await prisma.tenant.findUnique({
    where: { id: tenantId },
    select: { id: true, name: true, slug: true },
  });
  if (!tenant || tenant.slug === "platform") {
    return NextResponse.json({ error: "Empresa no encontrada" }, { status: 404 });
  }

  const users = await prisma.user.findMany({
    where: { tenantId },
    orderBy: { createdAt: "asc" },
    select: {
      id: true,
      username: true,
      name: true,
      role: true,
      createdAt: true,
    },
  });

  return NextResponse.json({ tenant, users });
}

/** Crear usuario en una empresa. Solo SUPER_ADMIN. */
export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getSession(request);
  if (!session) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }
  if (session.role !== "SUPER_ADMIN") {
    return NextResponse.json({ error: "Sin permiso" }, { status: 403 });
  }

  const { id: tenantId } = await params;

  const tenant = await prisma.tenant.findUnique({
    where: { id: tenantId },
    select: { id: true, slug: true },
  });
  if (!tenant || tenant.slug === "platform") {
    return NextResponse.json({ error: "Empresa no encontrada" }, { status: 404 });
  }

  try {
    const body = await request.json();
    const parsed = createUsuarioSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Datos inválidos", details: parsed.error.flatten().fieldErrors },
        { status: 400 }
      );
    }
    const data = parsed.data;
    const email = data.email === "" ? undefined : data.email;

    const existing = await prisma.user.findUnique({
      where: { tenantId_username: { tenantId, username: data.username } },
    });
    if (existing) {
      return NextResponse.json(
        { error: "Ya existe un usuario con ese nombre de usuario" },
        { status: 409 }
      );
    }

    const passwordHash = await bcrypt.hash(data.password, 10);
    const user = await prisma.user.create({
      data: {
        tenantId,
        username: data.username,
        email,
        passwordHash,
        name: data.name,
        role: data.role,
      },
      select: {
        id: true,
        username: true,
        name: true,
        role: true,
        createdAt: true,
      },
    });
    return NextResponse.json(user, { status: 201 });
  } catch {
    return NextResponse.json({ error: "Error interno" }, { status: 500 });
  }
}
