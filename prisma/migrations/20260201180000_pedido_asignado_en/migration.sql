-- AlterTable Pedido: add asignadoEn (hora en que se asignó al repartidor)
ALTER TABLE "Pedido" ADD COLUMN IF NOT EXISTS "asignadoEn" TIMESTAMP(3);
