import { z } from "zod";

export const createClienteSchema = z.object({
  name: z.string().min(1, "El nombre es requerido"),
  documento: z.string().optional(),
  direccion: z.string().optional(),
  distrito: z.string().optional(),
  tipoValvula: z.string().optional(),
  telefono: z.string().optional(),
  email: z.string().email("Email inválido").optional().or(z.literal("")),
});

export const updateClienteSchema = z.object({
  name: z.string().min(1, "El nombre es requerido").optional(),
  documento: z.string().optional(),
  direccion: z.string().optional(),
  distrito: z.string().optional(),
  tipoValvula: z.string().optional(),
  telefono: z.string().optional(),
  email: z.string().email("Email inválido").optional().or(z.literal("")),
});

export type CreateClienteInput = z.infer<typeof createClienteSchema>;
export type UpdateClienteInput = z.infer<typeof updateClienteSchema>;
