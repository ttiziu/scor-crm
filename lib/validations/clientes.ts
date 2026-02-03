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

export const createClienteDireccionSchema = z.object({
  nombre: z.string().min(1, "El nombre de la dirección es requerido"),
  direccion: z.string().min(1, "La dirección es requerida"),
  distrito: z.string().optional(),
  tipoValvula: z.string().optional(),
});

export const updateClienteDireccionSchema = z.object({
  nombre: z.string().min(1).optional(),
  direccion: z.string().min(1).optional(),
  distrito: z.string().optional(),
  tipoValvula: z.string().optional(),
});

export type CreateClienteInput = z.infer<typeof createClienteSchema>;
export type UpdateClienteInput = z.infer<typeof updateClienteSchema>;
export type CreateClienteDireccionInput = z.infer<typeof createClienteDireccionSchema>;
export type UpdateClienteDireccionInput = z.infer<typeof updateClienteDireccionSchema>;
