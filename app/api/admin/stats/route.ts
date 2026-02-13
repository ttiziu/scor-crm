import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getSession } from "@/lib/auth/get-session";

/** Resumen global de todas las empresas. Solo SUPER_ADMIN. */
export async function GET(request: Request) {
  const session = await getSession(request);
  if (!session) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }
  if (session.role !== "SUPER_ADMIN") {
    return NextResponse.json({ error: "Sin permiso" }, { status: 403 });
  }

  const tenants = await prisma.tenant.findMany({
    where: { slug: { not: "platform" } },
    orderBy: { createdAt: "desc" },
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

  const totalEmpresas = tenants.length;
  const activas = tenants.filter((t) => t.isActive).length;
  const bloqueadas = totalEmpresas - activas;
  const totalClientes = tenants.reduce((s, t) => s + t._count.clientes, 0);
  const totalPedidos = tenants.reduce((s, t) => s + t._count.pedidos, 0);
  const totalUsuarios = tenants.reduce((s, t) => s + t._count.users, 0);

  return NextResponse.json({
    totalEmpresas,
    activas,
    bloqueadas,
    totalClientes,
    totalPedidos,
    totalUsuarios,
    ultimasEmpresas: tenants.slice(0, 10),
  });
}
