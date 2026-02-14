import { NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import * as XLSX from "xlsx";
import { prisma } from "@/lib/db";
import { getSession } from "@/lib/auth/get-session";
import { getEffectiveTenantId } from "@/lib/auth/get-effective-tenant";

const ESTADOS_VALIDOS = ["CREATED", "IN_ROUTE", "DELIVERED", "CANCELLED"] as const;
const FORMAS_PAGO_VALIDAS = ["YAPE", "PLIN", "TRANSFERENCIA", "EFECTIVO", "TARJETA"] as const;

function isEstadoValido(estado: string | null): estado is (typeof ESTADOS_VALIDOS)[number] {
  return estado !== null && (ESTADOS_VALIDOS as readonly string[]).includes(estado);
}

function isFormaPagoValida(formaPago: string | null): formaPago is (typeof FORMAS_PAGO_VALIDAS)[number] {
  return formaPago !== null && (FORMAS_PAGO_VALIDAS as readonly string[]).includes(formaPago);
}

function estadoLabel(estado: string): string {
  switch (estado) {
    case "CREATED": return "Creado";
    case "IN_ROUTE": return "En ruta";
    case "DELIVERED": return "Entregado";
    case "CANCELLED": return "Cancelado";
    default: return estado;
  }
}

function formatDate(d: Date | null): string {
  if (!d) return "";
  const x = new Date(d);
  const day = String(x.getDate()).padStart(2, "0");
  const month = String(x.getMonth() + 1).padStart(2, "0");
  const year = x.getFullYear();
  return `${day}/${month}/${year}`;
}

function cell(val: string | null | undefined): string {
  if (val == null) return "";
  return String(val);
}

export async function GET(request: Request) {
  const session = await getSession(request);
  if (!session) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const clienteId = searchParams.get("clienteId");
  const clienteQuery = searchParams.get("clienteQuery")?.trim();
  const estadoParam = searchParams.get("estado");
  const fechaParam = searchParams.get("fecha");
  const fechaDesdeParam = searchParams.get("fechaDesde");
  const fechaHastaParam = searchParams.get("fechaHasta");
  const repartidorIdParam = searchParams.get("repartidorId");
  const formaPagoParam = searchParams.get("formaPago");

  const tenantId = getEffectiveTenantId(request, session) ?? session.tenantId;
  const where: Prisma.PedidoWhereInput = {
    tenantId,
  };
  if (session.role === "REPARTIDOR") {
    where.repartidorId = session.userId;
  } else if (repartidorIdParam) {
    where.repartidorId = repartidorIdParam;
  }
  if (clienteId) where.clienteId = clienteId;
  if (clienteQuery) {
    const clientesMatch = await prisma.cliente.findMany({
      where: {
        tenantId,
        OR: [
          { name: { contains: clienteQuery, mode: "insensitive" } },
          { documento: { contains: clienteQuery, mode: "insensitive" } },
        ],
      },
      select: { id: true },
    });
    const ids = clientesMatch.map((c) => c.id);
    where.clienteId = ids.length === 0 ? { in: [] } : { in: ids };
  }
  if (isEstadoValido(estadoParam)) where.estado = estadoParam;
  if (isFormaPagoValida(formaPagoParam)) where.formaPago = formaPagoParam;
  const dateOnlyRe = /^\d{4}-\d{2}-\d{2}$/;
  if (fechaDesdeParam && dateOnlyRe.test(fechaDesdeParam) && fechaHastaParam && dateOnlyRe.test(fechaHastaParam)) {
    const start = new Date(fechaDesdeParam + "T00:00:00");
    const end = new Date(fechaHastaParam + "T00:00:00");
    end.setDate(end.getDate() + 1);
    where.fechaProgramada = { gte: start, lt: end };
  } else if (fechaParam && dateOnlyRe.test(fechaParam)) {
    const start = new Date(fechaParam + "T00:00:00");
    const end = new Date(start);
    end.setDate(end.getDate() + 1);
    where.fechaProgramada = { gte: start, lt: end };
  }

  const pedidos = await prisma.pedido.findMany({
    where,
    orderBy: { fechaPedido: "desc" },
    select: {
      estado: true,
      fechaPedido: true,
      fechaProgramada: true,
      formaPago: true,
      efectivoCon: true,
      motivoCancelacion: true,
      observaciones: true,
      cliente: {
        select: {
          name: true,
          documento: true,
          direccion: true,
          distrito: true,
        },
      },
      clienteDireccion: { select: { direccion: true, distrito: true } },
      repartidor: { select: { name: true } },
      items: {
        select: {
          cantidad: true,
          precioUnitario: true,
          marca: { select: { name: true } },
        },
      },
    },
  });

  const headerRow = [
    "Cliente",
    "Documento",
    "Dirección",
    "Estado",
    "Fecha pedido",
    "Fecha programada",
    "Repartidor",
    "Forma pago",
    "Efectivo con",
    "Total",
    "Observaciones",
    "Motivo cancelación",
  ];

  const dataRows = pedidos.map((p) => {
    const total = (p.items ?? []).reduce(
      (sum, i) => sum + Number(i.precioUnitario) * i.cantidad,
      0
    );
    const direccion = p.clienteDireccion
      ? [p.clienteDireccion.direccion, p.clienteDireccion.distrito].filter(Boolean).join(", ")
      : [p.cliente?.direccion, p.cliente?.distrito].filter(Boolean).join(", ");
    const clienteName = p.cliente?.name?.trim() || "—";
    return [
      cell(clienteName),
      cell(p.cliente?.documento),
      cell(direccion),
      cell(estadoLabel(p.estado)),
      cell(formatDate(p.fechaPedido)),
      cell(formatDate(p.fechaProgramada)),
      cell(p.repartidor?.name),
      cell(p.formaPago),
      p.efectivoCon != null ? String(p.efectivoCon) : "",
      total.toFixed(2),
      cell(p.observaciones),
      cell(p.motivoCancelacion),
    ];
  });

  const sheetData = [headerRow, ...dataRows];
  const worksheet = XLSX.utils.aoa_to_sheet(sheetData);

  worksheet["!cols"] = [
    { wch: 20 },
    { wch: 14 },
    { wch: 42 },
    { wch: 12 },
    { wch: 14 },
    { wch: 14 },
    { wch: 18 },
    { wch: 14 },
    { wch: 12 },
    { wch: 12 },
    { wch: 24 },
    { wch: 28 },
    { wch: 28 },
  ];

  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, "Pedidos");

  const buffer = XLSX.write(workbook, { type: "buffer", bookType: "xlsx" });

  const filename =
    fechaDesdeParam && dateOnlyRe.test(fechaDesdeParam) && fechaHastaParam && dateOnlyRe.test(fechaHastaParam)
      ? `pedidos_${fechaDesdeParam}_${fechaHastaParam}.xlsx`
      : `pedidos_${new Date().toISOString().slice(0, 10)}.xlsx`;
  return new NextResponse(buffer, {
    status: 200,
    headers: {
      "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "Content-Disposition": `attachment; filename="${filename}"`,
    },
  });
}
