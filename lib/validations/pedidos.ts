import { z } from "zod";

const pedidoEstadoEnum = z.enum(["CREATED", "IN_ROUTE", "DELIVERED", "CANCELLED"]);

export const createPedidoSchema = z.object({
  clienteId: z.string().min(1, "El cliente es requerido"),
  estado: pedidoEstadoEnum.optional().default("CREATED"),
  cantidad: z.number().int().min(0).optional(),
  observaciones: z.string().optional(),
});

export const updatePedidoSchema = z.object({
  estado: pedidoEstadoEnum.optional(),
  cantidad: z.number().int().min(0).optional(),
  observaciones: z.string().optional(),
});

export type CreatePedidoInput = z.infer<typeof createPedidoSchema>;
export type UpdatePedidoInput = z.infer<typeof updatePedidoSchema>;
