"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";

type User = { id: string; username: string; role: string };

function todayISO() {
  const d = new Date();
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

type DashboardStats = {
  totalClientes: number;
  pedidosHoy: number;
  creados: number;
  enRuta: number;
  entregados: number;
  cancelados: number;
};

export default function HomePage() {
  const router = useRouter();
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState<DashboardStats | null>(null);

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
        if (data?.user) setUser(data.user);
        setLoading(false);
      })
      .catch(() => {
        setLoading(false);
        router.replace("/login");
      });
  }, [router]);

  useEffect(() => {
    if (!user || user.role === "REPARTIDOR") return;
    const hoy = todayISO();
    Promise.all([
      fetch("/api/clientes", { credentials: "include" }).then((r) => r.json()),
      fetch(`/api/pedidos?fecha=${hoy}`, { credentials: "include" }).then((r) => r.json()),
    ])
      .then(([clientes, pedidos]) => {
        const list = Array.isArray(pedidos) ? pedidos : [];
        setStats({
          totalClientes: Array.isArray(clientes) ? clientes.length : 0,
          pedidosHoy: list.length,
          creados: list.filter((p: { estado: string }) => p.estado === "CREATED").length,
          enRuta: list.filter((p: { estado: string }) => p.estado === "IN_ROUTE").length,
          entregados: list.filter((p: { estado: string }) => p.estado === "DELIVERED").length,
          cancelados: list.filter((p: { estado: string }) => p.estado === "CANCELLED").length,
        });
      })
      .catch(() => setStats(null));
  }, [user]);

  async function handleLogout() {
    await fetch("/api/auth/logout", { method: "POST", credentials: "include" });
    router.replace("/login");
    router.refresh();
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p>Cargando…</p>
      </div>
    );
  }

  if (!user) return null;

  return (
    <div className="min-h-screen p-6">
      <header className="flex justify-between items-center mb-8">
        <h1 className="text-xl font-semibold">SCOR CRM</h1>
        <div className="flex items-center gap-4">
          <span className="text-sm text-neutral-600">{user.username}</span>
          <button
            type="button"
            onClick={handleLogout}
            className="text-sm underline"
          >
            Cerrar sesión
          </button>
        </div>
      </header>
      <main>
        <p className="mb-6">Bienvenido, {user.username}</p>

        {user.role !== "REPARTIDOR" && stats !== null && (
          <section className="mb-8">
            <h2 className="text-lg font-medium mb-4">Resumen</h2>
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4">
              <Link href="/clientes" className="border border-neutral-300 rounded-lg p-4 hover:bg-neutral-50">
                <p className="text-2xl font-semibold">{stats.totalClientes}</p>
                <p className="text-sm text-neutral-600">Clientes</p>
              </Link>
              <Link href="/pedidos" className="border border-neutral-300 rounded-lg p-4 hover:bg-neutral-50">
                <p className="text-2xl font-semibold">{stats.pedidosHoy}</p>
                <p className="text-sm text-neutral-600">Pedidos hoy</p>
              </Link>
              <Link href="/pedidos" className="border border-neutral-300 rounded-lg p-4 hover:bg-neutral-50 border-l-4 border-l-amber-500">
                <p className="text-2xl font-semibold">{stats.creados}</p>
                <p className="text-sm text-neutral-600">Creados</p>
              </Link>
              <Link href="/pedidos" className="border border-neutral-300 rounded-lg p-4 hover:bg-neutral-50 border-l-4 border-l-amber-600">
                <p className="text-2xl font-semibold">{stats.enRuta}</p>
                <p className="text-sm text-neutral-600">En ruta</p>
              </Link>
              <Link href="/pedidos" className="border border-neutral-300 rounded-lg p-4 hover:bg-neutral-50 border-l-4 border-l-green-600">
                <p className="text-2xl font-semibold">{stats.entregados}</p>
                <p className="text-sm text-neutral-600">Entregados</p>
              </Link>
              <Link href="/pedidos" className="border border-neutral-300 rounded-lg p-4 hover:bg-neutral-50 border-l-4 border-l-red-500">
                <p className="text-2xl font-semibold">{stats.cancelados}</p>
                <p className="text-sm text-neutral-600">Cancelados</p>
              </Link>
            </div>
          </section>
        )}

        <nav className="flex gap-4 flex-wrap">
          {user.role === "ADMIN" && (
            <Link
              href="/usuarios"
              className="py-2 px-4 rounded bg-foreground text-background"
            >
              Usuarios
            </Link>
          )}
          {user.role !== "REPARTIDOR" && (
            <>
              <Link
                href="/clientes"
                className="py-2 px-4 rounded bg-foreground text-background"
              >
                Clientes
              </Link>
              <Link
                href="/productos"
                className="py-2 px-4 rounded border border-foreground"
              >
                Productos
              </Link>
              <Link
                href="/pedidos"
                className="py-2 px-4 rounded border border-foreground"
              >
                Pedidos
              </Link>
            </>
          )}
          {user.role === "REPARTIDOR" && (
            <Link
              href="/mis-pedidos"
              className="py-2 px-4 rounded bg-foreground text-background"
            >
              Mis pedidos
            </Link>
          )}
        </nav>
      </main>
    </div>
  );
}
