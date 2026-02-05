"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Spinner } from "@/components/ui/spinner";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { AlertCircleIcon, ArrowLeft } from "lucide-react";

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
          setAuthOk(true);
          setIsAdmin(data.user.role === "ADMIN");
          if (data.user.role === "ADMIN") loadUsuarios();
        }
      })
      .catch(() => router.replace("/login"))
      .finally(() => setLoading(false));
  }, [router]);

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
  if (!isAdmin) {
    return (
      <div className="min-h-screen p-6">
        <Link href="/" className="inline-flex items-center gap-2 text-sm font-medium text-muted-foreground hover:text-foreground transition-colors mb-4">
        <ArrowLeft className="size-4" />
        Regresar
      </Link>
        <p className="text-red-600">No tienes permiso para ver esta página.</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen p-6">
      <header className="flex justify-between items-center mb-6">
        <div className="flex items-center gap-4">
          <Link href="/" className="inline-flex items-center gap-2 text-sm font-medium text-muted-foreground hover:text-foreground transition-colors">
            <ArrowLeft className="size-4" />
            Regresar
          </Link>
          <h1 className="text-xl font-semibold">Usuarios</h1>
        </div>
      </header>

      <div className="mb-6">
        <Button type="button" size="sm" onClick={() => setFormOpen(!formOpen)}>
          {formOpen ? "Cerrar formulario" : "Nuevo usuario"}
        </Button>
        {formOpen && (
          <form onSubmit={handleSubmit} className="mt-4 p-4 border rounded max-w-md space-y-3">
            <input
              placeholder="Usuario * (nombre para iniciar sesión)"
              value={form.username}
              onChange={(e) => setForm((f) => ({ ...f, username: e.target.value }))}
              required
              className="w-full border rounded px-3 py-2"
            />
            <input
              type="email"
              placeholder="Email (opcional)"
              value={form.email}
              onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))}
              className="w-full border rounded px-3 py-2"
            />
            <div className="flex gap-2 items-center">
              <input
                type={showPassword ? "text" : "password"}
                placeholder="Contraseña * (mín. 6)"
                value={form.password}
                onChange={(e) => setForm((f) => ({ ...f, password: e.target.value }))}
                required
                minLength={6}
                className="flex-1 border rounded px-3 py-2"
              />
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setShowPassword((v) => !v)}
                title={showPassword ? "Ocultar contraseña" : "Mostrar contraseña"}
                className="whitespace-nowrap"
              >
                {showPassword ? "Ocultar" : "Mostrar"}
              </Button>
            </div>
            <input
              placeholder="Nombre *"
              value={form.name}
              onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
              required
              className="w-full border rounded px-3 py-2"
            />
            <div>
              <label className="block text-sm mb-1">Rol</label>
              <select
                value={form.role}
                onChange={(e) => setForm((f) => ({ ...f, role: e.target.value }))}
                className="w-full border rounded px-3 py-2"
              >
                <option value="OPERADOR">Operador</option>
                <option value="REPARTIDOR">Repartidor</option>
                <option value="ADMIN">Administrador</option>
              </select>
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
              {saving ? "Guardando…" : "Guardar"}
            </Button>
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
                        <Button type="button" variant="link" size="sm" onClick={() => { setEditingId(u.id); setEditForm({ username: u.username ?? "", name: u.name, role: u.role, password: "" }); }} className="mr-2">Editar</Button>
                        <Button type="button" variant="link" size="sm" onClick={() => handleDelete(u.id)} className="text-red-600">Eliminar</Button>
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
