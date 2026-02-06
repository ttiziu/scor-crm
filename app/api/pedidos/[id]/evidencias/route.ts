import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getSession } from "@/lib/auth/get-session";
import { getSignedUrlForEvidencia } from "@/lib/s3";

type RouteParams = { params: Promise<{ id: string }> };

export async function GET(request: Request, { params }: RouteParams) {
  const session = await getSession(request);
  if (!session) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }

  const { id: pedidoId } = await params;

  const where: { id: string; tenantId: string; repartidorId?: string } = {
    id: pedidoId,
    tenantId: session.tenantId,
  };
  if (session.role === "REPARTIDOR") where.repartidorId = session.userId;

  const pedido = await prisma.pedido.findFirst({
    where,
    select: { id: true },
  });
  if (!pedido) {
    return NextResponse.json({ error: "Pedido no encontrado" }, { status: 404 });
  }

  const evidencias = await prisma.pedidoEvidencia.findMany({
    where: { pedidoId },
    orderBy: { createdAt: "desc" },
    select: {
      id: true,
      fotoUrl: true,
      comentario: true,
      createdAt: true,
      repartidor: { select: { name: true } },
    },
  });

  const withSignedUrls = await Promise.all(
    evidencias.map(async (e) => {
      let signedUrl = e.fotoUrl;
      try {
        signedUrl = await getSignedUrlForEvidencia(e.fotoUrl);
      } catch {
        // si falla la firma, se devuelve la URL original (puede no cargar si el bucket es privado)
      }
      return {
        id: e.id,
        fotoUrl: signedUrl,
        comentario: e.comentario,
        createdAt: e.createdAt,
        repartidor: e.repartidor.name,
      };
    })
  );

  return NextResponse.json(withSignedUrls);
}
