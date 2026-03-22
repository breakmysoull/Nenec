import { AppRole } from "@/types/database";

export type Permission = 
  | 'view_dashboard'
  | 'view_stock'
  | 'view_orders'
  | 'view_checklists'
  | 'view_checklist_review'
  | 'view_training'
  | 'view_products'
  | 'view_units'
  | 'view_users'
  | 'manage_stock'
  | 'manage_orders'
  | 'manage_users'
  | 'manage_settings'
  | 'manage_checklists'
  | 'create_order'
  | 'submit_order'
  | 'approve_order'
  | 'receive_order';

const ROLE_PERMISSIONS: Record<AppRole, Permission[]> = {
  super_admin: [
    'view_dashboard', 'view_stock', 'view_orders', 'view_checklists', 
    'view_checklist_review', 'view_training', 'view_products', 'view_units', 
    'view_users', 'manage_stock', 'manage_orders', 'manage_users', 'manage_settings',
    'manage_checklists', 'create_order', 'submit_order', 'approve_order', 'receive_order'
  ],
  admin: [
    'view_dashboard', 'view_stock', 'view_orders', 'view_checklists', 
    'view_checklist_review', 'view_training', 'view_products', 'view_units', 
    'view_users', 'manage_stock', 'manage_orders', 'manage_users', 'manage_settings',
    'manage_checklists', 'create_order', 'submit_order', 'approve_order', 'receive_order'
  ],
  manager: [
    'view_dashboard', 'view_stock', 'view_orders', 'view_checklists', 
    'view_checklist_review', 'view_training', 'view_users', 'manage_stock', 'manage_orders',
    'manage_users', 'manage_checklists', 'create_order', 'submit_order', 'approve_order', 'receive_order'
  ],
  operator: [
    'view_dashboard', 'view_stock', 'view_checklists', 'view_training',
    'create_order', 'submit_order'
  ],
  // Legacy mappings
  admin_rede: [
    'view_dashboard', 'view_stock', 'view_orders', 'view_checklists', 
    'view_checklist_review', 'view_training', 'view_products', 'view_units', 
    'view_users', 'manage_stock', 'manage_orders', 'manage_users', 'manage_settings',
    'manage_checklists', 'create_order', 'submit_order', 'approve_order', 'receive_order'
  ],
  gerente: [
    'view_dashboard', 'view_stock', 'view_orders', 'view_checklists', 
    'view_checklist_review', 'view_training', 'view_users', 'manage_stock', 'manage_orders',
    'manage_users', 'manage_checklists', 'create_order', 'submit_order', 'approve_order', 'receive_order'
  ],
  lider_turno: [
    'view_dashboard', 'view_stock', 'view_orders', 'view_checklists', 
    'view_checklist_review', 'view_training', 'view_users', 'manage_stock', 'manage_orders',
    'manage_users', 'manage_checklists', 'create_order', 'submit_order', 'approve_order', 'receive_order'
  ],
  operador: [
    'view_dashboard', 'view_stock', 'view_checklists', 'view_training',
    'create_order', 'submit_order'
  ],
  trainee: [
    'view_training'
  ]
};

export const hasPermission = (role: AppRole | undefined, permission: Permission): boolean => {
  if (!role) return false;
  
  // Super Admin bypass
  if (role === 'super_admin') return true;

  const permissions = ROLE_PERMISSIONS[role] || [];
  return permissions.includes(permission);
};

// Helper to normalize roles
export const normalizeRole = (role: string): AppRole => {
  if (role === 'admin_rede') return 'admin';
  if (role === 'gerente') return 'manager';
  if (role === 'operador') return 'operator';
  if (role === 'lider_turno') return 'manager';
  return role as AppRole;
};

// Hierarchy definition: higher index = more power
const ROLE_HIERARCHY: Record<AppRole, number> = {
  super_admin: 100,
  admin: 50,
  // Legacy
  admin_rede: 50,
  manager: 25,
  gerente: 25,
  lider_turno: 25,
  operator: 10,
  operador: 10,
  trainee: 5
};

export const canCreateRole = (currentUserRole: AppRole | null, targetRole: AppRole): boolean => {
  if (!currentUserRole) return false;
  
  const normalizedCurrent = normalizeRole(currentUserRole);
  const normalizedTarget = normalizeRole(targetRole);

  // Super Admin can create anything except another Super Admin
  if (normalizedCurrent === 'super_admin') {
    return normalizedTarget !== 'super_admin';
  }

  // Admin can create Manager, Operator and Trainee
  if (normalizedCurrent === 'admin') {
    return ['manager', 'operator', 'trainee'].includes(normalizedTarget);
  }

  // Manager can create Operator and Trainee
  if (normalizedCurrent === 'manager') {
    return ['operator', 'trainee'].includes(normalizedTarget);
  }

  return false;
};

export const canManageUser = (currentUserRole: AppRole | null, targetUserRole: AppRole): boolean => {
  if (!currentUserRole) return false;
  
  const normalizedCurrent = normalizeRole(currentUserRole);
  const normalizedTarget = normalizeRole(targetUserRole);

  // Super Admin manages everyone except themselves (logic handled elsewhere) or other super admins
  if (normalizedCurrent === 'super_admin') return normalizedTarget !== 'super_admin';

  // Strict hierarchy check
  const currentLevel = ROLE_HIERARCHY[normalizedCurrent] || 0;
  const targetLevel = ROLE_HIERARCHY[normalizedTarget] || 0;

  return currentLevel > targetLevel;
};

/**
 * Centralized role check helpers — use these instead of comparing role strings directly.
 * They cover BOTH the new English roles (manager, admin) AND legacy Portuguese roles
 * (gerente, admin_rede, lider_turno, operador) that may come from the database.
 */
export const isManagerOrAbove = (role: AppRole | null): boolean => {
  if (!role) return false;
  const normalized = normalizeRole(role);
  return normalized === 'manager' || normalized === 'admin' || normalized === 'super_admin';
};

export const isAdminOrAbove = (role: AppRole | null): boolean => {
  if (!role) return false;
  const normalized = normalizeRole(role);
  return normalized === 'admin' || normalized === 'super_admin';
};
