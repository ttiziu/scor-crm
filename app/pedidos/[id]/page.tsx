"use client";

import { useEffect, useState } from "react";
import { useRouter, useParams } from "next/navigation";
import Link from "next/link";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Spinner } from "@/components/ui/spinner";
import { EstadoPedidoBadge } from "@/components/estado-pedido-badge";
import { AlertCircleIcon } from "lucide-react";

type ClienteDireccion = { id: string; nombre: string; direccion: string; distrito: string | null };
type Producto = { id: string; name: string };
type Marca = { id: string; name: string };
type Repartidor = { id: string; name: string };
type LineaForm = { id?: string; productoId: string; marcaId: string; cantidad: string; precioUnitario: string };

type PedidoDetalle = {
  id: string;
  clienteId: string;
  clienteDireccionId: string | null;
  estado: string;
  fechaPedido: string;
  fechaProgramada: string | null;
  repartidorId: string | null;
  formaPago: string | null;
  efectivoCon: number | null;
  motivoCancelacion: string | null;
  observaciones: string | null;
  cliente: { id: string; name: string; documento: string | null; direccion: string | null; distrito: string | null; telefono: string | null };
  clienteDireccion: { id: string; nombre: string; direccion: string; distrito: string | null } | null;
  repartidor: { id: string; name: string } | null;
  items: Array<{
    id: string;
    productoId: string;
    marcaId: string | null;
    cantidad: number;
    precioUnitario: number;
    producto: { id: string; name: string };
    marca?: { id: string; name: string } | null;
  }>;
};

function todayISO() {
  const d = new Date();
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function formatDate(s: string | null) {
  if (!s) return "—";
  try {
    return new Date(s).toLocaleDateString("es", { day: "2-digit", month: "2-digit", year: "numeric" });
  } catch {
    return s;
  }
}

export default function PedidoDetallePage() {
  const router = useRouter();
  const params = useParams();
  const id = params?.id as string;
  const [pedido, setPedido] = useState<PedidoDetalle | null>(null);
  const [clienteDirecciones, setClienteDirecciones] = useState<ClienteDireccion[]>([]);
  const [productos, setProductos] = useState<Producto[]>([]);
  const [marcas, setMarcas] = useState<Marca[]>([]);
  const [repartidores, setRepartidores] = useState<Repartidor[]>([]);
  const [formasPago, setFormasPago] = useState<{ value: string; label: string }[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [userRole, setUserRole] = useState("");
  const [isAdmin, setIsAdmin] = useState(false);

  const [form, setForm] = useState({
    clienteDireccionId: "",
    fechaProgramada: "",
    repartidorId: "",
    formaPago: "",
    efectivoCon: "",
    observaciones: "",
    estado: "",
    motivoCancelacion: "",
    lineas: [] as LineaForm[],
  });

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
            return;
          }
          setUserRole(data.user.role ?? "");
          setIsAdmin(data.user.role === "ADMIN");
        }
      })
      .catch(() => router.replace("/login"));
  }, [router]);

  useEffect(() => {
    if (!id) return;
    fetch(`/api/pedidos/${id}`, { credentials: "include" })
      .then((res) => {
        if (res.status === 404) {
          router.replace("/pedidos");
          return null;
        }
        return res.json();
      })
      .then((data) => {
        if (data?.id) {
          setPedido(data);
          setForm({
            clienteDireccionId: data.clienteDireccionId ?? "",
            fechaProgramada: data.fechaProgramada ? data.fechaProgramada.slice(0, 10) : todayISO(),
            repartidorId: data.repartidorId ?? "",
            formaPago: data.formaPago ?? "",
            efectivoCon: data.efectivoCon != null ? String(data.efectivoCon) : "",
            observaciones: data.observaciones ?? "",
            estado: data.estado ?? "CREATED",
            motivoCancelacion: data.motivoCancelacion ?? "",
            lineas:
              (data.items?.length
                ? data.items.map((i: { id: string; productoId: string; marcaId?: string | null; cantidad: number; precioUnitario: number }) => ({
                    id: i.id,
                    productoId: i.productoId,
                    marcaId: i.marcaId ?? "",
                    cantidad: String(i.cantidad),
                    precioUnitario: String(i.precioUnitario),
                  }))
                : [{ productoId: "", marcaId: "", cantidad: "1", precioUnitario: "" }]) ?? [],
          });
          if (data.clienteId) {
            fetch(`/api/clientes/${data.clienteId}`, { credentials: "include" })
              .then((r) => (r.ok ? r.json() : null))
              .then((c) => setClienteDirecciones(c?.direcciones ?? []))
              .catch(() => {});
          }
        }
      })
      .catch(() => router.replace("/pedidos"))
      .finally(() => setLoading(false));
  }, [id, router]);

  useEffect(() => {
    fetch("/api/productos", { credentials: "include" })
      .then((r) => r.json())
      .then((d) => (Array.isArray(d) ? setProductos(d) : []))
      .catch(() => {});
    fetch("/api/marcas", { credentials: "include" })
      .then((r) => r.json())
      .then((d) => (Array.isArray(d) ? setMarcas(d) : []))
      .catch(() => {});
    fetch("/api/repartidores", { credentials: "include" })
      .then((r) => (r.status === 403 ? [] : r.json()))
      .then((d) => (Array.isArray(d) ? setRepartidores(d) : setRepartidores([])))
      .catch(() => setRepartidores([]));
    fetch("/api/formas-pago", { credentials: "include" })
      .then((r) => (r.ok ? r.json() : []))
      .then((d) => (Array.isArray(d) && d.length > 0 ? setFormasPago(d) : setFormasPago([{ value: "YAPE", label: "Yape" }, { value: "PLIN", label: "Plin" }, { value: "TRANSFERENCIA", label: "Transferencia" }, { value: "EFECTIVO", label: "Efectivo" }, { value: "TARJETA", label: "Tarjeta" }])))
      .catch(() => {});
  }, []);

  function setLinea(i: number, field: keyof LineaForm, value: string) {
    setForm((f) => ({
      ...f,
      lineas: f.lineas.map((l, idx) => (idx === i ? { ...l, [field]: value } : l)),
    }));
  }
  function addLinea() {
    setForm((f) => ({
      ...f,
      lineas: [...f.lineas, { productoId: "", marcaId: "", cantidad: "1", precioUnitario: "" }],
    }));
  }
  function removeLinea(i: number) {
    setForm((f) => ({ ...f, lineas: f.lineas.filter((_, idx) => idx !== i) }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!pedido) return;
    setError("");
    setSaving(true);
    const lineasValidas = form.lineas.filter(
      (l) => l.productoId && l.cantidad && parseInt(l.cantidad, 10) >= 1 && l.precioUnitario !== "" && Number(l.precioUnitario) >= 0
    );
    if (lineasValidas.length === 0) {
      setError("Debe haber al menos una línea con producto, cantidad y precio.");
      setSaving(false);
      return;
    }
    try {
      const res = await fetch(`/api/pedidos/${pedido.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          estado: form.estado,
          fechaProgramada: form.fechaProgramada || null,
          repartidorId: form.repartidorId || null,
          clienteDireccionId: form.clienteDireccionId || null,
          formaPago: form.formaPago || null,
          efectivoCon: form.efectivoCon ? Number(form.efectivoCon) : null,
          observaciones: form.observaciones || null,
          motivoCancelacion: form.estado === "CANCELLED" ? (form.motivoCancelacion || null) : null,
          items: lineasValidas.map((l) => ({
            productoId: l.productoId,
            marcaId: l.marcaId && l.marcaId !== "" ? l.marcaId : undefined,
            cantidad: parseInt(l.cantidad, 10),
            precioUnitario: Number(l.precioUnitario),
          })),
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(data.error ?? "Error al guardar");
        setSaving(false);
        return;
      }
      setPedido(data);
      setForm((f) => ({
        ...f,
        clienteDireccionId: data.clienteDireccionId ?? "",
        fechaProgramada: data.fechaProgramada ? data.fechaProgramada.slice(0, 10) : todayISO(),
        repartidorId: data.repartidorId ?? "",
        formaPago: data.formaPago ?? "",
        efectivoCon: data.efectivoCon != null ? String(data.efectivoCon) : "",
        observaciones: data.observaciones ?? "",
        estado: data.estado ?? "",
        motivoCancelacion: data.motivoCancelacion ?? "",
        lineas:
          data.items?.map((i: { id: string; productoId: string; marcaId?: string | null; cantidad: number; precioUnitario: number }) => ({
            id: i.id,
            productoId: i.productoId,
            marcaId: i.marcaId ?? "",
            cantidad: String(i.cantidad),
            precioUnitario: String(i.precioUnitario),
          })) ?? [],
      }));
    } catch {
      setError("Error de conexión");
    } finally {
      setSaving(false);
    }
  }

  if (loading || !pedido) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p>Cargando…</p>
      </div>
    );
  }

  const total = form.lineas.reduce(
    (acc, l) => acc + (Number(l.precioUnitario) || 0) * (parseInt(l.cantidad, 10) || 0),
    0
  );

  return (
    <div className="min-h-screen p-6">
      <header className="flex justify-between items-center mb-6">
        <div className="flex items-center gap-4">
          <Link href="/pedidos" className="text-sm underline">
            ← Volver a Pedidos
          </Link>
          <h1 className="text-xl font-semibold">Pedido · {pedido.cliente?.name ?? "—"}</h1>
        </div>
      </header>

      <div className="max-w-2xl space-y-6">
        <section className="border border-neutral-300 rounded p-4 bg-neutral-50/50">
          <h2 className="font-medium mb-3">Datos del pedido</h2>
          <dl className="grid grid-cols-2 gap-2 text-sm">
            <dt className="text-neutral-600">Cliente</dt>
            <dd>{pedido.cliente?.name ?? "—"} {pedido.cliente?.documento ? `(${pedido.cliente.documento})` : ""}</dd>
            <dt className="text-neutral-600">Teléfono</dt>
            <dd>{pedido.cliente?.telefono ?? "—"}</dd>
            <dt className="text-neutral-600">Dirección de entrega</dt>
            <dd>
              {pedido.clienteDireccion
                ? `${pedido.clienteDireccion.nombre}: ${pedido.clienteDireccion.direccion}${pedido.clienteDireccion.distrito ? ", " + pedido.clienteDireccion.distrito : ""}`
                : pedido.cliente?.direccion
                  ? `${pedido.cliente.direccion}${pedido.cliente.distrito ? ", " + pedido.cliente.distrito : ""}`
                  : "—"}
            </dd>
            <dt className="text-neutral-600">Fecha pedido</dt>
            <dd>{formatDate(pedido.fechaPedido)}</dd>
            <dt className="text-neutral-600">Estado</dt>
            <dd>
              <EstadoPedidoBadge estado={pedido.estado} motivoCancelacion={pedido.motivoCancelacion} />
            </dd>
          </dl>
        </section>

        <form onSubmit={handleSubmit} className="border border-neutral-300 rounded p-4 space-y-4">
          <h2 className="font-medium">Editar pedido</h2>

          <div>
            <label className="block text-sm mb-1">Dirección de entrega</label>
            <select
              value={form.clienteDireccionId}
              onChange={(e) => setForm((f) => ({ ...f, clienteDireccionId: e.target.value }))}
              className="w-full border rounded px-3 py-2"
            >
              <option value="">
                Dirección principal — {pedido.cliente?.direccion ?? "—"}
                {pedido.cliente?.distrito ? `, ${pedido.cliente.distrito}` : ""}
              </option>
              {clienteDirecciones.map((d) => (
                <option key={d.id} value={d.id}>
                  {d.nombre} — {d.direccion}
                  {d.distrito ? `, ${d.distrito}` : ""}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm mb-1">Fecha programada</label>
            <input
              type="date"
              value={form.fechaProgramada}
              onChange={(e) => setForm((f) => ({ ...f, fechaProgramada: e.target.value }))}
              className="w-full border rounded px-3 py-2"
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
                {repartidores.map((r) => (
                  <option key={r.id} value={r.id}>
                    {r.name}
                  </option>
                ))}
              </select>
            </div>
          )}

          <div>
            <label className="block text-sm mb-1">Estado</label>
            <select
              value={form.estado}
              onChange={(e) => setForm((f) => ({ ...f, estado: e.target.value }))}
              className="w-full border rounded px-3 py-2"
            >
              <option value="CREATED">Creado</option>
              <option value="IN_ROUTE">En ruta</option>
              <option value="DELIVERED">Entregado</option>
              <option value="CANCELLED">Cancelado</option>
            </select>
          </div>

          {form.estado === "CANCELLED" && (
            <div>
              <label className="block text-sm mb-1">Motivo de cancelación</label>
              <input
                value={form.motivoCancelacion}
                onChange={(e) => setForm((f) => ({ ...f, motivoCancelacion: e.target.value }))}
                placeholder="Opcional"
                className="w-full border rounded px-3 py-2"
              />
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
              {formasPago.map((fp) => (
                <option key={fp.value} value={fp.value}>{fp.label}</option>
              ))}
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
                className="w-full border rounded px-3 py-2"
              />
            </div>
          )}

          <div>
            <div className="flex justify-between items-center mb-1">
              <label className="block text-sm">Líneas del pedido</label>
              <Button type="button" variant="link" size="sm" onClick={addLinea}>
                + Agregar línea
              </Button>
            </div>
            <div className="space-y-2">
              {form.lineas.map((l, i) => (
                <div key={i} className="flex gap-2 items-center flex-wrap">
                  <select
                    value={l.productoId}
                    onChange={(e) => setLinea(i, "productoId", e.target.value)}
                    className="flex-1 min-w-[140px] border rounded px-2 py-1.5 text-sm"
                    required
                  >
                    <option value="">Producto</option>
                    {productos.map((prod) => (
                      <option key={prod.id} value={prod.id}>
                        {prod.name}
                      </option>
                    ))}
                  </select>
                  <select
                    value={l.marcaId}
                    onChange={(e) => setLinea(i, "marcaId", e.target.value)}
                    className="min-w-[110px] border rounded px-2 py-1.5 text-sm"
                    title="Marca del balón"
                  >
                    <option value="">Marca</option>
                    {marcas.map((m) => (
                      <option key={m.id} value={m.id}>
                        {m.name}
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
                    <Button type="button" variant="link" size="sm" onClick={() => removeLinea(i)} className="text-red-600">
                      Quitar
                    </Button>
                  )}
                </div>
              ))}
            </div>
            {form.lineas.length > 0 && (
              <p className="mt-2 text-sm font-medium">Total: S/ {total.toFixed(2)}</p>
            )}
          </div>

          <div>
            <label className="block text-sm mb-1">Observaciones</label>
            <input
              value={form.observaciones}
              onChange={(e) => setForm((f) => ({ ...f, observaciones: e.target.value }))}
              placeholder="Observaciones"
              className="w-full border rounded px-3 py-2"
            />
          </div>

          {error && (
            <Alert variant="destructive">
              <AlertCircleIcon />
              <AlertTitle>Error</AlertTitle>
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}
          <Button type="submit" disabled={saving} size="sm">
            {saving && <Spinner data-icon="inline-start" />}
            {saving ? "Guardando…" : "Guardar cambios"}
          </Button>
        </form>
      </div>
    </div>
  );
}
