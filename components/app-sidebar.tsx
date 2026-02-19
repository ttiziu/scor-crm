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
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Badge } from "@/components/ui/badge";
import { LayoutDashboard, ClipboardList, Truck, Users, Package, Tag, UserCog, LogOut, ChevronsUpDown, Building2, Check, CheckCircle, Ban } from "lucide-react";
import { cn } from "@/lib/utils";

type User = { username: string; role: string } | null;
type Tenant = { id: string; name: string; slug: string; isActive?: boolean };

export function AppSidebar() {
  const pathname = usePathname();
  const router = useRouter();
  const [user, setUser] = useState<User>(null);
  const [contextTenantId, setContextTenantId] = useState<string | null>(null);
  const [tenants, setTenants] = useState<Tenant[]>([]);
  const [tenantSelectorOpen, setTenantSelectorOpen] = useState(false);

  useEffect(() => {
    fetch("/api/auth/me", { credentials: "include" })
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (data?.user) {
          setUser({ username: data.user.username, role: data.user.role });
          setContextTenantId(data.contextTenantId ?? null);
        }
      })
      .catch(() => setUser(null));
  }, []);

  useEffect(() => {
    if (user?.role === "SUPER_ADMIN") {
      fetch("/api/tenants", { credentials: "include" })
        .then((res) => (res.ok ? res.json() : []))
        .then((list) => Array.isArray(list) && list.length > 0 ? setTenants(list) : setTenants([]))
        .catch(() => setTenants([]));
    }
  }, [user?.role]);

  async function handleLogout() {
    await fetch("/api/auth/logout", { method: "POST", credentials: "include" });
    router.replace("/login");
    router.refresh();
  }

  async function setContextTenant(tenantId: string | null) {
    const res = await fetch("/api/auth/context-tenant", {
      method: "POST",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ tenantId }),
    });
    if (!res.ok) return;
    setContextTenantId(tenantId);
    setTenantSelectorOpen(false);
    window.dispatchEvent(new CustomEvent("scor-context-tenant-changed", { detail: { tenantId } }));
    router.refresh();
  }

  const allNavItems = [
    { href: "/", label: "Inicio", icon: LayoutDashboard, iconClass: "bg-blue-100 text-blue-600" },
    { href: "/empresas", label: "Empresas", icon: Building2, superAdminOnly: true, iconClass: "bg-rose-100 text-rose-600" },
    { href: "/pedidos", label: "Pedidos", icon: ClipboardList, iconClass: "bg-amber-100 text-amber-600" },
    { href: "/mis-pedidos", label: "Mis pedidos", icon: Truck, repartidorOnly: true, iconClass: "bg-slate-100 text-slate-600" },
    { href: "/clientes", label: "Clientes", icon: Users, iconClass: "bg-emerald-100 text-emerald-600" },
    { href: "/productos", label: "Productos", icon: Package, iconClass: "bg-violet-100 text-violet-600" },
    { href: "/marcas", label: "Marcas", icon: Tag, iconClass: "bg-orange-100 text-orange-600" },
    { href: "/usuarios", label: "Usuarios", icon: UserCog, adminOnly: true, iconClass: "bg-indigo-100 text-indigo-600" },
  ];

  const navItems = allNavItems.filter((item) => {
    if ("superAdminOnly" in item && item.superAdminOnly) return user?.role === "SUPER_ADMIN";
    if (item.adminOnly) return user?.role === "ADMIN";
    if (item.repartidorOnly) return user?.role === "REPARTIDOR";
    if (user?.role === "REPARTIDOR") return item.href === "/" || item.href === "/mis-pedidos";
    if (user?.role === "SUPER_ADMIN") return true; // super admin ve todo (incl. Empresas ya filtrado arriba)
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
                    src="/logo/scor-logo-secundary-v2.png"
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
        {user?.role === "SUPER_ADMIN" && (
          <SidebarGroup className="border-b border-sidebar-border pb-3">
            <SidebarGroupContent>
              <div className="px-2">
                <p className="mb-1.5 text-xs font-medium text-muted-foreground">Ver empresa</p>
                <Popover open={tenantSelectorOpen} onOpenChange={setTenantSelectorOpen}>
                  <PopoverTrigger asChild>
                    <button
                      type="button"
                      className="flex w-full items-center justify-between gap-2 rounded-md border border-input bg-background px-3 py-2 text-sm outline-none ring-ring transition-colors hover:bg-accent hover:text-accent-foreground focus-visible:ring-2"
                    >
                      <span className="flex min-w-0 items-center gap-2 truncate">
                        {contextTenantId ? (
                          <>
                            {(() => {
                              const t = tenants.find((t) => t.id === contextTenantId);
                              const active = t?.isActive !== false;
                              return (
                                <>
                                  <span className="truncate">{t?.name ?? "Empresa"}</span>
                                  <Badge variant="outline" className={cn("shrink-0 text-[10px] px-1.5 py-0 gap-0.5", active ? "border-green-300 bg-green-50 text-green-700" : "border-red-300 bg-red-50 text-red-700")}>
                                    {active ? <CheckCircle className="size-3" /> : <Ban className="size-3" />}
                                    {active ? "Activa" : "Bloqueada"}
                                  </Badge>
                                </>
                              );
                            })()}
                          </>
                        ) : (
                          "Selecciona una empresa"
                        )}
                      </span>
                      <ChevronsUpDown className="size-4 shrink-0 text-muted-foreground" />
                    </button>
                  </PopoverTrigger>
                  <PopoverContent className="w-(--radix-popover-trigger-width) p-0" align="start">
                    <Command>
                      <CommandInput placeholder="Buscar empresa..." />
                      <CommandList>
                        <CommandEmpty>No se encontró ninguna empresa.</CommandEmpty>
                        <CommandGroup>
                          <CommandItem
                            value="Sin empresa salir"
                            onSelect={() => setContextTenant(null)}
                          >
                            <span className="text-muted-foreground">Sin empresa (salir)</span>
                          </CommandItem>
                          {tenants.map((t) => {
                            const active = t.isActive !== false;
                            return (
                              <CommandItem
                                key={t.id}
                                value={`${t.name} ${t.slug} ${active ? "activa" : "bloqueada"}`}
                                onSelect={() => setContextTenant(t.id)}
                              >
                                <Check className={cn("mr-2 size-4 shrink-0", contextTenantId === t.id ? "opacity-100" : "opacity-0")} />
                                <span className="flex min-w-0 flex-1 items-center justify-between gap-2">
                                  <span className="truncate">{t.name}</span>
                                  <Badge variant="outline" className={cn("shrink-0 text-[10px] px-1.5 py-0 gap-0.5", active ? "border-green-300 bg-green-50 text-green-700" : "border-red-300 bg-red-50 text-red-700")}>
                                    {active ? <CheckCircle className="size-3" /> : <Ban className="size-3" />}
                                    {active ? "Activa" : "Bloqueada"}
                                  </Badge>
                                </span>
                              </CommandItem>
                            );
                          })}
                        </CommandGroup>
                      </CommandList>
                    </Command>
                  </PopoverContent>
                </Popover>
              </div>
            </SidebarGroupContent>
          </SidebarGroup>
        )}
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
