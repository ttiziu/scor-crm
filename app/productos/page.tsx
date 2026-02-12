"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Spinner } from "@/components/ui/spinner";
import { toast } from "sonner";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Pencil, Trash2 } from "lucide-react";

type Producto = {
  id: string;
  name: string;
  createdAt: string;
};

export default function ProductosPage() {
  const router = useRouter();
  const [productos, setProductos] = useState<Producto[]>([]);
  const [loading, setLoading] = useState(true);
  const [authOk, setAuthOk] = useState(false);
  const [userRole, setUserRole] = useState("");
  const [contextTenantId, setContextTenantId] = useState<string | null>(null);
  const [formOpen, setFormOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({ name: "" });
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState("");

  function loadProductos() {
    fetch("/api/productos", { credentials: "include" })
      .then((res) => res.json())
      .then((data) => (Array.isArray(data) ? setProductos(data) : setProductos([])))
      .catch(() => setProductos([]));
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
          loadProductos();
        }
      })
      .catch(() => router.replace("/login"));
  }

  useEffect(() => {
    fetchMe().finally(() => setLoading(false));
  }, [router]);

  useEffect(() => {
    const onContextChange = () => {
      fetchMe().then(() => loadProductos());
    };
    window.addEventListener("scor-context-tenant-changed", onContextChange);
    return () => window.removeEventListener("scor-context-tenant-changed", onContextChange);
  }, []);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const nameTrim = form.name.trim();
    if (!nameTrim) {
      toast.error("El nombre del producto es requerido");
      return;
    }
    setSaving(true);
    try {
      const res = await fetch("/api/productos", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ name: nameTrim }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        toast.error(data.error ?? "Error al crear producto");
        return;
      }
      toast.success("Producto creado");
      setForm({ name: "" });
      setFormOpen(false);
      loadProductos();
    } catch {
      toast.error("Error de conexión");
    } finally {
      setSaving(false);
    }
  }

  async function handleUpdate(id: string) {
    const nameTrim = editName.trim();
    if (!nameTrim) {
      toast.error("El nombre del producto es requerido");
      return;
    }
    setSaving(true);
    try {
      const res = await fetch(`/api/productos/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ name: nameTrim }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        toast.error(data.error ?? "Error al actualizar");
        return;
      }
      toast.success("Producto actualizado");
      setEditingId(null);
      setEditName("");
      loadProductos();
    } catch {
      toast.error("Error de conexión");
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(id: string) {
    if (!confirm("¿Eliminar este producto?")) return;
    setSaving(true);
    try {
      const res = await fetch(`/api/productos/${id}`, {
        method: "DELETE",
        credentials: "include",
      });
      if (res.ok) {
        setEditingId(null);
        loadProductos();
        toast.success("Producto eliminado");
      } else {
        const data = await res.json().catch(() => ({}));
        toast.error(data.error ?? "No se pudo eliminar");
      }
    } catch {
      toast.error("Error de conexión");
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
        <h1 className="text-xl font-semibold">Productos</h1>
        <Button type="button" size="sm" onClick={() => setFormOpen(!formOpen)}>
          {formOpen ? "Cerrar formulario" : "Nuevo producto"}
        </Button>
      </header>

      <div className="mb-6">
        {formOpen && (
          <div className="mt-4 max-w-2xl">
            <div className="rounded-xl border border-neutral-200 bg-white shadow-sm overflow-hidden">
              <div className="p-6">
                <h2 className="text-lg font-semibold text-neutral-900 mb-5">Nuevo producto</h2>
                <form onSubmit={handleSubmit} className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-neutral-700 mb-1.5">Nombre *</label>
                    <input
                      placeholder="Ej. Balón 10 kg"
                      value={form.name}
                      onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                      className="w-full rounded-lg border border-neutral-200 bg-white px-3 py-2 text-sm placeholder:text-neutral-400 focus:outline-none focus:ring-2 focus:ring-neutral-400/50"
                    />
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

      {productos.length === 100 && (
        <p className="text-sm text-neutral-600 mb-2">Mostrando últimos 100 productos.</p>
      )}
      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Nombre</TableHead>
              <TableHead className="w-40">Acciones</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {productos.length === 0 ? (
              <TableRow>
                <TableCell colSpan={2} className="h-24 text-center text-muted-foreground">
                  No hay productos. Agrega algunos o ejecuta el seed.
                </TableCell>
              </TableRow>
            ) : (
              productos.map((p) => (
                <TableRow key={p.id}>
                  <TableCell>
                    {editingId === p.id ? (
                      <input
                        value={editName}
                        onChange={(e) => setEditName(e.target.value)}
                        className="w-full border rounded px-2 py-1"
                        autoFocus
                      />
                    ) : (
                      p.name
                    )}
                  </TableCell>
                  <TableCell>
                    {editingId === p.id ? (
                      <>
                        <Button
                          type="button"
                          variant="link"
                          size="sm"
                          onClick={() => handleUpdate(p.id)}
                          disabled={saving}
                          className="mr-2"
                        >
                          Guardar
                        </Button>
                        <Button
                          type="button"
                          variant="link"
                          size="sm"
                          onClick={() => { setEditingId(null); setEditName(""); }}
                        >
                          Cancelar
                        </Button>
                      </>
                    ) : (
                      <div className="flex items-center gap-1">
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 text-neutral-700 hover:text-neutral-900 hover:bg-neutral-100"
                          onClick={() => { setEditingId(p.id); setEditName(p.name); }}
                          title="Editar"
                        >
                          <Pencil className="size-4" />
                        </Button>
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 text-red-600 hover:text-red-700 hover:bg-red-50"
                          onClick={() => handleDelete(p.id)}
                          disabled={saving}
                          title="Eliminar"
                        >
                          {saving ? <Spinner className="size-4" /> : <Trash2 className="size-4" />}
                        </Button>
                      </div>
                    )}
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
