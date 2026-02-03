import { z } from "zod";

export const createProductoSchema = z.object({
  name: z.string().min(1, "El nombre del producto es requerido"),
});

export const updateProductoSchema = z.object({
  name: z.string().min(1, "El nombre del producto es requerido").optional(),
});

export type CreateProductoInput = z.infer<typeof createProductoSchema>;
export type UpdateProductoInput = z.infer<typeof updateProductoSchema>;
