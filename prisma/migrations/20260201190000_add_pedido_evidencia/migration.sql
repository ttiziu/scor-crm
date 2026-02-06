-- CreateTable PedidoEvidencia
CREATE TABLE IF NOT EXISTS "PedidoEvidencia" (
    "id" TEXT NOT NULL,
    "pedidoId" TEXT NOT NULL,
    "repartidorId" TEXT NOT NULL,
    "fotoUrl" TEXT NOT NULL,
    "comentario" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "PedidoEvidencia_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "PedidoEvidencia_pedidoId_idx" ON "PedidoEvidencia"("pedidoId");
CREATE INDEX IF NOT EXISTS "PedidoEvidencia_repartidorId_idx" ON "PedidoEvidencia"("repartidorId");

ALTER TABLE "PedidoEvidencia" ADD CONSTRAINT "PedidoEvidencia_pedidoId_fkey" FOREIGN KEY ("pedidoId") REFERENCES "Pedido"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "PedidoEvidencia" ADD CONSTRAINT "PedidoEvidencia_repartidorId_fkey" FOREIGN KEY ("repartidorId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
