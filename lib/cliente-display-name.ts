/**
 * Muestra el nombre del cliente. Si está vacío (legacy), muestra "—".
 * Los nuevos sin nombre se guardan como "Cliente 1", "Cliente 2", etc.
 */
export function clienteDisplayName(cliente: {
  name?: string | null;
} | null | undefined): string {
  if (!cliente) return "—";
  const n = cliente.name?.trim();
  return n || "—";
}
