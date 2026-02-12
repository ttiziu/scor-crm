import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth/get-session";
import { CONTEXT_COOKIE } from "@/lib/auth/get-effective-tenant";

export async function GET(request: Request) {
  const session = await getSession(request);
  if (!session) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }
  const contextTenantId =
    session.role === "SUPER_ADMIN" ? request.cookies.get(CONTEXT_COOKIE)?.value ?? null : null;
  return NextResponse.json({
    user: {
      id: session.userId,
      username: session.username,
      role: session.role,
    },
    tenantId: session.tenantId,
    contextTenantId: contextTenantId || undefined,
  });
}
