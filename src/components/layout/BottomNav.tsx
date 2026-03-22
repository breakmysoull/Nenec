import { Link, useLocation } from "react-router-dom";
import { 
  LayoutDashboard, 
  Package, 
  ClipboardCheck, 
  ShoppingCart,
  GraduationCap,
  Users as UsersIcon
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Permission, hasPermission } from "@/lib/permissions";
import { usePermissions } from "@/contexts/PermissionsContext";

const allNavItems = [
  { icon: LayoutDashboard, label: "Início", path: "/dashboard", permission: "view_dashboard" as Permission },
  { icon: Package, label: "Estoque", path: "/stock", permission: "view_stock" as Permission },
  { icon: UsersIcon, label: "Equipe", path: "/users", permission: "view_users" as Permission },
  { icon: ClipboardCheck, label: "Checklists", path: "/checklists", permission: "view_checklists" as Permission },
  { icon: GraduationCap, label: "Treino", path: "/training", permission: "view_training" as Permission },
];

export const BottomNav = () => {
  const location = useLocation();
  const { role } = usePermissions();

  // Filter based on permissions
  const navItems = allNavItems.filter(item => 
    hasPermission(role || 'trainee', item.permission)
  );

  return (
    <nav className="bottom-nav safe-area-bottom">
      {navItems.map((item) => {
        const isActive = location.pathname.startsWith(item.path);
        return (
          <Link
            key={item.path}
            to={item.path}
            className={cn("bottom-nav-item", isActive && "active")}
          >
            <item.icon className="w-5 h-5" />
            <span className="text-xs font-medium">{item.label}</span>
          </Link>
        );
      })}
    </nav>
  );
};
