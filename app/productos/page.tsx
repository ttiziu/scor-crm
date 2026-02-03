"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";

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
  const [formOpen, setFormOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [form, setForm] = useState({ name: "" });
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState("");

  function loadProductos() {
    fetch("/api/productos", { credentials: "include" })
      .then((res) => res.json())
      .then((data) => (Array.isArray(data) ? setProductos(data) : setProductos([])))
      .catch(() => setProductos([]));
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
        loadProductos();
      })
      .catch(() => router.replace("/login"))
      .finally(() => setLoading(false));
  }, [router]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setSaving(true);
    try {
      const res = await fetch("/api/productos", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ name: form.name.trim() }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(data.error ?? "Error al crear");
        return;
      }
      setForm({ name: "" });
      setFormOpen(false);
      loadProductos();
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
      const res = await fetch(`/api/productos/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ name: editName.trim() }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(data.error ?? "Error al actualizar");
        return;
      }
      setEditingId(null);
      setEditName("");
      loadProductos();
    } catch {
      setError("Error de conexión");
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
      }
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
          <Link href="/" className="text-sm underline">
            ← Volver
          </Link>
          <h1 className="text-xl font-semibold">Productos</h1>
        </div>
      </header>

      <div className="mb-6">
        <button
          type="button"
          onClick={() => setFormOpen(!formOpen)}
          className="py-2 px-4 rounded bg-foreground text-background text-sm"
        >
          {formOpen ? "Cerrar formulario" : "Nuevo producto"}
        </button>
        {formOpen && (
          <form onSubmit={handleSubmit} className="mt-4 p-4 border rounded max-w-md space-y-3">
            <input
              placeholder="Nombre del producto *"
              value={form.name}
              onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
              required
              className="w-full border rounded px-3 py-2"
            />
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
              <th className="border border-neutral-300 px-3 py-2 text-left">Nombre</th>
              <th className="border border-neutral-300 px-3 py-2 text-left w-40">Acciones</th>
            </tr>
          </thead>
          <tbody>
            {productos.length === 0 ? (
              <tr>
                <td colSpan={2} className="border border-neutral-300 px-3 py-4 text-center text-neutral-500">
                  No hay productos. Agrega algunos o ejecuta el seed.
                </td>
              </tr>
            ) : (
              productos.map((p) => (
                <tr key={p.id}>
                  <td className="border border-neutral-300 px-3 py-2">
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
                  </td>
                  <td className="border border-neutral-300 px-3 py-2">
                    {editingId === p.id ? (
                      <>
                        <button
                          type="button"
                          onClick={() => handleUpdate(p.id)}
                          disabled={saving}
                          className="text-sm underline mr-2 disabled:opacity-50"
                        >
                          Guardar
                        </button>
                        <button
                          type="button"
                          onClick={() => { setEditingId(null); setEditName(""); }}
                          className="text-sm underline"
                        >
                          Cancelar
                        </button>
                      </>
                    ) : (
                      <>
                        <button
                          type="button"
                          onClick={() => { setEditingId(p.id); setEditName(p.name); }}
                          className="text-sm underline mr-2"
                        >
                          Editar
                        </button>
                        <button
                          type="button"
                          onClick={() => handleDelete(p.id)}
                          disabled={saving}
                          className="text-sm underline text-red-600"
                        >
                          Eliminar
                        </button>
                      </>
                    )}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
