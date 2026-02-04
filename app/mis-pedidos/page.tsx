"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { EstadoPedidoBadge } from "@/components/estado-pedido-badge";

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

  return (
    <div className="min-h-screen p-6">
      <header className="flex justify-between items-center mb-6 flex-wrap gap-4">
        <div className="flex items-center gap-4">
          <Link href="/" className="text-sm underline">
            ← Volver
          </Link>
          <h1 className="text-xl font-semibold">Mis pedidos</h1>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
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
                    <p className="text-sm text-neutral-600">
                      📍 {direccionEntrega(p)}
                    </p>
                  )}
                  {p.cliente.telefono && (
                    <p className="text-sm">📞 {p.cliente.telefono}</p>
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
