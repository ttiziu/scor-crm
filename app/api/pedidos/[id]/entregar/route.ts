import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getSession } from "@/lib/auth/get-session";
import { uploadEvidencia } from "@/lib/s3";

type RouteParams = { params: Promise<{ id: string }> };

const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10 MB
const ALLOWED_TYPES = ["image/jpeg", "image/png", "image/webp", "image/heic"];

export async function POST(request: Request, { params }: RouteParams) {
  const session = await getSession(request);
  if (!session) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }
  if (session.role !== "REPARTIDOR") {
    return NextResponse.json(
      { error: "Solo repartidores pueden registrar entrega con evidencia" },
      { status: 403 }
    );
  }

  const { id: pedidoId } = await params;

  const pedido = await prisma.pedido.findFirst({
    where: {
      id: pedidoId,
      tenantId: session.tenantId,
      repartidorId: session.userId,
    },
  });
  if (!pedido) {
    return NextResponse.json({ error: "Pedido no encontrado" }, { status: 404 });
  }
  if (pedido.estado === "DELIVERED") {
    return NextResponse.json(
      { error: "El pedido ya está marcado como entregado" },
      { status: 400 }
    );
  }

  let formData: FormData;
  try {
    formData = await request.formData();
  } catch {
    return NextResponse.json(
      { error: "Formato de solicitud inválido" },
      { status: 400 }
    );
  }

  const file = formData.get("evidencia");
  if (!file || !(file instanceof File)) {
    return NextResponse.json(
      { error: "Debe enviar al menos una foto de evidencia" },
      { status: 400 }
    );
  }
  if (file.size > MAX_FILE_SIZE) {
    return NextResponse.json(
      { error: "La imagen no debe superar 10 MB" },
      { status: 400 }
    );
  }
  if (!ALLOWED_TYPES.includes(file.type) && !file.name.match(/\.(jpe?g|png|webp|heic)$/i)) {
    return NextResponse.json(
      { error: "Formato no permitido. Use JPG, PNG, WebP o HEIC" },
      { status: 400 }
    );
  }

  const comentarioRaw = (formData.get("comentario") as string | null)?.trim() || null;
  const comentario = comentarioRaw
    ? comentarioRaw.slice(0, 2000).replace(/\r\n/g, "\n").replace(/[\x00-\x08\x0B\x0C\x0E-\x1F]/g, "")
    : null;

  let fotoUrl: string;
  try {
    fotoUrl = await uploadEvidencia(pedidoId, file);
  } catch (err) {
    console.error("S3 upload error:", err);
    return NextResponse.json(
      { error: "No se pudo subir la imagen. Revise la configuración de AWS S3." },
      { status: 500 }
    );
  }

  await prisma.$transaction([
    prisma.pedidoEvidencia.create({
      data: {
        pedidoId,
        repartidorId: session.userId,
        fotoUrl,
        comentario,
      },
    }),
    prisma.pedido.update({
      where: { id: pedidoId },
      data: { estado: "DELIVERED" },
    }),
  ]);

  return NextResponse.json({ ok: true, estado: "DELIVERED" });
}
