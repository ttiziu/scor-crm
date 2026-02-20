"use client";

import { Suspense, useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Spinner } from "@/components/ui/spinner";
import { Skeleton } from "@/components/ui/skeleton";
import { TableSkeleton } from "@/components/ui/table-skeleton";
import { toast } from "sonner";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Badge } from "@/components/ui/badge";
import { clienteDisplayName } from "@/lib/cliente-display-name";
import { ChevronLeft, ChevronRight, ShoppingCart, Pencil, Trash2 } from "lucide-react";

type ClienteDireccion = {
  id: string;
  nombre: string;
  direccion: string;
  distrito: string | null;
  tipoValvula: string | null;
};

type Cliente = {
  id: string;
  name: string;
  documento: string | null;
  direccion: string | null;
  distrito: string | null;
  tipoValvula: string | null;
  telefono: string | null;
  email: string | null;
  createdAt: string;
  direcciones?: ClienteDireccion[];
};

type DirAdicional = { nombre: string; direccion: string; distrito: string; tipoValvula: string };

function ClientesPageSkeleton() {
  return (
    <div className="min-h-screen p-6">
      <div className="mb-6">
        <Skeleton className="h-6 w-32 mb-4" />
        <div className="flex gap-3 flex-wrap">
          <Skeleton className="h-9 w-40" />
          <Skeleton className="h-9 w-36" />
          <Skeleton className="h-9 w-36" />
        </div>
      </div>
      <div className="mb-2">
        <Skeleton className="h-4 w-48" />
      </div>
      <TableSkeleton columns={7} rows={8} />
    </div>
  );
}

function ClientesPageContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [clientes, setClientes] = useState<Cliente[]>([]);
  const [loading, setLoading] = useState(true);
  const [authOk, setAuthOk] = useState(false);
  const [userRole, setUserRole] = useState("");
  const [contextTenantId, setContextTenantId] = useState<string | null>(null);
  const [formOpen, setFormOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({ name: "", documento: "", direccion: "", distrito: "", tipoValvula: "", telefono: "", email: "" });
  const [direccionesAdicionales, setDireccionesAdicionales] = useState<DirAdicional[]>([]);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editForm, setEditForm] = useState({ name: "", documento: "", direccion: "", distrito: "", tipoValvula: "", telefono: "", email: "" });
  const [direcciones, setDirecciones] = useState<ClienteDireccion[]>([]);
  const [nuevaDir, setNuevaDir] = useState({ nombre: "", direccion: "", distrito: "", tipoValvula: "" });
  const [editDirId, setEditDirId] = useState<string | null>(null);
  const [editDirForm, setEditDirForm] = useState({ nombre: "", direccion: "", distrito: "", tipoValvula: "" });
  const [opcionesTipoValvula, setOpcionesTipoValvula] = useState<string[]>(["Normal", "Premium"]);
  const [filtroNombre, setFiltroNombre] = useState("");
  const [filtroDocumento, setFiltroDocumento] = useState("");
  const [filtroTelefono, setFiltroTelefono] = useState("");
  const [filtroNombreDebounced, setFiltroNombreDebounced] = useState("");
  const [filtroDocumentoDebounced, setFiltroDocumentoDebounced] = useState("");
  const [filtroTelefonoDebounced, setFiltroTelefonoDebounced] = useState("");
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [deleteClientePending, setDeleteClientePending] = useState<{ id: string; name: string } | null>(null);
  const [deleteDireccionPending, setDeleteDireccionPending] = useState<string | null>(null);
  const [page, setPage] = useState(1);
  const [totalClientes, setTotalClientes] = useState(0);
  const PAGE_SIZE = 100;

  function loadClientes() {
    const params = new URLSearchParams();
    params.set("page", String(page));
    params.set("pageSize", String(PAGE_SIZE));
    if (filtroNombreDebounced) params.set("nombre", filtroNombreDebounced);
    if (filtroDocumentoDebounced) params.set("documento", filtroDocumentoDebounced);
    if (filtroTelefonoDebounced) params.set("telefono", filtroTelefonoDebounced);
    const url = `/api/clientes?${params.toString()}`;
    fetch(url, { credentials: "include" })
      .then((res) => res.json())
      .then((data) => {
        if (data?.clientes != null) {
          setClientes(Array.isArray(data.clientes) ? data.clientes : []);
          setTotalClientes(Number(data.total) ?? 0);
        } else {
          setClientes(Array.isArray(data) ? data : []);
          setTotalClientes(0);
        }
      })
      .catch(() => {
        setClientes([]);
        setTotalClientes(0);
      });
  }

  function loadClienteParaEditar(id: string) {
    fetch(`/api/clientes/${id}`, { credentials: "include" })
      .then((res) => res.json())
      .then((data) => {
        if (data.id) {
          setEditForm({
            name: data.name ?? "",
            documento: data.documento ?? "",
            direccion: data.direccion ?? "",
            distrito: data.distrito ?? "",
            tipoValvula: data.tipoValvula ?? "",
            telefono: data.telefono ?? "",
            email: data.email ?? "",
          });
          setDirecciones(data.direcciones ?? []);
        }
      })
      .catch(() => setDirecciones([]));
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
        if (data?.user?.role === "REPARTIDOR") {
          router.replace("/");
          return;
        }
        if (data?.user) {
          setAuthOk(true);
          setUserRole(data.user.role ?? "");
          setContextTenantId(data.contextTenantId ?? null);
        }
      })
      .catch(() => router.replace("/login"));
  }

  useEffect(() => {
    fetchMe().finally(() => setLoading(false));
  }, [router]);

  useEffect(() => {
    const onContextChange = () => fetchMe();
    window.addEventListener("scor-context-tenant-changed", onContextChange);
    return () => window.removeEventListener("scor-context-tenant-changed", onContextChange);
  }, []);

  useEffect(() => {
    if (!authOk) return;
    fetch("/api/tipos-valvula", { credentials: "include" })
      .then((res) => (res.ok ? res.json() : ["Normal", "Premium"]))
      .then((data) => (Array.isArray(data) && data.length > 0 ? setOpcionesTipoValvula(data) : null))
      .catch(() => {});
  }, [authOk]);

  useEffect(() => {
    const t = setTimeout(() => {
      setFiltroNombreDebounced(filtroNombre);
      setFiltroDocumentoDebounced(filtroDocumento);
      setFiltroTelefonoDebounced(filtroTelefono);
    }, 400);
    return () => clearTimeout(t);
  }, [filtroNombre, filtroDocumento, filtroTelefono]);

  useEffect(() => {
    if (!authOk) return;
    loadClientes();
  }, [authOk, page, filtroNombreDebounced, filtroDocumentoDebounced, filtroTelefonoDebounced, contextTenantId]);

  useEffect(() => {
    setPage(1);
  }, [filtroNombreDebounced, filtroDocumentoDebounced, filtroTelefonoDebounced]);

  useEffect(() => {
    if (editingId) loadClienteParaEditar(editingId);
  }, [editingId]);

  useEffect(() => {
    if (!authOk) return;
    const crear = searchParams.get("crear");
    const telefono = searchParams.get("telefono")?.trim();
    if (crear === "1" && telefono) {
      setFormOpen(true);
      setForm((f) => ({ ...f, telefono }));
      router.replace("/clientes");
    }
  }, [authOk, searchParams, router]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.telefono.trim()) {
      toast.error("El teléfono es requerido");
      return;
    }
    if (!form.direccion.trim()) {
      toast.error("La dirección es requerida");
      return;
    }
    if (!form.distrito.trim()) {
      toast.error("El distrito es requerido");
      return;
    }
    if (form.email.trim() && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email.trim())) {
      toast.error("Indica un email válido");
      return;
    }
    const incompleteDir = direccionesAdicionales.find((d) => (d.nombre.trim() && !d.direccion.trim()) || (!d.nombre.trim() && d.direccion.trim()));
    if (incompleteDir) {
      toast.error("En direcciones adicionales, nombre y dirección son requeridos cuando agregas una");
      return;
    }
    setSaving(true);
    try {
      const dirsToSend = direccionesAdicionales
        .filter((d) => d.nombre.trim() && d.direccion.trim())
        .map((d) => ({
          nombre: d.nombre.trim(),
          direccion: d.direccion.trim(),
          distrito: d.distrito.trim() || undefined,
          tipoValvula: d.tipoValvula.trim() || undefined,
        }));

      const res = await fetch("/api/clientes", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          name: form.name.trim() || undefined,
          documento: form.documento || undefined,
          direccion: form.direccion.trim(),
          distrito: form.distrito.trim(),
          telefono: form.telefono.trim(),
          tipoValvula: form.tipoValvula || undefined,
          email: form.email || undefined,
          ...(dirsToSend.length > 0 && { direccionesAdicionales: dirsToSend }),
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        toast.error(data.error ?? "Error al crear cliente");
        return;
      }
      toast.success("Cliente creado");
      setForm({ name: "", documento: "", direccion: "", distrito: "", tipoValvula: "", telefono: "", email: "" });
      setDireccionesAdicionales([]);
      setFormOpen(false);
      loadClientes();
    } catch {
      toast.error("Error de conexión");
    } finally {
      setSaving(false);
    }
  }

  async function handleUpdateCliente(e: React.FormEvent) {
    e.preventDefault();
    if (!editingId) return;
    if (editForm.email.trim() && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(editForm.email.trim())) {
      toast.error("Indica un email válido");
      return;
    }
    setSaving(true);
    try {
      const res = await fetch(`/api/clientes/${editingId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          name: editForm.name,
          documento: editForm.documento || undefined,
          direccion: editForm.direccion || undefined,
          distrito: editForm.distrito || undefined,
          tipoValvula: editForm.tipoValvula || undefined,
          telefono: editForm.telefono || undefined,
          email: editForm.email || undefined,
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        toast.error(data.error ?? "Error al actualizar");
        return;
      }
      toast.success("Cliente actualizado");
      setEditingId(null);
      loadClientes();
    } catch {
      toast.error("Error de conexión");
    } finally {
      setSaving(false);
    }
  }

  async function handleAddDireccion(e: React.FormEvent) {
    e.preventDefault();
    if (!editingId) return;
    setSaving(true);
    try {
      const res = await fetch(`/api/clientes/${editingId}/direcciones`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          nombre: nuevaDir.nombre.trim(),
          direccion: nuevaDir.direccion.trim(),
          distrito: nuevaDir.distrito.trim() || undefined,
          tipoValvula: nuevaDir.tipoValvula.trim() || undefined,
        }),
      });
      if (res.ok) {
        setNuevaDir({ nombre: "", direccion: "", distrito: "", tipoValvula: "" });
        loadClienteParaEditar(editingId);
      }
    } finally {
      setSaving(false);
    }
  }

  async function handleUpdateDireccion(dirId: string) {
    setSaving(true);
    try {
      const res = await fetch(`/api/clientes/${editingId}/direcciones/${dirId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          nombre: editDirForm.nombre.trim(),
          direccion: editDirForm.direccion.trim(),
          distrito: editDirForm.distrito.trim() || undefined,
          tipoValvula: editDirForm.tipoValvula.trim() || undefined,
        }),
      });
      if (res.ok) {
        setEditDirId(null);
        if (editingId) loadClienteParaEditar(editingId);
      }
    } finally {
      setSaving(false);
    }
  }

  async function handleDeleteDireccion(dirId: string) {
    setSaving(true);
    try {
      const res = await fetch(`/api/clientes/${editingId}/direcciones/${dirId}`, {
        method: "DELETE",
        credentials: "include",
      });
      if (res.ok && editingId) loadClienteParaEditar(editingId);
      setDeleteDireccionPending(null);
    } finally {
      setSaving(false);
    }
  }

  async function handleDeleteCliente(id: string, name: string) {
    setDeletingId(id);
    try {
      const res = await fetch(`/api/clientes/${id}`, { method: "DELETE", credentials: "include" });
      if (res.ok) {
        if (editingId === id) setEditingId(null);
        loadClientes();
        toast.success("Cliente eliminado");
      } else {
        const data = await res.json().catch(() => ({}));
        toast.error(data.error ?? "No se pudo eliminar el cliente");
      }
    } catch {
      toast.error("Error de conexión");
    } finally {
      setDeletingId(null);
      setDeleteClientePending(null);
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen p-6">
        <div className="flex justify-between items-center mb-6">
          <Skeleton className="h-8 w-32" />
          <Skeleton className="h-9 w-32" />
        </div>
        <div className="mb-4 rounded-md bg-neutral-50/50 p-3 space-y-2">
          <Skeleton className="h-4 w-16" />
          <div className="flex gap-3 flex-wrap">
            <Skeleton className="h-9 w-40" />
            <Skeleton className="h-9 w-36" />
            <Skeleton className="h-9 w-36" />
          </div>
        </div>
        <div className="mb-2">
          <Skeleton className="h-4 w-48" />
        </div>
        <TableSkeleton columns={7} rows={8} />
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
        <h1 className="text-xl font-semibold">Clientes</h1>
        <Button type="button" size="sm" onClick={() => setFormOpen(!formOpen)}>
          {formOpen ? "Cerrar formulario" : "Nuevo cliente"}
        </Button>
      </header>

      <div className="mb-6">
        {formOpen && (
          <div className="mt-4 w-full">
            <div className="rounded-xl border border-neutral-200 bg-white shadow-sm overflow-hidden">
              <div className="p-6">
                <h2 className="text-lg font-semibold text-neutral-900 mb-5">Nuevo cliente</h2>
                <form onSubmit={handleSubmit} className="space-y-5">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-neutral-700 mb-1.5">Nombre (opcional)</label>
                      <input
                        placeholder="Dejar vacío = Cliente 1, Cliente 2, etc."
                        value={form.name}
                        onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                        className="w-full rounded-lg border border-neutral-200 bg-white px-3 py-2 text-sm placeholder:text-neutral-400 focus:outline-none focus:ring-2 focus:ring-neutral-400/50"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-neutral-700 mb-1.5">Documento</label>
                      <input
                        placeholder="DNI o RUC"
                        value={form.documento}
                        onChange={(e) => setForm((f) => ({ ...f, documento: e.target.value }))}
                        className="w-full rounded-lg border border-neutral-200 bg-white px-3 py-2 text-sm placeholder:text-neutral-400 focus:outline-none focus:ring-2 focus:ring-neutral-400/50"
                      />
                    </div>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-neutral-700 mb-1.5">Dirección *</label>
                      <input
                        placeholder="Dirección principal"
                        value={form.direccion}
                        onChange={(e) => setForm((f) => ({ ...f, direccion: e.target.value }))}
                        required
                        className="w-full rounded-lg border border-neutral-200 bg-white px-3 py-2 text-sm placeholder:text-neutral-400 focus:outline-none focus:ring-2 focus:ring-neutral-400/50"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-neutral-700 mb-1.5">Distrito *</label>
                      <input
                        placeholder="Distrito"
                        value={form.distrito}
                        onChange={(e) => setForm((f) => ({ ...f, distrito: e.target.value }))}
                        required
                        className="w-full rounded-lg border border-neutral-200 bg-white px-3 py-2 text-sm placeholder:text-neutral-400 focus:outline-none focus:ring-2 focus:ring-neutral-400/50"
                      />
                    </div>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-neutral-700 mb-1.5">Teléfono *</label>
                      <input
                        placeholder="Ej. 987654321"
                        value={form.telefono}
                        onChange={(e) => setForm((f) => ({ ...f, telefono: e.target.value }))}
                        required
                        className="w-full rounded-lg border border-neutral-200 bg-white px-3 py-2 text-sm placeholder:text-neutral-400 focus:outline-none focus:ring-2 focus:ring-neutral-400/50"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-neutral-700 mb-1.5">Tipo de válvula</label>
                      <input
                        list="tipoValvula-list-new"
                        placeholder="Ej. Normal, Premium"
                        value={form.tipoValvula}
                        onChange={(e) => setForm((f) => ({ ...f, tipoValvula: e.target.value }))}
                        className="w-full rounded-lg border border-neutral-200 bg-white px-3 py-2 text-sm placeholder:text-neutral-400 focus:outline-none focus:ring-2 focus:ring-neutral-400/50"
                      />
                      <datalist id="tipoValvula-list-new">{opcionesTipoValvula.map((o) => <option key={o} value={o} />)}</datalist>
                    </div>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-neutral-700 mb-1.5">Email</label>
                    <input
                      type="email"
                      placeholder="correo@ejemplo.com"
                      value={form.email}
                      onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))}
                      className="w-full max-w-md rounded-lg border border-neutral-200 bg-white px-3 py-2 text-sm placeholder:text-neutral-400 focus:outline-none focus:ring-2 focus:ring-neutral-400/50"
                    />
                  </div>
                  <div>
                    <p className="text-sm font-medium text-neutral-700 mb-2">Otra(s) dirección(es)</p>
                    {direccionesAdicionales.map((d, i) => (
                      <div key={i} className="flex flex-wrap items-center gap-2 mb-2 p-3 rounded-lg border border-neutral-200 bg-neutral-50/50">
                        <input placeholder="Nombre (ej. Sucursal 2)" value={d.nombre} onChange={(e) => setDireccionesAdicionales((prev) => prev.map((x, j) => (j === i ? { ...x, nombre: e.target.value } : x)))} className="rounded-lg border border-neutral-200 bg-white px-2 py-2 w-36 text-sm focus:outline-none focus:ring-2 focus:ring-neutral-400/50" />
                        <input placeholder="Dirección" value={d.direccion} onChange={(e) => setDireccionesAdicionales((prev) => prev.map((x, j) => (j === i ? { ...x, direccion: e.target.value } : x)))} className="rounded-lg border border-neutral-200 bg-white px-2 py-2 flex-1 min-w-[140px] text-sm focus:outline-none focus:ring-2 focus:ring-neutral-400/50" />
                        <input placeholder="Distrito" value={d.distrito} onChange={(e) => setDireccionesAdicionales((prev) => prev.map((x, j) => (j === i ? { ...x, distrito: e.target.value } : x)))} className="rounded-lg border border-neutral-200 bg-white px-2 py-2 w-28 text-sm focus:outline-none focus:ring-2 focus:ring-neutral-400/50" />
                        <input list={`tipoValvula-extra-${i}`} placeholder="Válvula" value={d.tipoValvula} onChange={(e) => setDireccionesAdicionales((prev) => prev.map((x, j) => (j === i ? { ...x, tipoValvula: e.target.value } : x)))} className="rounded-lg border border-neutral-200 bg-white px-2 py-2 w-24 text-sm focus:outline-none focus:ring-2 focus:ring-neutral-400/50" />
                        <datalist id={`tipoValvula-extra-${i}`}>{opcionesTipoValvula.map((o) => <option key={o} value={o} />)}</datalist>
                        <Button type="button" variant="ghost" size="sm" className="text-red-600 shrink-0" onClick={() => setDireccionesAdicionales((prev) => prev.filter((_, j) => j !== i))}>Quitar</Button>
                      </div>
                    ))}
                    <Button type="button" variant="outline" size="sm" onClick={() => setDireccionesAdicionales((prev) => [...prev, { nombre: "", direccion: "", distrito: "", tipoValvula: "" }])} className="rounded-lg">
                      Añadir otra dirección
                    </Button>
                  </div>
                  <div className="pt-1">
                    <Button type="submit" disabled={saving} size="sm" className="rounded-lg px-5">
                      {saving && <Spinner data-icon="inline-start" />}
                      {saving ? "Guardando…" : "Guardar"}
                    </Button>
                  </div>
                </form>
              </div>
            </div>
          </div>
        )}
      </div>

      <div className="mb-4 rounded-md border bg-neutral-50/50 p-3">
        <p className="text-sm font-medium text-neutral-700 mb-2">Filtros</p>
        <div className="flex flex-wrap items-center gap-3">
          <div className="flex items-center gap-1">
            <label className="text-sm">Nombre:</label>
            <input
              type="text"
              value={filtroNombre}
              onChange={(e) => setFiltroNombre(e.target.value)}
              placeholder="Buscar por nombre"
              className="border rounded px-2 py-1.5 text-sm w-40"
            />
          </div>
          <div className="flex items-center gap-1">
            <label className="text-sm">Documento:</label>
            <input
              type="text"
              value={filtroDocumento}
              onChange={(e) => setFiltroDocumento(e.target.value)}
              placeholder="Buscar por documento"
              className="border rounded px-2 py-1.5 text-sm w-36"
            />
          </div>
          <div className="flex items-center gap-1">
            <label className="text-sm">Teléfono:</label>
            <input
              type="text"
              value={filtroTelefono}
              onChange={(e) => setFiltroTelefono(e.target.value)}
              placeholder="Buscar por teléfono"
              className="border rounded px-2 py-1.5 text-sm w-36"
            />
          </div>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => {
              setFiltroNombre("");
              setFiltroDocumento("");
              setFiltroTelefono("");
            }}
          >
            Limpiar filtros
          </Button>
        </div>
      </div>

      <Sheet
        open={!!editingId}
        onOpenChange={(open) => {
          if (!open) {
            setEditingId(null);
            setEditDirId(null);
            setDeleteDireccionPending(null);
          }
        }}
      >
        <SheetContent
          side="right"
          className="w-full sm:max-w-3xl md:max-w-4xl lg:max-w-5xl overflow-y-auto flex flex-col p-0"
          onClick={(e) => e.stopPropagation()}
        >
          <SheetHeader className="pb-4 border-b shrink-0 px-6 pt-6">
            <SheetTitle className="text-lg pr-8">
              Editar cliente
            </SheetTitle>
          </SheetHeader>
          {editingId && (
            <div className="mt-4 flex-1 overflow-y-auto px-6 pb-6">
              <form onSubmit={handleUpdateCliente} className="space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-neutral-700 mb-1.5">Nombre</label>
                    <input
                      placeholder="Opcional (vacío = Cliente N por orden)"
                      value={editForm.name}
                      onChange={(e) => setEditForm((f) => ({ ...f, name: e.target.value }))}
                      className="w-full border border-neutral-200 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-neutral-400/50"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-neutral-700 mb-1.5">Documento</label>
                    <input
                      placeholder="Documento"
                      value={editForm.documento}
                      onChange={(e) => setEditForm((f) => ({ ...f, documento: e.target.value }))}
                      className="w-full border border-neutral-200 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-neutral-400/50"
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-neutral-700 mb-1.5">Dirección principal</label>
                  <input
                    placeholder="Dirección"
                    value={editForm.direccion}
                    onChange={(e) => setEditForm((f) => ({ ...f, direccion: e.target.value }))}
                    className="w-full border border-neutral-200 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-neutral-400/50"
                  />
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-neutral-700 mb-1.5">Distrito</label>
                    <input
                      placeholder="Distrito"
                      value={editForm.distrito}
                      onChange={(e) => setEditForm((f) => ({ ...f, distrito: e.target.value }))}
                      className="w-full border border-neutral-200 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-neutral-400/50"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-neutral-700 mb-1.5">Tipo de válvula</label>
                    <input
                      list="tipoValvula-list-edit"
                      placeholder="Ej. Normal, Premium"
                      value={editForm.tipoValvula}
                      onChange={(e) => setEditForm((f) => ({ ...f, tipoValvula: e.target.value }))}
                      className="w-full border border-neutral-200 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-neutral-400/50"
                    />
                    <datalist id="tipoValvula-list-edit">{opcionesTipoValvula.map((o) => <option key={o} value={o} />)}</datalist>
                  </div>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-neutral-700 mb-1.5">Teléfono</label>
                    <input
                      placeholder="Teléfono"
                      value={editForm.telefono}
                      onChange={(e) => setEditForm((f) => ({ ...f, telefono: e.target.value }))}
                      className="w-full border border-neutral-200 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-neutral-400/50"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-neutral-700 mb-1.5">Email</label>
                    <input
                      type="email"
                      placeholder="Email"
                      value={editForm.email}
                      onChange={(e) => setEditForm((f) => ({ ...f, email: e.target.value }))}
                      className="w-full border border-neutral-200 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-neutral-400/50"
                    />
                  </div>
                </div>
                <div className="pt-2">
                  <Button type="submit" disabled={saving} size="default" className="min-w-[140px]">
                    {saving && <Spinner data-icon="inline-start" />}
                    Guardar cliente
                  </Button>
                </div>
              </form>
              <div className="mt-6 pt-6 border-t border-neutral-200">
                <h3 className="text-sm font-medium text-neutral-700 mb-3">Direcciones adicionales</h3>
                <ul className="space-y-3 mb-4">
                  {direcciones.map((d) => (
                    <li key={d.id} className="flex items-center gap-3 flex-wrap p-3 rounded-lg bg-neutral-50/80 text-sm">
                      {editDirId === d.id ? (
                        <>
                          <input value={editDirForm.nombre} onChange={(e) => setEditDirForm((f) => ({ ...f, nombre: e.target.value }))} placeholder="Nombre" className="border border-neutral-200 rounded-lg px-3 py-2 text-sm w-28 focus:outline-none focus:ring-2 focus:ring-neutral-400/50" />
                          <input value={editDirForm.direccion} onChange={(e) => setEditDirForm((f) => ({ ...f, direccion: e.target.value }))} placeholder="Dirección" className="border border-neutral-200 rounded-lg px-3 py-2 text-sm flex-1 min-w-[160px] focus:outline-none focus:ring-2 focus:ring-neutral-400/50" />
                          <input value={editDirForm.distrito} onChange={(e) => setEditDirForm((f) => ({ ...f, distrito: e.target.value }))} placeholder="Distrito" className="border border-neutral-200 rounded-lg px-3 py-2 text-sm w-28 focus:outline-none focus:ring-2 focus:ring-neutral-400/50" />
                          <Button type="button" variant="outline" size="sm" onClick={() => handleUpdateDireccion(d.id)} disabled={saving}>Guardar</Button>
                          <Button type="button" variant="ghost" size="sm" onClick={() => setEditDirId(null)}>Cancelar</Button>
                        </>
                      ) : (
                        <>
                          <span className="font-medium">{d.nombre}:</span>
                          <span className="text-neutral-600">{d.direccion}{d.distrito ? `, ${d.distrito}` : ""}</span>
                          <Button type="button" variant="ghost" size="sm" onClick={() => { setEditDirId(d.id); setEditDirForm({ nombre: d.nombre, direccion: d.direccion, distrito: d.distrito ?? "", tipoValvula: d.tipoValvula ?? "" }); }}>Editar</Button>
                          <Button type="button" variant="ghost" size="sm" onClick={() => setDeleteDireccionPending(d.id)} disabled={saving} className="text-red-600 hover:text-red-700">Eliminar</Button>
                        </>
                      )}
                    </li>
                  ))}
                </ul>
                <form onSubmit={handleAddDireccion} className="flex gap-3 flex-wrap items-end">
                  <div className="min-w-[120px]">
                    <label className="block text-xs font-medium text-neutral-600 mb-1">Nombre</label>
                    <input value={nuevaDir.nombre} onChange={(e) => setNuevaDir((f) => ({ ...f, nombre: e.target.value }))} placeholder="Ej. Sucursal 2" className="w-full border border-neutral-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-neutral-400/50" required />
                  </div>
                  <div className="flex-1 min-w-[180px]">
                    <label className="block text-xs font-medium text-neutral-600 mb-1">Dirección</label>
                    <input value={nuevaDir.direccion} onChange={(e) => setNuevaDir((f) => ({ ...f, direccion: e.target.value }))} placeholder="Dirección completa" className="w-full border border-neutral-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-neutral-400/50" required />
                  </div>
                  <div className="min-w-[100px]">
                    <label className="block text-xs font-medium text-neutral-600 mb-1">Distrito</label>
                    <input value={nuevaDir.distrito} onChange={(e) => setNuevaDir((f) => ({ ...f, distrito: e.target.value }))} placeholder="Distrito" className="w-full border border-neutral-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-neutral-400/50" />
                  </div>
                  <Button type="submit" disabled={saving} size="sm">Agregar</Button>
                </form>
              </div>
            </div>
          )}
        </SheetContent>
      </Sheet>

      <div className="flex flex-wrap items-center justify-between gap-2 mb-2">
        <p className="text-sm text-neutral-600">
          {totalClientes === 0
            ? "No hay clientes"
            : `Mostrando ${(page - 1) * PAGE_SIZE + 1}-${Math.min(page * PAGE_SIZE, totalClientes)} de ${totalClientes} clientes.`}
        </p>
        {totalClientes > PAGE_SIZE && (
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
              Página {page} de {Math.ceil(totalClientes / PAGE_SIZE)}
            </span>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setPage((p) => p + 1)}
              disabled={page >= Math.ceil(totalClientes / PAGE_SIZE)}
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
              <TableHead>Nombre</TableHead>
              <TableHead>Documento</TableHead>
              <TableHead>Dirección</TableHead>
              <TableHead>Distrito</TableHead>
              <TableHead>Tipo válvula</TableHead>
              <TableHead>Teléfono</TableHead>
              <TableHead className="w-24">Acciones</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {clientes.length === 0 ? (
              <TableRow>
                <TableCell colSpan={7} className="h-24 text-center text-muted-foreground">
                  {filtroNombreDebounced || filtroDocumentoDebounced || filtroTelefonoDebounced
                    ? "No hay clientes con estos filtros"
                    : "No hay clientes"}
                </TableCell>
              </TableRow>
            ) : (
              clientes.map((c) => (
                <TableRow key={c.id}>
                  <TableCell>{clienteDisplayName(c)}</TableCell>
                  <TableCell>{c.documento ?? "—"}</TableCell>
                  <TableCell>{c.direccion ?? "—"}</TableCell>
                  <TableCell>{c.distrito ?? "—"}</TableCell>
                  <TableCell>
                    {c.tipoValvula && /premium|premiun|premiu/i.test(c.tipoValvula) ? (
                      <Badge variant="outline" className="font-semibold bg-green-50 text-green-700 border-green-200 dark:bg-green-950 dark:text-green-300 dark:border-green-800">P</Badge>
                    ) : c.tipoValvula && /normal/i.test(c.tipoValvula) ? (
                      <Badge variant="outline" className="font-semibold bg-sky-50 text-sky-700 border-sky-200 dark:bg-sky-950 dark:text-sky-300 dark:border-sky-800">N</Badge>
                    ) : (
                      "—"
                    )}
                  </TableCell>
                  <TableCell>{c.telefono ?? "—"}</TableCell>
                  <TableCell>
                    <div className="flex items-center gap-1">
                      <Link
                        href={`/pedidos?clienteId=${encodeURIComponent(c.id)}`}
                        title="Hacer pedido"
                        className="inline-flex items-center justify-center h-8 w-8 rounded-md text-blue-600 hover:text-blue-700 hover:bg-blue-50 transition-colors"
                      >
                        <ShoppingCart className="size-4" />
                      </Link>
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 text-neutral-700 hover:text-neutral-900 hover:bg-neutral-100"
                        onClick={() => setEditingId(c.id)}
                        title="Editar"
                      >
                        <Pencil className="size-4" />
                      </Button>
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 text-red-600 hover:text-red-700 hover:bg-red-50"
                        onClick={() => setDeleteClientePending({ id: c.id, name: clienteDisplayName(c) })}
                        disabled={deletingId === c.id}
                        title="Eliminar"
                      >
                        {deletingId === c.id ? <Spinner className="size-4" /> : <Trash2 className="size-4" />}
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      <AlertDialog open={!!deleteClientePending} onOpenChange={(open) => !open && setDeleteClientePending(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              ¿Eliminar al cliente &quot;{deleteClientePending?.name}&quot;?
            </AlertDialogTitle>
            <AlertDialogDescription>
              Se borrarán también sus direcciones y puede afectar pedidos asociados. Esta acción no se puede deshacer.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              variant="destructive"
              onClick={() => deleteClientePending && handleDeleteCliente(deleteClientePending.id, deleteClientePending.name)}
            >
              Eliminar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={!!deleteDireccionPending} onOpenChange={(open) => !open && setDeleteDireccionPending(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>¿Eliminar esta dirección?</AlertDialogTitle>
            <AlertDialogDescription>
              La dirección se eliminará de forma permanente.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              variant="destructive"
              onClick={() => deleteDireccionPending && editingId && handleDeleteDireccion(deleteDireccionPending)}
            >
              Eliminar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

export default function ClientesPage() {
  return (
    <Suspense fallback={<ClientesPageSkeleton />}>
      <ClientesPageContent />
    </Suspense>
  );
}
