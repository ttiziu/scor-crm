"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";

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

  function loadClientes() {
    fetch("/api/clientes", { credentials: "include" })
      .then((res) => res.json())
      .then((data) => (Array.isArray(data) ? setClientes(data) : setClientes([])))
      .catch(() => setClientes([]));
  }

  useEffect(() => {
    fetch("/api/auth/me", { credentials: "include" })
      .then((res) => {
        if (res.status === 401) {
          router.replace("/login");
          return;
        }
        setAuthOk(true);
        return res.json();
      })
      .then(() => {
        loadClientes();
      })
      .catch(() => router.replace("/login"))
      .finally(() => setLoading(false));
  }, [router]);

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
          <h1 className="text-xl font-semibold">Clientes</h1>
        </div>
      </header>

      <div className="mb-6">
        <button
          type="button"
          onClick={() => setFormOpen(!formOpen)}
          className="py-2 px-4 rounded bg-foreground text-background text-sm"
        >
          {formOpen ? "Cerrar formulario" : "Nuevo cliente"}
        </button>
        {formOpen && (
          <form onSubmit={handleSubmit} className="mt-4 p-4 border rounded max-w-md space-y-3">
            <input
              placeholder="Nombre *"
              value={form.name}
              onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
              required
              className="w-full border rounded px-3 py-2"
            />
            <input
              placeholder="Documento"
              value={form.documento}
              onChange={(e) => setForm((f) => ({ ...f, documento: e.target.value }))}
              className="w-full border rounded px-3 py-2"
            />
            <input
              placeholder="Dirección"
              value={form.direccion}
              onChange={(e) => setForm((f) => ({ ...f, direccion: e.target.value }))}
              className="w-full border rounded px-3 py-2"
            />
            <input
              placeholder="Distrito"
              value={form.distrito}
              onChange={(e) => setForm((f) => ({ ...f, distrito: e.target.value }))}
              className="w-full border rounded px-3 py-2"
            />
            <input
              placeholder="Tipo de válvula"
              value={form.tipoValvula}
              onChange={(e) => setForm((f) => ({ ...f, tipoValvula: e.target.value }))}
              className="w-full border rounded px-3 py-2"
            />
            <input
              placeholder="Teléfono"
              value={form.telefono}
              onChange={(e) => setForm((f) => ({ ...f, telefono: e.target.value }))}
              className="w-full border rounded px-3 py-2"
            />
            <input
              type="email"
              placeholder="Email"
              value={form.email}
              onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))}
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
              <th className="border border-neutral-300 px-3 py-2 text-left">Documento</th>
              <th className="border border-neutral-300 px-3 py-2 text-left">Dirección</th>
              <th className="border border-neutral-300 px-3 py-2 text-left">Distrito</th>
              <th className="border border-neutral-300 px-3 py-2 text-left">Tipo válvula</th>
              <th className="border border-neutral-300 px-3 py-2 text-left">Teléfono</th>
              <th className="border border-neutral-300 px-3 py-2 text-left">Email</th>
            </tr>
          </thead>
          <tbody>
            {clientes.length === 0 ? (
              <tr>
                <td colSpan={7} className="border border-neutral-300 px-3 py-4 text-center text-neutral-500">
                  No hay clientes
                </td>
              </tr>
            ) : (
              clientes.map((c) => (
                <tr key={c.id}>
                  <td className="border border-neutral-300 px-3 py-2">{c.name}</td>
                  <td className="border border-neutral-300 px-3 py-2">{c.documento ?? "—"}</td>
                  <td className="border border-neutral-300 px-3 py-2">{c.direccion ?? "—"}</td>
                  <td className="border border-neutral-300 px-3 py-2">{c.distrito ?? "—"}</td>
                  <td className="border border-neutral-300 px-3 py-2">{c.tipoValvula ?? "—"}</td>
                  <td className="border border-neutral-300 px-3 py-2">{c.telefono ?? "—"}</td>
                  <td className="border border-neutral-300 px-3 py-2">{c.email ?? "—"}</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
