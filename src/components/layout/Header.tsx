import { Bell, Menu, User, Shield, Building2, ChevronDown, AlertTriangle, Package, Plus, ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
} from "@/components/ui/dropdown-menu";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useAuth } from "@/contexts/AuthContext";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { roleLabels, AppRole } from "@/types/database";
import { useStockAlerts } from "@/hooks/useStockAlerts";
import { useState } from "react";
import { useNavigate } from "react-router-dom";

interface HeaderProps {
  title?: string;
  onMenuClick?: () => void;
  showBackButton?: boolean;
}

export const Header = ({ title = "Nenec", onMenuClick, showBackButton }: HeaderProps) => {
  const { user, signOut, role, isSuperAdmin, units, activeUnitId, setActiveUnitId } = useAuth();
  const { critical, count: alertCount } = useStockAlerts();
  const navigate = useNavigate();
  const [alertsOpen, setAlertsOpen] = useState(false);

  const initials = user?.email?.slice(0, 2).toUpperCase() || "U";
  const currentRole = role || 'operator';
  const activeUnit = units.find(u => u.id === activeUnitId);

  return (
    <header className="sticky top-0 z-40 bg-card border-b safe-area-top">
      <div className="flex items-center justify-between h-14 px-4">
        <div className="flex items-center gap-3">
          {showBackButton ? (
            <Button
              variant="ghost"
              size="icon"
              onClick={() => navigate(-1)}
              aria-label="Voltar para página anterior"
              className="transition-colors hover:bg-accent/80 active:bg-accent"
            >
              <ArrowLeft className="w-5 h-5" />
            </Button>
          ) : (
            <Button
              variant="ghost"
              size="icon"
              className="lg:hidden"
              onClick={onMenuClick}
            >
              <Menu className="w-5 h-5" />
            </Button>
          )}
          <div className="flex items-center gap-2">
            <h1 className="text-lg font-bold text-primary hidden sm:block">{title}</h1>
            
            {/* Unit Selector */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" size="sm" className="ml-2 gap-2 h-8 px-3 border-dashed" disabled={units.length === 0}>
                  <Building2 className="w-4 h-4 text-muted-foreground" />
                  <span className="font-medium max-w-[120px] truncate">
                    {activeUnit ? activeUnit.name : (units.length === 0 ? "Sem unidades" : "Selecione a Unidade")}
                  </span>
                  <ChevronDown className="w-3 h-3 opacity-50" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="start" className="w-[200px]">
                <DropdownMenuLabel>Unidade Ativa</DropdownMenuLabel>
                <DropdownMenuSeparator />
                {units.length === 0 ? (
                  <div className="p-2 text-xs text-muted-foreground text-center">
                    Nenhuma unidade disponível
                  </div>
                ) : (
                  <DropdownMenuRadioGroup value={activeUnitId || ""} onValueChange={setActiveUnitId}>
                    {units.map((unit) => (
                      <DropdownMenuRadioItem key={unit.id} value={unit.id}>
                        {unit.name}
                      </DropdownMenuRadioItem>
                    ))}
                  </DropdownMenuRadioGroup>
                )}
              </DropdownMenuContent>
            </DropdownMenu>

            {isSuperAdmin && (
              <span className="hidden md:inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold bg-purple-900 text-purple-100 uppercase tracking-wider">
                Super Admin
              </span>
            )}
          </div>
        </div>

        <div className="flex items-center gap-2">
          <Popover open={alertsOpen} onOpenChange={setAlertsOpen}>
            <PopoverTrigger asChild>
              <Button variant="ghost" size="icon" className="relative">
                <Bell className="w-5 h-5" />
                {alertCount > 0 && (
                  <span className="absolute -top-1 -right-1 flex h-4 w-4 items-center justify-center rounded-full bg-destructive text-[10px] font-bold text-destructive-foreground animate-in zoom-in">
                    {alertCount > 9 ? '9+' : alertCount}
                  </span>
                )}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-80 p-0" align="end" sideOffset={8}>
              <div className="flex items-center justify-between px-4 py-3 border-b bg-muted/30">
                <h4 className="font-semibold text-sm flex items-center gap-2">
                  <AlertTriangle className="w-4 h-4 text-warning" />
                  Estoque em Atenção
                </h4>
                {alertCount > 0 && (
                  <span className="text-xs text-muted-foreground">{alertCount} itens</span>
                )}
              </div>
              
              <ScrollArea className="h-[300px]">
                {alertCount === 0 ? (
                  <div className="flex flex-col items-center justify-center h-[200px] text-muted-foreground p-4 text-center">
                    <Package className="w-10 h-10 mb-2 opacity-20" />
                    <p className="text-sm">Nenhum item crítico no momento</p>
                  </div>
                ) : (
                  <div className="divide-y">
                    {critical.map((item) => (
                      <div key={item.id} className="p-3 hover:bg-muted/50 transition-colors flex items-start gap-3">
                        <div className={`mt-1 w-2 h-2 rounded-full shrink-0 ${
                          item.current_stock === 0 ? 'bg-destructive' : 'bg-warning'
                        }`} />
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium truncate">{item.name}</p>
                          <div className="flex items-center justify-between mt-1">
                            <p className="text-xs text-muted-foreground">
                              Mín: {item.min_stock} {item.unit_measure}
                            </p>
                            <p className={`text-xs font-bold ${
                              item.current_stock === 0 ? 'text-destructive' : 'text-warning'
                            }`}>
                              {item.current_stock} {item.unit_measure}
                            </p>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </ScrollArea>

              <div className="p-2 border-t bg-muted/30 grid grid-cols-2 gap-2">
                <Button 
                  variant="outline" 
                  size="sm" 
                  className="w-full text-xs h-8"
                  onClick={() => {
                    setAlertsOpen(false);
                    navigate('/stock?filter=critical');
                  }}
                >
                  <Package className="w-3 h-3 mr-2" />
                  Ver Estoque
                </Button>
                <Button 
                  size="sm" 
                  className="w-full text-xs h-8"
                  onClick={() => {
                    setAlertsOpen(false);
                    navigate('/purchases/new');
                  }}
                >
                  <Plus className="w-3 h-3 mr-2" />
                  Criar Pedido
                </Button>
              </div>
            </PopoverContent>
          </Popover>

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" className={isSuperAdmin ? "ring-2 ring-purple-500 ring-offset-2" : ""}>
                <Avatar className="w-8 h-8">
                  <AvatarFallback className={isSuperAdmin ? "bg-purple-600 text-white" : "bg-primary text-primary-foreground text-xs"}>
                    {initials}
                  </AvatarFallback>
                </Avatar>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-56 bg-popover">
              <DropdownMenuLabel className="flex flex-col">
                <span className="flex items-center justify-between">
                  Minha Conta
                  {isSuperAdmin && <span className="text-[10px] bg-purple-100 text-purple-700 px-1 rounded font-bold">SUPER</span>}
                </span>
                <span className="font-normal text-xs text-muted-foreground flex items-center gap-1 mt-1">
                  <Shield className={isSuperAdmin ? "w-3 h-3 text-purple-600" : "w-3 h-3"} />
                  {isSuperAdmin ? "Super Admin" : (roleLabels[currentRole] || currentRole)}
                </span>
              </DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuItem>
                <User className="w-4 h-4 mr-2" />
                Perfil
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={signOut} className="text-destructive">
                Sair
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>
    </header>
  );
};
