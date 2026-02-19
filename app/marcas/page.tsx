"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
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
import { Pencil, Trash2, Tag } from "lucide-react";

type Marca = {
  id: string;
  name: string;
};

export default function MarcasPage() {
  const router = useRouter();
  const [marcas, setMarcas] = useState<Marca[]>([]);
  const [loading, setLoading] = useState(true);
  const [authOk, setAuthOk] = useState(false);
  const [userRole, setUserRole] = useState("");
  const [contextTenantId, setContextTenantId] = useState<string | null>(null);
  const [formOpen, setFormOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({ name: "" });
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState("");
  const [deleteMarcaPending, setDeleteMarcaPending] = useState<{ id: string; name: string } | null>(null);

  function loadMarcas() {
    fetch("/api/marcas", { credentials: "include" })
      .then((res) => res.json())
      .then((data) => (Array.isArray(data) ? setMarcas(data) : setMarcas([])))
      .catch(() => setMarcas([]));
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
          loadMarcas();
        }
      })
      .catch(() => router.replace("/login"));
  }

  useEffect(() => {
    fetchMe().finally(() => setLoading(false));
  }, [router]);

  useEffect(() => {
    const onContextChange = () => {
      fetchMe().then(() => loadMarcas());
    };
    window.addEventListener("scor-context-tenant-changed", onContextChange);
    return () => window.removeEventListener("scor-context-tenant-changed", onContextChange);
  }, []);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const nameTrim = form.name.trim();
    if (!nameTrim) {
      toast.error("El nombre de la marca es requerido");
      return;
    }
    setSaving(true);
    try {
      const res = await fetch("/api/marcas", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ name: nameTrim }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        toast.error(data.error ?? "Error al crear marca");
        return;
      }
      toast.success("Marca creada");
      setForm({ name: "" });
      setFormOpen(false);
      loadMarcas();
    } catch {
      toast.error("Error de conexión");
    } finally {
      setSaving(false);
    }
  }

  async function handleUpdate(id: string) {
    const nameTrim = editName.trim();
    if (!nameTrim) {
      toast.error("El nombre de la marca es requerido");
      return;
    }
    setSaving(true);
    try {
      const res = await fetch(`/api/marcas/${id}`, {
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
      toast.success("Marca actualizada");
      setEditingId(null);
      setEditName("");
      loadMarcas();
    } catch {
      toast.error("Error de conexión");
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(id: string) {
    setSaving(true);
    try {
      const res = await fetch(`/api/marcas/${id}`, {
        method: "DELETE",
        credentials: "include",
      });
      if (res.ok) {
        setEditingId(null);
        loadMarcas();
        toast.success("Marca eliminada");
      } else {
        const data = await res.json().catch(() => ({}));
        toast.error(data.error ?? "No se pudo eliminar");
      }
    } catch {
      toast.error("Error de conexión");
    } finally {
      setSaving(false);
      setDeleteMarcaPending(null);
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen p-6">
        <div className="flex justify-between items-center mb-6">
          <Skeleton className="h-8 w-32" />
          <Skeleton className="h-9 w-36" />
        </div>
        <div className="mb-2">
          <Skeleton className="h-4 w-48" />
        </div>
        <TableSkeleton columns={2} rows={8} />
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
        <h1 className="text-xl font-semibold flex items-center gap-2">
          <Tag className="size-5 text-muted-foreground" />
          Marcas
        </h1>
        <Button type="button" size="sm" onClick={() => setFormOpen(!formOpen)}>
          {formOpen ? "Cerrar formulario" : "Nueva marca"}
        </Button>
      </header>

      <div className="mb-6">
        {formOpen && (
          <div className="mt-4 max-w-2xl">
            <div className="rounded-xl border border-neutral-200 bg-white shadow-sm overflow-hidden">
              <div className="p-6">
                <h2 className="text-lg font-semibold text-neutral-900 mb-5">Nueva marca</h2>
                <p className="text-sm text-muted-foreground mb-4">
                  Las marcas representan los balones que vendes (ej. Solgas, Limagas, Caserito). Cada empresa puede tener sus propias marcas.
                </p>
                <form onSubmit={handleSubmit} className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-neutral-700 mb-1.5">Nombre *</label>
                    <input
                      placeholder="Ej. Solgas, Limagas, Caserito"
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

      <div className="mb-2">
        <p className="text-sm text-muted-foreground">
          {marcas.length === 0
            ? "No hay marcas. Agrega las marcas de balón que vendes."
            : `${marcas.length} marca${marcas.length === 1 ? "" : "s"}.`}
        </p>
      </div>
      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Nombre</TableHead>
              <TableHead className="w-40">Acciones</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {marcas.length === 0 ? (
              <TableRow>
                <TableCell colSpan={2} className="h-24 text-center text-muted-foreground">
                  No hay marcas. Agrega las marcas de balón que ofrece tu negocio.
                </TableCell>
              </TableRow>
            ) : (
              marcas.map((m) => (
                <TableRow key={m.id}>
                  <TableCell>
                    {editingId === m.id ? (
                      <input
                        value={editName}
                        onChange={(e) => setEditName(e.target.value)}
                        className="w-full border rounded px-2 py-1"
                        autoFocus
                      />
                    ) : (
                      m.name
                    )}
                  </TableCell>
                  <TableCell>
                    {editingId === m.id ? (
                      <>
                        <Button
                          type="button"
                          variant="link"
                          size="sm"
                          onClick={() => handleUpdate(m.id)}
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
                          onClick={() => { setEditingId(m.id); setEditName(m.name); }}
                          title="Editar"
                        >
                          <Pencil className="size-4" />
                        </Button>
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 text-red-600 hover:text-red-700 hover:bg-red-50"
                          onClick={() => setDeleteMarcaPending({ id: m.id, name: m.name })}
                          disabled={saving || !!deleteMarcaPending}
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

      <AlertDialog open={!!deleteMarcaPending} onOpenChange={(open) => !open && setDeleteMarcaPending(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>¿Eliminar esta marca?</AlertDialogTitle>
            <AlertDialogDescription>
              &quot;{deleteMarcaPending?.name}&quot; se eliminará. Los pedidos que la usen quedarán sin marca asignada.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              variant="destructive"
              onClick={() => deleteMarcaPending && handleDelete(deleteMarcaPending.id)}
            >
              Eliminar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
