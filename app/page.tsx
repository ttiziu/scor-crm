"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Users } from "lucide-react";
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

export default function HomePage() {
  const router = useRouter();
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState<DashboardStats | null>(null);

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
      <div className="min-h-screen p-6 flex items-center justify-center">
        <p className="text-muted-foreground">Selecciona una empresa en el menú lateral para ver sus datos.</p>
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
