import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth/get-session";

export async function GET(request: Request) {
  const session = await getSession(request);
  if (!session) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }
  return NextResponse.json({
    user: {
      id: session.userId,
      email: session.email,
      role: session.role,
    },
    tenantId: session.tenantId,
  });
}
