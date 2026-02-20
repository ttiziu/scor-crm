"use client";

import { Suspense, useEffect, useState, useRef } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { Spinner } from "@/components/ui/spinner";
import { Skeleton } from "@/components/ui/skeleton";
import { TableSkeleton } from "@/components/ui/table-skeleton";
import {
  HoverCard,
  HoverCardContent,
  HoverCardTrigger,
} from "@/components/ui/hover-card";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { clienteDisplayName } from "@/lib/cliente-display-name";
import { EstadoPedidoBadge } from "@/components/estado-pedido-badge";
import { FormaPagoBadge } from "@/components/forma-pago-badge";
import { Pencil, Truck, CheckCircle, XCircle, ChevronLeft, ChevronRight, Eye, RefreshCw, CalendarIcon } from "lucide-react";
import { PedidoEditSheet } from "./pedido-edit-sheet";
import { format } from "date-fns";
import { es as esDateFns } from "date-fns/locale";
import { es as esDayPicker } from "react-day-picker/locale";
import type { DateRange } from "react-day-picker";

type Cliente = { id: string; name: string; documento?: string | null; telefono?: string | null };
type ClienteDireccion = { id: string; nombre: string; direccion: string; distrito: string | null };
type ClienteDetalle = { direccion: string | null; distrito: string | null; direcciones: ClienteDireccion[] };
type Producto = { id: string; name: string };
type Marca = { id: string; name: string };
type Repartidor = { id: string; name: string };
type PedidoItem = {
  id: string;
  productoId: string;
  marcaId?: string | null;
  cantidad: number;
  precioUnitario: number | string;
  producto: { id: string; name: string };
  marca?: { id: string; name: string } | null;
};
type Pedido = {
  id: string;
  clienteId: string;
  estado: string;
  cantidad: number | null;
  fechaPedido: string;
  fechaProgramada: string | null;
  repartidorId: string | null;
  asignadoEn?: string | null;
  formaPago: string | null;
  efectivoCon: number | string | null;
  motivoCancelacion: string | null;
  observaciones: string | null;
  createdAt: string;
  cliente: Cliente & { direccion?: string | null; distrito?: string | null; telefono?: string | null };
  clienteDireccion?: { id: string; nombre: string; direccion: string; distrito: string | null } | null;
  repartidor?: { id: string; name: string } | null;
  items?: PedidoItem[];
  _count?: { evidencias: number };
};

type LineaForm = { productoId: string; marcaId: string; cantidad: string; precioUnitario: string };

function todayISO() {
  const d = new Date();
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

type EvidenciaItem = { id: string; fotoUrl: string; comentario: string | null; createdAt: string; repartidor: string };

function EvidenciaHoverContent({ pedidoId }: { pedidoId: string }) {
  const [list, setList] = useState<EvidenciaItem[] | null>(null);
  const [loading, setLoading] = useState(true);
  useEffect(() => {
    let cancelled = false;
    fetch(`/api/pedidos/${pedidoId}/evidencias`, { credentials: "include" })
      .then((r) => (r.ok ? r.json() : []))
      .then((data) => { if (!cancelled) setList(Array.isArray(data) ? data : []); })
      .catch(() => { if (!cancelled) setList([]); })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [pedidoId]);
  if (loading) return <div className="p-4 text-sm text-muted-foreground">Cargando…</div>;
  if (!list?.length) return <div className="p-4 text-sm text-muted-foreground">Sin evidencias</div>;
  return (
    <div className="p-3 space-y-3">
      <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Evidencia de entrega</p>
      {list.map((e) => (
        <div key={e.id} className="space-y-1.5">
          <img src={e.fotoUrl} alt="Evidencia" className="w-full rounded border object-contain max-h-48 bg-neutral-50" />
          {e.comentario && <p className="text-sm text-neutral-600">{e.comentario}</p>}
          <p className="text-xs text-muted-foreground">{e.repartidor} · {new Date(e.createdAt).toLocaleString("es-PE")}</p>
        </div>
      ))}
    </div>
  );
}

function PedidosContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [pedidos, setPedidos] = useState<Pedido[]>([]);
  const [clientes, setClientes] = useState<Cliente[]>([]);
  const [productos, setProductos] = useState<Producto[]>([]);
  const [marcas, setMarcas] = useState<Marca[]>([]);
  const [repartidores, setRepartidores] = useState<Repartidor[]>([]);
  const [isAdmin, setIsAdmin] = useState(false);
  const [userRole, setUserRole] = useState("");
  const [contextTenantId, setContextTenantId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [authOk, setAuthOk] = useState(false);
  const [formOpen, setFormOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    clienteId: "",
    clienteDireccionId: "",
    fechaProgramada: todayISO(),
    repartidorId: "",
    formaPago: "",
    efectivoCon: "",
    observaciones: "",
    lineas: [{ productoId: "", marcaId: "", cantidad: "1", precioUnitario: "" }] as LineaForm[],
  });
  const [clienteSearch, setClienteSearch] = useState("");
  const [clienteDropdownOpen, setClienteDropdownOpen] = useState(false);
  const [clienteDetalle, setClienteDetalle] = useState<ClienteDetalle | null>(null);
  const [ultimoPedido, setUltimoPedido] = useState<{
    clienteId: string;
    data: {
      formaPago: string | null;
      efectivoCon: number | null;
      clienteDireccionId: string;
      observaciones: string;
      items: Array<{ productoId: string; marcaId: string; cantidad: number; precioUnitario: number }>;
    };
  } | null>(null);
  const [fechaDesde, setFechaDesde] = useState(() => todayISO());
  const [fechaHasta, setFechaHasta] = useState(() => todayISO());
  const [repartidorFiltro, setRepartidorFiltro] = useState("");
  const [clienteBusquedaInput, setClienteBusquedaInput] = useState("");
  const [clienteBusqueda, setClienteBusqueda] = useState("");
  const [estadoFiltro, setEstadoFiltro] = useState("");
  const [formaPagoFiltro, setFormaPagoFiltro] = useState("");
  const [cancelando, setCancelando] = useState<{ id: string; motivo: string } | null>(null);
  const [editingPedidoId, setEditingPedidoId] = useState<string | null>(null);
  const [updatingEstadoId, setUpdatingEstadoId] = useState<string | null>(null);
  const [exportando, setExportando] = useState(false);
  const [formasPago, setFormasPago] = useState<{ value: string; label: string }[]>([]);
  const [page, setPage] = useState(1);
  const [totalPedidos, setTotalPedidos] = useState(0);
  const PEDIDOS_PAGE_SIZE = 100;
  const clienteInputRef = useRef<HTMLInputElement>(null);
  const [clientePhoneSearch, setClientePhoneSearch] = useState("");
  const [clientePhoneDropdownOpen, setClientePhoneDropdownOpen] = useState(false);
  const [phoneSearchResults, setPhoneSearchResults] = useState<Cliente[]>([]);
  const [phoneSearching, setPhoneSearching] = useState(false);
  const phoneInputRef = useRef<HTMLInputElement>(null);

  function loadPedidos() {
    const params = new URLSearchParams();
    params.set("page", String(page));
    params.set("pageSize", String(PEDIDOS_PAGE_SIZE));
    if (fechaDesde && fechaHasta) {
      params.set("fechaDesde", fechaDesde);
      params.set("fechaHasta", fechaHasta);
    }
    if (repartidorFiltro) params.set("repartidorId", repartidorFiltro);
    if (estadoFiltro) params.set("estado", estadoFiltro);
    if (formaPagoFiltro) params.set("formaPago", formaPagoFiltro);
    if (clienteBusqueda.trim()) params.set("clienteQuery", clienteBusqueda.trim());
    const url = `/api/pedidos?${params.toString()}`;
    fetch(url, { credentials: "include" })
      .then((res) => res.json())
      .then((data) => {
        if (data?.pedidos != null) {
          setPedidos(Array.isArray(data.pedidos) ? data.pedidos : []);
          setTotalPedidos(Number(data.total) ?? 0);
        } else {
          setPedidos(Array.isArray(data) ? data : []);
          setTotalPedidos(0);
        }
      })
      .catch(() => {
        setPedidos([]);
        setTotalPedidos(0);
      });
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

  function loadMarcas() {
    fetch("/api/marcas", { credentials: "include" })
      .then((res) => res.json())
      .then((data) => (Array.isArray(data) ? setMarcas(data) : setMarcas([])))
      .catch(() => setMarcas([]));
  }

  function loadRepartidores() {
    fetch("/api/repartidores", { credentials: "include" })
      .then((res) => (res.status === 403 ? [] : res.json()))
      .then((data) => (Array.isArray(data) ? setRepartidores(data) : setRepartidores([])))
      .catch(() => setRepartidores([]));
  }

  function fetchMe() {
    return fetch("/api/auth/me", { credentials: "include" })
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
          setAuthOk(true);
          setIsAdmin(data.user.role === "ADMIN");
          setUserRole(data.user.role ?? "");
          setContextTenantId(data.contextTenantId ?? null);
        }
        loadPedidos();
        loadClientes();
        loadProductos();
        loadMarcas();
        loadRepartidores();
        fetch("/api/formas-pago", { credentials: "include" })
          .then((r) => (r.ok ? r.json() : []))
          .then((d) => (Array.isArray(d) && d.length > 0 ? setFormasPago(d) : setFormasPago([{ value: "YAPE", label: "Yape" }, { value: "PLIN", label: "Plin" }, { value: "TRANSFERENCIA", label: "Transferencia" }, { value: "EFECTIVO", label: "Efectivo" }, { value: "TARJETA", label: "Tarjeta" }])))
          .catch(() => {});
      })
      .catch(() => router.replace("/login"));
  }

  useEffect(() => {
    fetchMe().finally(() => setLoading(false));
  }, [router]);

  useEffect(() => {
    const onContextChange = () => fetchMe().then(() => {
      loadPedidos();
      loadClientes();
      loadProductos();
      loadMarcas();
      loadRepartidores();
    });
    window.addEventListener("scor-context-tenant-changed", onContextChange);
    return () => window.removeEventListener("scor-context-tenant-changed", onContextChange);
  }, []);

  useEffect(() => {
    if (!form.clienteId) {
      setClienteDetalle(null);
      setUltimoPedido(null);
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

  // Cargar último pedido del cliente para pre-llenar formulario
  useEffect(() => {
    if (!form.clienteId) {
      setUltimoPedido(null);
      return;
    }
    const cid = form.clienteId;
    setUltimoPedido(null);
    fetch(`/api/clientes/${cid}/ultimo-pedido`, { credentials: "include" })
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (data && data.items?.length > 0) {
          setUltimoPedido({ clienteId: cid, data });
        } else {
          setUltimoPedido(null);
          setForm((f) => {
            if (f.clienteId !== cid) return f;
            return {
              ...f,
              formaPago: "",
              efectivoCon: "",
              observaciones: "",
              clienteDireccionId: "",
              lineas: [{ productoId: "", marcaId: "", cantidad: "1", precioUnitario: "" }],
            };
          });
        }
      })
      .catch(() => setUltimoPedido(null));
  }, [form.clienteId]);

  // Aplicar último pedido al form cuando tengamos clienteDetalle (para validar dirección)
  useEffect(() => {
    if (!ultimoPedido || ultimoPedido.clienteId !== form.clienteId || !clienteDetalle) return;
    const { data } = ultimoPedido;
    const direccionIds = clienteDetalle.direcciones.map((d) => d.id);
    const clienteDireccionId =
      data.clienteDireccionId && direccionIds.includes(data.clienteDireccionId)
        ? data.clienteDireccionId
        : "";
    setForm((f) => ({
      ...f,
      formaPago: data.formaPago ?? "",
      efectivoCon: data.efectivoCon != null ? String(data.efectivoCon) : "",
      observaciones: data.observaciones ?? "",
      clienteDireccionId,
      lineas: data.items.map((i) => ({
        productoId: i.productoId,
        marcaId: i.marcaId ?? "",
        cantidad: String(i.cantidad),
        precioUnitario: String(i.precioUnitario),
      })),
    }));
    setUltimoPedido(null);
  }, [ultimoPedido, form.clienteId, clienteDetalle]);

  // Debounce búsqueda por cliente (evitar una petición por cada tecla)
  useEffect(() => {
    const t = setTimeout(() => setClienteBusqueda(clienteBusquedaInput), 400);
    return () => clearTimeout(t);
  }, [clienteBusquedaInput]);

  // Búsqueda por teléfono (debounced)
  useEffect(() => {
    const q = clientePhoneSearch.trim();
    if (q.length < 2) {
      setPhoneSearchResults([]);
      return;
    }
    const t = setTimeout(() => {
      setPhoneSearching(true);
      const params = new URLSearchParams({ telefono: q, page: "1", pageSize: "20" });
      fetch(`/api/clientes?${params}`, { credentials: "include" })
        .then((res) => res.json())
        .then((data) => {
          const list = data?.clientes ?? (Array.isArray(data) ? data : []);
          setPhoneSearchResults(list);
        })
        .catch(() => setPhoneSearchResults([]))
        .finally(() => setPhoneSearching(false));
    }, 350);
    return () => clearTimeout(t);
  }, [clientePhoneSearch]);

  // Preseleccionar cliente y abrir formulario si se viene desde Clientes con ?clienteId=...
  useEffect(() => {
    if (!authOk || clientes.length === 0) return;
    const clienteId = searchParams.get("clienteId");
    if (!clienteId) return;
    const c = clientes.find((x) => x.id === clienteId);
    if (c) {
      setForm((f) => ({ ...f, clienteId }));
      setClienteSearch(`${clienteDisplayName(c)}${c.documento ? " — " + c.documento : ""}`);
      setFormOpen(true);
      router.replace("/pedidos", { scroll: false });
    }
  }, [authOk, clientes, searchParams, router]);

  useEffect(() => {
    if (authOk) loadPedidos();
  }, [authOk, page, fechaDesde, fechaHasta, repartidorFiltro, estadoFiltro, formaPagoFiltro, clienteBusqueda, contextTenantId]);

  useEffect(() => {
    setPage(1);
  }, [fechaDesde, fechaHasta, repartidorFiltro, estadoFiltro, formaPagoFiltro, clienteBusqueda]);

  // Actualizar lista al volver a la pestaña (p. ej. cuando el repartidor marca En ruta/Entregado)
  useEffect(() => {
    if (!authOk) return;
    const onFocus = () => loadPedidos();
    window.addEventListener("focus", onFocus);
    return () => window.removeEventListener("focus", onFocus);
  }, [authOk, page, fechaDesde, fechaHasta, repartidorFiltro, estadoFiltro, formaPagoFiltro, clienteBusqueda]);

  // Polling cada 15 s para ver enseguida cuando el repartidor marca En ruta/Entregado
  useEffect(() => {
    if (!authOk) return;
    const id = setInterval(loadPedidos, 15_000);
    return () => clearInterval(id);
  }, [authOk, page, fechaDesde, fechaHasta, repartidorFiltro, estadoFiltro, formaPagoFiltro, clienteBusqueda]);

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
        toast.success("Pedido cancelado");
      } else {
        const data = await res.json().catch(() => ({}));
        toast.error(data.error ?? "Error al cancelar");
      }
    } catch {
      toast.error("Error de conexión");
    } finally {
      setSaving(false);
    }
  }

  async function cambiarEstado(pedidoId: string, estado: string) {
    setUpdatingEstadoId(pedidoId);
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
      setUpdatingEstadoId(null);
    }
  }

  async function exportarPedidos() {
    const params = new URLSearchParams();
    if (fechaDesde && fechaHasta) {
      params.set("fechaDesde", fechaDesde);
      params.set("fechaHasta", fechaHasta);
    }
    if (repartidorFiltro) params.set("repartidorId", repartidorFiltro);
    if (estadoFiltro) params.set("estado", estadoFiltro);
    if (formaPagoFiltro) params.set("formaPago", formaPagoFiltro);
    if (clienteBusqueda.trim()) params.set("clienteQuery", clienteBusqueda.trim());
    setExportando(true);
    try {
      const res = await fetch(`/api/pedidos/export?${params.toString()}`, { credentials: "include" });
      if (!res.ok) return;
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = fechaDesde && fechaHasta ? `pedidos_${fechaDesde}_${fechaHasta}.xlsx` : "pedidos_todos.xlsx";
      a.click();
      URL.revokeObjectURL(url);
    } finally {
      setExportando(false);
    }
  }

  function addLinea() {
    setForm((f) => ({
      ...f,
      lineas: [...f.lineas, { productoId: "", marcaId: "", cantidad: "1", precioUnitario: "" }],
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
      toast.error("Selecciona un cliente");
      return;
    }
    const lineasValidas = form.lineas.filter(
      (l) => l.productoId && l.cantidad && parseInt(l.cantidad, 10) >= 1 && l.precioUnitario !== "" && Number(l.precioUnitario) >= 0
    );
    const lineasPayload = lineasValidas.map((l) => ({
      productoId: l.productoId,
      marcaId: l.marcaId && l.marcaId !== "" ? l.marcaId : undefined,
      cantidad: parseInt(l.cantidad, 10),
      precioUnitario: Number(l.precioUnitario),
    }));
    if (lineasValidas.length === 0) {
      toast.error("Agrega al menos una línea con producto, cantidad y precio");
      return;
    }
    if (!form.fechaProgramada?.trim()) {
      toast.error("Indica la fecha programada");
      return;
    }
    if (!form.formaPago?.trim()) {
      toast.error("Selecciona la forma de pago");
      return;
    }
    if (form.formaPago === "EFECTIVO" && (!form.efectivoCon || Number(form.efectivoCon) <= 0)) {
      toast.error("Indica con cuánto paga (efectivo)");
      return;
    }
    if (repartidores.length === 0) {
      toast.error("Debes crear al menos un repartidor en Usuarios para poder registrar pedidos");
      return;
    }
    if (!form.repartidorId?.trim()) {
      toast.error("Selecciona un repartidor");
      return;
    }
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
          items: lineasPayload,
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        toast.error(data.error ?? "Error al crear");
        return;
      }
      toast.success("Pedido creado");
      setForm({
        clienteId: "",
        clienteDireccionId: "",
        fechaProgramada: todayISO(),
        repartidorId: "",
        formaPago: "",
        efectivoCon: "",
        observaciones: "",
        lineas: [{ productoId: "", marcaId: "", cantidad: "1", precioUnitario: "" }],
      });
      setClienteDetalle(null);
      setClienteSearch("");
      setClientePhoneSearch("");
      setPhoneSearchResults([]);
      setFormOpen(false);
      loadPedidos();
    } catch {
      toast.error("Error de conexión");
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
      const lineLabel = p.items.length === 1 ? "línea" : "líneas";
      return `${p.items.length} ${lineLabel} · S/ ${total.toFixed(2)}`;
    }
    return p.cantidad != null ? `Cantidad: ${p.cantidad}` : "—";
  }

  if (loading) {
    return (
      <div className="min-h-screen p-6">
        <div className="flex justify-between items-center mb-6">
          <Skeleton className="h-8 w-28" />
          <Skeleton className="h-9 w-32" />
        </div>
        <div className="mb-4 rounded-lg border border-neutral-200 bg-neutral-50/50 p-3 space-y-2">
          <Skeleton className="h-4 w-16" />
          <div className="flex gap-3 flex-wrap">
            <Skeleton className="h-9 w-36" />
            <Skeleton className="h-9 w-36" />
            <Skeleton className="h-9 w-24" />
          </div>
        </div>
        <div className="mb-2">
          <Skeleton className="h-4 w-56" />
        </div>
        <TableSkeleton columns={9} rows={8} />
      </div>
    );
  }
  if (!authOk) return null;

  if (userRole === "SUPER_ADMIN" && !contextTenantId) {
    return (
      <div className="min-h-screen p-6 flex items-center justify-center">
        <p className="text-muted-foreground">Selecciona una empresa en el menú lateral para ver sus datos.</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen p-6">
      <header className="flex flex-wrap justify-between items-center gap-4 mb-6">
        <h1 className="text-xl font-semibold">Pedidos</h1>
        {userRole !== "REPARTIDOR" && (
          <Button type="button" size="sm" onClick={() => setFormOpen(!formOpen)}>
            {formOpen ? "Cerrar formulario" : "Nuevo pedido"}
          </Button>
        )}
      </header>

      <div className="mb-6">
        {formOpen && (
          <form onSubmit={handleSubmit} className="mt-4 w-full">
            <div className="rounded-xl border border-neutral-200 bg-white shadow-sm overflow-hidden">
              <div className="p-6 space-y-5">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="relative">
                    <label className="block text-sm font-medium text-neutral-700 mb-1.5">Teléfono</label>
                    <input
                      ref={phoneInputRef}
                      type="text"
                      inputMode="numeric"
                      value={clientePhoneDropdownOpen ? clientePhoneSearch : (form.clienteId && clienteSeleccionado?.telefono) || clientePhoneSearch}
                      onChange={(e) => {
                        setClientePhoneSearch(e.target.value);
                        setClientePhoneDropdownOpen(true);
                        if (!e.target.value) setForm((f) => (f.clienteId ? { ...f, clienteId: "" } : f));
                      }}
                      onFocus={() => setClientePhoneDropdownOpen(true)}
                      onBlur={() => setTimeout(() => setClientePhoneDropdownOpen(false), 200)}
                      placeholder="Buscar por número..."
                      className="w-full rounded-lg border border-neutral-200 bg-white px-3 py-2 text-sm placeholder:text-neutral-400 focus:outline-none focus:ring-2 focus:ring-neutral-400/50"
                      autoComplete="off"
                    />
                    {clientePhoneDropdownOpen && (clientePhoneSearch.trim().length >= 2 || phoneSearchResults.length > 0) && (
                      <div className="absolute z-20 w-full mt-1 rounded-lg border border-neutral-200 bg-white shadow-lg max-h-52 overflow-y-auto">
                        {phoneSearching ? (
                          <div className="px-3 py-3 text-sm text-neutral-500">Buscando…</div>
                        ) : phoneSearchResults.length === 0 ? (
                          <div className="px-3 py-3 space-y-2">
                            <p className="text-sm text-neutral-500">
                              {clientePhoneSearch.trim().length >= 2 ? "Ningún cliente con ese número" : "Escribe al menos 2 dígitos"}
                            </p>
                            {clientePhoneSearch.trim().length >= 2 && (
                              <Link
                                href={`/clientes?crear=1&telefono=${encodeURIComponent(clientePhoneSearch.trim())}`}
                                className="inline-flex items-center gap-1.5 text-sm font-medium text-primary hover:underline"
                                onClick={() => setClientePhoneDropdownOpen(false)}
                              >
                                Crear cliente con este número →
                              </Link>
                            )}
                          </div>
                        ) : (
                          phoneSearchResults.map((c) => (
                            <Button
                              key={c.id}
                              type="button"
                              variant="ghost"
                              size="sm"
                              className="w-full justify-start rounded-none border-b border-neutral-100 last:border-0 h-auto py-2.5 text-left font-normal"
                              onMouseDown={(e) => {
                                e.preventDefault();
                                setForm((f) => ({ ...f, clienteId: c.id }));
                                setClienteSearch(`${clienteDisplayName(c)}${c.documento ? " — " + c.documento : ""}`);
                                setClientePhoneSearch(c.telefono ?? "");
                                setPhoneSearchResults([]);
                                setClientePhoneDropdownOpen(false);
                                setClientes((prev) => (prev.some((x) => x.id === c.id) ? prev : [...prev, c]));
                                phoneInputRef.current?.blur();
                              }}
                            >
                              <span className="font-medium">{c.telefono ?? "—"}</span>
                              <span className="text-neutral-500 ml-2">{clienteDisplayName(c)}</span>
                            </Button>
                          ))
                        )}
                      </div>
                    )}
                  </div>
                  <div className="relative">
                    <label className="block text-sm font-medium text-neutral-700 mb-1.5">Cliente *</label>
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
                      placeholder="Nombre o documento..."
                      className="w-full rounded-lg border border-neutral-200 bg-white px-3 py-2 text-sm placeholder:text-neutral-400 focus:outline-none focus:ring-2 focus:ring-neutral-400/50"
                      autoComplete="off"
                    />
                    {clienteDropdownOpen && (
                      <div className="absolute z-20 w-full mt-1 rounded-lg border border-neutral-200 bg-white shadow-lg max-h-52 overflow-y-auto">
                        {clientesFiltrados.length === 0 ? (
                          <div className="px-3 py-3 text-sm text-neutral-500">Ningún cliente coincide</div>
                        ) : (
                          clientesFiltrados.map((c) => {
                            const text = `${clienteDisplayName(c)}${c.documento ? " — " + c.documento : ""}`;
                            return (
                              <Button
                                key={c.id}
                                type="button"
                                variant="ghost"
                                size="sm"
                                className="w-full justify-start rounded-none border-b border-neutral-100 last:border-0 h-auto py-2.5 text-left font-normal"
                                onMouseDown={(e) => {
                                  e.preventDefault();
                                  setForm((f) => ({ ...f, clienteId: c.id }));
                                  setClienteSearch(text);
                                  setClientePhoneSearch(c.telefono ?? "");
                                  setClienteDropdownOpen(false);
                                  clienteInputRef.current?.blur();
                                }}
                              >
                                {text}
                              </Button>
                            );
                          })
                        )}
                      </div>
                    )}
                  </div>
                </div>

                {form.clienteId && clienteDetalle && (
                  <div>
                    <label className="block text-sm font-medium text-neutral-700 mb-1.5">Dirección de entrega</label>
                    <select
                      value={form.clienteDireccionId}
                      onChange={(e) => setForm((f) => ({ ...f, clienteDireccionId: e.target.value }))}
                      className="w-full rounded-lg border border-neutral-200 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-neutral-400/50"
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

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-neutral-700 mb-1.5">Fecha programada *</label>
                    <input
                      type="date"
                      value={form.fechaProgramada}
                      onChange={(e) => setForm((f) => ({ ...f, fechaProgramada: e.target.value }))}
                      className="w-full rounded-lg border border-neutral-200 bg-white px-3 py-2 text-sm scheme-light focus:outline-none focus:ring-2 focus:ring-neutral-400/50"
                      title="Haz clic para abrir el calendario"
                    />
                  </div>
                  {repartidores.length > 0 ? (
                    <div>
                      <label className="block text-sm font-medium text-neutral-700 mb-1.5">
                        Repartidor <span className="text-red-500">*</span>
                      </label>
                      <select
                        value={form.repartidorId}
                        onChange={(e) => setForm((f) => ({ ...f, repartidorId: e.target.value }))}
                        className="w-full rounded-lg border border-neutral-200 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-neutral-400/50"
                      >
                        <option value="">Seleccionar repartidor</option>
                        {repartidores.map((r) => (
                          <option key={r.id} value={r.id}>
                            {r.name}
                          </option>
                        ))}
                      </select>
                    </div>
                  ) : (
                    <p className="text-sm text-amber-700 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2">
                      Debes crear al menos un repartidor en Usuarios para poder registrar pedidos.
                    </p>
                  )}
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-neutral-700 mb-1.5">Forma de pago *</label>
                    <select
                      value={form.formaPago}
                      onChange={(e) => setForm((f) => ({ ...f, formaPago: e.target.value }))}
                      className="w-full rounded-lg border border-neutral-200 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-neutral-400/50"
                    >
                      <option value="">Seleccionar</option>
                      {formasPago.map((fp) => (
                        <option key={fp.value} value={fp.value}>{fp.label}</option>
                      ))}
                    </select>
                  </div>
                  {form.formaPago === "EFECTIVO" && (
                    <div>
                      <label className="block text-sm font-medium text-neutral-700 mb-1.5">Con cuánto paga (efectivo) *</label>
                      <input
                        type="number"
                        min={0}
                        step={0.01}
                        value={form.efectivoCon}
                        onChange={(e) => setForm((f) => ({ ...f, efectivoCon: e.target.value }))}
                        placeholder="Ej. 100"
                        className="w-full rounded-lg border border-neutral-200 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-neutral-400/50"
                      />
                    </div>
                  )}
                </div>

                <div>
                  <div className="flex justify-between items-center mb-1.5">
                    <label className="block text-sm font-medium text-neutral-700">Líneas del pedido *</label>
                    <Button type="button" variant="link" size="sm" onClick={addLinea} className="text-neutral-600 h-auto p-0">
                      + Agregar línea
                    </Button>
                  </div>
                  <div className="space-y-2">
                    {form.lineas.map((l, i) => (
                      <div key={i} className="flex gap-2 items-center flex-wrap">
                        <select
                          value={l.productoId}
                          onChange={(e) => setLinea(i, "productoId", e.target.value)}
                          className="flex-1 min-w-[140px] rounded-lg border border-neutral-200 bg-white px-2 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-neutral-400/50"
                          required={i === 0}
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
                          className="min-w-[110px] rounded-lg border border-neutral-200 bg-white px-2 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-neutral-400/50"
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
                          className="w-20 rounded-lg border border-neutral-200 bg-white px-2 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-neutral-400/50"
                        />
                        <input
                          type="number"
                          min={0}
                          step={0.01}
                          value={l.precioUnitario}
                          onChange={(e) => setLinea(i, "precioUnitario", e.target.value)}
                          placeholder="Precio unit."
                          className="w-28 rounded-lg border border-neutral-200 bg-white px-2 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-neutral-400/50"
                        />
                        {form.lineas.length > 1 && (
                          <Button type="button" variant="link" size="sm" onClick={() => removeLinea(i)} className="text-red-600 h-auto p-0">
                            Quitar
                          </Button>
                        )}
                      </div>
                    ))}
                  </div>
                  {(() => {
                    const total = form.lineas.reduce((sum, l) => {
                      const cant = parseInt(l.cantidad, 10);
                      const precio = Number(l.precioUnitario);
                      if (!isNaN(cant) && cant > 0 && !isNaN(precio) && precio >= 0) return sum + cant * precio;
                      return sum;
                    }, 0);
                    if (total > 0) {
                      return (
                        <p className="mt-2 text-sm font-medium text-neutral-800">
                          Total: <span className="tabular-nums">S/ {total.toFixed(2)}</span>
                        </p>
                      );
                    }
                    return null;
                  })()}
                </div>

                <div>
                  <label className="block text-sm font-medium text-neutral-700 mb-1.5">Observaciones</label>
                  <textarea
                    rows={2}
                    placeholder="Opcional"
                    value={form.observaciones}
                    onChange={(e) => setForm((f) => ({ ...f, observaciones: e.target.value }))}
                    className="w-full rounded-lg border border-neutral-200 bg-white px-3 py-2 text-sm placeholder:text-neutral-400 focus:outline-none focus:ring-2 focus:ring-neutral-400/50 resize-none"
                  />
                </div>

                <div className="pt-1">
                  <Button type="submit" disabled={saving || repartidores.length === 0} size="sm" className="rounded-lg px-5">
                    {saving && <Spinner data-icon="inline-start" />}
                    {saving ? "Guardando…" : "Guardar"}
                  </Button>
                </div>
              </div>
            </div>
          </form>
        )}
      </div>

      <div className="mb-4 p-3 border border-neutral-200 rounded-lg bg-neutral-50/50">
        <p className="text-sm font-medium text-neutral-700 mb-2">Filtros</p>
        <div className="flex flex-wrap items-center gap-3">
          <div className="flex gap-2 flex-wrap items-center">
            <Popover>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  size="sm"
                  className="justify-start px-2.5 font-normal min-w-[220px] gap-2"
                >
                  <CalendarIcon className="size-4 shrink-0" />
                  {fechaDesde && fechaHasta ? (
                    <span className="truncate">
                      {format(new Date(fechaDesde + "T00:00:00"), "dd MMM yyyy", { locale: esDateFns })} - {format(new Date(fechaHasta + "T00:00:00"), "dd MMM yyyy", { locale: esDateFns })}
                    </span>
                  ) : (
                    <span className="text-muted-foreground">Seleccionar rango</span>
                  )}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="start">
                <Calendar
                  mode="range"
                  defaultMonth={fechaDesde ? new Date(fechaDesde + "T00:00:00") : undefined}
                  selected={
                    fechaDesde && fechaHasta
                      ? { from: new Date(fechaDesde + "T00:00:00"), to: new Date(fechaHasta + "T00:00:00") }
                      : undefined
                  }
                  onSelect={(range: DateRange | undefined) => {
                    if (range?.from) {
                      const from = format(range.from, "yyyy-MM-dd");
                      const to = range.to ? format(range.to, "yyyy-MM-dd") : from;
                      setFechaDesde(from);
                      setFechaHasta(to);
                    } else {
                      setFechaDesde("");
                      setFechaHasta("");
                    }
                  }}
                  numberOfMonths={2}
                  locale={esDayPicker}
                />
              </PopoverContent>
            </Popover>
            <Button type="button" variant="outline" size="sm" onClick={() => { setFechaDesde(todayISO()); setFechaHasta(todayISO()); }}>Hoy</Button>
            <Button type="button" variant="outline" size="sm" onClick={() => { setFechaDesde(""); setFechaHasta(""); }}>Todas</Button>
          </div>
          {userRole !== "REPARTIDOR" && repartidores.length > 0 && (
            <div className="flex items-center gap-1">
              <label className="text-sm">Repartidor:</label>
              <select value={repartidorFiltro} onChange={(e) => setRepartidorFiltro(e.target.value)} className="border rounded px-2 py-1.5 text-sm min-w-[120px]">
                <option value="">Todos</option>
                {repartidores.map((r) => (
                  <option key={r.id} value={r.id}>{r.name}</option>
                ))}
              </select>
            </div>
          )}
          <div className="flex items-center gap-1">
            <label className="text-sm">Estado:</label>
            <select value={estadoFiltro} onChange={(e) => setEstadoFiltro(e.target.value)} className="border rounded px-2 py-1.5 text-sm min-w-[110px]">
              <option value="">Todos</option>
              <option value="CREATED">Creado</option>
              <option value="IN_ROUTE">En ruta</option>
              <option value="DELIVERED">Entregado</option>
              <option value="CANCELLED">Cancelado</option>
            </select>
          </div>
          <div className="flex items-center gap-1">
            <label className="text-sm">Pago:</label>
            <select value={formaPagoFiltro} onChange={(e) => setFormaPagoFiltro(e.target.value)} className="border rounded px-2 py-1.5 text-sm min-w-[120px]">
              <option value="">Todos</option>
              {formasPago.map((fp) => (
                <option key={fp.value} value={fp.value}>{fp.label}</option>
              ))}
            </select>
          </div>
          <div className="flex items-center gap-1">
            <label className="text-sm">Cliente:</label>
            <input
              type="text"
              value={clienteBusquedaInput}
              onChange={(e) => setClienteBusquedaInput(e.target.value)}
              placeholder="Nombre o documento"
              className="border rounded px-2 py-1.5 text-sm w-40"
            />
          </div>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={loadPedidos}
            title="Actualizar lista (p. ej. si el repartidor marcó En ruta o Entregado)"
          >
            <RefreshCw className="size-4" />
          </Button>
            <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => {
              setFechaDesde(todayISO());
              setFechaHasta(todayISO());
              setRepartidorFiltro("");
              setEstadoFiltro("");
              setFormaPagoFiltro("");
              setClienteBusquedaInput("");
              setClienteBusqueda("");
            }}
          >
            Limpiar filtros
          </Button>
          {userRole !== "REPARTIDOR" && (
            <Button
              type="button"
              size="sm"
              onClick={exportarPedidos}
              disabled={exportando}
              className="bg-green-700 text-white hover:bg-green-800"
            >
              {exportando && <Spinner data-icon="inline-start" />}
              {exportando ? "Exportando…" : "Exportar Excel"}
            </Button>
          )}
        </div>
      </div>

      <PedidoEditSheet
        pedidoId={editingPedidoId}
        open={!!editingPedidoId}
        onOpenChange={(open) => !open && setEditingPedidoId(null)}
        onSaved={loadPedidos}
        productos={productos}
        marcas={marcas}
        repartidores={repartidores}
        formasPago={formasPago.length > 0 ? formasPago : [
          { value: "YAPE", label: "Yape" },
          { value: "PLIN", label: "Plin" },
          { value: "TRANSFERENCIA", label: "Transferencia" },
          { value: "EFECTIVO", label: "Efectivo" },
          { value: "TARJETA", label: "Tarjeta" },
        ]}
        isAdmin={!!isAdmin}
      />

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
            <div className="flex gap-2 justify-end">
              <Button type="button" variant="outline" size="sm" onClick={() => setCancelando(null)}>Cerrar</Button>
              <Button type="button" size="sm" onClick={cancelarPedido} disabled={saving} variant="destructive">Confirmar cancelación</Button>
            </div>
          </div>
        </div>
      )}

      <div className="flex flex-wrap items-center justify-between gap-2 mb-2">
        <p className="text-sm text-neutral-600">
          {totalPedidos === 0
            ? "No hay pedidos"
            : `Mostrando ${(page - 1) * PEDIDOS_PAGE_SIZE + 1}-${Math.min(page * PEDIDOS_PAGE_SIZE, totalPedidos)} de ${totalPedidos} pedidos.`}
        </p>
        {totalPedidos > PEDIDOS_PAGE_SIZE && (
          <div className="flex items-center gap-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={page <= 1}
            >
              <ChevronLeft className="size-4" />
              Anterior
            </Button>
            <span className="text-sm text-neutral-600">
              Página {page} de {Math.max(1, Math.ceil(totalPedidos / PEDIDOS_PAGE_SIZE))}
            </span>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setPage((p) => p + 1)}
              disabled={page >= Math.ceil(totalPedidos / PEDIDOS_PAGE_SIZE)}
            >
              Siguiente
              <ChevronRight className="size-4" />
            </Button>
          </div>
        )}
      </div>
      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Cliente</TableHead>
              <TableHead>Estado</TableHead>
              <TableHead>Detalle / Total</TableHead>
              <TableHead>Fecha</TableHead>
              <TableHead>Programado</TableHead>
              <TableHead>Repartidor</TableHead>
              <TableHead>Pago</TableHead>
              <TableHead>Observaciones</TableHead>
              <TableHead className="min-w-[180px]">Acciones</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {pedidos.length === 0 ? (
              <TableRow>
                <TableCell colSpan={9} className="h-24 text-center text-muted-foreground">
                  {(fechaDesde && fechaHasta) || repartidorFiltro || estadoFiltro || formaPagoFiltro || clienteBusqueda.trim() ? "No hay pedidos con estos filtros" : "No hay pedidos"}
                </TableCell>
              </TableRow>
            ) : (
              pedidos.map((p) => (
                <TableRow key={p.id}>
                  <TableCell>
                    <HoverCard openDelay={200} closeDelay={100}>
                      <HoverCardTrigger asChild>
                        <button
                          type="button"
                          className="text-left text-sm underline decoration-dotted underline-offset-2 hover:no-underline cursor-default font-medium"
                        >
                          {clienteDisplayName(p.cliente)}
                        </button>
                      </HoverCardTrigger>
                      <HoverCardContent side="top" align="start" className="w-72">
                        <div className="flex flex-col gap-2 text-sm">
                          <h4 className="font-semibold text-foreground">{clienteDisplayName(p.cliente)}</h4>
                          {p.cliente?.telefono ? (
                            <p>
                              <span className="text-muted-foreground">Tel: </span>
                              <a href={`tel:${p.cliente.telefono}`} className="text-primary hover:underline">
                                {p.cliente.telefono}
                              </a>
                            </p>
                          ) : (
                            <p className="text-muted-foreground">Sin teléfono</p>
                          )}
                          {p.cliente?.direccion || p.cliente?.distrito ? (
                            <p>
                              <span className="text-muted-foreground">Dirección: </span>
                              {[p.cliente?.direccion, p.cliente?.distrito].filter(Boolean).join(", ")}
                            </p>
                          ) : null}
                          {p.clienteDireccion && (
                            <p className="pt-1 border-t border-border">
                              <span className="text-muted-foreground">Entrega: </span>
                              {[p.clienteDireccion.nombre, p.clienteDireccion.direccion, p.clienteDireccion.distrito].filter(Boolean).join(" · ")}
                            </p>
                          )}
                        </div>
                      </HoverCardContent>
                    </HoverCard>
                  </TableCell>
                  <TableCell>
                    <EstadoPedidoBadge
                      estado={p.estado}
                      motivoCancelacion={p.motivoCancelacion}
                      loading={updatingEstadoId === p.id}
                    />
                  </TableCell>
                  <TableCell>
                    {p.items && p.items.length > 0 ? (
                      <HoverCard openDelay={200} closeDelay={100}>
                        <HoverCardTrigger asChild>
                          <button
                            type="button"
                            className="text-left text-sm underline decoration-dotted underline-offset-2 hover:no-underline cursor-default"
                          >
                            {itemsSummary(p)}
                          </button>
                        </HoverCardTrigger>
                        <HoverCardContent side="top" align="start" className="w-72">
                          <div className="flex flex-col gap-2">
                            <h4 className="font-medium text-sm">Productos en el pedido</h4>
                            <ul className="text-sm space-y-1.5">
                              {p.items.map((i) => {
                                const subtotal = Number(i.precioUnitario) * i.cantidad;
                                const marcaName = i.marca?.name;
                                return (
                                  <li key={i.id} className="flex justify-between gap-2">
                                    <span>
                                      {i.cantidad}× {i.producto.name}
                                      {marcaName ? ` (${marcaName})` : ""}
                                    </span>
                                    <span className="text-muted-foreground shrink-0">S/ {subtotal.toFixed(2)}</span>
                                  </li>
                                );
                              })}
                            </ul>
                            <p className="text-sm font-medium border-t pt-2 mt-1">
                              Total: S/ {p.items.reduce((acc, i) => acc + Number(i.precioUnitario) * i.cantidad, 0).toFixed(2)}
                            </p>
                          </div>
                        </HoverCardContent>
                      </HoverCard>
                    ) : (
                      itemsSummary(p)
                    )}
                  </TableCell>
                  <TableCell>{formatDate(p.fechaPedido)}</TableCell>
                  <TableCell>{formatDate(p.fechaProgramada)}</TableCell>
                  <TableCell>
                    {p.repartidor && (p.asignadoEn != null) ? (
                      <HoverCard openDelay={200} closeDelay={100}>
                        <HoverCardTrigger asChild>
                          <button
                            type="button"
                            className="text-left text-sm underline decoration-dotted underline-offset-2 hover:no-underline cursor-default"
                          >
                            {p.repartidor.name}
                          </button>
                        </HoverCardTrigger>
                        <HoverCardContent side="top" align="start" className="w-56">
                          <div className="space-y-1 text-sm">
                            <p className="font-medium">{p.repartidor?.name}</p>
                            <p className="text-muted-foreground">
                              Asignado a las {new Date(p.asignadoEn).toLocaleTimeString("es-PE", { hour: "2-digit", minute: "2-digit", second: "2-digit" })}
                            </p>
                          </div>
                        </HoverCardContent>
                      </HoverCard>
                    ) : (
                      p.repartidor?.name ?? "—"
                    )}
                  </TableCell>
                  <TableCell>
                    <span className="inline-flex items-center gap-1.5">
                      <FormaPagoBadge formaPago={p.formaPago} efectivoCon={p.efectivoCon} />
                      {(p._count?.evidencias ?? 0) > 0 && (
                        <HoverCard openDelay={200} closeDelay={100}>
                          <HoverCardTrigger asChild>
                            <button
                              type="button"
                              className="inline-flex h-7 w-7 items-center justify-center rounded-md text-neutral-500 hover:text-neutral-700 hover:bg-neutral-100 transition-colors"
                              title="Ver evidencia de entrega"
                            >
                              <Eye className="size-4" />
                            </button>
                          </HoverCardTrigger>
                          <HoverCardContent side="left" className="w-80 max-h-[70vh] overflow-auto p-0">
                            <EvidenciaHoverContent pedidoId={p.id} />
                          </HoverCardContent>
                        </HoverCard>
                      )}
                    </span>
                  </TableCell>
                  <TableCell>{p.observaciones ?? "—"}</TableCell>
                  <TableCell className="align-middle">
                    <div className="flex items-center gap-1 flex-wrap">
                      <button
                        type="button"
                        onClick={() => setEditingPedidoId(p.id)}
                        title="Editar"
                        className="inline-flex items-center justify-center h-8 w-8 rounded-md text-neutral-700 hover:text-neutral-900 hover:bg-neutral-100 transition-colors"
                      >
                        <Pencil className="size-4" />
                      </button>
                      {p.estado === "CREATED" && (
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 text-amber-700 hover:text-amber-800 hover:bg-amber-50"
                          onClick={() => cambiarEstado(p.id, "IN_ROUTE")}
                          disabled={updatingEstadoId === p.id}
                          title="En ruta"
                        >
                          {updatingEstadoId === p.id ? <Spinner className="size-4" /> : <Truck className="size-4" />}
                        </Button>
                      )}
                      {(p.estado === "CREATED" || p.estado === "IN_ROUTE") && (
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 text-green-700 hover:text-green-800 hover:bg-green-50"
                          onClick={() => cambiarEstado(p.id, "DELIVERED")}
                          disabled={updatingEstadoId === p.id}
                          title="Entregado"
                        >
                          {updatingEstadoId === p.id && p.estado === "IN_ROUTE" ? <Spinner className="size-4" /> : <CheckCircle className="size-4" />}
                        </Button>
                      )}
                      {(p.estado === "CREATED" || p.estado === "IN_ROUTE") && (
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 text-red-600 hover:text-red-700 hover:bg-red-50"
                          onClick={() => setCancelando({ id: p.id, motivo: "" })}
                          title="Cancelar"
                        >
                          <XCircle className="size-4" />
                        </Button>
                      )}
                    </div>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}

function PedidosSkeletonFallback() {
  return (
    <div className="min-h-screen p-6">
      <div className="flex justify-between items-center mb-6">
        <Skeleton className="h-8 w-28" />
        <Skeleton className="h-9 w-32" />
      </div>
      <div className="mb-4 rounded-lg border border-neutral-200 bg-neutral-50/50 p-3 space-y-2">
        <Skeleton className="h-4 w-16" />
        <div className="flex gap-3 flex-wrap">
          <Skeleton className="h-9 w-36" />
          <Skeleton className="h-9 w-36" />
        </div>
      </div>
      <TableSkeleton columns={9} rows={8} />
    </div>
  );
}

export default function PedidosPage() {
  return (
    <Suspense fallback={<PedidosSkeletonFallback />}>
      <PedidosContent />
    </Suspense>
  );
}
