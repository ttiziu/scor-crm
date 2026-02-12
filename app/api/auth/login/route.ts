import { NextResponse } from "next/server";
import * as bcrypt from "bcryptjs";
import { prisma } from "@/lib/db";
import { createToken } from "@/lib/auth/jwt";
import { setSessionCookie } from "@/lib/auth/cookies";
import { loginSchema } from "@/lib/validations/auth";
import {
  getClientIp,
  isRateLimited,
  recordFailedAttempt,
  clearFailedAttempts,
} from "@/lib/rate-limit";

export async function POST(request: Request) {
  const ip = getClientIp(request);

  // Verificar rate limiting antes de procesar
  const rateCheck = isRateLimited(ip);
  if (rateCheck.blocked) {
    return NextResponse.json(
      {
        error: "Demasiados intentos fallidos. Intente nuevamente más tarde.",
        retryAfter: rateCheck.retryAfter,
      },
      { status: 429 }
    );
  }

  try {
    const body = await request.json();
    const parsed = loginSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Datos inválidos", details: parsed.error.flatten().fieldErrors },
        { status: 400 }
      );
    }
    const { username, password, tenantSlug = "demo" } = parsed.data;

    const tenant = await prisma.tenant.findUnique({ where: { slug: tenantSlug } });
    if (!tenant) {
      return NextResponse.json({ error: "Tenant no encontrado" }, { status: 404 });
    }
    if (!tenant.isActive) {
      return NextResponse.json({ error: "Empresa deshabilitada. Contacte al administrador." }, { status: 403 });
    }

    const user = await prisma.user.findUnique({
      where: { tenantId_username: { tenantId: tenant.id, username } },
    });
    if (!user) {
      recordFailedAttempt(ip);
      return NextResponse.json({ error: "Credenciales inválidas" }, { status: 401 });
    }

    const valid = await bcrypt.compare(password, user.passwordHash);
    if (!valid) {
      recordFailedAttempt(ip);
      return NextResponse.json({ error: "Credenciales inválidas" }, { status: 401 });
    }

    // Login exitoso: limpiar intentos fallidos
    clearFailedAttempts(ip);

    const token = await createToken({
      userId: user.id,
      tenantId: user.tenantId,
      username: user.username ?? username,
      role: user.role,
    });

    const response = NextResponse.json({
      user: { id: user.id, username: user.username ?? username, name: user.name, role: user.role },
    });
    response.headers.set("Set-Cookie", setSessionCookie(token));
    return response;
  } catch {
    return NextResponse.json({ error: "Error interno" }, { status: 500 });
  }
}
