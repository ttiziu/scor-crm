import { NextResponse } from "next/server";
import * as bcrypt from "bcryptjs";
import type { Role } from "@prisma/client";
import { prisma } from "@/lib/db";
import { getSession } from "@/lib/auth/get-session";
import { updateUsuarioSchema } from "@/lib/validations/usuarios";

type RouteParams = { params: Promise<{ id: string }> };

export async function GET(request: Request, { params }: RouteParams) {
  const session = await getSession(request);
  if (!session) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }
  if (session.role !== "ADMIN") {
    return NextResponse.json({ error: "Sin permiso" }, { status: 403 });
  }

  const { id } = await params;
  const user = await prisma.user.findFirst({
    where: { id, tenantId: session.tenantId },
    select: {
      id: true,
      username: true,
      email: true,
      name: true,
      role: true,
      createdAt: true,
      updatedAt: true,
    },
  });
  if (!user) {
    return NextResponse.json({ error: "Usuario no encontrado" }, { status: 404 });
  }
  return NextResponse.json(user);
}

export async function PATCH(request: Request, { params }: RouteParams) {
  const session = await getSession(request);
  if (!session) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }
  if (session.role !== "ADMIN") {
    return NextResponse.json({ error: "Sin permiso" }, { status: 403 });
  }

  const { id } = await params;
  const existing = await prisma.user.findFirst({
    where: { id, tenantId: session.tenantId },
  });
  if (!existing) {
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

    if (data.username !== undefined && data.username !== existing.username) {
      const taken = await prisma.user.findUnique({
        where: { tenantId_username: { tenantId: session.tenantId, username: data.username } },
      });
      if (taken) {
        return NextResponse.json({ error: "Ya existe un usuario con ese nombre de usuario" }, { status: 409 });
      }
    }

    const updateData: { name?: string; username?: string; role?: Role; passwordHash?: string } = {};
    if (data.name !== undefined) updateData.name = data.name;
    if (data.username !== undefined) updateData.username = data.username;
    if (data.role !== undefined) updateData.role = data.role;
    if (data.password !== undefined) {
      updateData.passwordHash = await bcrypt.hash(data.password, 10);
    }

    const user = await prisma.user.update({
      where: { id },
      data: updateData,
      select: {
        id: true,
        username: true,
        email: true,
        name: true,
        role: true,
        createdAt: true,
        updatedAt: true,
      },
    });
    return NextResponse.json(user);
  } catch {
    return NextResponse.json({ error: "Error interno" }, { status: 500 });
  }
}

export async function DELETE(request: Request, { params }: RouteParams) {
  const session = await getSession(request);
  if (!session) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }
  if (session.role !== "ADMIN") {
    return NextResponse.json({ error: "Sin permiso" }, { status: 403 });
  }

  const { id } = await params;
  const existing = await prisma.user.findFirst({
    where: { id, tenantId: session.tenantId },
  });
  if (!existing) {
    return NextResponse.json({ error: "Usuario no encontrado" }, { status: 404 });
  }
  if (existing.id === session.userId) {
    return NextResponse.json({ error: "No puedes eliminarte a ti mismo" }, { status: 400 });
  }

  await prisma.user.delete({ where: { id } });
  return new NextResponse(null, { status: 204 });
}
