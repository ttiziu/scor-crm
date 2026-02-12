import type { Session } from "./get-session";

const CONTEXT_COOKIE = "scor_context_tenant_id";

/** Parsea el valor de una cookie desde el header Cookie (compatible con Request estándar). */
function getCookieFromHeader(cookieHeader: string | null, name: string): string | undefined {
  if (!cookieHeader) return undefined;
  const match = cookieHeader.match(new RegExp(`(?:^|;\\s*)${name}=([^;]*)`));
  return match ? decodeURIComponent(match[1].trim()) : undefined;
}

/** Devuelve solo el valor de la cookie de contexto (para SUPER_ADMIN). Usar en /api/auth/me. */
export function getContextTenantIdFromRequest(request: Request): string | null {
  const value = getCookieFromHeader(request.headers.get("cookie"), CONTEXT_COOKIE);
  return value?.trim() ?? null;
}

/**
 * Para SUPER_ADMIN: si tiene un tenant en contexto (cookie), usa ese.
 * Para otros roles: usa session.tenantId.
 */
export function getEffectiveTenantId(request: Request, session: Session | null): string | null {
  if (!session) return null;
  if (session.role === "SUPER_ADMIN") {
    const contextId = getCookieFromHeader(request.headers.get("cookie"), CONTEXT_COOKIE);
    if (contextId?.trim()) return contextId;
  }
  return session.tenantId;
}

export { CONTEXT_COOKIE };
