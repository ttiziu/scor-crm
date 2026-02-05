"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { EstadoPedidoBadge } from "@/components/estado-pedido-badge";
import { MapPin, Package, Truck, CheckCircle, XCircle, Copy, Check, Clock } from "lucide-react";

function todayISO() {
  const d = new Date();
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

type PedidoItem = {
  id: string;
  cantidad: number;
  precioUnitario: number | string;
  producto: { name: string };
  marca?: { name: string } | null;
};
type Pedido = {
  id: string;
  estado: string;
  formaPago: string | null;
  efectivoCon: number | string | null;
  observaciones: string | null;
  motivoCancelacion: string | null;
  asignadoEn: string | null;
  cliente: {
    name: string;
    direccion: string | null;
    distrito: string | null;
    telefono: string | null;
  };
  clienteDireccion?: { nombre: string; direccion: string; distrito: string | null } | null;
  items: PedidoItem[];
};

export default function MisPedidosPage() {
  const router = useRouter();
  const [pedidos, setPedidos] = useState<Pedido[]>([]);
  const [loading, setLoading] = useState(true);
  const [authOk, setAuthOk] = useState(false);
  const [updatingId, setUpdatingId] = useState<string | null>(null);
  const [fechaFiltro, setFechaFiltro] = useState(() => todayISO());
  const [estadoFiltro, setEstadoFiltro] = useState<string | null>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/auth/me", { credentials: "include" })
      .then((res) => {
        if (res.status === 401) {
          router.replace("/login");
          return null;
        }
        return res.json();
      })
      .then((data) => {
        if (data?.user) {
          if (data.user.role !== "REPARTIDOR") {
            router.replace("/pedidos");
            return;
          }
          setAuthOk(true);
        }
      })
      .catch(() => router.replace("/login"))
      .finally(() => setLoading(false));
  }, [router]);

  function loadPedidos() {
    fetch(`/api/pedidos?fecha=${fechaFiltro}`, { credentials: "include" })
      .then((res) => res.json())
      .then((d) => (Array.isArray(d) ? setPedidos(d) : setPedidos([])))
      .catch(() => setPedidos([]));
  }

  useEffect(() => {
    if (!authOk) return;
    loadPedidos();
  }, [authOk, fechaFiltro]);

  // Actualizar lista al volver a la pestaña (p. ej. si oficina canceló un pedido)
  useEffect(() => {
    if (!authOk) return;
    const onFocus = () => loadPedidos();
    window.addEventListener("focus", onFocus);
    return () => window.removeEventListener("focus", onFocus);
  }, [authOk, fechaFiltro]);

  // Polling cada 60 s para que el repartidor vea cancelaciones sin recargar
  useEffect(() => {
    if (!authOk) return;
    const id = setInterval(loadPedidos, 60_000);
    return () => clearInterval(id);
  }, [authOk, fechaFiltro]);

  async function cambiarEstado(pedidoId: string, estado: string) {
    setUpdatingId(pedidoId);
    try {
      const res = await fetch(`/api/pedidos/${pedidoId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ estado }),
      });
      if (res.ok) {
        setPedidos((prev) =>
          prev.map((p) => (p.id === pedidoId ? { ...p, estado } : p))
        );
      }
    } finally {
      setUpdatingId(null);
    }
  }

  function total(p: Pedido) {
    return p.items.reduce(
      (acc, i) => acc + Number(i.precioUnitario) * i.cantidad,
      0
    );
  }

  async function copiarDireccion(pedidoId: string, direccion: string) {
    try {
      await navigator.clipboard.writeText(direccion);
      setCopiedId(pedidoId);
      setTimeout(() => setCopiedId(null), 2000);
    } catch {
      // fallback si clipboard no está disponible
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p>Cargando…</p>
      </div>
    );
  }
  if (!authOk) return null;

  const direccionEntrega = (p: Pedido) => {
    if (p.clienteDireccion) {
      return `${p.clienteDireccion.direccion}${p.clienteDireccion.distrito ? ", " + p.clienteDireccion.distrito : ""}`;
    }
    if (p.cliente.direccion) {
      return `${p.cliente.direccion}${p.cliente.distrito ? ", " + p.cliente.distrito : ""}`;
    }
    return null;
  };

  const creados = pedidos.filter((p) => p.estado === "CREATED").length;
  const enRuta = pedidos.filter((p) => p.estado === "IN_ROUTE").length;
  const entregados = pedidos.filter((p) => p.estado === "DELIVERED").length;
  const cancelados = pedidos.filter((p) => p.estado === "CANCELLED").length;

  const pedidosFiltrados = estadoFiltro ? pedidos.filter((p) => p.estado === estadoFiltro) : pedidos;

  function toggleEstadoFiltro(estado: string) {
    setEstadoFiltro((prev) => (prev === estado ? null : estado));
  }

  return (
    <div className="min-h-screen p-4 sm:p-6">
      <header className="mb-4 sm:mb-6 space-y-4">
        <h1 className="text-xl font-semibold">Mis pedidos</h1>
        <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center sm:gap-4">
          <div className="flex flex-nowrap items-center gap-2 overflow-x-auto pb-1 -mx-1 px-1 sm:flex-wrap sm:overflow-visible sm:mx-0 sm:px-0">
            <button
              type="button"
              onClick={() => toggleEstadoFiltro("CREATED")}
              title="Pendientes"
              className={`flex items-center gap-1.5 rounded-md border px-2 py-1.5 shrink-0 transition-colors hover:opacity-90 ${estadoFiltro === "CREATED" ? "bg-sky-50 border-sky-400 border-2" : "bg-sky-50 border-sky-200"}`}
            >
              <Package className="size-3.5 text-sky-600" />
              <span className="text-sm font-semibold text-sky-700">{creados}</span>
            </button>
            <button
              type="button"
              onClick={() => toggleEstadoFiltro("IN_ROUTE")}
              title="En ruta"
              className={`flex items-center gap-1.5 rounded-md border px-2 py-1.5 shrink-0 transition-colors hover:opacity-90 ${estadoFiltro === "IN_ROUTE" ? "bg-amber-50 border-amber-400 border-2" : "bg-amber-50 border-amber-200"}`}
            >
              <Truck className="size-3.5 text-amber-600" />
              <span className="text-sm font-semibold text-amber-700">{enRuta}</span>
            </button>
            <button
              type="button"
              onClick={() => toggleEstadoFiltro("DELIVERED")}
              title="Entregados"
              className={`flex items-center gap-1.5 rounded-md border px-2 py-1.5 shrink-0 transition-colors hover:opacity-90 ${estadoFiltro === "DELIVERED" ? "bg-green-50 border-green-400 border-2" : "bg-green-50 border-green-200"}`}
            >
              <CheckCircle className="size-3.5 text-green-600" />
              <span className="text-sm font-semibold text-green-700">{entregados}</span>
            </button>
            <button
              type="button"
              onClick={() => toggleEstadoFiltro("CANCELLED")}
              title="Cancelados"
              className={`flex items-center gap-1.5 rounded-md border px-2 py-1.5 shrink-0 transition-colors hover:opacity-90 ${estadoFiltro === "CANCELLED" ? "bg-red-50 border-red-400 border-2" : "bg-red-50 border-red-200"}`}
            >
              <XCircle className="size-3.5 text-red-600" />
              <span className="text-sm font-semibold text-red-700">{cancelados}</span>
            </button>
          </div>
          <div className="flex items-center gap-2 flex-nowrap sm:ml-auto">
            <input
              type="date"
              value={fechaFiltro}
              onChange={(e) => setFechaFiltro(e.target.value)}
              className="border rounded-md px-3 py-2 text-sm min-w-0 [color-scheme:light]"
              title="Fecha"
            />
            <Button type="button" variant="outline" size="sm" onClick={() => setFechaFiltro(todayISO())}>
              Hoy
            </Button>
            <Button type="button" variant="outline" size="sm" onClick={loadPedidos} title="Actualizar lista (por si cancelaron un pedido)">
              Actualizar
            </Button>
          </div>
        </div>
      </header>

      <div className="space-y-4">
        {pedidos.length === 0 ? (
          <p className="text-neutral-500 text-sm sm:text-base">No tienes pedidos asignados para esta fecha.</p>
        ) : pedidosFiltrados.length === 0 ? (
          <p className="text-neutral-500 text-sm sm:text-base">
            No hay pedidos con el estado seleccionado. Haz clic en un icono para filtrar o vuelve a hacer clic para ver todos.
          </p>
        ) : (
          pedidosFiltrados.map((p) => (
            <article
              key={p.id}
              className={`rounded-xl border shadow-sm overflow-hidden ${p.estado === "CANCELLED" ? "border-red-200 bg-red-50/30" : "border-neutral-200 bg-white"}`}
            >
              <div className="p-4 sm:p-5">
                <div className="flex flex-col gap-3 sm:flex-row sm:justify-between sm:items-start">
                  <div className="min-w-0 flex-1">
                    <h2 className="font-semibold text-neutral-900 truncate">{p.cliente.name}</h2>
                    {direccionEntrega(p) && (
                      <div className="mt-1.5 flex items-center gap-1.5 flex-wrap">
                        <MapPin className="size-4 shrink-0 text-neutral-500" />
                        <span className="inline-flex items-center gap-1.5 flex-wrap text-base text-neutral-700 min-w-0">
                          <a
                            href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(direccionEntrega(p)!)}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="break-words underline underline-offset-2 text-neutral-700 hover:text-neutral-900"
                            title="Abrir en Google Maps"
                          >
                            {direccionEntrega(p)}
                          </a>
                          <span className="inline-flex shrink-0">
                            <Button
                              type="button"
                              variant="ghost"
                              size="icon-sm"
                              onClick={() => copiarDireccion(p.id, direccionEntrega(p) ?? "")}
                              title="Copiar dirección"
                              className="text-neutral-500 hover:text-neutral-700 h-8 w-8 flex items-center justify-center"
                            >
                              {copiedId === p.id ? <Check className="size-4 text-green-600" /> : <Copy className="size-4" />}
                            </Button>
                          </span>
                        </span>
                      </div>
                    )}
                  </div>
                  <div className="shrink-0 text-right sm:text-right">
                    <p className="font-semibold text-lg text-neutral-900">S/ {total(p).toFixed(2)}</p>
                    <p className="text-sm text-neutral-600">
                      {p.formaPago ?? "—"}
                      {p.formaPago === "EFECTIVO" && p.efectivoCon != null && (
                        <span> (con S/ {Number(p.efectivoCon)})</span>
                      )}
                    </p>
                  </div>
                </div>

                <div className="mt-4 pt-3 border-t border-neutral-200">
                  <p className="text-base text-neutral-700">
                    {p.items.map((i) => (
                      <span key={i.id} className="mr-3 last:mr-0">
                        {i.cantidad}× {i.producto.name}
                        {i.marca?.name ? ` (${i.marca.name})` : ""}
                      </span>
                    ))}
                  </p>
                </div>

                {p.observaciones && (
                  <p className="mt-2 text-base text-neutral-700 bg-neutral-100 rounded-lg px-3 py-2.5 border border-neutral-200">Obs: {p.observaciones}</p>
                )}

                {p.asignadoEn && (
                  <p className="mt-2 flex items-center gap-1.5 text-sm text-neutral-600">
                    <Clock className="size-4 shrink-0" />
                    Asignado a las {new Date(p.asignadoEn).toLocaleTimeString("es-PE", { hour: "2-digit", minute: "2-digit" })}
                  </p>
                )}
                <div className="mt-4 pt-3 border-t border-neutral-200 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                  <EstadoPedidoBadge
                    estado={p.estado}
                    motivoCancelacion={p.estado === "CANCELLED" ? p.motivoCancelacion : undefined}
                    showMotivoInline
                    loading={updatingId === p.id}
                  />
                  {p.estado !== "CANCELLED" && (
                    <>
                      {p.estado === "CREATED" && (
                        <Button
                          type="button"
                          size="default"
                          onClick={() => cambiarEstado(p.id, "IN_ROUTE")}
                          disabled={updatingId === p.id}
                          className="w-full sm:w-auto border-2 border-amber-500 bg-amber-50 text-amber-700 hover:bg-amber-100 font-medium rounded-lg"
                        >
                          <Truck className="size-4 mr-2" />
                          Marcar en ruta
                        </Button>
                      )}
                      {p.estado === "IN_ROUTE" && (
                        <Button
                          type="button"
                          size="default"
                          onClick={() => cambiarEstado(p.id, "DELIVERED")}
                          disabled={updatingId === p.id}
                          className="w-full sm:w-auto border-2 border-green-600 bg-green-50 text-green-700 hover:bg-green-100 font-medium rounded-lg"
                        >
                          <CheckCircle className="size-4 mr-2" />
                          Marcar entregado
                        </Button>
                      )}
                    </>
                  )}
                </div>
              </div>
            </article>
          ))
        )}
      </div>
    </div>
  );
}
