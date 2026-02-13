"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Spinner } from "@/components/ui/spinner";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { AlertCircleIcon, Building2, Plus, Ban, CheckCircle, Trash2, Search, Pencil, UserCog, KeyRound } from "lucide-react";
import { toast } from "sonner";

type TenantRow = {
  id: string;
  name: string;
  slug: string;
  isActive: boolean;
  createdAt: string;
  _count: { users: number; clientes: number; pedidos: number };
};

export default function EmpresasPage() {
  const router = useRouter();
  const [tenants, setTenants] = useState<TenantRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [authOk, setAuthOk] = useState(false);
  const [formOpen, setFormOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [form, setForm] = useState({
    name: "",
    slug: "",
    firstAdminUsername: "",
    firstAdminPassword: "",
    firstAdminName: "",
  });
  type AlertType = "block" | "habilitar" | "delete" | null;
  const [alertOpen, setAlertOpen] = useState(false);
  const [alertType, setAlertType] = useState<AlertType>(null);
  const [alertTenant, setAlertTenant] = useState<TenantRow | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [editingTenant, setEditingTenant] = useState<TenantRow | null>(null);
  const [editForm, setEditForm] = useState({ name: "", slug: "" });
  const [usersSheetTenant, setUsersSheetTenant] = useState<TenantRow | null>(null);
  const [usersData, setUsersData] = useState<{ tenant: { name: string }; users: Array<{ id: string; username: string | null; name: string; role: string }> } | null>(null);
  const [usersLoading, setUsersLoading] = useState(false);
  const [resetUser, setResetUser] = useState<{ id: string; username: string | null; name: string } | null>(null);
  const [resetPassword, setResetPassword] = useState("");
  const [resetSaving, setResetSaving] = useState(false);
  const [newUserOpen, setNewUserOpen] = useState(false);
  const [newUserForm, setNewUserForm] = useState({ username: "", name: "", password: "", role: "OPERADOR" as string });
  const [newUserSaving, setNewUserSaving] = useState(false);
  const [roleChangingId, setRoleChangingId] = useState<string | null>(null);

  const filteredTenants = tenants.filter(
    (t) =>
      !searchQuery.trim() ||
      t.name.toLowerCase().includes(searchQuery.toLowerCase().trim()) ||
      t.slug.toLowerCase().includes(searchQuery.toLowerCase().trim())
  );

  function loadTenants() {
    fetch("/api/tenants", { credentials: "include" })
      .then((res) => {
        if (res.status === 403) {
          router.replace("/");
          return [];
        }
        if (res.status === 401) {
          router.replace("/login");
          return [];
        }
        return res.json();
      })
      .then((data) => (Array.isArray(data) ? setTenants(data) : setTenants([])))
      .catch(() => setTenants([]));
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
        if (data?.user) {
          setAuthOk(true);
          if (data.user.role === "SUPER_ADMIN") loadTenants();
          else router.replace("/");
        }
      })
      .catch(() => router.replace("/login"))
      .finally(() => setLoading(false));
  }, [router]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    if (!form.name.trim()) {
      toast.error("Nombre de empresa es requerido");
      return;
    }
    if (!form.slug.trim()) {
      toast.error("Slug es requerido (ej: mi-empresa)");
      return;
    }
    if (!form.firstAdminUsername.trim() || !form.firstAdminPassword.trim() || !form.firstAdminName.trim()) {
      toast.error("Completa los datos del primer admin (nombre, usuario, contraseña)");
      return;
    }
    if (form.firstAdminPassword.length < 6) {
      toast.error("La contraseña del admin debe tener al menos 6 caracteres");
      return;
    }
    const slug = form.slug.trim().toLowerCase().replace(/\s+/g, "-");
    setSaving(true);
    try {
      const body = {
        name: form.name.trim(),
        slug,
        firstAdmin: {
          username: form.firstAdminUsername.trim(),
          password: form.firstAdminPassword,
          name: form.firstAdminName.trim(),
        },
      };
      const res = await fetch("/api/tenants", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify(body),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(data.error ?? "Error al crear empresa");
        toast.error(data.error ?? "Error al crear empresa");
        return;
      }
      setForm({
        name: "",
        slug: "",
        firstAdminUsername: "",
        firstAdminPassword: "",
        firstAdminName: "",
      });
      setFormOpen(false);
      loadTenants();
      toast.success("Empresa creada");
    } catch {
      setError("Error de conexión");
      toast.error("Error de conexión");
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
      <div className="flex flex-wrap items-center justify-between gap-4 mb-6">
        <h1 className="text-xl font-semibold flex items-center gap-2">
          <Building2 className="size-5" />
          Empresas
        </h1>
        <div className="flex flex-wrap items-center gap-3">
          <div className="relative">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
            <Input
              placeholder="Buscar empresa..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-8 w-64"
            />
          </div>
          <Button onClick={() => setFormOpen((v) => !v)}>
            <Plus className="size-4 mr-2" />
            Nueva empresa
          </Button>
        </div>
      </div>

      {formOpen && (
        <form
          onSubmit={handleSubmit}
          className="mb-6 rounded-xl border bg-card p-6 shadow-sm space-y-6 w-full max-w-4xl"
        >
          <h2 className="text-lg font-semibold">Crear empresa</h2>
          <div className="grid gap-6 sm:grid-cols-2">
            <div className="space-y-4">
              <div className="space-y-2">
                <label htmlFor="empresa-name" className="block text-sm font-medium">
                  Nombre de la empresa
                </label>
                <Input
                  id="empresa-name"
                  value={form.name}
                  onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                  placeholder="Ej: Gas Norte SAC"
                  className="w-full"
                />
              </div>
              <div className="space-y-2">
                <label htmlFor="empresa-slug" className="block text-sm font-medium">
                  Slug (para login)
                </label>
                <Input
                  id="empresa-slug"
                  value={form.slug}
                  onChange={(e) => setForm((f) => ({ ...f, slug: e.target.value }))}
                  placeholder="Ej: gas-norte"
                  className="w-full"
                />
                <p className="text-xs text-muted-foreground">Solo minúsculas, números y guiones</p>
              </div>
            </div>
            <div className="space-y-4 rounded-lg border bg-muted/20 p-4 sm:p-4">
              <p className="text-sm font-medium">Primer admin (obligatorio)</p>
              <div className="grid gap-3 sm:grid-cols-1">
                <div className="space-y-2">
                  <label htmlFor="first-admin-name" className="block text-xs font-medium text-muted-foreground">
                    Nombre completo
                  </label>
                  <Input
                    id="first-admin-name"
                    value={form.firstAdminName}
                    onChange={(e) => setForm((f) => ({ ...f, firstAdminName: e.target.value }))}
                    placeholder="Ej: Juan Pérez"
                  />
                </div>
                <div className="space-y-2">
                  <label htmlFor="first-admin-user" className="block text-xs font-medium text-muted-foreground">
                    Usuario
                  </label>
                  <Input
                    id="first-admin-user"
                    value={form.firstAdminUsername}
                    onChange={(e) => setForm((f) => ({ ...f, firstAdminUsername: e.target.value }))}
                    placeholder="Ej: admin"
                  />
                </div>
                <div className="space-y-2">
                  <label htmlFor="first-admin-pass" className="block text-xs font-medium text-muted-foreground">
                    Contraseña (mín. 6 caracteres)
                  </label>
                  <Input
                    id="first-admin-pass"
                    type="password"
                    value={form.firstAdminPassword}
                    onChange={(e) => setForm((f) => ({ ...f, firstAdminPassword: e.target.value }))}
                    placeholder="••••••••"
                  />
                </div>
              </div>
            </div>
          </div>
          {error && (
            <Alert variant="destructive">
              <AlertCircleIcon />
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}
          <div className="flex flex-wrap gap-3 pt-2">
            <Button type="submit" disabled={saving}>
              {saving && <Spinner data-icon="inline-start" />}
              Crear empresa
            </Button>
            <Button type="button" variant="outline" onClick={() => setFormOpen(false)}>
              Cancelar
            </Button>
          </div>
        </form>
      )}

      <div className="border rounded-lg overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="px-4">Nombre</TableHead>
              <TableHead className="px-4">Slug</TableHead>
              <TableHead className="px-4">Estado</TableHead>
              <TableHead className="text-right px-4 w-24 tabular-nums">Usuarios</TableHead>
              <TableHead className="text-right px-4 w-24 tabular-nums">Clientes</TableHead>
              <TableHead className="text-right px-4 w-24 tabular-nums">Pedidos</TableHead>
              <TableHead className="text-right px-4 w-[220px]">Acciones</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredTenants.length === 0 ? (
              <TableRow>
                <TableCell colSpan={7} className="text-center text-muted-foreground py-8">
                  {tenants.length === 0
                    ? "No hay empresas. Crea una con el botón \"Nueva empresa\"."
                    : "No se encontraron empresas con ese criterio de búsqueda."}
                </TableCell>
              </TableRow>
            ) : (
              filteredTenants.map((t) => (
                <TableRow key={t.id} className={!t.isActive ? "opacity-60 bg-muted/30" : ""}>
                  <TableCell className="font-medium px-4">{t.name}</TableCell>
                  <TableCell className="text-muted-foreground px-4">{t.slug}</TableCell>
                  <TableCell className="px-4">
                    {t.isActive ? (
                      <span className="inline-flex items-center gap-1 text-green-600 text-sm">
                        <CheckCircle className="size-4 shrink-0" />
                        Activa
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 text-red-600 text-sm">
                        <Ban className="size-4 shrink-0" />
                        Bloqueada
                      </span>
                    )}
                  </TableCell>
                  <TableCell className="text-right px-4 tabular-nums">{t._count.users}</TableCell>
                  <TableCell className="text-right px-4 tabular-nums">{t._count.clientes}</TableCell>
                  <TableCell className="text-right px-4 tabular-nums">{t._count.pedidos}</TableCell>
                  <TableCell className="text-right px-4">
                    <div className="flex gap-1 justify-end">
                      <Button
                        variant="outline"
                        size="sm"
                        className="h-8 w-8 p-0"
                        title="Ver usuarios y resetear contraseñas"
                        onClick={() => {
                          setUsersSheetTenant(t);
                          setUsersData(null);
                          setUsersLoading(true);
                          fetch(`/api/admin/tenants/${t.id}/users`, { credentials: "include" })
                            .then((r) => (r.ok ? r.json() : null))
                            .then((data) => setUsersData(data))
                            .catch(() => setUsersData(null))
                            .finally(() => setUsersLoading(false));
                        }}
                      >
                        <UserCog className="size-4" />
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        className="h-8 w-8 p-0"
                        title="Editar nombre"
                        onClick={() => {
                          setEditingTenant(t);
                          setEditForm({ name: t.name, slug: t.slug });
                        }}
                      >
                        <Pencil className="size-4" />
                      </Button>
                      <Button
                        variant={t.isActive ? "outline" : "default"}
                        size="sm"
                        onClick={() => {
                          setAlertTenant(t);
                          setAlertType(t.isActive ? "block" : "habilitar");
                          setAlertOpen(true);
                        }}
                      >
                        {t.isActive ? "Bloquear" : "Habilitar"}
                      </Button>
                      {t.slug !== "platform" && (
                        <Button
                          variant="outline"
                          size="sm"
                          className="text-red-600 hover:text-red-700 hover:bg-red-50"
                          onClick={() => {
                            setAlertTenant(t);
                            setAlertType("delete");
                            setAlertOpen(true);
                          }}
                        >
                          <Trash2 className="size-4" />
                        </Button>
                      )}
                    </div>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      <Sheet open={!!usersSheetTenant} onOpenChange={(open) => !open && (setUsersSheetTenant(null), setUsersData(null), setResetUser(null), setNewUserOpen(false))}>
        <SheetContent side="right" className="sm:max-w-md">
          <SheetHeader>
            <SheetTitle>Usuarios de {usersSheetTenant?.name ?? ""}</SheetTitle>
          </SheetHeader>
          {usersLoading ? (
            <p className="p-4 text-muted-foreground text-sm">Cargando…</p>
          ) : !usersData ? (
            <p className="p-4 text-muted-foreground text-sm">Error al cargar usuarios.</p>
          ) : (
            <div className="flex-1 overflow-auto px-4 space-y-3">
              <Button
                variant="outline"
                size="sm"
                className="w-full"
                onClick={() => {
                  setNewUserForm({ username: "", name: "", password: "", role: "OPERADOR" });
                  setNewUserOpen(true);
                }}
              >
                <Plus className="size-4 mr-2" />
                Nuevo usuario
              </Button>
              {usersData.users.length === 0 ? (
                <p className="text-muted-foreground text-sm">No hay usuarios.</p>
              ) : (
                usersData.users.map((u) => (
                  <div
                    key={u.id}
                    className="flex flex-wrap items-center gap-2 p-3 rounded-lg border bg-muted/30"
                  >
                    <div className="min-w-0 flex-1">
                      <p className="font-medium truncate">{u.username ?? "—"}</p>
                      <p className="text-sm text-muted-foreground truncate">{u.name}</p>
                    </div>
                    <select
                      value={u.role}
                      disabled={roleChangingId === u.id || u.role === "SUPER_ADMIN"}
                      className="text-sm border rounded px-2 py-1 bg-background min-w-[110px]"
                      onChange={async (e) => {
                        const role = e.target.value as "ADMIN" | "OPERADOR" | "REPARTIDOR";
                        setRoleChangingId(u.id);
                        try {
                          const res = await fetch(`/api/admin/users/${u.id}`, {
                            method: "PATCH",
                            headers: { "Content-Type": "application/json" },
                            credentials: "include",
                            body: JSON.stringify({ role }),
                          });
                          if (res.ok) {
                            setUsersData((prev) =>
                              prev
                                ? {
                                    ...prev,
                                    users: prev.users.map((x) =>
                                      x.id === u.id ? { ...x, role } : x
                                    ),
                                  }
                                : null
                            );
                            toast.success("Rol actualizado");
                          } else {
                            const d = await res.json().catch(() => ({}));
                            toast.error(d.error ?? "Error");
                          }
                        } catch {
                          toast.error("Error de conexión");
                        } finally {
                          setRoleChangingId(null);
                        }
                      }}
                    >
                      <option value="ADMIN">Admin</option>
                      <option value="OPERADOR">Operador</option>
                      <option value="REPARTIDOR">Repartidor</option>
                    </select>
                    <Button
                      variant="outline"
                      size="sm"
                      className="shrink-0"
                      onClick={() => {
                        setResetUser({ id: u.id, username: u.username, name: u.name });
                        setResetPassword("");
                      }}
                    >
                      <KeyRound className="size-4 mr-1" />
                      Resetear
                    </Button>
                  </div>
                ))
              )}
            </div>
          )}
        </SheetContent>
      </Sheet>

      <Dialog open={newUserOpen && !!usersSheetTenant} onOpenChange={(open) => !open && setNewUserOpen(false)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Nuevo usuario en {usersSheetTenant?.name ?? ""}</DialogTitle>
          </DialogHeader>
          <form
            onSubmit={async (e) => {
              e.preventDefault();
              if (!usersSheetTenant) return;
              const username = newUserForm.username.trim();
              const name = newUserForm.name.trim();
              const password = newUserForm.password;
              if (!username) {
                toast.error("El usuario es requerido");
                return;
              }
              if (!name) {
                toast.error("El nombre es requerido");
                return;
              }
              if (!password || password.length < 6) {
                toast.error("La contraseña debe tener al menos 6 caracteres");
                return;
              }
              setNewUserSaving(true);
              try {
                const res = await fetch(`/api/admin/tenants/${usersSheetTenant.id}/users`, {
                  method: "POST",
                  headers: { "Content-Type": "application/json" },
                  credentials: "include",
                  body: JSON.stringify({
                    username,
                    name,
                    email: "",
                    password,
                    role: newUserForm.role,
                  }),
                });
                const data = await res.json().catch(() => ({}));
                if (res.ok) {
                  toast.success("Usuario creado");
                  setNewUserOpen(false);
                  setNewUserForm({ username: "", name: "", password: "", role: "OPERADOR" });
                  if (usersSheetTenant) {
                    setUsersLoading(true);
                    fetch(`/api/admin/tenants/${usersSheetTenant.id}/users`, { credentials: "include" })
                      .then((r) => (r.ok ? r.json() : null))
                      .then((d) => setUsersData(d))
                      .catch(() => {})
                      .finally(() => setUsersLoading(false));
                  }
                } else {
                  toast.error(data.error ?? "Error al crear");
                }
              } catch {
                toast.error("Error de conexión");
              } finally {
                setNewUserSaving(false);
              }
            }}
            className="space-y-4"
          >
            <div className="space-y-2">
              <label htmlFor="new-user-username" className="block text-sm font-medium">
                Usuario (login)
              </label>
              <Input
                id="new-user-username"
                value={newUserForm.username}
                onChange={(e) => setNewUserForm((f) => ({ ...f, username: e.target.value }))}
                placeholder="Ej: operador1"
                className="w-full"
              />
            </div>
            <div className="space-y-2">
              <label htmlFor="new-user-name" className="block text-sm font-medium">
                Nombre
              </label>
              <Input
                id="new-user-name"
                value={newUserForm.name}
                onChange={(e) => setNewUserForm((f) => ({ ...f, name: e.target.value }))}
                placeholder="Ej: Juan Pérez"
                className="w-full"
              />
            </div>
            <div className="space-y-2">
              <label htmlFor="new-user-password" className="block text-sm font-medium">
                Contraseña
              </label>
              <Input
                id="new-user-password"
                type="password"
                value={newUserForm.password}
                onChange={(e) => setNewUserForm((f) => ({ ...f, password: e.target.value }))}
                placeholder="Mín. 6 caracteres"
                minLength={6}
                className="w-full"
              />
            </div>
            <div className="space-y-2">
              <label htmlFor="new-user-role" className="block text-sm font-medium">
                Rol
              </label>
              <select
                id="new-user-role"
                value={newUserForm.role}
                onChange={(e) => setNewUserForm((f) => ({ ...f, role: e.target.value }))}
                className="w-full border rounded-md px-3 py-2 bg-background text-sm"
              >
                <option value="ADMIN">Administrador</option>
                <option value="OPERADOR">Operador</option>
                <option value="REPARTIDOR">Repartidor</option>
              </select>
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setNewUserOpen(false)}>
                Cancelar
              </Button>
              <Button type="submit" disabled={newUserSaving}>
                {newUserSaving && <Spinner data-icon="inline-start" />}
                Crear
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <Dialog open={!!resetUser} onOpenChange={(open) => !open && (setResetUser(null), setResetPassword(""))}>
        <DialogContent className="sm:max-w-md">
          {resetUser && (
            <>
              <DialogHeader>
                <DialogTitle>Resetear contraseña</DialogTitle>
                <p className="text-sm text-muted-foreground">
                  Nueva contraseña para {resetUser.name} ({resetUser.username ?? "—"})
                </p>
              </DialogHeader>
              <form
            onSubmit={async (e) => {
              e.preventDefault();
              if (!resetUser || !resetPassword.trim() || resetPassword.length < 6) {
                toast.error("La contraseña debe tener al menos 6 caracteres");
                return;
              }
              setResetSaving(true);
              try {
                const res = await fetch(`/api/admin/users/${resetUser.id}/reset-password`, {
                  method: "POST",
                  headers: { "Content-Type": "application/json" },
                  credentials: "include",
                  body: JSON.stringify({ password: resetPassword }),
                });
                const data = await res.json().catch(() => ({}));
                if (res.ok) {
                  toast.success("Contraseña actualizada");
                  setResetUser(null);
                  setResetPassword("");
                } else {
                  toast.error(data.error ?? "Error al resetear");
                }
              } catch {
                toast.error("Error de conexión");
              } finally {
                setResetSaving(false);
              }
            }}
            className="space-y-4"
          >
            <div className="space-y-2">
              <label htmlFor="reset-password" className="block text-sm font-medium">
                Nueva contraseña
              </label>
              <Input
                id="reset-password"
                type="password"
                value={resetPassword}
                onChange={(e) => setResetPassword(e.target.value)}
                placeholder="Mín. 6 caracteres"
                minLength={6}
                className="w-full"
              />
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setResetUser(null)}>
                Cancelar
              </Button>
              <Button type="submit" disabled={resetSaving || resetPassword.length < 6}>
                {resetSaving && <Spinner data-icon="inline-start" />}
                Guardar
              </Button>
            </DialogFooter>
              </form>
            </>
          )}
        </DialogContent>
      </Dialog>

      <Dialog open={!!editingTenant} onOpenChange={(open) => !open && setEditingTenant(null)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Editar empresa</DialogTitle>
          </DialogHeader>
          {editingTenant && (
            <form
              onSubmit={async (e) => {
                e.preventDefault();
                const name = editForm.name.trim();
                const slug = editForm.slug.trim().toLowerCase().replace(/\s+/g, "-");
                if (!name) {
                  toast.error("El nombre es requerido");
                  return;
                }
                if (!slug) {
                  toast.error("El slug es requerido");
                  return;
                }
                setSaving(true);
                try {
                  const res = await fetch(`/api/tenants/${editingTenant.id}`, {
                    method: "PATCH",
                    headers: { "Content-Type": "application/json" },
                    credentials: "include",
                    body: JSON.stringify({ name, slug }),
                  });
                  const data = await res.json().catch(() => ({}));
                  if (res.ok) {
                    loadTenants();
                    setEditingTenant(null);
                    toast.success("Empresa actualizada");
                  } else {
                    toast.error(data.error ?? "Error al actualizar");
                  }
                } catch {
                  toast.error("Error de conexión");
                } finally {
                  setSaving(false);
                }
              }}
              className="space-y-4"
            >
              <div className="space-y-2">
                <label htmlFor="edit-tenant-name" className="block text-sm font-medium">
                  Nombre
                </label>
                <Input
                  id="edit-tenant-name"
                  value={editForm.name}
                  onChange={(e) => setEditForm((f) => ({ ...f, name: e.target.value }))}
                  placeholder="Ej: Mi Empresa SAC"
                  className="w-full"
                />
              </div>
              <div className="space-y-2">
                <label htmlFor="edit-tenant-slug" className="block text-sm font-medium">
                  Slug (para login)
                </label>
                <Input
                  id="edit-tenant-slug"
                  value={editForm.slug}
                  onChange={(e) => setEditForm((f) => ({ ...f, slug: e.target.value }))}
                  placeholder="Ej: mi-empresa"
                  className="w-full"
                  disabled={editingTenant.slug === "platform"}
                />
                {editingTenant.slug === "platform" && (
                  <p className="text-xs text-muted-foreground">El slug de la plataforma no se puede cambiar.</p>
                )}
              </div>
              <DialogFooter>
                <Button type="button" variant="outline" onClick={() => setEditingTenant(null)}>
                  Cancelar
                </Button>
                <Button type="submit" disabled={saving}>
                  {saving && <Spinner data-icon="inline-start" />}
                  Guardar
                </Button>
              </DialogFooter>
            </form>
          )}
        </DialogContent>
      </Dialog>

      <AlertDialog open={alertOpen} onOpenChange={setAlertOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {alertType === "block" && alertTenant && `¿Bloquear "${alertTenant.name}"?`}
              {alertType === "habilitar" && alertTenant && `¿Habilitar "${alertTenant.name}"?`}
              {alertType === "delete" && alertTenant && `¿Eliminar "${alertTenant.name}"?`}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {alertType === "block" && "Nadie podrá acceder a esta empresa hasta que la habilites nuevamente."}
              {alertType === "habilitar" && "Los usuarios de esta empresa podrán volver a acceder al sistema."}
              {alertType === "delete" &&
                "Se borrarán permanentemente todos los datos: usuarios, clientes, pedidos, productos. Esta acción no se puede deshacer."}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              variant={alertType === "delete" ? "destructive" : "default"}
              onClick={async (e) => {
                if (!alertTenant) return;
                if (alertType === "block" || alertType === "habilitar") {
                  const res = await fetch(`/api/tenants/${alertTenant.id}`, {
                    method: "PATCH",
                    headers: { "Content-Type": "application/json" },
                    credentials: "include",
                    body: JSON.stringify({ isActive: !alertTenant.isActive }),
                  });
                  if (res.ok) {
                    loadTenants();
                    toast.success(alertType === "block" ? "Empresa bloqueada" : "Empresa habilitada");
                  } else {
                    const d = await res.json().catch(() => ({}));
                    toast.error(d.error ?? "Error");
                  }
                }
                if (alertType === "delete") {
                  const res = await fetch(`/api/tenants/${alertTenant.id}`, {
                    method: "DELETE",
                    credentials: "include",
                  });
                  if (res.ok) {
                    loadTenants();
                    toast.success("Empresa eliminada");
                  } else {
                    const d = await res.json().catch(() => ({}));
                    toast.error(d.error ?? "Error");
                  }
                }
              }}
            >
              {alertType === "block" && "Bloquear"}
              {alertType === "habilitar" && "Habilitar"}
              {alertType === "delete" && "Eliminar"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
