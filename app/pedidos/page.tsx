"use client";

import { useEffect, useState, useRef } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";

type Cliente = { id: string; name: string; documento?: string | null };
type ClienteDireccion = { id: string; nombre: string; direccion: string; distrito: string | null };
type ClienteDetalle = { direccion: string | null; distrito: string | null; direcciones: ClienteDireccion[] };
type Producto = { id: string; name: string };
type Usuario = { id: string; name: string; role: string };
type PedidoItem = {
  id: string;
  productoId: string;
  cantidad: number;
  precioUnitario: number | string;
  producto: { id: string; name: string };
};
type Pedido = {
  id: string;
  clienteId: string;
  estado: string;
  cantidad: number | null;
  fechaPedido: string;
  fechaProgramada: string | null;
  repartidorId: string | null;
  formaPago: string | null;
  efectivoCon: number | string | null;
  motivoCancelacion: string | null;
  observaciones: string | null;
  createdAt: string;
  cliente: Cliente & { direccion?: string | null; distrito?: string | null; telefono?: string | null };
  repartidor?: { id: string; name: string } | null;
  items?: PedidoItem[];
};

type LineaForm = { productoId: ""; cantidad: "1"; precioUnitario: "" };

function todayISO() {
  return new Date().toISOString().slice(0, 10);
}

export default function PedidosPage() {
  const router = useRouter();
  const [pedidos, setPedidos] = useState<Pedido[]>([]);
  const [clientes, setClientes] = useState<Cliente[]>([]);
  const [productos, setProductos] = useState<Producto[]>([]);
  const [usuarios, setUsuarios] = useState<Usuario[]>([]);
  const [isAdmin, setIsAdmin] = useState(false);
  const [userRole, setUserRole] = useState("");
  const [loading, setLoading] = useState(true);
  const [authOk, setAuthOk] = useState(false);
  const [formOpen, setFormOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [form, setForm] = useState({
    clienteId: "",
    clienteDireccionId: "",
    fechaProgramada: todayISO(),
    repartidorId: "",
    formaPago: "",
    efectivoCon: "",
    observaciones: "",
    lineas: [{ productoId: "", cantidad: "1", precioUnitario: "" }] as LineaForm[],
  });
  const [clienteSearch, setClienteSearch] = useState("");
  const [clienteDropdownOpen, setClienteDropdownOpen] = useState(false);
  const [clienteDetalle, setClienteDetalle] = useState<ClienteDetalle | null>(null);
  const [fechaFiltro, setFechaFiltro] = useState(() => todayISO());
  const [cancelando, setCancelando] = useState<{ id: string; motivo: string } | null>(null);
  const clienteInputRef = useRef<HTMLInputElement>(null);

  function loadPedidos() {
    const url = `/api/pedidos?fecha=${fechaFiltro}`;
    fetch(url, { credentials: "include" })
      .then((res) => res.json())
      .then((data) => (Array.isArray(data) ? setPedidos(data) : setPedidos([])))
      .catch(() => setPedidos([]));
  }

  function loadClientes() {
    fetch("/api/clientes", { credentials: "include" })
      .then((res) => res.json())
      .then((data) => (Array.isArray(data) ? setClientes(data) : setClientes([])))
      .catch(() => setClientes([]));
  }

  function loadProductos() {
    fetch("/api/productos", { credentials: "include" })
      .then((res) => res.json())
      .then((data) => (Array.isArray(data) ? setProductos(data) : setProductos([])))
      .catch(() => setProductos([]));
  }

  function loadUsuarios() {
    fetch("/api/usuarios", { credentials: "include" })
      .then((res) => (res.status === 403 ? [] : res.json()))
      .then((data) => (Array.isArray(data) ? setUsuarios(data.filter((u: Usuario) => u.role === "REPARTIDOR")) : setUsuarios([])))
      .catch(() => setUsuarios([]));
  }

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
          if (data.user.role === "REPARTIDOR") {
            router.replace("/mis-pedidos");
            setLoading(false);
            return;
          }
          setAuthOk(true);
          setIsAdmin(data.user.role === "ADMIN");
          setUserRole(data.user.role ?? "");
        }
        loadPedidos();
        loadClientes();
        loadProductos();
        loadUsuarios();
      })
      .catch(() => router.replace("/login"))
      .finally(() => setLoading(false));
  }, [router]);

  useEffect(() => {
    if (!form.clienteId) {
      setClienteDetalle(null);
      setForm((f) => (f.clienteDireccionId ? { ...f, clienteDireccionId: "" } : f));
      return;
    }
    fetch(`/api/clientes/${form.clienteId}`, { credentials: "include" })
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (data?.id) {
          setClienteDetalle({
            direccion: data.direccion ?? null,
            distrito: data.distrito ?? null,
            direcciones: data.direcciones ?? [],
          });
          setForm((f) => (f.clienteDireccionId ? { ...f, clienteDireccionId: "" } : f));
        } else {
          setClienteDetalle(null);
        }
      })
      .catch(() => setClienteDetalle(null));
  }, [form.clienteId]);

  useEffect(() => {
    if (authOk) loadPedidos();
  }, [fechaFiltro]);

  async function cancelarPedido() {
    if (!cancelando) return;
    setSaving(true);
    try {
      const res = await fetch(`/api/pedidos/${cancelando.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ estado: "CANCELLED", motivoCancelacion: cancelando.motivo.trim() || null }),
      });
      if (res.ok) {
        setCancelando(null);
        loadPedidos();
      } else {
        const data = await res.json().catch(() => ({}));
        setError(data.error ?? "Error al cancelar");
      }
    } catch {
      setError("Error de conexión");
    } finally {
      setSaving(false);
    }
  }

  function addLinea() {
    setForm((f) => ({
      ...f,
      lineas: [...f.lineas, { productoId: "", cantidad: "1", precioUnitario: "" }],
    }));
  }

  function removeLinea(i: number) {
    setForm((f) => ({
      ...f,
      lineas: f.lineas.filter((_, idx) => idx !== i),
    }));
  }

  function setLinea(i: number, field: keyof LineaForm, value: string) {
    setForm((f) => ({
      ...f,
      lineas: f.lineas.map((l, idx) => (idx === i ? { ...l, [field]: value } : l)),
    }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.clienteId.trim()) {
      setError("Selecciona un cliente");
      return;
    }
    const lineasValidas = form.lineas.filter(
      (l) => l.productoId && l.cantidad && parseInt(l.cantidad, 10) >= 1 && l.precioUnitario !== "" && Number(l.precioUnitario) >= 0
    );
    if (lineasValidas.length === 0) {
      setError("Agrega al menos una línea con producto, cantidad y precio");
      return;
    }
    setError("");
    setSaving(true);
    try {
      const res = await fetch("/api/pedidos", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          clienteId: form.clienteId,
          clienteDireccionId: form.clienteDireccionId.trim() || undefined,
          observaciones: form.observaciones || undefined,
          fechaProgramada: form.fechaProgramada || undefined,
          repartidorId: form.repartidorId || undefined,
          formaPago: form.formaPago || undefined,
          efectivoCon: form.efectivoCon ? Number(form.efectivoCon) : undefined,
          items: lineasValidas.map((l) => ({
            productoId: l.productoId,
            cantidad: parseInt(l.cantidad, 10),
            precioUnitario: Number(l.precioUnitario),
          })),
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(data.error ?? "Error al crear");
        return;
      }
      setForm({
        clienteId: "",
        clienteDireccionId: "",
        fechaProgramada: todayISO(),
        repartidorId: "",
        formaPago: "",
        efectivoCon: "",
        observaciones: "",
        lineas: [{ productoId: "", cantidad: "1", precioUnitario: "" }],
      });
      setClienteDetalle(null);
      setClienteSearch("");
      setFormOpen(false);
      loadPedidos();
    } catch {
      setError("Error de conexión");
    } finally {
      setSaving(false);
    }
  }

  const clientesFiltrados = clienteSearch.trim()
    ? clientes.filter(
        (c) =>
          c.name.toLowerCase().includes(clienteSearch.toLowerCase()) ||
          (c.documento && c.documento.includes(clienteSearch))
      )
    : clientes;

  const clienteSeleccionado = form.clienteId ? clientes.find((c) => c.id === form.clienteId) : null;
  const clienteDisplay = clienteSeleccionado
    ? `${clienteSeleccionado.name}${clienteSeleccionado.documento ? " — " + clienteSeleccionado.documento : ""}`
    : "";

  function formatDate(s: string | null) {
    if (!s) return "—";
    try {
      return new Date(s).toLocaleDateString("es", { day: "2-digit", month: "2-digit", year: "numeric" });
    } catch {
      return s;
    }
  }

  function itemsSummary(p: Pedido) {
    if (p.items && p.items.length > 0) {
      const total = p.items.reduce(
        (acc, i) => acc + Number(i.precioUnitario) * i.cantidad,
        0
      );
      return `${p.items.length} líneas · S/ ${total.toFixed(2)}`;
    }
    return p.cantidad != null ? `Cantidad: ${p.cantidad}` : "—";
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p>Cargando…</p>
      </div>
    );
  }
  if (!authOk) return null;

  return (
    <div className="min-h-screen p-6">
      <header className="flex justify-between items-center mb-6">
        <div className="flex items-center gap-4">
          <Link href="/" className="text-sm underline">
            ← Volver
          </Link>
          <h1 className="text-xl font-semibold">Pedidos</h1>
        </div>
      </header>

      <div className="mb-6">
        {userRole !== "REPARTIDOR" && (
          <button
            type="button"
            onClick={() => setFormOpen(!formOpen)}
            className="py-2 px-4 rounded bg-foreground text-background text-sm"
          >
            {formOpen ? "Cerrar formulario" : "Nuevo pedido"}
          </button>
        )}
        {formOpen && (
          <form onSubmit={handleSubmit} className="mt-4 p-4 border rounded max-w-2xl space-y-4">
            <div className="relative">
              <label className="block text-sm mb-1">Cliente *</label>
              <input
                ref={clienteInputRef}
                type="text"
                value={clienteDropdownOpen ? clienteSearch : clienteDisplay || clienteSearch}
                onChange={(e) => {
                  setClienteSearch(e.target.value);
                  setClienteDropdownOpen(true);
                  if (!e.target.value) setForm((f) => ({ ...f, clienteId: "" }));
                }}
                onFocus={() => setClienteDropdownOpen(true)}
                onBlur={() => setTimeout(() => setClienteDropdownOpen(false), 200)}
                placeholder="Escribe nombre o documento..."
                className="w-full border rounded px-3 py-2"
                autoComplete="off"
              />
              {clienteDropdownOpen && (
                <div className="absolute z-10 w-full mt-1 border rounded bg-background shadow-lg max-h-48 overflow-y-auto">
                  {clientesFiltrados.length === 0 ? (
                    <div className="px-3 py-2 text-sm text-neutral-500">Ningún cliente coincide</div>
                  ) : (
                    clientesFiltrados.map((c) => {
                      const text = `${c.name}${c.documento ? " — " + c.documento : ""}`;
                      return (
                        <button
                          key={c.id}
                          type="button"
                          className="w-full text-left px-3 py-2 text-sm hover:bg-neutral-100 border-b border-neutral-100 last:border-0"
                          onMouseDown={(e) => {
                            e.preventDefault();
                            setForm((f) => ({ ...f, clienteId: c.id }));
                            setClienteSearch(text);
                            setClienteDropdownOpen(false);
                            clienteInputRef.current?.blur();
                          }}
                        >
                          {text}
                        </button>
                      );
                    })
                  )}
                </div>
              )}
            </div>

            {form.clienteId && clienteDetalle && (
              <div>
                <label className="block text-sm mb-1">Dirección de entrega</label>
                <select
                  value={form.clienteDireccionId}
                  onChange={(e) => setForm((f) => ({ ...f, clienteDireccionId: e.target.value }))}
                  className="w-full border rounded px-3 py-2"
                >
                  <option value="">
                    Dirección principal
                    {clienteDetalle.direccion || clienteDetalle.distrito
                      ? ` — ${[clienteDetalle.direccion, clienteDetalle.distrito].filter(Boolean).join(", ")}`
                      : ""}
                  </option>
                  {clienteDetalle.direcciones.map((d) => (
                    <option key={d.id} value={d.id}>
                      {d.nombre} — {d.direccion}
                      {d.distrito ? `, ${d.distrito}` : ""}
                    </option>
                  ))}
                </select>
              </div>
            )}

            <div>
              <label className="block text-sm mb-1">Fecha programada</label>
              <input
                type="date"
                value={form.fechaProgramada}
                onChange={(e) => setForm((f) => ({ ...f, fechaProgramada: e.target.value }))}
                className="w-full border rounded px-3 py-2 [color-scheme:light]"
                title="Haz clic para abrir el calendario"
              />
            </div>

            {isAdmin && (
              <div>
                <label className="block text-sm mb-1">Repartidor</label>
                <select
                  value={form.repartidorId}
                  onChange={(e) => setForm((f) => ({ ...f, repartidorId: e.target.value }))}
                  className="w-full border rounded px-3 py-2"
                >
                  <option value="">Sin asignar</option>
                  {usuarios.map((u) => (
                    <option key={u.id} value={u.id}>
                      {u.name}
                    </option>
                  ))}
                </select>
              </div>
            )}

            <div>
              <label className="block text-sm mb-1">Forma de pago</label>
              <select
                value={form.formaPago}
                onChange={(e) => setForm((f) => ({ ...f, formaPago: e.target.value }))}
                className="w-full border rounded px-3 py-2"
              >
                <option value="">Seleccionar</option>
                <option value="YAPE">Yape</option>
                <option value="PLIN">Plin</option>
                <option value="TRANSFERENCIA">Transferencia</option>
                <option value="EFECTIVO">Efectivo</option>
                <option value="TARJETA">Tarjeta</option>
              </select>
            </div>
            {form.formaPago === "EFECTIVO" && (
              <div>
                <label className="block text-sm mb-1">Con cuánto paga (efectivo)</label>
                <input
                  type="number"
                  min={0}
                  step={0.01}
                  value={form.efectivoCon}
                  onChange={(e) => setForm((f) => ({ ...f, efectivoCon: e.target.value }))}
                  placeholder="Ej. 100"
                  className="w-full border rounded px-3 py-2"
                />
              </div>
            )}

            <div>
              <div className="flex justify-between items-center mb-1">
                <label className="block text-sm">Líneas del pedido *</label>
                <button type="button" onClick={addLinea} className="text-sm underline">
                  + Agregar línea
                </button>
              </div>
              <div className="space-y-2">
                {form.lineas.map((l, i) => (
                  <div key={i} className="flex gap-2 items-center flex-wrap">
                    <select
                      value={l.productoId}
                      onChange={(e) => setLinea(i, "productoId", e.target.value)}
                      className="flex-1 min-w-[140px] border rounded px-2 py-1.5 text-sm"
                      required={i === 0}
                    >
                      <option value="">Producto</option>
                      {productos.map((prod) => (
                        <option key={prod.id} value={prod.id}>
                          {prod.name}
                        </option>
                      ))}
                    </select>
                    <input
                      type="number"
                      min={1}
                      value={l.cantidad}
                      onChange={(e) => setLinea(i, "cantidad", e.target.value)}
                      placeholder="Cant."
                      className="w-20 border rounded px-2 py-1.5 text-sm"
                    />
                    <input
                      type="number"
                      min={0}
                      step={0.01}
                      value={l.precioUnitario}
                      onChange={(e) => setLinea(i, "precioUnitario", e.target.value)}
                      placeholder="Precio unit."
                      className="w-28 border rounded px-2 py-1.5 text-sm"
                    />
                    {form.lineas.length > 1 && (
                      <button type="button" onClick={() => removeLinea(i)} className="text-red-600 text-sm">
                        Quitar
                      </button>
                    )}
                  </div>
                ))}
              </div>
            </div>

            <div>
              <label className="block text-sm mb-1">Observaciones</label>
              <input
                placeholder="Observaciones"
                value={form.observaciones}
                onChange={(e) => setForm((f) => ({ ...f, observaciones: e.target.value }))}
                className="w-full border rounded px-3 py-2"
              />
            </div>

            {error && <p className="text-sm text-red-600">{error}</p>}
            <button type="submit" disabled={saving} className="py-2 px-4 rounded bg-foreground text-background text-sm disabled:opacity-50">
              {saving ? "Guardando…" : "Guardar"}
            </button>
          </form>
        )}
      </div>

      <div className="mb-4 flex flex-wrap items-center gap-3">
        <label className="text-sm font-medium">Ver pedidos del:</label>
        <input
          type="date"
          value={fechaFiltro}
          onChange={(e) => setFechaFiltro(e.target.value)}
          className="border rounded px-3 py-2 [color-scheme:light]"
        />
        <button
          type="button"
          onClick={() => setFechaFiltro(todayISO())}
          className="py-2 px-3 rounded border text-sm hover:bg-neutral-100"
        >
          Hoy
        </button>
      </div>

      {cancelando && (
        <div className="fixed inset-0 z-20 flex items-center justify-center bg-black/50 p-4">
          <div className="bg-background border rounded-lg shadow-lg max-w-md w-full p-4">
            <h3 className="font-medium mb-2">Cancelar pedido</h3>
            <p className="text-sm text-neutral-600 mb-3">Si el cliente canceló, indica el motivo (opcional). El repartidor verá el pedido como &quot;Envío cancelado&quot;.</p>
            <textarea
              value={cancelando.motivo}
              onChange={(e) => setCancelando((c) => (c ? { ...c, motivo: e.target.value } : null))}
              placeholder="Ej: Cliente llamó y canceló"
              rows={3}
              className="w-full border rounded px-3 py-2 text-sm mb-3"
            />
            {error && <p className="text-sm text-red-600 mb-2">{error}</p>}
            <div className="flex gap-2 justify-end">
              <button type="button" onClick={() => { setCancelando(null); setError(""); }} className="py-2 px-3 rounded border text-sm">Cerrar</button>
              <button type="button" onClick={cancelarPedido} disabled={saving} className="py-2 px-3 rounded bg-red-600 text-white text-sm disabled:opacity-50">Confirmar cancelación</button>
            </div>
          </div>
        </div>
      )}

      <div className="overflow-x-auto">
        <table className="w-full border-collapse border border-neutral-300">
          <thead>
            <tr className="bg-neutral-100">
              <th className="border border-neutral-300 px-3 py-2 text-left">Cliente</th>
              <th className="border border-neutral-300 px-3 py-2 text-left">Estado</th>
              <th className="border border-neutral-300 px-3 py-2 text-left">Detalle / Total</th>
              <th className="border border-neutral-300 px-3 py-2 text-left">Fecha</th>
              <th className="border border-neutral-300 px-3 py-2 text-left">Programado</th>
              <th className="border border-neutral-300 px-3 py-2 text-left">Repartidor</th>
              <th className="border border-neutral-300 px-3 py-2 text-left">Pago</th>
              <th className="border border-neutral-300 px-3 py-2 text-left">Observaciones</th>
              <th className="border border-neutral-300 px-3 py-2 text-left w-28">Acciones</th>
            </tr>
          </thead>
          <tbody>
            {pedidos.length === 0 ? (
              <tr>
                <td colSpan={9} className="border border-neutral-300 px-3 py-4 text-center text-neutral-500">
                  No hay pedidos para esta fecha
                </td>
              </tr>
            ) : (
              pedidos.map((p) => (
                <tr key={p.id}>
                  <td className="border border-neutral-300 px-3 py-2">{p.cliente?.name ?? "—"}</td>
                  <td className="border border-neutral-300 px-3 py-2">
                    {p.estado === "CANCELLED" ? (
                      <span className="text-red-700" title={p.motivoCancelacion ?? undefined}>Cancelado{p.motivoCancelacion ? ": " + p.motivoCancelacion : ""}</span>
                    ) : p.estado === "CREATED" ? "Creado" : p.estado === "IN_ROUTE" ? "En ruta" : p.estado === "DELIVERED" ? "Entregado" : p.estado}
                  </td>
                  <td className="border border-neutral-300 px-3 py-2">{itemsSummary(p)}</td>
                  <td className="border border-neutral-300 px-3 py-2">{formatDate(p.fechaPedido)}</td>
                  <td className="border border-neutral-300 px-3 py-2">{formatDate(p.fechaProgramada)}</td>
                  <td className="border border-neutral-300 px-3 py-2">{p.repartidor?.name ?? "—"}</td>
                  <td className="border border-neutral-300 px-3 py-2">
                    {p.formaPago ?? "—"}
                    {p.formaPago === "EFECTIVO" && p.efectivoCon != null && ` (con S/ ${Number(p.efectivoCon)})`}
                  </td>
                  <td className="border border-neutral-300 px-3 py-2">{p.observaciones ?? "—"}</td>
                  <td className="border border-neutral-300 px-3 py-2">
                    {(p.estado === "CREATED" || p.estado === "IN_ROUTE") && (
                      <button type="button" onClick={() => { setCancelando({ id: p.id, motivo: "" }); setError(""); }} className="text-sm text-red-600 underline">Cancelar</button>
                    )}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
