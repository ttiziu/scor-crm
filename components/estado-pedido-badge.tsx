"use client";

import { Badge } from "@/components/ui/badge";
import { Spinner } from "@/components/ui/spinner";

const ESTADO_CONFIG: Record<
  string,
  { label: string; className: string }
> = {
  CREATED: {
    label: "Creado",
    className: "bg-sky-50 text-sky-700 dark:bg-sky-950 dark:text-sky-300 border-sky-200 dark:border-sky-800",
  },
  IN_ROUTE: {
    label: "En ruta",
    className: "bg-amber-50 text-amber-700 dark:bg-amber-950 dark:text-amber-300 border-amber-200 dark:border-amber-800",
  },
  DELIVERED: {
    label: "Entregado",
    className: "bg-green-50 text-green-700 dark:bg-green-950 dark:text-green-300 border-green-200 dark:border-green-800",
  },
  CANCELLED: {
    label: "Cancelado",
    className: "bg-red-50 text-red-700 dark:bg-red-950 dark:text-red-300 border-red-200 dark:border-red-800",
  },
};

type EstadoPedidoBadgeProps = {
  estado: string;
  motivoCancelacion?: string | null;
  loading?: boolean;
  className?: string;
};

export function EstadoPedidoBadge({
  estado,
  motivoCancelacion,
  loading = false,
  className,
}: EstadoPedidoBadgeProps) {
  const config = ESTADO_CONFIG[estado] ?? {
    label: estado,
    className: "bg-muted text-muted-foreground",
  };
  const text =
    estado === "CANCELLED" && motivoCancelacion
      ? `${config.label}: ${motivoCancelacion}`
      : config.label;

  return (
    <span className="inline-block">
      <Badge variant="outline" className={`${config.className} ${className ?? ""}`}>
        {loading && <Spinner className="size-3 shrink-0" />}
        <span className={motivoCancelacion ? "max-w-[200px] truncate" : undefined} title={motivoCancelacion ?? undefined}>
          {text}
        </span>
      </Badge>
    </span>
  );
}
