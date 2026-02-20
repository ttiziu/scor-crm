import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import type { Role } from "@prisma/client";
import { getSession } from "@/lib/auth/get-session";
import { updateUsuarioSchema } from "@/lib/validations/usuarios";

/** Actualizar usuario (rol, nombre, usuario). Solo SUPER_ADMIN. */
export async function PATCH(
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

  const { id: userId } = await params;

  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { id: true, tenantId: true, username: true },
  });
  if (!user) {
    return NextResponse.json({ error: "Usuario no encontrado" }, { status: 404 });
  }

  try {
    const body = await request.json();
    const parsed = updateUsuarioSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Datos inválidos", details: parsed.error.flatten().fieldErrors },
        { status: 400 }
      );
    }
    const data = parsed.data;

    if (data.username !== undefined && data.username !== user.username) {
      const taken = await prisma.user.findUnique({
        where: {
          tenantId_username: { tenantId: user.tenantId, username: data.username },
        },
      });
      if (taken) {
        return NextResponse.json(
          { error: "Ya existe un usuario con ese nombre de usuario" },
          { status: 409 }
        );
      }
    }

    const updateData: { name?: string; username?: string; role?: Role } = {};
    if (data.name !== undefined) updateData.name = data.name;
    if (data.username !== undefined) updateData.username = data.username;
    if (data.role !== undefined) updateData.role = data.role as Role;

    const updated = await prisma.user.update({
      where: { id: userId },
      data: updateData,
      select: {
        id: true,
        username: true,
        name: true,
        role: true,
        createdAt: true,
      },
    });
    return NextResponse.json(updated);
  } catch {
    return NextResponse.json({ error: "Error interno" }, { status: 500 });
  }
}

/** Eliminar usuario de una empresa. Solo SUPER_ADMIN. */
export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getSession(request);
  if (!session) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }
  if (session.role !== "SUPER_ADMIN") {
    return NextResponse.json({ error: "Solo el super administrador puede eliminar usuarios" }, { status: 403 });
  }

  const { id: userId } = await params;

  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { id: true, tenant: { select: { slug: true } } },
  });
  if (!user) {
    return NextResponse.json({ error: "Usuario no encontrado" }, { status: 404 });
  }
  if (user.id === session.userId) {
    return NextResponse.json({ error: "No puedes eliminarte a ti mismo" }, { status: 400 });
  }
  if (user.tenant.slug === "platform") {
    return NextResponse.json({ error: "No se pueden eliminar usuarios de la plataforma" }, { status: 400 });
  }

  await prisma.user.delete({ where: { id: userId } });
  return new NextResponse(null, { status: 204 });
}
