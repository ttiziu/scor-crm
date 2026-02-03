import { z } from "zod";

export const loginSchema = z.object({
  username: z.string().min(1, "El usuario es requerido"),
  password: z.string().min(1, "La contraseña es requerida"),
  tenantSlug: z.string().optional(),
});

export type LoginInput = z.infer<typeof loginSchema>;
