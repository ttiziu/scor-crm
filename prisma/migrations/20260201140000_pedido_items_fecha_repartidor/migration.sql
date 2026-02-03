-- AlterTable Pedido: add fechaProgramada, repartidorId, motivoCancelacion
ALTER TABLE "Pedido" ADD COLUMN IF NOT EXISTS "fechaProgramada" TIMESTAMP(3);
ALTER TABLE "Pedido" ADD COLUMN IF NOT EXISTS "repartidorId" TEXT;
ALTER TABLE "Pedido" ADD COLUMN IF NOT EXISTS "motivoCancelacion" TEXT;

-- CreateTable PedidoItem
CREATE TABLE IF NOT EXISTS "PedidoItem" (
    "id" TEXT NOT NULL,
    "pedidoId" TEXT NOT NULL,
    "productoId" TEXT NOT NULL,
    "cantidad" INTEGER NOT NULL,
    "precioUnitario" DECIMAL(10,2) NOT NULL,
    CONSTRAINT "PedidoItem_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "PedidoItem_pedidoId_idx" ON "PedidoItem"("pedidoId");
CREATE INDEX IF NOT EXISTS "PedidoItem_productoId_idx" ON "PedidoItem"("productoId");

ALTER TABLE "PedidoItem" ADD CONSTRAINT "PedidoItem_pedidoId_fkey" FOREIGN KEY ("pedidoId") REFERENCES "Pedido"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "PedidoItem" ADD CONSTRAINT "PedidoItem_productoId_fkey" FOREIGN KEY ("productoId") REFERENCES "Producto"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- FK Pedido.repartidorId -> User.id (ON DELETE SET NULL)
ALTER TABLE "Pedido" ADD CONSTRAINT "Pedido_repartidorId_fkey" FOREIGN KEY ("repartidorId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
CREATE INDEX IF NOT EXISTS "Pedido_repartidorId_idx" ON "Pedido"("repartidorId");
