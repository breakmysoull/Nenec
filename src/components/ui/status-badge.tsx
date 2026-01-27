import { cn } from "@/lib/utils";
import { OrderStatus, TrainingStatus } from "@/types/database";

type StatusType = OrderStatus | TrainingStatus | "active" | "inactive";

interface StatusBadgeProps {
  status: StatusType;
  label?: string;
}

const statusStyles: Record<StatusType, string> = {
  pendente: "status-pending",
  aprovado: "status-approved",
  entregue: "status-delivered",
  cancelado: "status-cancelled",
  em_andamento: "bg-info/15 text-info",
  concluido: "status-approved",
  active: "status-approved",
  inactive: "bg-muted text-muted-foreground",
};

const defaultLabels: Record<StatusType, string> = {
  pendente: "Pendente",
  aprovado: "Aprovado",
  entregue: "Entregue",
  cancelado: "Cancelado",
  em_andamento: "Em Andamento",
  concluido: "Concluído",
  active: "Ativo",
  inactive: "Inativo",
};

export const StatusBadge = ({ status, label }: StatusBadgeProps) => {
  return (
    <span className={cn("status-badge", statusStyles[status])}>
      <span className="w-1.5 h-1.5 rounded-full bg-current" />
      {label || defaultLabels[status]}
    </span>
  );
};
