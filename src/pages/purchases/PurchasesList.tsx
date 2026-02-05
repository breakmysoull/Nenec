import { AppLayout } from "@/components/layout/AppLayout";
import { PageHeader } from "@/components/ui/page-header";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { StatusBadge } from "@/components/ui/status-badge";
import { Plus, Package, Clock, Eye, Edit, ChevronRight } from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { usePermissions } from "@/contexts/PermissionsContext";
import { hasPermission } from "@/lib/permissions";
import { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/lib/supabase";
import { toast } from "sonner";
import { OrderStatus } from "@/types/database";

// Interface for purchase list item
interface PurchaseOrder {
  id: string;
  status: OrderStatus;
  created_at: string;
  created_by: string;
  unit_id: string;
  suppliers: {
    name: string;
  };
  profiles: {
    full_name: string | null;
    email: string;
  };
}

const Purchases = () => {
  const { role, activeUnitId, isSuperAdmin } = usePermissions();
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState<string>("all");
  const [orders, setOrders] = useState<PurchaseOrder[]>([]);
  const [loading, setLoading] = useState(true);

  // Permission Checks
  const canCreate = hasPermission(role || 'operator', 'create_order');

  const fetchOrders = useCallback(async () => {
    try {
      setLoading(true);
      
      let query = supabase
        .from('purchase_orders')
        .select(`
          id,
          status,
          created_at,
          created_by,
          unit_id,
          suppliers (
            name
          ),
          profiles:profiles!purchase_orders_created_by_fkey (
            full_name,
            email
          )
        `)
        .order('created_at', { ascending: false });

      if (activeUnitId && !isSuperAdmin) {
        query = query.eq('unit_id', activeUnitId);
      }

      const { data, error } = await query;

      if (error) throw error;

      setOrders((data || []) as PurchaseOrder[]);
    } catch {
      toast.error("Erro ao carregar pedidos");
    } finally {
      setLoading(false);
    }
  }, [activeUnitId, isSuperAdmin]);

  useEffect(() => {
    if (activeUnitId || isSuperAdmin) {
      fetchOrders();
    } else {
      setLoading(false);
    }
  }, [activeUnitId, isSuperAdmin, fetchOrders]);

  const filteredOrders = orders.filter(order => {
    if (activeTab === 'all') return true;
    
    // Map tab to status
    // Tabs: draft, submitted, approved, received, cancelled
    // DB Status: pendente, aprovado, entregue, cancelado
    
    // Logic: 
    // draft = pendente (conceptual, usually distinguished by submitted_at but simplified here to 'pendente' for now unless we have a draft flag)
    // For now, let's map:
    // pendente -> submitted (as we don't have a clear draft vs submitted in DB yet without extra columns)
    // Actually, prompt says: "Se status = draft ... Se status = submitted". 
    // Assuming 'pendente' covers both for now, or we treat 'pendente' as 'submitted'.
    
    // Let's stick to DB enums:
    if (activeTab === 'submitted') return order.status === 'pendente';
    if (activeTab === 'approved') return order.status === 'aprovado';
    if (activeTab === 'received') return order.status === 'entregue';
    if (activeTab === 'cancelled') return order.status === 'cancelado';
    
    return false;
  });

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString('pt-BR', {
      day: '2-digit',
      month: '2-digit',
      year: '2-digit',
    });
  };

  return (
    <AppLayout title="Compras">
      <PageHeader
        title="Pedidos de Compra"
        subtitle="Gerenciamento de aquisições"
        actions={
          canCreate && (
            <Button size="sm" onClick={() => navigate('/purchases/new')}>
              <Plus className="w-4 h-4 mr-1" />
              Novo Pedido
            </Button>
          )
        }
      />

      <div className="p-4 space-y-4">
        <Tabs defaultValue="all" onValueChange={setActiveTab} className="w-full">
          <TabsList className="w-full justify-start overflow-x-auto">
            <TabsTrigger value="all">Todos</TabsTrigger>
            <TabsTrigger value="submitted">Pendentes</TabsTrigger>
            <TabsTrigger value="approved">Aprovados</TabsTrigger>
            <TabsTrigger value="received">Recebidos</TabsTrigger>
            <TabsTrigger value="cancelled">Cancelados</TabsTrigger>
          </TabsList>

          <TabsContent value={activeTab} className="mt-4">
            {loading ? (
              <div className="flex justify-center py-8">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
              </div>
            ) : filteredOrders.length === 0 ? (
              <EmptyState
                icon={Package}
                title="Nenhum pedido encontrado"
                description="Não há pedidos com este status."
              />
            ) : (
              <div className="space-y-3">
                {filteredOrders.map((order) => (
                  <div 
                    key={order.id} 
                    className="list-item group cursor-pointer hover:bg-muted/50 transition-colors"
                    onClick={() => navigate(`/purchases/${order.id}`)}
                  >
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="font-semibold text-base">
                          {order.suppliers?.name || "Fornecedor Desconhecido"}
                        </span>
                        <StatusBadge status={order.status} />
                      </div>
                      <div className="flex flex-wrap gap-x-4 gap-y-1 text-sm text-muted-foreground">
                        <span className="flex items-center gap-1">
                          <Clock className="w-3.5 h-3.5" />
                          {formatDate(order.created_at)}
                        </span>
                        <span>
                          Por: {order.profiles?.full_name || order.profiles?.email || "Usuário"}
                        </span>
                        <span className="font-mono text-xs opacity-70">
                          #{order.id.slice(0, 8)}
                        </span>
                      </div>
                    </div>
                    
                    <div className="flex items-center">
                      <ChevronRight className="w-5 h-5 text-muted-foreground group-hover:text-primary transition-colors" />
                    </div>
                  </div>
                ))}
              </div>
            )}
          </TabsContent>
        </Tabs>
      </div>
    </AppLayout>
  );
};

export default Purchases;
