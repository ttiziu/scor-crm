import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth/get-session";
import { prisma } from "@/lib/db";
import { CONTEXT_COOKIE } from "@/lib/auth/get-effective-tenant";

const COOKIE_MAX_AGE = 60 * 60 * 24; // 24 horas

/** Establecer o limpiar el tenant en contexto (solo SUPER_ADMIN). */
export async function POST(request: Request) {
  const session = await getSession(request);
  if (!session) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }
  if (session.role !== "SUPER_ADMIN") {
    return NextResponse.json({ error: "Sin permiso" }, { status: 403 });
  }

  const body = await request.json().catch(() => ({}));
  const tenantId = body.tenantId;

  const response = NextResponse.json({ ok: true });

  if (!tenantId) {
    // Limpiar contexto
    response.headers.set(
      "Set-Cookie",
      `${CONTEXT_COOKIE}=; Path=/; Max-Age=0`
    );
    return response;
  }

  // Verificar que el tenant existe y no es platform
  const tenant = await prisma.tenant.findUnique({
    where: { id: tenantId },
    select: { id: true, slug: true },
  });
  if (!tenant || tenant.slug === "platform") {
    return NextResponse.json({ error: "Tenant no válido" }, { status: 400 });
  }

  response.headers.set(
    "Set-Cookie",
    `${CONTEXT_COOKIE}=${tenantId}; Path=/; Max-Age=${COOKIE_MAX_AGE}; SameSite=Lax`
  );
  return response;
}
