import { AppLayout } from "@/components/layout/AppLayout";
import { PageHeader } from "@/components/ui/page-header";
import { Button } from "@/components/ui/button";
import { StatusBadge } from "@/components/ui/status-badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { 
  ArrowLeft, 
  Calendar, 
  Building2, 
  User, 
  CheckCircle, 
  Archive, 
  XCircle,
  Clock
} from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { hasPermission } from "@/lib/permissions";
import { useState, useEffect } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { supabase } from "@/lib/supabase";
import { toast } from "sonner";
import { OrderStatus } from "@/types/database";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";

interface PurchaseOrderDetail {
  id: string;
  status: OrderStatus;
  created_at: string;
  approved_at?: string;
  delivered_at?: string;
  notes?: string;
  unit_id: string;
  suppliers: {
    name: string;
    email?: string | null;
    phone?: string | null;
  };
  profiles_created: {
    full_name: string | null;
  };
  profiles_approved: {
    full_name: string | null;
  };
  items: {
    id: string;
    quantity_requested: number;
    unit_price?: number;
    ingredients: {
      name: string;
      unit_measure: string;
    };
  }[];
}

const PurchaseDetail = () => {
  const { id } = useParams();
  const { role, user } = useAuth();
  const navigate = useNavigate();
  const [order, setOrder] = useState<PurchaseOrderDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState(false);

  // Permission Checks
  const canApprove = hasPermission(role || 'operator', 'approve_order');
  const canReceive = hasPermission(role || 'operator', 'receive_order');

  useEffect(() => {
    if (id) {
      fetchOrderDetail();
    }
  }, [id]);

  const fetchOrderDetail = async () => {
    try {
      setLoading(true);
      
      const { data, error } = await supabase
        .from('purchase_orders' as any)
        .select(`
          *,
          suppliers (name, email, phone),
          profiles_created:profiles!purchase_orders_created_by_fkey (full_name),
          profiles_approved:profiles!purchase_orders_approved_by_fkey (full_name),
          items:purchase_order_items (
            id,
            quantity_requested,
            unit_price,
            ingredients (
              name,
              unit_measure
            )
          )
        `)
        .eq('id', id)
        .single();

      if (error) throw error;

      setOrder(data as any);
    } catch (error: any) {
      console.error('Error fetching order detail:', error);
      toast.error("Erro ao carregar detalhes do pedido");
      navigate('/purchases');
    } finally {
      setLoading(false);
    }
  };

  const handleStatusChange = async (newStatus: OrderStatus) => {
    if (!order) return;
    
    try {
      setProcessing(true);
      
      if (newStatus === 'entregue') {
        await purchaseService.receivePurchaseOrder(order.id);
        toast.success("Pedido recebido e estoque atualizado");
      } else {
        const updates: any = {
          status: newStatus,
          updated_at: new Date().toISOString(),
        };

        if (newStatus === 'aprovado') {
          updates.approved_at = new Date().toISOString();
          updates.approved_by = user?.id;
        }

        const { error } = await supabase
          .from('purchase_orders')
          .update(updates)
          .eq('id', order.id);

        if (error) throw error;

        toast.success(`Pedido ${newStatus === 'aprovado' ? 'aprovado' : 'atualizado'} com sucesso!`);
      }

      fetchOrderDetail(); // Refresh data
    } catch (error: any) {
      console.error('Error updating status:', error);
      toast.error(error.message || "Erro ao atualizar status");
    } finally {
      setProcessing(false);
    }
  };

  if (loading) {
    return (
      <AppLayout title="Detalhes do Pedido">
        <div className="flex justify-center items-center h-full min-h-[50vh]">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
        </div>
      </AppLayout>
    );
  }

  if (!order) return null;

  return (
    <AppLayout title={`Pedido #${order.id.slice(0, 8)}`}>
      <PageHeader
        title="Detalhes do Pedido"
        subtitle={`#${order.id.slice(0, 8)}`}
        showBack
        onBack={() => navigate('/purchases')}
        actions={
          <div className="flex gap-2">
            {/* Approve Action */}
            {order.status === 'pendente' && canApprove && (
              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <Button className="bg-primary hover:bg-primary/90">
                    <CheckCircle className="w-4 h-4 mr-2" />
                    Aprovar
                  </Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>Aprovar Pedido?</AlertDialogTitle>
                    <AlertDialogDescription>
                      Isso liberará o pedido para envio ao fornecedor.
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>Cancelar</AlertDialogCancel>
                    <AlertDialogAction onClick={() => handleStatusChange('aprovado')}>
                      Confirmar Aprovação
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            )}

            {/* Receive Action */}
            {order.status === 'aprovado' && canReceive && (
              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <Button className="bg-green-600 hover:bg-green-700" disabled={processing}>
                    <Archive className="w-4 h-4 mr-2" />
                    Receber
                  </Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>Receber Pedido?</AlertDialogTitle>
                    <AlertDialogDescription>
                      Isso confirmará a entrada dos itens no estoque e finalizará o pedido.
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>Cancelar</AlertDialogCancel>
                    <AlertDialogAction onClick={() => handleStatusChange('entregue')}>
                      Confirmar Recebimento
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            )}
          </div>
        }
      />

      <div className="p-4 space-y-6 max-w-4xl mx-auto">
        {/* Summary Card */}
        <Card>
          <CardHeader className="pb-4">
            <div className="flex justify-between items-start">
              <CardTitle className="text-lg">Resumo</CardTitle>
              <StatusBadge status={order.status} />
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-1">
                <p className="text-sm font-medium text-muted-foreground">Fornecedor</p>
                <p className="font-semibold text-lg">{order.suppliers?.name}</p>
                {(order.suppliers?.email || order.suppliers?.phone) && (
                  <p className="text-sm text-muted-foreground">
                    {order.suppliers.email} • {order.suppliers.phone}
                  </p>
                )}
              </div>
              
              <div className="space-y-1">
                <p className="text-sm font-medium text-muted-foreground">Solicitante</p>
                <div className="flex items-center gap-2">
                  <User className="w-4 h-4 text-muted-foreground" />
                  <span>{order.profiles_created?.full_name || "Desconhecido"}</span>
                </div>
              </div>
            </div>

            <Separator />

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
              <div className="flex items-center gap-2">
                <Calendar className="w-4 h-4 text-muted-foreground" />
                <div>
                  <p className="text-muted-foreground">Criado em</p>
                  <p className="font-medium">
                    {new Date(order.created_at).toLocaleString('pt-BR')}
                  </p>
                </div>
              </div>

              {order.approved_at && (
                <div className="flex items-center gap-2">
                  <CheckCircle className="w-4 h-4 text-success" />
                  <div>
                    <p className="text-muted-foreground">Aprovado em</p>
                    <p className="font-medium">
                      {new Date(order.approved_at).toLocaleString('pt-BR')}
                    </p>
                    {order.profiles_approved && (
                      <p className="text-xs text-muted-foreground">
                        por {order.profiles_approved.full_name}
                      </p>
                    )}
                  </div>
                </div>
              )}

              {order.delivered_at && (
                <div className="flex items-center gap-2">
                  <Archive className="w-4 h-4 text-blue-500" />
                  <div>
                    <p className="text-muted-foreground">Recebido em</p>
                    <p className="font-medium">
                      {new Date(order.delivered_at).toLocaleString('pt-BR')}
                    </p>
                  </div>
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Items List */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Itens do Pedido</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="divide-y">
              {order.items.map((item) => (
                <div key={item.id} className="py-3 flex justify-between items-center first:pt-0 last:pb-0">
                  <div>
                    <p className="font-medium">{item.ingredients?.name}</p>
                    <p className="text-sm text-muted-foreground">
                      {item.ingredients?.unit_measure}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="font-bold text-lg">
                      {item.quantity_requested} <span className="text-sm font-normal text-muted-foreground">{item.ingredients?.unit_measure}</span>
                    </p>
                    {item.unit_price && (
                      <p className="text-sm text-muted-foreground">
                        {item.unit_price.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })} / un
                      </p>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </AppLayout>
  );
};

export default PurchaseDetail;
