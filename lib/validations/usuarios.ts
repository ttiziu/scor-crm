import { z } from "zod";

const roleEnum = z.enum(["ADMIN", "OPERADOR", "REPARTIDOR"]);

export const createUsuarioSchema = z.object({
  username: z.string().min(1, "El usuario es requerido"),
  email: z.string().email("Email inválido").optional().or(z.literal("")),
  password: z.string().min(6, "Mínimo 6 caracteres"),
  name: z.string().min(1, "El nombre es requerido"),
  role: roleEnum,
});

export const updateUsuarioSchema = z.object({
  username: z.string().min(1, "El usuario es requerido").optional(),
  name: z.string().min(1, "El nombre es requerido").optional(),
  role: roleEnum.optional(),
  password: z.string().min(6, "Mínimo 6 caracteres").optional(),
});

export type CreateUsuarioInput = z.infer<typeof createUsuarioSchema>;
export type UpdateUsuarioInput = z.infer<typeof updateUsuarioSchema>;
