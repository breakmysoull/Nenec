// Database types for the fast food operations platform

export type AppRole = 'super_admin' | 'admin' | 'manager' | 'operator' | 'lider_turno' | 'admin_rede' | 'gerente' | 'operador';

export type StockMovementType = 'compra' | 'producao' | 'venda' | 'perda' | 'ajuste';

export type OrderStatus = 'pendente' | 'aprovado' | 'entregue' | 'cancelado';

export type ChecklistType = 'abertura' | 'praca' | 'fechamento';

export type ChecklistItemType = 'check' | 'foto_obrigatoria' | 'video_opcional';

export type TrainingStatus = 'pendente' | 'em_andamento' | 'concluido';

export type UnitMeasure = 'kg' | 'g' | 'l' | 'ml' | 'un';

export interface Unit {
  id: string;
  name: string;
  slug?: string;
  is_active?: boolean;
  address?: string;
  city?: string;
  state?: string;
}

// Display helpers
export const roleLabels: Record<AppRole, string> = {
  super_admin: 'Super Admin',
  admin: 'Administrador',
  manager: 'Gerente',
  operator: 'Operador',
  // Legacy / PT-BR support
  admin_rede: 'Admin da Rede',
  gerente: 'Gerente',
  operador: 'Operador',
  lider_turno: 'Líder de Turno',
};

export const orderStatusLabels: Record<OrderStatus, string> = {
  pendente: 'Pendente',
  aprovado: 'Aprovado',
  entregue: 'Entregue',
  cancelado: 'Cancelado',
};

export const checklistTypeLabels: Record<ChecklistType, string> = {
  abertura: 'Abertura',
  praca: 'Praça',
  fechamento: 'Fechamento',
};

export const stockMovementLabels: Record<StockMovementType, string> = {
  compra: 'Compra',
  producao: 'Produção',
  venda: 'Venda',
  perda: 'Perda',
  ajuste: 'Ajuste',
};

export const trainingStatusLabels: Record<TrainingStatus, string> = {
  pendente: 'Pendente',
  em_andamento: 'Em Andamento',
  concluido: 'Concluído',
};

export const unitMeasureLabels: Record<UnitMeasure, string> = {
  kg: 'Quilograma',
  g: 'Grama',
  l: 'Litro',
  ml: 'Mililitro',
  un: 'Unidade',
};
