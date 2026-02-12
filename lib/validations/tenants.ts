import { z } from "zod";

const slugRegex = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

export const createTenantSchema = z.object({
  name: z.string().min(1, "El nombre es requerido"),
  slug: z
    .string()
    .min(1, "El slug es requerido")
    .regex(slugRegex, "Solo minúsculas, números y guiones (ej: mi-empresa)"),
  firstAdmin: z.object({
    username: z.string().min(1, "Usuario requerido"),
    password: z.string().min(6, "Mínimo 6 caracteres"),
    name: z.string().min(1, "Nombre requerido"),
  }),
});

export type CreateTenantInput = z.infer<typeof createTenantSchema>;

export const updateTenantSchema = z.object({
  name: z.string().min(1, "El nombre es requerido").optional(),
  slug: z
    .string()
    .min(1, "El slug es requerido")
    .regex(slugRegex, "Solo minúsculas, números y guiones (ej: mi-empresa)")
    .optional(),
  isActive: z.boolean().optional(),
}).refine((data) => data.name !== undefined || data.slug !== undefined || data.isActive !== undefined, {
  message: "Indica al menos un campo a actualizar (nombre, slug o estado)",
});

export type UpdateTenantInput = z.infer<typeof updateTenantSchema>;
