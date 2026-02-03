-- Add REPARTIDOR to Role enum (PostgreSQL: add value to existing enum)
ALTER TYPE "Role" ADD VALUE IF NOT EXISTS 'REPARTIDOR';

-- Create FormaPago enum
DO $$ BEGIN
  CREATE TYPE "FormaPago" AS ENUM ('YAPE', 'PLIN', 'TRANSFERENCIA', 'EFECTIVO', 'TARJETA');
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

-- Add formaPago and efectivoCon to Pedido
ALTER TABLE "Pedido" ADD COLUMN IF NOT EXISTS "formaPago" "FormaPago";
ALTER TABLE "Pedido" ADD COLUMN IF NOT EXISTS "efectivoCon" DECIMAL(10,2);
