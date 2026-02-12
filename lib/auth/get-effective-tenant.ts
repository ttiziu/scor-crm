import type { Session } from "./get-session";

const CONTEXT_COOKIE = "scor_context_tenant_id";

/**
 * Para SUPER_ADMIN: si tiene un tenant en contexto (cookie), usa ese.
 * Para otros roles: usa session.tenantId.
 */
export function getEffectiveTenantId(request: Request, session: Session | null): string | null {
  if (!session) return null;
  if (session.role === "SUPER_ADMIN") {
    const contextId = request.cookies.get(CONTEXT_COOKIE)?.value;
    if (contextId?.trim()) return contextId;
  }
  return session.tenantId;
}

export { CONTEXT_COOKIE };
