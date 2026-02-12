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
import { AlertCircleIcon, Building2, Plus, Ban, CheckCircle, Trash2, Search } from "lucide-react";
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
              <TableHead>Nombre</TableHead>
              <TableHead>Slug</TableHead>
              <TableHead>Estado</TableHead>
              <TableHead className="text-right">Usuarios</TableHead>
              <TableHead className="text-right">Clientes</TableHead>
              <TableHead className="text-right">Pedidos</TableHead>
              <TableHead className="text-right w-[100px]">Acciones</TableHead>
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
                  <TableCell className="font-medium">{t.name}</TableCell>
                  <TableCell className="text-muted-foreground">{t.slug}</TableCell>
                  <TableCell>
                    {t.isActive ? (
                      <span className="inline-flex items-center gap-1 text-green-600 text-sm">
                        <CheckCircle className="size-4" />
                        Activa
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 text-red-600 text-sm">
                        <Ban className="size-4" />
                        Bloqueada
                      </span>
                    )}
                  </TableCell>
                  <TableCell className="text-right">{t._count.users}</TableCell>
                  <TableCell className="text-right">{t._count.clientes}</TableCell>
                  <TableCell className="text-right">{t._count.pedidos}</TableCell>
                  <TableCell className="text-right">
                    <div className="flex gap-1 justify-end">
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
