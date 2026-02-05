import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getSession } from "@/lib/auth/get-session";

function todayISO() {
  const d = new Date();
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

export async function GET(request: Request) {
  const session = await getSession(request);
  if (!session) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }
  if (session.role === "REPARTIDOR") {
    return NextResponse.json({ error: "Sin permiso" }, { status: 403 });
  }

  const tenantId = session.tenantId;
  const hoy = todayISO();
  const startOfDay = new Date(hoy + "T00:00:00");
  const endOfDay = new Date(startOfDay);
  endOfDay.setDate(endOfDay.getDate() + 1);

  const whereHoy = {
    tenantId,
    fechaProgramada: { gte: startOfDay, lt: endOfDay },
  };

  const [totalClientes, pedidosHoy, creados, enRuta, entregados, cancelados] = await Promise.all([
    prisma.cliente.count({ where: { tenantId } }),
    prisma.pedido.count({ where: whereHoy }),
    prisma.pedido.count({ where: { ...whereHoy, estado: "CREATED" } }),
    prisma.pedido.count({ where: { ...whereHoy, estado: "IN_ROUTE" } }),
    prisma.pedido.count({ where: { ...whereHoy, estado: "DELIVERED" } }),
    prisma.pedido.count({ where: { ...whereHoy, estado: "CANCELLED" } }),
  ]);

  return NextResponse.json({
    totalClientes,
    pedidosHoy,
    creados,
    enRuta,
    entregados,
    cancelados,
  });
}
