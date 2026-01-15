import { AppLayout } from "@/components/layout/AppLayout";
import { PageHeader } from "@/components/ui/page-header";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { StatusBadge } from "@/components/ui/status-badge";
import { Plus, ShoppingCart, Package } from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { OrderStatus } from "@/types/database";

// Mock data
const mockOrders = [
  { 
    id: 1, 
    number: "#0042", 
    status: "pendente" as OrderStatus, 
    items: 5, 
    total: 1250.00,
    createdAt: "2024-01-15T10:30:00",
    requestedBy: "João Silva"
  },
  { 
    id: 2, 
    number: "#0041", 
    status: "aprovado" as OrderStatus, 
    items: 8, 
    total: 2340.50,
    createdAt: "2024-01-14T14:00:00",
    requestedBy: "Maria Santos"
  },
  { 
    id: 3, 
    number: "#0040", 
    status: "entregue" as OrderStatus, 
    items: 12, 
    total: 4500.00,
    createdAt: "2024-01-13T09:15:00",
    requestedBy: "Carlos Oliveira"
  },
];

const Orders = () => {
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

  const pendingOrders = mockOrders.filter(o => o.status === 'pendente');
  const approvedOrders = mockOrders.filter(o => o.status === 'aprovado');
  const deliveredOrders = mockOrders.filter(o => o.status === 'entregue');

  const OrderList = ({ orders }: { orders: typeof mockOrders }) => (
    orders.length === 0 ? (
      <EmptyState
        icon={Package}
        title="Nenhum pedido"
        description="Não há pedidos nesta categoria"
      />
    ) : (
      <div className="space-y-3">
        {orders.map((order) => (
          <div key={order.id} className="list-item">
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-1">
                <span className="font-semibold">{order.number}</span>
                <StatusBadge status={order.status} />
              </div>
              <p className="text-sm text-muted-foreground">
                {order.items} itens • {order.requestedBy}
              </p>
              <p className="text-xs text-muted-foreground">
                {formatDate(order.createdAt)}
              </p>
            </div>
            <div className="text-right">
              <p className="font-bold text-lg">{formatCurrency(order.total)}</p>
            </div>
          </div>
        ))}
      </div>
    )
  );

  return (
    <AppLayout title="Pedidos">
      <PageHeader
        title="Pedidos"
        subtitle="Fornecimento e suprimentos"
        actions={
          <Button size="sm">
            <Plus className="w-4 h-4 mr-1" />
            Novo
          </Button>
        }
      />

      <div className="p-4">
        <Tabs defaultValue="pending" className="w-full">
          <TabsList className="w-full grid grid-cols-3">
            <TabsTrigger value="pending" className="relative">
              Pendentes
              {pendingOrders.length > 0 && (
                <span className="ml-1 px-1.5 py-0.5 text-xs rounded-full bg-warning text-warning-foreground">
                  {pendingOrders.length}
                </span>
              )}
            </TabsTrigger>
            <TabsTrigger value="approved">Aprovados</TabsTrigger>
            <TabsTrigger value="delivered">Entregues</TabsTrigger>
          </TabsList>
          <TabsContent value="pending" className="mt-4">
            <OrderList orders={pendingOrders} />
          </TabsContent>
          <TabsContent value="approved" className="mt-4">
            <OrderList orders={approvedOrders} />
          </TabsContent>
          <TabsContent value="delivered" className="mt-4">
            <OrderList orders={deliveredOrders} />
          </TabsContent>
        </Tabs>
      </div>
    </AppLayout>
  );
};

export default Orders;
