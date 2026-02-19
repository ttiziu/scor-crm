import { z } from "zod";

export const createMarcaSchema = z.object({
  name: z.string().min(1, "El nombre de la marca es requerido"),
});

export const updateMarcaSchema = z.object({
  name: z.string().min(1, "El nombre de la marca es requerido").optional(),
});

export type CreateMarcaInput = z.infer<typeof createMarcaSchema>;
export type UpdateMarcaInput = z.infer<typeof updateMarcaSchema>;
