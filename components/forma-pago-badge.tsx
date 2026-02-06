import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

const FORMA_PAGO_LABEL: Record<string, string> = {
  YAPE: "Yape",
  PLIN: "Plin",
  TRANSFERENCIA: "Transferencia",
  EFECTIVO: "Efectivo",
  TARJETA: "Tarjeta",
};

const FORMA_PAGO_CLASS: Record<string, string> = {
  YAPE: "bg-violet-600 text-white border-violet-600",
  PLIN: "bg-blue-600 text-white border-blue-600",
  TRANSFERENCIA: "bg-emerald-600 text-white border-emerald-600",
  EFECTIVO: "bg-amber-600 text-white border-amber-600",
  TARJETA: "bg-slate-700 text-white border-slate-700",
};

type FormaPagoBadgeProps = {
  formaPago: string | null;
  efectivoCon?: number | string | null;
  className?: string;
};

export function FormaPagoBadge({ formaPago, efectivoCon, className }: FormaPagoBadgeProps) {
  if (formaPago == null || formaPago === "") {
    return <span className={className}>—</span>;
  }
  const label = FORMA_PAGO_LABEL[formaPago] ?? formaPago;
  const badgeClass = FORMA_PAGO_CLASS[formaPago] ?? "bg-neutral-600 text-white border-neutral-600";
  const conEfectivo = formaPago === "EFECTIVO" && efectivoCon != null && efectivoCon !== "";
  const efectivoNum = conEfectivo ? Number(efectivoCon) : null;

  return (
    <span className={`inline-flex items-center gap-1.5 flex-wrap ${className ?? ""}`}>
      <Badge variant="secondary" className={cn("font-medium border", badgeClass)}>
        {label}
      </Badge>
      {efectivoNum != null && !Number.isNaN(efectivoNum) && (
        <span className="text-muted-foreground text-sm">(con S/ {efectivoNum})</span>
      )}
    </span>
  );
}
