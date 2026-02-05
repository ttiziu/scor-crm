"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Spinner } from "@/components/ui/spinner";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { AlertCircleIcon, ArrowLeft } from "lucide-react";

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

export default function ClientesPage() {
  const router = useRouter();
  const [clientes, setClientes] = useState<Cliente[]>([]);
  const [loading, setLoading] = useState(true);
  const [authOk, setAuthOk] = useState(false);
  const [formOpen, setFormOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [form, setForm] = useState({ name: "", documento: "", direccion: "", distrito: "", tipoValvula: "", telefono: "", email: "" });
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

  function loadClientes() {
    const params = new URLSearchParams();
    if (filtroNombreDebounced) params.set("nombre", filtroNombreDebounced);
    if (filtroDocumentoDebounced) params.set("documento", filtroDocumentoDebounced);
    if (filtroTelefonoDebounced) params.set("telefono", filtroTelefonoDebounced);
    const url = `/api/clientes${params.toString() ? `?${params.toString()}` : ""}`;
    fetch(url, { credentials: "include" })
      .then((res) => res.json())
      .then((data) => (Array.isArray(data) ? setClientes(data) : setClientes([])))
      .catch(() => setClientes([]));
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
        if (data?.user?.role === "REPARTIDOR") {
          router.replace("/");
          return;
        }
        if (data?.user) setAuthOk(true);
      })
      .catch(() => router.replace("/login"))
      .finally(() => setLoading(false));
  }, [router]);

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
  }, [authOk, filtroNombreDebounced, filtroDocumentoDebounced, filtroTelefonoDebounced]);

  useEffect(() => {
    if (editingId) loadClienteParaEditar(editingId);
  }, [editingId]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setSaving(true);
    try {
      const res = await fetch("/api/clientes", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          name: form.name,
          documento: form.documento || undefined,
          direccion: form.direccion || undefined,
          distrito: form.distrito || undefined,
          tipoValvula: form.tipoValvula || undefined,
          telefono: form.telefono || undefined,
          email: form.email || undefined,
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(data.error ?? "Error al crear");
        return;
      }
      setForm({ name: "", documento: "", direccion: "", distrito: "", tipoValvula: "", telefono: "", email: "" });
      setFormOpen(false);
      loadClientes();
    } catch {
      setError("Error de conexión");
    } finally {
      setSaving(false);
    }
  }

  async function handleUpdateCliente(e: React.FormEvent) {
    e.preventDefault();
    if (!editingId) return;
    setError("");
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
        setError(data.error ?? "Error al actualizar");
        return;
      }
      setEditingId(null);
      loadClientes();
    } catch {
      setError("Error de conexión");
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
    if (!confirm("¿Eliminar esta dirección?")) return;
    setSaving(true);
    try {
      const res = await fetch(`/api/clientes/${editingId}/direcciones/${dirId}`, {
        method: "DELETE",
        credentials: "include",
      });
      if (res.ok && editingId) loadClienteParaEditar(editingId);
    } finally {
      setSaving(false);
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

  return (
    <div className="min-h-screen p-6">
      <header className="flex justify-between items-center mb-6">
        <div className="flex items-center gap-4">
          <Link href="/" className="inline-flex items-center gap-2 text-sm font-medium text-muted-foreground hover:text-foreground transition-colors">
            <ArrowLeft className="size-4" />
            Regresar
          </Link>
          <h1 className="text-xl font-semibold">Clientes</h1>
        </div>
      </header>

      <div className="mb-6">
        <Button type="button" size="sm" onClick={() => setFormOpen(!formOpen)}>
          {formOpen ? "Cerrar formulario" : "Nuevo cliente"}
        </Button>
        {formOpen && (
          <form onSubmit={handleSubmit} className="mt-4 p-4 border rounded max-w-md space-y-3">
            <input placeholder="Nombre *" value={form.name} onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))} required className="w-full border rounded px-3 py-2" />
            <input placeholder="Documento" value={form.documento} onChange={(e) => setForm((f) => ({ ...f, documento: e.target.value }))} className="w-full border rounded px-3 py-2" />
            <input placeholder="Dirección" value={form.direccion} onChange={(e) => setForm((f) => ({ ...f, direccion: e.target.value }))} className="w-full border rounded px-3 py-2" />
            <input placeholder="Distrito" value={form.distrito} onChange={(e) => setForm((f) => ({ ...f, distrito: e.target.value }))} className="w-full border rounded px-3 py-2" />
            <input list="tipoValvula-list-new" placeholder="Tipo de válvula (ej. Normal, Premium)" value={form.tipoValvula} onChange={(e) => setForm((f) => ({ ...f, tipoValvula: e.target.value }))} className="w-full border rounded px-3 py-2" />
            <datalist id="tipoValvula-list-new">{opcionesTipoValvula.map((o) => <option key={o} value={o} />)}</datalist>
            <input placeholder="Teléfono" value={form.telefono} onChange={(e) => setForm((f) => ({ ...f, telefono: e.target.value }))} className="w-full border rounded px-3 py-2" />
            <input type="email" placeholder="Email" value={form.email} onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))} className="w-full border rounded px-3 py-2" />
            {error && (
              <Alert variant="destructive">
                <AlertCircleIcon />
                <AlertTitle>Error</AlertTitle>
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}
            <Button type="submit" disabled={saving} size="sm">
            {saving && <Spinner data-icon="inline-start" />}
            Guardar
          </Button>
          </form>
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

      {editingId && (
        <div className="mb-6 p-4 border rounded bg-neutral-50 max-w-2xl">
          <h2 className="font-medium mb-3">Editar cliente</h2>
          <form onSubmit={handleUpdateCliente} className="space-y-3">
            <input placeholder="Nombre *" value={editForm.name} onChange={(e) => setEditForm((f) => ({ ...f, name: e.target.value }))} required className="w-full border rounded px-3 py-2" />
            <input placeholder="Documento" value={editForm.documento} onChange={(e) => setEditForm((f) => ({ ...f, documento: e.target.value }))} className="w-full border rounded px-3 py-2" />
            <input placeholder="Dirección principal" value={editForm.direccion} onChange={(e) => setEditForm((f) => ({ ...f, direccion: e.target.value }))} className="w-full border rounded px-3 py-2" />
            <input placeholder="Distrito" value={editForm.distrito} onChange={(e) => setEditForm((f) => ({ ...f, distrito: e.target.value }))} className="w-full border rounded px-3 py-2" />
            <input list="tipoValvula-list-edit" placeholder="Tipo de válvula (ej. Normal, Premium)" value={editForm.tipoValvula} onChange={(e) => setEditForm((f) => ({ ...f, tipoValvula: e.target.value }))} className="w-full border rounded px-3 py-2" />
            <datalist id="tipoValvula-list-edit">{opcionesTipoValvula.map((o) => <option key={o} value={o} />)}</datalist>
            <input placeholder="Teléfono" value={editForm.telefono} onChange={(e) => setEditForm((f) => ({ ...f, telefono: e.target.value }))} className="w-full border rounded px-3 py-2" />
            <input type="email" placeholder="Email" value={editForm.email} onChange={(e) => setEditForm((f) => ({ ...f, email: e.target.value }))} className="w-full border rounded px-3 py-2" />
            {error && (
              <Alert variant="destructive" className="mb-2">
                <AlertCircleIcon />
                <AlertTitle>Error</AlertTitle>
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}
            <div className="flex gap-2">
              <Button type="submit" disabled={saving} size="sm">
                {saving && <Spinner data-icon="inline-start" />}
                Guardar cliente
              </Button>
              <Button type="button" variant="outline" size="sm" onClick={() => { setEditingId(null); setError(""); }}>Cerrar</Button>
            </div>
          </form>
          <div className="mt-4">
            <h3 className="text-sm font-medium mb-2">Direcciones adicionales</h3>
            <ul className="space-y-2 mb-3">
              {direcciones.map((d) => (
                <li key={d.id} className="flex items-center gap-2 flex-wrap text-sm">
                  {editDirId === d.id ? (
                    <>
                      <input value={editDirForm.nombre} onChange={(e) => setEditDirForm((f) => ({ ...f, nombre: e.target.value }))} placeholder="Nombre" className="border rounded px-2 py-1 w-28" />
                      <input value={editDirForm.direccion} onChange={(e) => setEditDirForm((f) => ({ ...f, direccion: e.target.value }))} placeholder="Dirección" className="border rounded px-2 py-1 flex-1 min-w-[160px]" />
                      <input value={editDirForm.distrito} onChange={(e) => setEditDirForm((f) => ({ ...f, distrito: e.target.value }))} placeholder="Distrito" className="border rounded px-2 py-1 w-24" />
                      <Button type="button" variant="link" size="xs" onClick={() => handleUpdateDireccion(d.id)} disabled={saving}>Guardar</Button>
                      <Button type="button" variant="link" size="xs" onClick={() => setEditDirId(null)}>Cancelar</Button>
                    </>
                  ) : (
                    <>
                      <span className="font-medium">{d.nombre}:</span>
                      <span>{d.direccion}{d.distrito ? `, ${d.distrito}` : ""}</span>
                      <Button type="button" variant="link" size="xs" onClick={() => { setEditDirId(d.id); setEditDirForm({ nombre: d.nombre, direccion: d.direccion, distrito: d.distrito ?? "", tipoValvula: d.tipoValvula ?? "" }); }}>Editar</Button>
                      <Button type="button" variant="link" size="xs" onClick={() => handleDeleteDireccion(d.id)} disabled={saving} className="text-red-600">Eliminar</Button>
                    </>
                  )}
                </li>
              ))}
            </ul>
            <form onSubmit={handleAddDireccion} className="flex gap-2 flex-wrap items-center">
              <input value={nuevaDir.nombre} onChange={(e) => setNuevaDir((f) => ({ ...f, nombre: e.target.value }))} placeholder="Nombre (ej. Sucursal 2)" className="border rounded px-2 py-1 w-32" required />
              <input value={nuevaDir.direccion} onChange={(e) => setNuevaDir((f) => ({ ...f, direccion: e.target.value }))} placeholder="Dirección" className="border rounded px-2 py-1 w-48" required />
              <input value={nuevaDir.distrito} onChange={(e) => setNuevaDir((f) => ({ ...f, distrito: e.target.value }))} placeholder="Distrito" className="border rounded px-2 py-1 w-24" />
              <Button type="submit" disabled={saving} size="sm">Agregar</Button>
            </form>
          </div>
        </div>
      )}

      {clientes.length === 100 && (
        <p className="text-sm text-neutral-600 mb-2">Mostrando últimos 100 clientes.</p>
      )}
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
              <TableHead>Email</TableHead>
              <TableHead className="w-24">Acciones</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {clientes.length === 0 ? (
              <TableRow>
                <TableCell colSpan={8} className="h-24 text-center text-muted-foreground">
                  {filtroNombreDebounced || filtroDocumentoDebounced || filtroTelefonoDebounced
                    ? "No hay clientes con estos filtros"
                    : "No hay clientes"}
                </TableCell>
              </TableRow>
            ) : (
              clientes.map((c) => (
                <TableRow key={c.id}>
                  <TableCell>{c.name}</TableCell>
                  <TableCell>{c.documento ?? "—"}</TableCell>
                  <TableCell>{c.direccion ?? "—"}</TableCell>
                  <TableCell>{c.distrito ?? "—"}</TableCell>
                  <TableCell>{c.tipoValvula ?? "—"}</TableCell>
                  <TableCell>{c.telefono ?? "—"}</TableCell>
                  <TableCell>{c.email ?? "—"}</TableCell>
                  <TableCell>
                    <Link href={`/pedidos?clienteId=${encodeURIComponent(c.id)}`} className="text-sm underline mr-2">Hacer pedido</Link>
                    <Button type="button" variant="link" size="sm" onClick={() => setEditingId(c.id)}>Editar</Button>
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
