"use client";

import { useEffect, useState, useRef } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";

type Cliente = { id: string; name: string; documento?: string | null };

type Pedido = {
  id: string;
  clienteId: string;
  estado: string;
  cantidad: number | null;
  fechaPedido: string;
  observaciones: string | null;
  createdAt: string;
  cliente: Cliente;
};

export default function PedidosPage() {
  const router = useRouter();
  const [pedidos, setPedidos] = useState<Pedido[]>([]);
  const [clientes, setClientes] = useState<Cliente[]>([]);
  const [loading, setLoading] = useState(true);
  const [authOk, setAuthOk] = useState(false);
  const [formOpen, setFormOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [form, setForm] = useState({ clienteId: "", cantidad: "", observaciones: "" });
  const [clienteSearch, setClienteSearch] = useState("");
  const [clienteDropdownOpen, setClienteDropdownOpen] = useState(false);
  const clienteInputRef = useRef<HTMLInputElement>(null);
  const clienteListRef = useRef<HTMLDivElement>(null);

  function loadPedidos() {
    fetch("/api/pedidos", { credentials: "include" })
      .then((res) => res.json())
      .then((data) => (Array.isArray(data) ? setPedidos(data) : setPedidos([])))
      .catch(() => setPedidos([]));
  }

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
        loadPedidos();
        loadClientes();
      })
      .catch(() => router.replace("/login"))
      .finally(() => setLoading(false));
  }, [router]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.clienteId.trim()) {
      setError("Selecciona un cliente");
      return;
    }
    setError("");
    setSaving(true);
    try {
      const res = await fetch("/api/pedidos", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          clienteId: form.clienteId,
          cantidad: form.cantidad ? parseInt(form.cantidad, 10) : undefined,
          observaciones: form.observaciones || undefined,
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(data.error ?? "Error al crear");
        return;
      }
      setForm({ clienteId: "", cantidad: "", observaciones: "" });
      setClienteSearch("");
      setFormOpen(false);
      loadPedidos();
    } catch {
      setError("Error de conexión");
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

  function formatDate(s: string) {
    try {
      return new Date(s).toLocaleDateString("es", { day: "2-digit", month: "2-digit", year: "numeric" });
    } catch {
      return s;
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
          <h1 className="text-xl font-semibold">Pedidos</h1>
        </div>
      </header>

      <div className="mb-6">
        <button
          type="button"
          onClick={() => setFormOpen(!formOpen)}
          className="py-2 px-4 rounded bg-foreground text-background text-sm"
        >
          {formOpen ? "Cerrar formulario" : "Nuevo pedido"}
        </button>
        {formOpen && (
          <form onSubmit={handleSubmit} className="mt-4 p-4 border rounded max-w-md space-y-3">
            <div className="relative" ref={clienteListRef}>
              <label className="block text-sm mb-1">Cliente *</label>
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
                onBlur={() => {
                  setTimeout(() => setClienteDropdownOpen(false), 200);
                }}
                placeholder="Escribe nombre o documento para buscar..."
                className="w-full border rounded px-3 py-2"
                autoComplete="off"
              />
              {clienteDropdownOpen && (
                <div className="absolute z-10 w-full mt-1 border rounded bg-background shadow-lg max-h-48 overflow-y-auto">
                  {clientesFiltrados.length === 0 ? (
                    <div className="px-3 py-2 text-sm text-neutral-500">Ningún cliente coincide</div>
                  ) : (
                    clientesFiltrados.map((c) => {
                      const text = `${c.name}${c.documento ? " — " + c.documento : ""}`;
                      return (
                        <button
                          key={c.id}
                          type="button"
                          className="w-full text-left px-3 py-2 text-sm hover:bg-neutral-100 border-b border-neutral-100 last:border-0"
                          onMouseDown={(e) => {
                            e.preventDefault();
                            setForm((f) => ({ ...f, clienteId: c.id }));
                            setClienteSearch(text);
                            setClienteDropdownOpen(false);
                            clienteInputRef.current?.blur();
                          }}
                        >
                          {text}
                        </button>
                      );
                    })
                  )}
                </div>
              )}
            </div>
            <input
              type="number"
              min={0}
              placeholder="Cantidad"
              value={form.cantidad}
              onChange={(e) => setForm((f) => ({ ...f, cantidad: e.target.value }))}
              className="w-full border rounded px-3 py-2"
            />
            <input
              placeholder="Observaciones"
              value={form.observaciones}
              onChange={(e) => setForm((f) => ({ ...f, observaciones: e.target.value }))}
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
              <th className="border border-neutral-300 px-3 py-2 text-left">Cliente</th>
              <th className="border border-neutral-300 px-3 py-2 text-left">Estado</th>
              <th className="border border-neutral-300 px-3 py-2 text-left">Cantidad</th>
              <th className="border border-neutral-300 px-3 py-2 text-left">Fecha</th>
              <th className="border border-neutral-300 px-3 py-2 text-left">Observaciones</th>
            </tr>
          </thead>
          <tbody>
            {pedidos.length === 0 ? (
              <tr>
                <td colSpan={5} className="border border-neutral-300 px-3 py-4 text-center text-neutral-500">
                  No hay pedidos
                </td>
              </tr>
            ) : (
              pedidos.map((p) => (
                <tr key={p.id}>
                  <td className="border border-neutral-300 px-3 py-2">{p.cliente?.name ?? "—"}</td>
                  <td className="border border-neutral-300 px-3 py-2">{p.estado}</td>
                  <td className="border border-neutral-300 px-3 py-2">{p.cantidad ?? "—"}</td>
                  <td className="border border-neutral-300 px-3 py-2">{formatDate(p.fechaPedido)}</td>
                  <td className="border border-neutral-300 px-3 py-2">{p.observaciones ?? "—"}</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
