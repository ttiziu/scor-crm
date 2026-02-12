import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getSession } from "@/lib/auth/get-session";
import { updateTenantSchema } from "@/lib/validations/tenants";

type Params = { params: Promise<{ id: string }> };

/** Actualizar empresa (nombre, slug y/o estado). Solo SUPER_ADMIN. No se puede cambiar slug de "platform". */
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
    const parsed = updateTenantSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Datos inválidos", details: parsed.error.flatten().fieldErrors },
        { status: 400 }
      );
    }
    const data = parsed.data;

    const existing = await prisma.tenant.findUnique({ where: { id } });
    if (!existing) {
      return NextResponse.json({ error: "Empresa no encontrada" }, { status: 404 });
    }
    if (existing.slug === "platform" && data.slug !== undefined && data.slug !== "platform") {
      return NextResponse.json({ error: "No puedes cambiar el slug de la plataforma" }, { status: 400 });
    }

    if (data.slug !== undefined && data.slug !== existing.slug) {
      const taken = await prisma.tenant.findUnique({ where: { slug: data.slug } });
      if (taken) {
        return NextResponse.json({ error: "Ya existe una empresa con ese slug" }, { status: 409 });
      }
    }

    const updateData: { name?: string; slug?: string; isActive?: boolean } = {};
    if (data.name !== undefined) updateData.name = data.name.trim();
    if (data.slug !== undefined) updateData.slug = data.slug.trim().toLowerCase().replace(/\s+/g, "-");
    if (data.isActive !== undefined) updateData.isActive = data.isActive;

    const tenant = await prisma.tenant.update({
      where: { id },
      data: updateData,
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
