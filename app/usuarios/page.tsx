"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Spinner } from "@/components/ui/spinner";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { AlertCircleIcon, Pencil, Trash2 } from "lucide-react";

type Usuario = {
  id: string;
  username: string | null;
  email: string | null;
  name: string;
  role: string;
  createdAt: string;
};

export default function UsuariosPage() {
  const router = useRouter();
  const [usuarios, setUsuarios] = useState<Usuario[]>([]);
  const [loading, setLoading] = useState(true);
  const [authOk, setAuthOk] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);
  const [userRole, setUserRole] = useState("");
  const [contextTenantId, setContextTenantId] = useState<string | null>(null);
  const [formOpen, setFormOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [form, setForm] = useState({ username: "", email: "", password: "", name: "", role: "OPERADOR" });
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editForm, setEditForm] = useState({ username: "", name: "", role: "OPERADOR", password: "" });
  const [showPassword, setShowPassword] = useState(false);
  const [showEditPassword, setShowEditPassword] = useState(false);

  function loadUsuarios() {
    fetch("/api/usuarios", { credentials: "include" })
      .then((res) => {
        if (res.status === 403) return [];
        return res.json();
      })
      .then((data) => (Array.isArray(data) ? setUsuarios(data) : setUsuarios([])))
      .catch(() => setUsuarios([]));
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
          setAuthOk(true);
          setIsAdmin(data.user.role === "ADMIN");
          setUserRole(data.user.role ?? "");
          setContextTenantId(data.contextTenantId ?? null);
          if (data.user.role === "ADMIN" || data.user.role === "SUPER_ADMIN") loadUsuarios();
        }
      })
      .catch(() => router.replace("/login"));
  }

  useEffect(() => {
    fetchMe().finally(() => setLoading(false));
  }, [router]);

  useEffect(() => {
    const onContextChange = () => fetchMe().then(() => loadUsuarios());
    window.addEventListener("scor-context-tenant-changed", onContextChange);
    return () => window.removeEventListener("scor-context-tenant-changed", onContextChange);
  }, []);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setSaving(true);
    try {
      const res = await fetch("/api/usuarios", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          username: form.username,
          email: form.email || undefined,
          password: form.password,
          name: form.name,
          role: form.role,
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(data.error ?? "Error al crear");
        return;
      }
      setForm({ username: "", email: "", password: "", name: "", role: "OPERADOR" });
      setFormOpen(false);
      loadUsuarios();
    } catch {
      setError("Error de conexión");
    } finally {
      setSaving(false);
    }
  }

  async function handleUpdate(id: string) {
    setError("");
    setSaving(true);
    try {
      const body: { username?: string; name?: string; role?: string; password?: string } = {
        username: editForm.username,
        name: editForm.name,
        role: editForm.role,
      };
      if (editForm.password) body.password = editForm.password;
      const res = await fetch(`/api/usuarios/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify(body),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(data.error ?? "Error al actualizar");
        return;
      }
      setEditingId(null);
      setEditForm({ username: "", name: "", role: "OPERADOR", password: "" });
      loadUsuarios();
    } catch {
      setError("Error de conexión");
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(id: string) {
    if (!confirm("¿Eliminar este usuario?")) return;
    try {
      const res = await fetch(`/api/usuarios/${id}`, {
        method: "DELETE",
        credentials: "include",
      });
      if (res.status === 204) loadUsuarios();
      else {
        const data = await res.json().catch(() => ({}));
        setError(data.error ?? "Error al eliminar");
      }
    } catch {
      setError("Error de conexión");
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
  if (!isAdmin && userRole !== "SUPER_ADMIN") {
    return (
      <div className="min-h-screen p-6">
        <p className="text-red-600">No tienes permiso para ver esta página.</p>
      </div>
    );
  }

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
        <h1 className="text-xl font-semibold">Usuarios</h1>
        <Button type="button" size="sm" onClick={() => setFormOpen(!formOpen)}>
          {formOpen ? "Cerrar formulario" : "Nuevo usuario"}
        </Button>
      </header>

      <div className="mb-6">
        {formOpen && (
          <form onSubmit={handleSubmit} className="mt-4 w-full">
            <div className="rounded-xl border border-neutral-200 bg-white shadow-sm overflow-hidden">
              <div className="p-6 space-y-5">
                <h2 className="text-lg font-semibold text-neutral-900 mb-5">Nuevo usuario</h2>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-neutral-700 mb-1.5">Usuario *</label>
                    <input
                      placeholder="Nombre para iniciar sesión"
                      value={form.username}
                      onChange={(e) => setForm((f) => ({ ...f, username: e.target.value }))}
                      required
                      className="w-full rounded-lg border border-neutral-200 bg-white px-3 py-2 text-sm placeholder:text-neutral-400 focus:outline-none focus:ring-2 focus:ring-neutral-400/50"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-neutral-700 mb-1.5">Email</label>
                    <input
                      type="email"
                      placeholder="correo@ejemplo.com (opcional)"
                      value={form.email}
                      onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))}
                      className="w-full rounded-lg border border-neutral-200 bg-white px-3 py-2 text-sm placeholder:text-neutral-400 focus:outline-none focus:ring-2 focus:ring-neutral-400/50"
                    />
                  </div>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-neutral-700 mb-1.5">Contraseña *</label>
                    <div className="flex gap-2 items-center">
                      <input
                        type={showPassword ? "text" : "password"}
                        placeholder="Mín. 6 caracteres"
                        value={form.password}
                        onChange={(e) => setForm((f) => ({ ...f, password: e.target.value }))}
                        required
                        minLength={6}
                        className="flex-1 rounded-lg border border-neutral-200 bg-white px-3 py-2 text-sm placeholder:text-neutral-400 focus:outline-none focus:ring-2 focus:ring-neutral-400/50"
                      />
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => setShowPassword((v) => !v)}
                        title={showPassword ? "Ocultar contraseña" : "Mostrar contraseña"}
                        className="shrink-0 rounded-lg"
                      >
                        {showPassword ? "Ocultar" : "Mostrar"}
                      </Button>
                    </div>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-neutral-700 mb-1.5">Nombre *</label>
                    <input
                      placeholder="Nombre completo"
                      value={form.name}
                      onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                      required
                      className="w-full rounded-lg border border-neutral-200 bg-white px-3 py-2 text-sm placeholder:text-neutral-400 focus:outline-none focus:ring-2 focus:ring-neutral-400/50"
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-neutral-700 mb-1.5">Rol</label>
                  <select
                    value={form.role}
                    onChange={(e) => setForm((f) => ({ ...f, role: e.target.value }))}
                    className="w-full max-w-xs rounded-lg border border-neutral-200 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-neutral-400/50"
                  >
                    <option value="OPERADOR">Operador</option>
                    <option value="REPARTIDOR">Repartidor</option>
                    <option value="ADMIN">Administrador</option>
                  </select>
                </div>
                {error && (
                  <Alert variant="destructive" className="rounded-lg">
                    <AlertCircleIcon />
                    <AlertTitle>Error</AlertTitle>
                    <AlertDescription>{error}</AlertDescription>
                  </Alert>
                )}
                <div className="pt-1">
                  <Button type="submit" disabled={saving} size="sm" className="rounded-lg px-5">
                    {saving && <Spinner data-icon="inline-start" />}
                    {saving ? "Guardando…" : "Guardar"}
                  </Button>
                </div>
              </div>
            </div>
          </form>
        )}
      </div>

      {usuarios.length === 100 && (
        <p className="text-sm text-neutral-600 mb-2">Mostrando últimos 100 usuarios.</p>
      )}
      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Usuario</TableHead>
              <TableHead>Nombre</TableHead>
              <TableHead>Rol</TableHead>
              <TableHead>Acciones</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {usuarios.length === 0 ? (
              <TableRow>
                <TableCell colSpan={4} className="h-24 text-center text-muted-foreground">
                  No hay usuarios
                </TableCell>
              </TableRow>
            ) : (
              usuarios.map((u) => (
                <TableRow key={u.id}>
                  {editingId === u.id ? (
                    <>
                      <TableCell>
                        <input
                          value={editForm.username}
                          onChange={(e) => setEditForm((f) => ({ ...f, username: e.target.value }))}
                          className="w-full border rounded px-2 py-1"
                          placeholder="Usuario"
                        />
                      </TableCell>
                      <TableCell>
                        <input
                          value={editForm.name}
                          onChange={(e) => setEditForm((f) => ({ ...f, name: e.target.value }))}
                          className="w-full border rounded px-2 py-1"
                        />
                      </TableCell>
                      <TableCell>
                        <select
                          value={editForm.role}
                          onChange={(e) => setEditForm((f) => ({ ...f, role: e.target.value }))}
                          className="border rounded px-2 py-1"
                        >
                          <option value="OPERADOR">Operador</option>
                          <option value="REPARTIDOR">Repartidor</option>
                          <option value="ADMIN">Administrador</option>
                        </select>
                      </TableCell>
                      <TableCell className="space-x-2">
                        <input
                          type={showEditPassword ? "text" : "password"}
                          placeholder="Nueva contraseña (opcional)"
                          value={editForm.password}
                          onChange={(e) => setEditForm((f) => ({ ...f, password: e.target.value }))}
                          className="border rounded px-2 py-1 w-40"
                        />
                        <Button
                          type="button"
                          variant="link"
                          size="sm"
                          onClick={() => setShowEditPassword((v) => !v)}
                          title={showEditPassword ? "Ocultar" : "Mostrar"}
                        >
                          {showEditPassword ? "Ocultar" : "Mostrar"}
                        </Button>
                        <Button type="button" variant="link" size="sm" onClick={() => handleUpdate(u.id)} disabled={saving}>Guardar</Button>
                        <Button type="button" variant="link" size="sm" onClick={() => { setEditingId(null); setEditForm({ username: "", name: "", role: "OPERADOR", password: "" }); }}>Cancelar</Button>
                      </TableCell>
                    </>
                  ) : (
                    <>
                      <TableCell>{u.username ?? "—"}</TableCell>
                      <TableCell>{u.name}</TableCell>
                      <TableCell>{u.role}</TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1">
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 text-neutral-700 hover:text-neutral-900 hover:bg-neutral-100"
                            onClick={() => { setEditingId(u.id); setEditForm({ username: u.username ?? "", name: u.name, role: u.role, password: "" }); }}
                            title="Editar"
                          >
                            <Pencil className="size-4" />
                          </Button>
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 text-red-600 hover:text-red-700 hover:bg-red-50"
                            onClick={() => handleDelete(u.id)}
                            title="Eliminar"
                          >
                            <Trash2 className="size-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </>
                  )}
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
