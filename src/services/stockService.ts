import { db } from "@/lib/firebase";
import { collection, query, where, getDocs, collectionGroup, addDoc } from "firebase/firestore";

export interface StockItem {
  id: string;
  unit_id: string;
  ingredient_name: string;
  unit_measure: string;
  stock: number;
  minimum_stock?: number;
  last_updated: string;
}

export interface StockMovement {
  id: string;
  unit_id: string;
  type: 'IN' | 'OUT';
  quantity: number;
  ingredient_name: string;
  order_id?: string;
  date: string;
  user_name?: string;
}

export const stockService = {
  getInventory: async (unitId?: string): Promise<StockItem[]> => {
    try {
      const q = unitId 
        ? query(collectionGroup(db, 'inventory'), where('unit_id', '==', unitId)) 
        : query(collectionGroup(db, 'inventory'));
      
      const snap = await getDocs(q);
      return snap.docs.map(d => ({ id: d.id, ...d.data() } as StockItem));
    } catch {
      return [];
    }
  },

  getMovements: async (unitId?: string): Promise<StockMovement[]> => {
    try {
      const q = unitId 
        ? query(collectionGroup(db, 'stock_movements'), where('unit_id', '==', unitId)) 
        : query(collectionGroup(db, 'stock_movements'));
      
      const snap = await getDocs(q);
      return snap.docs.map(d => ({ id: d.id, ...d.data() } as StockMovement));
    } catch {
      return [];
    }
  },

  recordMovement: async (networkId: string, unitId: string, movement: Omit<StockMovement, 'id' | 'date'>) => {
    const ref = collection(db, 'networks', networkId, 'units', unitId, 'stock_movements');
    await addDoc(ref, {
      ...movement,
      date: new Date().toISOString()
    });
  }
};
