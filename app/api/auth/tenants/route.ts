import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";

/** Lista pública de empresas (slug, name) para el selector del login. */
export async function GET() {
  try {
    const tenants = await prisma.tenant.findMany({
      where: { isActive: true },
      orderBy: { name: "asc" },
      select: { id: true, name: true, slug: true },
    });
    return NextResponse.json(tenants);
  } catch {
    return NextResponse.json({ error: "Error al cargar empresas" }, { status: 500 });
  }
}
