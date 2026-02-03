-- CreateTable ClienteDireccion
CREATE TABLE IF NOT EXISTS "ClienteDireccion" (
    "id" TEXT NOT NULL,
    "clienteId" TEXT NOT NULL,
    "nombre" TEXT NOT NULL,
    "direccion" TEXT NOT NULL,
    "distrito" TEXT,
    "tipoValvula" TEXT,
    CONSTRAINT "ClienteDireccion_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "ClienteDireccion_clienteId_idx" ON "ClienteDireccion"("clienteId");

ALTER TABLE "ClienteDireccion" ADD CONSTRAINT "ClienteDireccion_clienteId_fkey" FOREIGN KEY ("clienteId") REFERENCES "Cliente"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Add clienteDireccionId to Pedido
ALTER TABLE "Pedido" ADD COLUMN IF NOT EXISTS "clienteDireccionId" TEXT;

CREATE INDEX IF NOT EXISTS "Pedido_clienteDireccionId_idx" ON "Pedido"("clienteDireccionId");

ALTER TABLE "Pedido" ADD CONSTRAINT "Pedido_clienteDireccionId_fkey" FOREIGN KEY ("clienteDireccionId") REFERENCES "ClienteDireccion"("id") ON DELETE SET NULL ON UPDATE CASCADE;
