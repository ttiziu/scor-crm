"use client";

import { useState, useEffect } from "react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Spinner } from "@/components/ui/spinner";
import { AlertCircleIcon, ChevronsUpDown, Eye, EyeOff } from "lucide-react";

type TenantOption = { id: string; name: string; slug: string };

export default function LoginPage() {
  const router = useRouter();
  const [tenants, setTenants] = useState<TenantOption[]>([]);
  const [tenantSlug, setTenantSlug] = useState("");
  const [empresaOpen, setEmpresaOpen] = useState(false);
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (tenantSlug?.trim()) setError("");
  }, [tenantSlug]);

  useEffect(() => {
    fetch("/api/auth/tenants")
      .then((r) => r.json())
      .then((data) => {
        if (Array.isArray(data)) {
          setTenants(data);
          if (data.length > 0) {
            const demo = data.find((t: TenantOption) => t.slug === "demo");
            setTenantSlug((prev) => prev || (demo ? demo.slug : data[0].slug));
          }
        }
      })
      .catch(() => setTenants([]));
  }, []);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    if (!username.trim()) {
      toast.error("Completa el campo Usuario");
      return;
    }
    if (!password) {
      toast.error("Completa el campo Contraseña");
      return;
    }
    if (!tenantSlug?.trim() && tenants.length > 0) {
      setError("Debes seleccionar una empresa");
      toast.error("Debes seleccionar una empresa");
      return;
    }
    setLoading(true);
    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          username,
          password,
          tenantSlug: tenantSlug || "demo",
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        const msg = data.error ?? "Error al iniciar sesión";
        setError(msg);
        toast.error(msg);
        return;
      }
      router.push("/");
      router.refresh();
    } catch {
      setError("Error de conexión");
      toast.error("Error de conexión");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-4">
      <div className="w-full max-w-sm">
        <div className="flex justify-center mb-8">
          <Image
            src="/logo/scor-logo-secundary-v2.png"
            alt="SCOR CRM"
            width={280}
            height={200}
            className="h-24 w-auto object-contain"
            unoptimized
          />
        </div>
        <form onSubmit={handleSubmit} className="space-y-4">
          {tenants.length >= 1 && (
            <div>
              <label className="block text-sm font-medium mb-1">
                Empresa <span className="text-red-500">*</span>
              </label>
              <Popover open={empresaOpen} onOpenChange={setEmpresaOpen}>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    role="combobox"
                    aria-expanded={empresaOpen}
                    className="w-full justify-between font-normal"
                  >
                    {tenants.find((t) => t.slug === tenantSlug)?.name ?? "Selecciona tu empresa"}
                    <ChevronsUpDown className="ml-2 size-4 shrink-0 opacity-50" />
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-(--radix-popover-trigger-width) p-0" align="start">
                  <Command>
                    <CommandInput placeholder="Buscar empresa..." />
                    <CommandList>
                      <CommandEmpty>No se encontró ninguna empresa.</CommandEmpty>
                      <CommandGroup>
                        {tenants.map((t) => (
                          <CommandItem
                            key={t.id}
                            value={`${t.name} ${t.slug}`}
                            onSelect={() => {
                              setTenantSlug(t.slug);
                              setEmpresaOpen(false);
                            }}
                          >
                            {t.name}
                          </CommandItem>
                        ))}
                      </CommandGroup>
                    </CommandList>
                  </Command>
                </PopoverContent>
              </Popover>
            </div>
          )}
          <div>
            <label htmlFor="username" className="block text-sm font-medium mb-1">
              Usuario
            </label>
            <input
              id="username"
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              autoComplete="username"
              placeholder="Nombre de usuario"
              className="w-full border rounded px-3 py-2 text-foreground bg-background"
            />
          </div>
          <div>
            <label htmlFor="password" className="block text-sm font-medium mb-1">
              Contraseña
            </label>
            <div className="relative">
              <input
                id="password"
                type={showPassword ? "text" : "password"}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                autoComplete="current-password"
                placeholder="Contraseña"
                className="w-full border rounded px-3 py-2 pr-10 text-foreground bg-background"
              />
              <button
                type="button"
                onClick={() => setShowPassword((v) => !v)}
                className="absolute right-2 top-1/2 -translate-y-1/2 p-1 rounded text-muted-foreground hover:text-foreground hover:bg-muted"
                title={showPassword ? "Ocultar contraseña" : "Mostrar contraseña"}
                aria-label={showPassword ? "Ocultar contraseña" : "Mostrar contraseña"}
              >
                {showPassword ? <EyeOff className="size-5" /> : <Eye className="size-5" />}
              </button>
            </div>
          </div>
          {error && (
            <Alert variant="destructive">
              <AlertCircleIcon />
              <AlertTitle>Error</AlertTitle>
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}
          <Button
            type="submit"
            disabled={loading}
            className="w-full"
          >
            {loading && <Spinner data-icon="inline-start" />}
            {loading ? "Entrando…" : "Entrar"}
          </Button>
        </form>
      </div>
    </div>
  );
}
