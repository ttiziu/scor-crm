"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";

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
        <Link href="/" className="text-sm underline block mb-4">← Volver</Link>
        <p className="text-red-600">No tienes permiso para ver esta página.</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen p-6">
      <header className="flex justify-between items-center mb-6">
        <div className="flex items-center gap-4">
          <Link href="/" className="text-sm underline">
            ← Volver
          </Link>
          <h1 className="text-xl font-semibold">Usuarios</h1>
        </div>
      </header>

      <div className="mb-6">
        <button
          type="button"
          onClick={() => setFormOpen(!formOpen)}
          className="py-2 px-4 rounded bg-foreground text-background text-sm"
        >
          {formOpen ? "Cerrar formulario" : "Nuevo usuario"}
        </button>
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
            <input
              type="password"
              placeholder="Contraseña * (mín. 6)"
              value={form.password}
              onChange={(e) => setForm((f) => ({ ...f, password: e.target.value }))}
              required
              minLength={6}
              className="w-full border rounded px-3 py-2"
            />
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
                <option value="ADMIN">Administrador</option>
              </select>
            </div>
            {error && <p className="text-sm text-red-600">{error}</p>}
            <button type="submit" disabled={saving} className="py-2 px-4 rounded bg-foreground text-background text-sm disabled:opacity-50">
              {saving ? "Guardando…" : "Guardar"}
            </button>
          </form>
        )}
      </div>

      <div className="overflow-x-auto">
        <table className="w-full border-collapse border border-neutral-300">
          <thead>
            <tr className="bg-neutral-100">
              <th className="border border-neutral-300 px-3 py-2 text-left">Usuario</th>
              <th className="border border-neutral-300 px-3 py-2 text-left">Nombre</th>
              <th className="border border-neutral-300 px-3 py-2 text-left">Rol</th>
              <th className="border border-neutral-300 px-3 py-2 text-left">Acciones</th>
            </tr>
          </thead>
          <tbody>
            {usuarios.length === 0 ? (
              <tr>
                <td colSpan={4} className="border border-neutral-300 px-3 py-4 text-center text-neutral-500">
                  No hay usuarios
                </td>
              </tr>
            ) : (
              usuarios.map((u) => (
                <tr key={u.id}>
                  {editingId === u.id ? (
                    <>
                      <td className="border border-neutral-300 px-3 py-2">
                        <input
                          value={editForm.username}
                          onChange={(e) => setEditForm((f) => ({ ...f, username: e.target.value }))}
                          className="w-full border rounded px-2 py-1"
                          placeholder="Usuario"
                        />
                      </td>
                      <td className="border border-neutral-300 px-3 py-2">
                        <input
                          value={editForm.name}
                          onChange={(e) => setEditForm((f) => ({ ...f, name: e.target.value }))}
                          className="w-full border rounded px-2 py-1"
                        />
                      </td>
                      <td className="border border-neutral-300 px-3 py-2">
                        <select
                          value={editForm.role}
                          onChange={(e) => setEditForm((f) => ({ ...f, role: e.target.value }))}
                          className="border rounded px-2 py-1"
                        >
                          <option value="OPERADOR">Operador</option>
                          <option value="ADMIN">Administrador</option>
                        </select>
                      </td>
                      <td className="border border-neutral-300 px-3 py-2 space-x-2">
                        <input
                          type="password"
                          placeholder="Nueva contraseña (opcional)"
                          value={editForm.password}
                          onChange={(e) => setEditForm((f) => ({ ...f, password: e.target.value }))}
                          className="border rounded px-2 py-1 w-40"
                        />
                        <button type="button" onClick={() => handleUpdate(u.id)} disabled={saving} className="text-sm underline">Guardar</button>
                        <button type="button" onClick={() => { setEditingId(null); setEditForm({ username: "", name: "", role: "OPERADOR", password: "" }); }} className="text-sm underline">Cancelar</button>
                      </td>
                    </>
                  ) : (
                    <>
                      <td className="border border-neutral-300 px-3 py-2">{u.username ?? "—"}</td>
                      <td className="border border-neutral-300 px-3 py-2">{u.name}</td>
                      <td className="border border-neutral-300 px-3 py-2">{u.role}</td>
                      <td className="border border-neutral-300 px-3 py-2">
                        <button type="button" onClick={() => { setEditingId(u.id); setEditForm({ username: u.username ?? "", name: u.name, role: u.role, password: "" }); }} className="text-sm underline mr-2">Editar</button>
                        <button type="button" onClick={() => handleDelete(u.id)} className="text-sm underline text-red-600">Eliminar</button>
                      </td>
                    </>
                  )}
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
