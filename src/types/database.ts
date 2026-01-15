// Database types for the fast food operations platform

export type AppRole = 'operador' | 'lider_turno' | 'gerente' | 'admin_rede';

export type StockMovementType = 'compra' | 'producao' | 'venda' | 'perda' | 'ajuste';

export type OrderStatus = 'pendente' | 'aprovado' | 'entregue' | 'cancelado';

export type ChecklistType = 'abertura' | 'praca' | 'fechamento';

export type ChecklistItemType = 'check' | 'foto_obrigatoria' | 'video_opcional';

export type TrainingStatus = 'pendente' | 'em_andamento' | 'concluido';

export type UnitMeasure = 'kg' | 'g' | 'l' | 'ml' | 'un';

// Display helpers
export const roleLabels: Record<AppRole, string> = {
  operador: 'Operador',
  lider_turno: 'Líder de Turno',
  gerente: 'Gerente',
  admin_rede: 'Admin da Rede',
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
