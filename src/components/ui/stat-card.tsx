import { cn } from "@/lib/utils";
import { LucideIcon } from "lucide-react";

interface StatCardProps {
  label: string;
  value: string | number;
  icon: LucideIcon;
  variant?: "default" | "critical" | "warning" | "success";
  subtext?: string;
  onClick?: () => void;
}

export const StatCard = ({
  label,
  value,
  icon: Icon,
  variant = "default",
  subtext,
  onClick,
}: StatCardProps) => {
  return (
    <div
      className={cn(
        "stat-card cursor-pointer transition-transform hover:scale-[1.02] active:scale-[0.98]",
        variant === "critical" && "stat-card-critical",
        variant === "warning" && "stat-card-warning",
        variant === "success" && "stat-card-success"
      )}
      onClick={onClick}
    >
      <div className="flex items-start justify-between">
        <div className="space-y-1">
          <p className="text-sm text-muted-foreground">{label}</p>
          <p className="text-2xl font-bold">{value}</p>
          {subtext && (
            <p className="text-xs text-muted-foreground">{subtext}</p>
          )}
        </div>
        <div
          className={cn(
            "p-2 rounded-lg",
            variant === "default" && "bg-primary/10 text-primary",
            variant === "critical" && "bg-destructive/10 text-destructive",
            variant === "warning" && "bg-warning/10 text-warning",
            variant === "success" && "bg-success/10 text-success"
          )}
        >
          <Icon className="w-5 h-5" />
        </div>
      </div>
    </div>
  );
};
