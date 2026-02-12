import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getSession } from "@/lib/auth/get-session";

type Params = { params: Promise<{ id: string }> };

/** Bloquear o desbloquear empresa. Solo SUPER_ADMIN. */
export async function PATCH(request: Request, { params }: Params) {
  const session = await getSession(request);
  if (!session) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }
  if (session.role !== "SUPER_ADMIN") {
    return NextResponse.json({ error: "Sin permiso" }, { status: 403 });
  }

  const { id } = await params;

  try {
    const body = await request.json();
    const isActive = body.isActive;
    if (typeof isActive !== "boolean") {
      return NextResponse.json({ error: "isActive debe ser true o false" }, { status: 400 });
    }

    const tenant = await prisma.tenant.update({
      where: { id },
      data: { isActive },
      select: { id: true, name: true, slug: true, isActive: true, createdAt: true },
    });
    return NextResponse.json(tenant);
  } catch (e) {
    const msg = e instanceof Error ? e.message : "";
    if (msg.includes("Record to update not found")) {
      return NextResponse.json({ error: "Empresa no encontrada" }, { status: 404 });
    }
    return NextResponse.json({ error: "Error al actualizar" }, { status: 500 });
  }
}

/** Eliminar empresa y todos sus datos. Solo SUPER_ADMIN. No se puede eliminar "platform". */
export async function DELETE(request: Request, { params }: Params) {
  const session = await getSession(request);
  if (!session) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }
  if (session.role !== "SUPER_ADMIN") {
    return NextResponse.json({ error: "Sin permiso" }, { status: 403 });
  }

  const { id } = await params;

  try {
    const tenant = await prisma.tenant.findUnique({ where: { id } });
    if (!tenant) {
      return NextResponse.json({ error: "Empresa no encontrada" }, { status: 404 });
    }
    if (tenant.slug === "platform") {
      return NextResponse.json({ error: "No puedes eliminar la plataforma" }, { status: 400 });
    }

    await prisma.tenant.delete({ where: { id } });
    return new NextResponse(null, { status: 204 });
  } catch {
    return NextResponse.json({ error: "Error al eliminar" }, { status: 500 });
  }
}
