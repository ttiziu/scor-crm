"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";

type User = { id: string; username: string; role: string };

export default function HomePage() {
  const router = useRouter();
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

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
        <nav className="flex gap-4">
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
