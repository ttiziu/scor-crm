"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { usePathname, useRouter } from "next/navigation";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from "@/components/ui/sidebar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { LayoutDashboard, ClipboardList, Truck, Users, Package, UserCog, LogOut, ChevronsUpDown } from "lucide-react";

type User = { username: string; role: string } | null;

export function AppSidebar() {
  const pathname = usePathname();
  const router = useRouter();
  const [user, setUser] = useState<User>(null);

  useEffect(() => {
    fetch("/api/auth/me", { credentials: "include" })
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => data?.user && setUser({ username: data.user.username, role: data.user.role }))
      .catch(() => setUser(null));
  }, []);

  async function handleLogout() {
    await fetch("/api/auth/logout", { method: "POST", credentials: "include" });
    router.replace("/login");
    router.refresh();
  }

  const allNavItems = [
    { href: "/", label: "Inicio", icon: LayoutDashboard, iconClass: "bg-blue-100 text-blue-600" },
    { href: "/pedidos", label: "Pedidos", icon: ClipboardList, iconClass: "bg-amber-100 text-amber-600" },
    { href: "/mis-pedidos", label: "Mis pedidos", icon: Truck, repartidorOnly: true, iconClass: "bg-slate-100 text-slate-600" },
    { href: "/clientes", label: "Clientes", icon: Users, iconClass: "bg-emerald-100 text-emerald-600" },
    { href: "/productos", label: "Productos", icon: Package, iconClass: "bg-violet-100 text-violet-600" },
    { href: "/usuarios", label: "Usuarios", icon: UserCog, adminOnly: true, iconClass: "bg-indigo-100 text-indigo-600" },
  ];

  const navItems = allNavItems.filter((item) => {
    if (item.adminOnly) return user?.role === "ADMIN";
    if (item.repartidorOnly) return user?.role === "REPARTIDOR";
    if (user?.role === "REPARTIDOR") return item.href === "/" || item.href === "/mis-pedidos";
    return true;
  });

  return (
    <Sidebar>
      <SidebarHeader className="flex h-16 shrink-0 flex-row items-center border-b border-sidebar-border px-3">
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton size="lg" asChild className="h-auto min-h-12 py-2 hover:bg-transparent active:bg-transparent data-[active=true]:bg-transparent">
              <Link href="/" className="flex w-full items-center rounded-md">
                <span className="relative flex h-14 w-full max-w-[240px] items-center justify-start">
                  <Image
                    src="/logo/scor-logo-secundary-v2.svg"
                    alt="SCOR CRM"
                    width={240}
                    height={56}
                    className="h-14 w-auto max-w-full object-contain object-left"
                    unoptimized
                    onError={(e) => {
                      e.currentTarget.style.display = "none";
                      const fallback = e.currentTarget.nextElementSibling;
                      if (fallback) (fallback as HTMLElement).style.display = "inline";
                    }}
                  />
                  <span className="font-semibold" style={{ display: "none" }}>
                    SCOR CRM
                  </span>
                </span>
              </Link>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarHeader>
      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupContent>
            <SidebarMenu className="gap-3">
              {navItems.map((item) => {
                const Icon = item.icon;
                const isActive = pathname === item.href || (item.href !== "/" && pathname.startsWith(item.href));
                const iconClass = item.iconClass ?? "bg-muted text-muted-foreground";
                return (
                  <SidebarMenuItem key={item.href}>
                    <SidebarMenuButton asChild isActive={isActive} tooltip={item.label} className="min-h-10 py-2.5 text-sm font-medium">
                      <Link href={item.href} className="flex items-center gap-2">
                        <span className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-md ${iconClass}`}>
                          <Icon className="size-4" />
                        </span>
                        <span className="truncate text-sm font-medium">{item.label}</span>
                      </Link>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                );
              })}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>
      <SidebarFooter className="border-t border-sidebar-border p-2">
        {user && (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button
                type="button"
                className="flex w-full items-center gap-2 rounded-md px-2 py-2 text-left text-sm outline-none ring-sidebar-ring transition-colors hover:bg-sidebar-accent hover:text-sidebar-accent-foreground focus-visible:ring-2"
              >
                <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-sidebar-accent text-sm font-medium text-sidebar-accent-foreground">
                  {(user.username || "U").charAt(0).toUpperCase()}
                </div>
                <span className="min-w-0 flex-1 truncate font-medium" title={user.username}>
                  {user.username}
                </span>
                <ChevronsUpDown className="size-4 shrink-0 text-muted-foreground" />
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent side="top" align="start" className="w-56">
              <DropdownMenuItem onClick={handleLogout}>
                <LogOut className="size-4 shrink-0" />
                Cerrar sesión
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        )}
      </SidebarFooter>
    </Sidebar>
  );
}
