"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { EstadoPedidoBadge } from "@/components/estado-pedido-badge";
import { MapPin, Phone, Package, Truck, CheckCircle, XCircle, Copy, Check } from "lucide-react";

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

  return (
    <div className="min-h-screen p-6">
      <header className="mb-6 space-y-4">
        <div className="flex items-center gap-2">
          <Link href="/" className="text-sm underline">
            ← Volver
          </Link>
          <h1 className="text-xl font-semibold">Mis pedidos</h1>
        </div>
        <div className="flex flex-wrap items-center gap-4">
          <div className="flex flex-wrap items-center gap-2">
            <div className="flex items-center gap-1.5 rounded-md border bg-sky-50 px-2 py-1.5 border-sky-200">
              <Package className="size-3.5 text-sky-600" />
              <span className="text-xs font-medium text-sky-800">Pendientes</span>
              <span className="text-sm font-semibold text-sky-700">{creados}</span>
            </div>
            <div className="flex items-center gap-1.5 rounded-md border bg-amber-50 px-2 py-1.5 border-amber-200">
              <Truck className="size-3.5 text-amber-600" />
              <span className="text-xs font-medium text-amber-800">En ruta</span>
              <span className="text-sm font-semibold text-amber-700">{enRuta}</span>
            </div>
            <div className="flex items-center gap-1.5 rounded-md border bg-green-50 px-2 py-1.5 border-green-200">
              <CheckCircle className="size-3.5 text-green-600" />
              <span className="text-xs font-medium text-green-800">Entregados</span>
              <span className="text-sm font-semibold text-green-700">{entregados}</span>
            </div>
            <div className="flex items-center gap-1.5 rounded-md border bg-red-50 px-2 py-1.5 border-red-200">
              <XCircle className="size-3.5 text-red-600" />
              <span className="text-xs font-medium text-red-800">Cancelados</span>
              <span className="text-sm font-semibold text-red-700">{cancelados}</span>
            </div>
          </div>
          <div className="flex items-center gap-2 flex-wrap ml-auto">
            <label className="text-sm">Ver pedidos del:</label>
            <input
              type="date"
              value={fechaFiltro}
              onChange={(e) => setFechaFiltro(e.target.value)}
              className="border rounded px-3 py-2 text-sm [color-scheme:light]"
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
          <p className="text-neutral-500">No tienes pedidos asignados para esta fecha.</p>
        ) : (
          pedidos.map((p) => (
            <div
              key={p.id}
              className={`border rounded p-4 ${p.estado === "CANCELLED" ? "border-red-200 bg-red-50/50" : "border-neutral-300 bg-neutral-50/50"}`}
            >
              <div className="flex justify-between items-start gap-4 flex-wrap">
                <div>
                  <p className="font-medium">{p.cliente.name}</p>
                  {direccionEntrega(p) && (
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <p className="text-sm text-neutral-600 flex items-center gap-1.5 min-w-0">
                        <MapPin className="size-4 shrink-0 text-neutral-500" />
                        <span className="break-words">{direccionEntrega(p)}</span>
                      </p>
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon-sm"
                        onClick={() => copiarDireccion(p.id, direccionEntrega(p) ?? "")}
                        title="Copiar dirección (pegar en Google Maps)"
                        className="shrink-0 text-neutral-500 hover:text-neutral-700"
                      >
                        {copiedId === p.id ? (
                          <Check className="size-4 text-green-600" />
                        ) : (
                          <Copy className="size-4" />
                        )}
                      </Button>
                    </div>
                  )}
                  {p.cliente.telefono && (
                    <p className="text-sm flex items-center gap-1.5">
                      <Phone className="size-4 shrink-0 text-neutral-500" />
                      {p.cliente.telefono}
                    </p>
                  )}
                </div>
                <div className="text-right">
                  <p className="font-medium">S/ {total(p).toFixed(2)}</p>
                  <p className="text-sm text-neutral-600">
                    {p.formaPago ?? "—"}
                    {p.formaPago === "EFECTIVO" && p.efectivoCon != null && (
                      <span> (con S/ {Number(p.efectivoCon)})</span>
                    )}
                  </p>
                </div>
              </div>
              <div className="mt-2 text-sm text-neutral-600">
                {p.items.map((i) => (
                  <span key={i.id} className="mr-3">
                    {i.cantidad}× {i.producto.name}
                    {i.marca?.name ? ` (${i.marca.name})` : ""}
                  </span>
                ))}
              </div>
              {p.observaciones && (
                <p className="mt-1 text-sm text-neutral-500">Obs: {p.observaciones}</p>
              )}
              <div className="mt-3 flex gap-2 flex-wrap items-center">
                <EstadoPedidoBadge
                  estado={p.estado}
                  motivoCancelacion={p.estado === "CANCELLED" ? p.motivoCancelacion : undefined}
                  loading={updatingId === p.id}
                />
                {p.estado !== "CANCELLED" && (
                  <>
                    {p.estado === "CREATED" && (
                      <Button
                        type="button"
                        size="sm"
                        onClick={() => cambiarEstado(p.id, "IN_ROUTE")}
                        disabled={updatingId === p.id}
                        className="bg-amber-600 text-white hover:bg-amber-700"
                      >
                        En ruta
                      </Button>
                    )}
                    {(p.estado === "CREATED" || p.estado === "IN_ROUTE") && (
                      <Button
                        type="button"
                        size="sm"
                        onClick={() => cambiarEstado(p.id, "DELIVERED")}
                        disabled={updatingId === p.id}
                        className="bg-green-600 text-white hover:bg-green-700"
                      >
                        Entregado
                      </Button>
                    )}
                  </>
                )}
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
