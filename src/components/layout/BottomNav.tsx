import { Link, useLocation } from "react-router-dom";
import { 
  LayoutDashboard, 
  Package, 
  ClipboardCheck, 
  ShoppingCart,
  GraduationCap 
} from "lucide-react";
import { cn } from "@/lib/utils";

const navItems = [
  { icon: LayoutDashboard, label: "Início", path: "/dashboard" },
  { icon: Package, label: "Estoque", path: "/stock" },
  { icon: ShoppingCart, label: "Pedidos", path: "/orders" },
  { icon: ClipboardCheck, label: "Checklists", path: "/checklists" },
  { icon: GraduationCap, label: "Treino", path: "/training" },
];

export const BottomNav = () => {
  const location = useLocation();

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
