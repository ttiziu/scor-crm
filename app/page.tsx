"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Users, Building2, ShoppingCart, UserCog, CheckCircle, Ban } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
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
      <div className="min-h-screen p-6">
        <div className="mb-6">
          <Skeleton className="h-6 w-48 mb-2" />
        </div>
        <section className="mb-8">
          <Skeleton className="h-6 w-24 mb-4" />
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4">
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="border border-neutral-300 rounded-lg p-4 flex flex-col gap-2">
                <Skeleton className="h-8 w-16" />
                <Skeleton className="h-4 w-20" />
              </div>
            ))}
          </div>
        </section>
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
              <div className="border border-neutral-200 rounded-lg overflow-hidden bg-white">
                <Table>
                  <TableHeader>
                    <TableRow className="bg-neutral-50/80 hover:bg-neutral-50/80">
                      <TableHead className="px-4">Empresa</TableHead>
                      <TableHead className="text-right px-4 w-20 tabular-nums">Usuarios</TableHead>
                      <TableHead className="text-right px-4 w-20 tabular-nums">Clientes</TableHead>
                      <TableHead className="text-right px-4 w-20 tabular-nums">Pedidos</TableHead>
                      <TableHead className="px-4">Estado</TableHead>
                      <TableHead className="text-right px-4 w-24"></TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {superAdminStats.ultimasEmpresas.map((t) => (
                      <TableRow key={t.id} className={!t.isActive ? "opacity-60 bg-muted/30" : ""}>
                        <TableCell className="font-medium px-4">{t.name}</TableCell>
                        <TableCell className="text-right px-4 tabular-nums">{t._count.users}</TableCell>
                        <TableCell className="text-right px-4 tabular-nums">{t._count.clientes}</TableCell>
                        <TableCell className="text-right px-4 tabular-nums">{t._count.pedidos}</TableCell>
                        <TableCell className="px-4">
                          <Badge variant="outline" className={t.isActive ? "border-green-300 bg-green-50 text-green-700" : "border-red-300 bg-red-50 text-red-700"}>
                            {t.isActive ? <CheckCircle className="size-3 mr-1" /> : <Ban className="size-3 mr-1" />}
                            {t.isActive ? "Activa" : "Bloqueada"}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-right px-4">
                          <Button variant="outline" size="sm" asChild>
                            <Link href="/empresas">Gestionar</Link>
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
              <p className="mt-3">
                <Link href="/empresas" className="text-primary hover:underline text-sm font-medium inline-flex items-center gap-1">
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
