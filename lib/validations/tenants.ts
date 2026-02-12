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
