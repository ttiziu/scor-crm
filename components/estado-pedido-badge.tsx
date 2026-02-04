"use client";

import { Badge } from "@/components/ui/badge";
import {
  HoverCard,
  HoverCardContent,
  HoverCardTrigger,
} from "@/components/ui/hover-card";
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
  const isCancelledWithMotivo = estado === "CANCELLED" && motivoCancelacion;
  const badgeText = config.label;

  const badge = (
    <Badge variant="outline" className={`${config.className} ${className ?? ""}`}>
      {loading && <Spinner className="size-3 shrink-0" />}
      <span>{badgeText}</span>
    </Badge>
  );

  if (isCancelledWithMotivo) {
    return (
      <span className="inline-block">
        <HoverCard openDelay={200} closeDelay={100}>
          <HoverCardTrigger asChild>
            <button
              type="button"
              className="cursor-default focus:outline-none focus:ring-0 [&>*]:pointer-events-none"
              aria-label="Ver motivo de cancelación"
            >
              {badge}
            </button>
          </HoverCardTrigger>
          <HoverCardContent side="top" align="start" className="w-64">
            <div className="space-y-1">
              <h4 className="text-sm font-medium">Motivo de cancelación</h4>
              <p className="text-sm text-neutral-700">{motivoCancelacion}</p>
            </div>
          </HoverCardContent>
        </HoverCard>
      </span>
    );
  }

  return (
    <span className="inline-block">
      {badge}
    </span>
  );
}
