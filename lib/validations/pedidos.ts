import { z } from "zod";

const pedidoEstadoEnum = z.enum(["CREATED", "IN_ROUTE", "DELIVERED", "CANCELLED"]);
const formaPagoEnum = z.enum(["YAPE", "PLIN", "TRANSFERENCIA", "EFECTIVO", "TARJETA"]);

const pedidoItemSchema = z.object({
  productoId: z.string().min(1, "Producto requerido"),
  marcaId: z.string().optional().nullable(),
  cantidad: z.number().int().min(1, "Cantidad mínima 1"),
  precioUnitario: z.number().min(0, "Precio no negativo"),
});

export const createPedidoSchema = z.object({
  clienteId: z.string().min(1, "El cliente es requerido"),
  estado: pedidoEstadoEnum.optional().default("CREATED"),
  cantidad: z.number().int().min(0).optional(),
  observaciones: z.string().optional(),
  fechaProgramada: z.string().optional(),
  repartidorId: z.string().optional().nullable(),
  clienteDireccionId: z.string().optional().nullable(),
  formaPago: formaPagoEnum.optional().nullable(),
  efectivoCon: z.number().min(0).optional().nullable(),
  items: z.array(pedidoItemSchema).min(1, "Agrega al menos una línea con producto, cantidad y precio").optional(),
});

export const updatePedidoSchema = z.object({
  estado: pedidoEstadoEnum.optional(),
  cantidad: z.number().int().min(0).optional().nullable(),
  observaciones: z.string().optional().nullable(),
  motivoCancelacion: z.string().optional().nullable(),
  fechaProgramada: z.string().optional().nullable(),
  repartidorId: z.string().optional().nullable(),
  clienteDireccionId: z.string().optional().nullable(),
  formaPago: formaPagoEnum.optional().nullable(),
  efectivoCon: z.number().min(0).optional().nullable(),
  items: z.array(pedidoItemSchema).optional(),
});

export type CreatePedidoInput = z.infer<typeof createPedidoSchema>;
export type UpdatePedidoInput = z.infer<typeof updatePedidoSchema>;
export type PedidoItemInput = z.infer<typeof pedidoItemSchema>;
