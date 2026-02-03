import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth/get-session";

const OPCIONES_VALVULA = ["Normal", "Premium"];

export async function GET(request: Request) {
  const session = await getSession(request);
  if (!session) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }
  if (session.role === "REPARTIDOR") {
    return NextResponse.json({ error: "Sin permiso" }, { status: 403 });
  }
  return NextResponse.json(OPCIONES_VALVULA);
}
