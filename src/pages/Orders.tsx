import { AppLayout } from "@/components/layout/AppLayout";
import { PageHeader } from "@/components/ui/page-header";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { StatusBadge } from "@/components/ui/status-badge";
import { Plus, ShoppingCart, Package, Edit, Send, CheckCircle, Archive, Clock } from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { OrderStatus } from "@/types/database";
import { usePermissions } from "@/contexts/PermissionsContext";
import { hasPermission } from "@/lib/permissions";
import { useState } from "react";
import { toast } from "sonner";

// Conceptual Order State
type OrderState = 'draft' | 'submitted' | 'approved' | 'received';

interface Order {
  id: number;
  number: string;
  status: OrderStatus;
  items: number;
  total: number;
  createdAt: string;
  requestedAt?: string;
  requestedBy: string;
  approvedAt?: string;
  deliveredAt?: string;
}

// Mock data with new states mapped
const mockOrders: Order[] = [
  { 
    id: 1, 
    number: "#0043", 
    status: "pendente", 
    items: 3, 
    total: 450.00,
    createdAt: "2024-01-18T08:00:00",
    requestedBy: "João Silva",
    // No requestedAt -> Draft
  },
  { 
    id: 2, 
    number: "#0042", 
    status: "pendente", 
    items: 5, 
    total: 1250.00,
    createdAt: "2024-01-15T10:30:00",
    requestedAt: "2024-01-15T10:35:00", // Has requestedAt -> Submitted
    requestedBy: "João Silva"
  },
  { 
    id: 3, 
    number: "#0041", 
    status: "aprovado", 
    items: 8, 
    total: 2340.50,
    createdAt: "2024-01-14T14:00:00",
    requestedAt: "2024-01-14T14:30:00",
    approvedAt: "2024-01-14T15:00:00",
    requestedBy: "Maria Santos"
  },
  { 
    id: 4, 
    number: "#0040", 
    status: "entregue", 
    items: 12, 
    total: 4500.00,
    createdAt: "2024-01-13T09:15:00",
    requestedAt: "2024-01-13T09:30:00",
    approvedAt: "2024-01-13T10:00:00",
    deliveredAt: "2024-01-13T14:00:00",
    requestedBy: "Carlos Oliveira"
  },
];

const Orders = () => {
  const { role } = usePermissions();
  const [activeTab, setActiveTab] = useState<string>("all");

  const getOrderState = (order: Order): OrderState => {
    if (order.status === 'entregue') return 'received';
    if (order.status === 'aprovado') return 'approved';
    if (order.status === 'pendente' && order.requestedAt) return 'submitted';
    return 'draft';
  };

  const filteredOrders = mockOrders.filter(order => {
    if (activeTab === 'all') return true;
    return getOrderState(order) === activeTab;
  });

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString('pt-BR', {
      day: '2-digit',
      month: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const formatCurrency = (value: number) => {
    return value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
  };

  // Permission Checks
  const canCreate = hasPermission(role || 'operator', 'create_order');
  const canSubmit = hasPermission(role || 'operator', 'submit_order');
  const canApprove = hasPermission(role || 'operator', 'approve_order');
  const canReceive = hasPermission(role || 'operator', 'receive_order');

  const handleAction = (action: string, orderId: number) => {
    toast.info(`Ação: ${action} (Pedido #${orderId}) - Mock`);
  };

  return (
    <AppLayout title="Pedidos">
      <PageHeader
        title="Pedidos de Compra"
        subtitle="Gerenciamento de suprimentos"
        actions={
          canCreate && (
            <Button size="sm">
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
            <TabsTrigger value="draft">Rascunhos</TabsTrigger>
            <TabsTrigger value="submitted">Pendentes</TabsTrigger>
            <TabsTrigger value="approved">Aprovados</TabsTrigger>
            <TabsTrigger value="received">Recebidos</TabsTrigger>
          </TabsList>

          <TabsContent value={activeTab} className="mt-4">
            {filteredOrders.length === 0 ? (
              <EmptyState
                icon={Package}
                title="Nenhum pedido encontrado"
                description="Não há pedidos com este status."
              />
            ) : (
              <div className="space-y-3">
                {filteredOrders.map((order) => {
                  const state = getOrderState(order);
                  
                  return (
                    <div key={order.id} className="list-item flex-col sm:flex-row sm:items-center gap-4">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <span className="font-semibold text-lg">{order.number}</span>
                          <StatusBadge status={order.status} />
                          {state === 'draft' && <span className="text-xs bg-muted px-2 py-0.5 rounded">Rascunho</span>}
                        </div>
                        <div className="flex flex-wrap gap-x-4 gap-y-1 text-sm text-muted-foreground">
                          <span className="flex items-center gap-1">
                            <Package className="w-3.5 h-3.5" />
                            {order.items} itens
                          </span>
                          <span className="flex items-center gap-1">
                            <Clock className="w-3.5 h-3.5" />
                            {formatDate(order.createdAt)}
                          </span>
                          <span>Por: {order.requestedBy}</span>
                        </div>
                      </div>
                      
                      <div className="flex items-center justify-between sm:justify-end gap-4 w-full sm:w-auto mt-2 sm:mt-0">
                        <div className="text-right">
                          <p className="font-bold text-lg">{formatCurrency(order.total)}</p>
                          <p className="text-xs text-muted-foreground">Total estimado</p>
                        </div>

                        <div className="flex items-center gap-2">
                          {/* Actions based on State & Permissions */}
                          
                          {state === 'draft' && (
                            <>
                              <Button variant="outline" size="icon" onClick={() => handleAction('Editar', order.id)}>
                                <Edit className="w-4 h-4" />
                              </Button>
                              {canSubmit && (
                                <Button size="icon" onClick={() => handleAction('Enviar', order.id)}>
                                  <Send className="w-4 h-4" />
                                </Button>
                              )}
                            </>
                          )}

                          {state === 'submitted' && (
                            <>
                              <Button variant="outline" size="sm" onClick={() => handleAction('Visualizar', order.id)}>
                                Ver
                              </Button>
                              {canApprove && (
                                <Button size="sm" className="bg-green-600 hover:bg-green-700" onClick={() => handleAction('Aprovar', order.id)}>
                                  <CheckCircle className="w-4 h-4 mr-1" />
                                  Aprovar
                                </Button>
                              )}
                            </>
                          )}

                          {state === 'approved' && (
                            <>
                              <Button variant="outline" size="sm" onClick={() => handleAction('Visualizar', order.id)}>
                                Ver
                              </Button>
                              {canReceive && (
                                <Button size="sm" onClick={() => handleAction('Receber', order.id)}>
                                  <Archive className="w-4 h-4 mr-1" />
                                  Receber
                                </Button>
                              )}
                            </>
                          )}

                          {state === 'received' && (
                            <Button variant="outline" size="sm" onClick={() => handleAction('Histórico', order.id)}>
                              Histórico
                            </Button>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </TabsContent>
        </Tabs>
      </div>
    </AppLayout>
  );
};

export default Orders;
