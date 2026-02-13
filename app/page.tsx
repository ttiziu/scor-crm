"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Users, Building2, ShoppingCart, UserCog } from "lucide-react";
import { NumberTicker } from "@/components/ui/number-ticker";
import { TypingAnimation } from "@/components/ui/typing-animation";

type User = { id: string; username: string; role: string };

type DashboardStats = {
  totalClientes: number;
  pedidosHoy: number;
  creados: number;
  enRuta: number;
  entregados: number;
  cancelados: number;
};

type SuperAdminStats = {
  totalEmpresas: number;
  activas: number;
  bloqueadas: number;
  totalClientes: number;
  totalPedidos: number;
  totalUsuarios: number;
  ultimasEmpresas: Array<{
    id: string;
    name: string;
    slug: string;
    isActive: boolean;
    createdAt: string;
    _count: { users: number; clientes: number; pedidos: number };
  }>;
};

export default function HomePage() {
  const router = useRouter();
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [superAdminStats, setSuperAdminStats] = useState<SuperAdminStats | null>(null);
  const [contextTenantId, setContextTenantId] = useState<string | null>(null);

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
        setContextTenantId(data?.contextTenantId ?? null);
        setLoading(false);
      })
      .catch(() => {
        setLoading(false);
        router.replace("/login");
      });
  }, [router]);

  useEffect(() => {
    if (!user || user.role === "REPARTIDOR") return;
    fetch("/api/stats", { credentials: "include" })
      .then((r) => r.json())
      .then((data) => {
        if (data.totalClientes !== undefined) {
          setStats({
            totalClientes: data.totalClientes,
            pedidosHoy: data.pedidosHoy ?? 0,
            creados: data.creados ?? 0,
            enRuta: data.enRuta ?? 0,
            entregados: data.entregados ?? 0,
            cancelados: data.cancelados ?? 0,
          });
        }
      })
      .catch(() => setStats(null));
  }, [user, contextTenantId]);

  useEffect(() => {
    if (user?.role !== "SUPER_ADMIN") return;
    fetch("/api/admin/stats", { credentials: "include" })
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => data && setSuperAdminStats(data))
      .catch(() => setSuperAdminStats(null));
  }, [user]);

  useEffect(() => {
    const onContextChange = () => {
      fetch("/api/auth/me", { credentials: "include" })
        .then((r) => (r.ok ? r.json() : null))
        .then((data) => setContextTenantId(data?.contextTenantId ?? null));
    };
    window.addEventListener("scor-context-tenant-changed", onContextChange);
    return () => window.removeEventListener("scor-context-tenant-changed", onContextChange);
  }, []);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p>Cargando…</p>
      </div>
    );
  }

  if (!user) return null;

  if (user.role === "SUPER_ADMIN" && !contextTenantId) {
    return (
      <div className="min-h-screen p-6">
        <p className="mb-6">
          <TypingAnimation words={[`Bienvenido, ${user.username}.`]} loop className="leading-normal" />
        </p>
        <h2 className="text-lg font-medium mb-4">Panel Super Admin</h2>
        {superAdminStats ? (
          <>
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4 mb-8">
              <Link href="/empresas" className="border border-neutral-300 rounded-lg p-4 hover:bg-neutral-50 flex flex-col">
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <NumberTicker value={superAdminStats.totalEmpresas} startValue={0} className="text-2xl font-semibold tabular-nums" />
                    <p className="text-sm text-neutral-600 mt-0.5">Empresas</p>
                  </div>
                  <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-md bg-rose-100 text-rose-600">
                    <Building2 className="size-5" />
                  </span>
                </div>
              </Link>
              <div className="border border-neutral-300 rounded-lg p-4 flex flex-col">
                <NumberTicker value={superAdminStats.activas} startValue={0} className="text-2xl font-semibold tabular-nums text-green-600" />
                <p className="text-sm text-neutral-600 mt-0.5">Activas</p>
              </div>
              <div className="border border-neutral-300 rounded-lg p-4 flex flex-col">
                <NumberTicker value={superAdminStats.bloqueadas} startValue={0} className="text-2xl font-semibold tabular-nums text-red-600" />
                <p className="text-sm text-neutral-600 mt-0.5">Bloqueadas</p>
              </div>
              <div className="border border-neutral-300 rounded-lg p-4 flex flex-col">
                <NumberTicker value={superAdminStats.totalClientes} startValue={0} className="text-2xl font-semibold tabular-nums" />
                <p className="text-sm text-neutral-600 mt-0.5">Total clientes</p>
              </div>
              <div className="border border-neutral-300 rounded-lg p-4 flex flex-col">
                <NumberTicker value={superAdminStats.totalPedidos} startValue={0} className="text-2xl font-semibold tabular-nums" />
                <p className="text-sm text-neutral-600 mt-0.5">Total pedidos</p>
              </div>
              <div className="border border-neutral-300 rounded-lg p-4 flex flex-col">
                <NumberTicker value={superAdminStats.totalUsuarios} startValue={0} className="text-2xl font-semibold tabular-nums" />
                <p className="text-sm text-neutral-600 mt-0.5">Total usuarios</p>
              </div>
            </div>
            <section>
              <h3 className="text-base font-medium mb-3">Últimas empresas</h3>
              <div className="border rounded-lg overflow-hidden">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b bg-neutral-50">
                      <th className="text-left p-3 font-medium">Empresa</th>
                      <th className="text-right p-3 font-medium">Usuarios</th>
                      <th className="text-right p-3 font-medium">Clientes</th>
                      <th className="text-right p-3 font-medium">Pedidos</th>
                      <th className="text-left p-3 font-medium">Estado</th>
                      <th className="text-left p-3 font-medium"></th>
                    </tr>
                  </thead>
                  <tbody>
                    {superAdminStats.ultimasEmpresas.map((t) => (
                      <tr key={t.id} className="border-b last:border-0">
                        <td className="p-3 font-medium">{t.name}</td>
                        <td className="p-3 text-right tabular-nums">{t._count.users}</td>
                        <td className="p-3 text-right tabular-nums">{t._count.clientes}</td>
                        <td className="p-3 text-right tabular-nums">{t._count.pedidos}</td>
                        <td className="p-3">
                          <span className={t.isActive ? "text-green-600" : "text-red-600"}>
                            {t.isActive ? "Activa" : "Bloqueada"}
                          </span>
                        </td>
                        <td className="p-3">
                          <Link href="/empresas" className="text-primary hover:underline text-sm">
                            Gestionar
                          </Link>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <p className="mt-2">
                <Link href="/empresas" className="text-primary hover:underline text-sm font-medium">
                  Ver todas las empresas →
                </Link>
              </p>
            </section>
          </>
        ) : (
          <p className="text-muted-foreground">Cargando resumen…</p>
        )}
      </div>
    );
  }

  return (
    <div className="min-h-screen p-6">
      <main>
        <p className="mb-6 flex flex-wrap items-baseline gap-4 justify-between">
          <TypingAnimation
            words={[`Bienvenido, ${user.username}.`]}
            loop={true}
            className="leading-normal"
          />
        </p>

        {user.role !== "REPARTIDOR" && stats !== null && (
          <section className="mb-8">
            <h2 className="text-lg font-medium mb-4">Resumen</h2>
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4">
              <Link href="/clientes" className="border border-neutral-300 rounded-lg p-4 hover:bg-neutral-50 flex flex-col">
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <NumberTicker value={stats.totalClientes} startValue={0} className="text-2xl font-semibold tabular-nums" />
                    <p className="text-sm text-neutral-600 mt-0.5">Clientes</p>
                  </div>
                  <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-md bg-emerald-100 text-emerald-600">
                    <Users className="size-5" />
                  </span>
                </div>
              </Link>
              <Link href="/pedidos" className="border border-neutral-300 rounded-lg p-4 hover:bg-neutral-50">
                <NumberTicker value={stats.pedidosHoy} startValue={0} className="text-2xl font-semibold tabular-nums" />
                <p className="text-sm text-neutral-600 mt-0.5">Pedidos hoy</p>
              </Link>
              <Link href="/pedidos" className="border border-neutral-300 rounded-lg p-4 hover:bg-neutral-50 border-l-4 border-l-amber-500">
                <NumberTicker value={stats.creados} startValue={0} className="text-2xl font-semibold tabular-nums" />
                <p className="text-sm text-neutral-600 mt-0.5">Creados</p>
              </Link>
              <Link href="/pedidos" className="border border-neutral-300 rounded-lg p-4 hover:bg-neutral-50 border-l-4 border-l-amber-600">
                <NumberTicker value={stats.enRuta} startValue={0} className="text-2xl font-semibold tabular-nums" />
                <p className="text-sm text-neutral-600 mt-0.5">En ruta</p>
              </Link>
              <Link href="/pedidos" className="border border-neutral-300 rounded-lg p-4 hover:bg-neutral-50 border-l-4 border-l-green-600">
                <NumberTicker value={stats.entregados} startValue={0} className="text-2xl font-semibold tabular-nums" />
                <p className="text-sm text-neutral-600 mt-0.5">Entregados</p>
              </Link>
              <Link href="/pedidos" className="border border-neutral-300 rounded-lg p-4 hover:bg-neutral-50 border-l-4 border-l-red-500">
                <NumberTicker value={stats.cancelados} startValue={0} className="text-2xl font-semibold tabular-nums" />
                <p className="text-sm text-neutral-600 mt-0.5">Cancelados</p>
              </Link>
            </div>
          </section>
        )}
      </main>
    </div>
  );
}
