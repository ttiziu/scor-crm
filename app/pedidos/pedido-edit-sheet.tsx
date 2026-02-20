"use client";

import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Spinner } from "@/components/ui/spinner";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { clienteDisplayName } from "@/lib/cliente-display-name";
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
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

type Props = {
  pedidoId: string | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSaved: () => void;
  productos: Producto[];
  marcas: Marca[];
  repartidores: Repartidor[];
  formasPago: { value: string; label: string }[];
  isAdmin: boolean;
};

export function PedidoEditSheet({
  pedidoId,
  open,
  onOpenChange,
  onSaved,
  productos,
  marcas,
  repartidores,
  formasPago,
  isAdmin,
}: Props) {
  const [pedido, setPedido] = useState<PedidoDetalle | null>(null);
  const [clienteDirecciones, setClienteDirecciones] = useState<ClienteDireccion[]>([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [form, setForm] = useState({
    clienteDireccionId: "",
    fechaProgramada: todayISO(),
    repartidorId: "",
    formaPago: "",
    efectivoCon: "",
    observaciones: "",
    estado: "",
    motivoCancelacion: "",
    lineas: [] as LineaForm[],
  });

  useEffect(() => {
    if (!open || !pedidoId) return;
    setLoading(true);
    setPedido(null);
    setError("");
    fetch(`/api/pedidos/${pedidoId}`, { credentials: "include" })
      .then((res) => (res.ok ? res.json() : null))
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
              data.items?.length > 0
                ? data.items.map((i: { id: string; productoId: string; marcaId?: string | null; cantidad: number; precioUnitario: number }) => ({
                    id: i.id,
                    productoId: i.productoId,
                    marcaId: i.marcaId ?? "",
                    cantidad: String(i.cantidad),
                    precioUnitario: String(i.precioUnitario),
                  }))
                : [{ productoId: "", marcaId: "", cantidad: "1", precioUnitario: "" }],
          });
          if (data.clienteId) {
            fetch(`/api/clientes/${data.clienteId}`, { credentials: "include" })
              .then((r) => (r.ok ? r.json() : null))
              .then((c) => setClienteDirecciones(c?.direcciones ?? []))
              .catch(() => {});
          }
        }
      })
      .catch(() => setError("Error al cargar"))
      .finally(() => setLoading(false));
  }, [open, pedidoId]);

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
      toast.error("Debe haber al menos una línea con producto, cantidad y precio.");
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
        const msg = data.error ?? "Error al guardar";
        setError(msg);
        toast.error(msg);
        setSaving(false);
        return;
      }
      toast.success("Cambios aplicados");
      onSaved();
      onOpenChange(false);
    } catch {
      setError("Error de conexión");
      toast.error("Error de conexión");
    } finally {
      setSaving(false);
    }
  }

  const total = form.lineas.reduce(
    (acc, l) => acc + (Number(l.precioUnitario) || 0) * (parseInt(l.cantidad, 10) || 0),
    0
  );

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        side="right"
        className="w-full sm:max-w-3xl md:max-w-4xl lg:max-w-5xl overflow-y-auto flex flex-col p-0"
        onClick={(e) => e.stopPropagation()}
      >
        <SheetHeader className="pb-4 border-b shrink-0 px-6 pt-6">
          <SheetTitle className="text-lg pr-8">
            {pedido ? `Editar pedido · ${clienteDisplayName(pedido.cliente)}` : "Editar pedido"}
          </SheetTitle>
        </SheetHeader>
        <div className="mt-4 flex-1 overflow-y-auto px-6 pb-6">
          {loading && (
            <div className="flex items-center justify-center py-12">
              <Spinner className="size-8" />
            </div>
          )}
          {!loading && error && !pedido && (
            <p className="text-destructive py-4">{error}</p>
          )}
          {!loading && pedido && (
            <form onSubmit={handleSubmit} className="space-y-5">
              <div className="rounded-xl border border-neutral-200 bg-neutral-50/80 p-4 text-sm space-y-2">
                <p className="font-medium text-neutral-800">{clienteDisplayName(pedido.cliente)}</p>
                <p className="text-neutral-600">
                  {pedido.clienteDireccion
                    ? `${pedido.clienteDireccion.nombre}: ${pedido.clienteDireccion.direccion}${pedido.clienteDireccion.distrito ? ", " + pedido.clienteDireccion.distrito : ""}`
                    : pedido.cliente?.direccion ?? "—"}
                </p>
                <EstadoPedidoBadge estado={pedido.estado} />
              </div>

              <div>
                <label className="block text-sm font-medium text-neutral-700 mb-1.5">Dirección de entrega</label>
                <select
                  value={form.clienteDireccionId}
                  onChange={(e) => setForm((f) => ({ ...f, clienteDireccionId: e.target.value }))}
                  className="w-full border border-neutral-200 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-neutral-400/50"
                >
                  <option value="">Dirección principal</option>
                  {clienteDirecciones.map((d) => (
                    <option key={d.id} value={d.id}>{d.nombre} — {d.direccion}</option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-neutral-700 mb-1.5">Fecha programada</label>
                  <input
                    type="date"
                    value={form.fechaProgramada}
                    onChange={(e) => setForm((f) => ({ ...f, fechaProgramada: e.target.value }))}
                    className="w-full border border-neutral-200 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-neutral-400/50"
                  />
                </div>
                {isAdmin && (
                  <div>
                    <label className="block text-sm font-medium text-neutral-700 mb-1.5">Repartidor</label>
                    <select
                      value={form.repartidorId}
                      onChange={(e) => setForm((f) => ({ ...f, repartidorId: e.target.value }))}
                      className="w-full border border-neutral-200 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-neutral-400/50"
                    >
                      <option value="">Seleccionar</option>
                      {repartidores.map((r) => (
                        <option key={r.id} value={r.id}>{r.name}</option>
                      ))}
                    </select>
                  </div>
                )}
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-neutral-700 mb-1.5">Estado</label>
                  <select
                    value={form.estado}
                    onChange={(e) => setForm((f) => ({ ...f, estado: e.target.value }))}
                    className="w-full border border-neutral-200 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-neutral-400/50"
                  >
                    <option value="CREATED">Creado</option>
                    <option value="IN_ROUTE">En ruta</option>
                    <option value="DELIVERED">Entregado</option>
                    <option value="CANCELLED">Cancelado</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-neutral-700 mb-1.5">Forma de pago</label>
                  <select
                    value={form.formaPago}
                    onChange={(e) => setForm((f) => ({ ...f, formaPago: e.target.value }))}
                    className="w-full border border-neutral-200 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-neutral-400/50"
                  >
                    <option value="">Seleccionar</option>
                    {formasPago.map((fp) => (
                      <option key={fp.value} value={fp.value}>{fp.label}</option>
                    ))}
                  </select>
                </div>
              </div>

              {form.estado === "CANCELLED" && (
                <div>
                  <label className="block text-sm font-medium text-neutral-700 mb-1.5">Motivo de cancelación</label>
                  <input
                    value={form.motivoCancelacion}
                    onChange={(e) => setForm((f) => ({ ...f, motivoCancelacion: e.target.value }))}
                    placeholder="Opcional"
                    className="w-full border border-neutral-200 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-neutral-400/50"
                  />
                </div>
              )}

              {form.formaPago === "EFECTIVO" && (
                <div>
                  <label className="block text-sm font-medium text-neutral-700 mb-1.5">Con cuánto paga</label>
                  <input
                    type="number"
                    min={0}
                    step={0.01}
                    value={form.efectivoCon}
                    onChange={(e) => setForm((f) => ({ ...f, efectivoCon: e.target.value }))}
                    className="w-full border border-neutral-200 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-neutral-400/50"
                  />
                </div>
              )}

              <div className="rounded-xl border border-neutral-200 p-4 bg-white">
                <div className="flex justify-between items-center mb-3">
                  <label className="text-sm font-medium text-neutral-700">Líneas del pedido</label>
                  <Button type="button" variant="outline" size="sm" onClick={addLinea}>+ Agregar línea</Button>
                </div>
                <div className="space-y-3">
                  {form.lineas.map((l, i) => (
                    <div key={i} className="flex gap-3 items-center flex-wrap p-2 rounded-lg bg-neutral-50/80">
                      <select
                        value={l.productoId}
                        onChange={(e) => setLinea(i, "productoId", e.target.value)}
                        className="flex-1 min-w-[160px] border border-neutral-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-neutral-400/50"
                      >
                        <option value="">Producto</option>
                        {productos.map((p) => (
                          <option key={p.id} value={p.id}>{p.name}</option>
                        ))}
                      </select>
                      <select
                        value={l.marcaId}
                        onChange={(e) => setLinea(i, "marcaId", e.target.value)}
                        className="min-w-[100px] border border-neutral-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-neutral-400/50"
                      >
                        <option value="">Marca</option>
                        {marcas.map((m) => (
                          <option key={m.id} value={m.id}>{m.name}</option>
                        ))}
                      </select>
                      <input
                        type="number"
                        min={1}
                        value={l.cantidad}
                        onChange={(e) => setLinea(i, "cantidad", e.target.value)}
                        placeholder="Cant."
                        className="w-20 border border-neutral-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-neutral-400/50"
                      />
                      <input
                        type="number"
                        min={0}
                        step={0.01}
                        value={l.precioUnitario}
                        onChange={(e) => setLinea(i, "precioUnitario", e.target.value)}
                        placeholder="Precio"
                        className="w-28 border border-neutral-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-neutral-400/50"
                      />
                      {form.lineas.length > 1 && (
                        <Button type="button" variant="ghost" size="sm" onClick={() => removeLinea(i)} className="text-red-600 hover:text-red-700 hover:bg-red-50">Quitar</Button>
                      )}
                    </div>
                  ))}
                </div>
                {form.lineas.length > 0 && (
                  <p className="mt-3 text-sm font-semibold text-neutral-800">Total: S/ {total.toFixed(2)}</p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-neutral-700 mb-1.5">Observaciones</label>
                <textarea
                  value={form.observaciones}
                  onChange={(e) => setForm((f) => ({ ...f, observaciones: e.target.value }))}
                  placeholder="Opcional"
                  rows={2}
                  className="w-full border border-neutral-200 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-neutral-400/50 resize-none"
                />
              </div>

              {error && (
                <Alert variant="destructive">
                  <AlertCircleIcon />
                  <AlertDescription>{error}</AlertDescription>
                </Alert>
              )}
              <div className="pt-2">
                <Button type="submit" disabled={saving} size="default" className="min-w-[140px]">
                  {saving && <Spinner data-icon="inline-start" />}
                  {saving ? "Guardando…" : "Guardar"}
                </Button>
              </div>
            </form>
          )}
        </div>
      </SheetContent>
    </Sheet>
  );
}
