import { cn } from "@/lib/utils";
import { LucideIcon, ChevronRight } from "lucide-react";
import { Link } from "react-router-dom";

interface ModuleCardProps {
  title: string;
  description: string;
  icon: LucideIcon;
  to: string;
  color?: string;
  badge?: string | number;
  variant?: 'default' | 'compact';
  className?: string;
}

export const ModuleCard = ({
  title,
  description,
  icon: Icon,
  to,
  color = "primary",
  badge,
  variant = 'default',
  className,
}: ModuleCardProps) => {
  return (
    <Link
      to={to}
      className={cn(
        "module-card group", 
        variant === 'compact' && "p-4",
        className
      )}
      style={{ "--accent-color": `var(--${color})` } as React.CSSProperties}
    >
      <div className="flex items-start gap-4">
        <div className="p-3 rounded-xl bg-primary/10 text-primary group-hover:bg-primary group-hover:text-primary-foreground transition-colors">
          <Icon className="w-6 h-6" />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <h3 className="font-semibold text-foreground">{title}</h3>
            {badge !== undefined && (
              <span className="px-2 py-0.5 text-xs font-medium rounded-full bg-primary text-primary-foreground">
                {badge}
              </span>
            )}
          </div>
          <p className="text-sm text-muted-foreground mt-1 line-clamp-2">
            {description}
          </p>
        </div>
        <ChevronRight className="w-5 h-5 text-muted-foreground group-hover:text-primary transition-colors" />
      </div>
    </Link>
  );
};
