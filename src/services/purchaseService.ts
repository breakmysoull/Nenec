import { db } from "@/lib/firebase";
import { collection, doc, getDoc, getDocs, updateDoc, writeBatch, query, collectionGroup, where, orderBy } from "firebase/firestore";
import { OrderStatus } from "@/types/database";

// Define the expected Firestore document shape
export interface FirestoreOrder {
  id: string;
  status: OrderStatus;
  created_at: string;
  approved_at?: string;
  delivered_at?: string;
  updated_at?: string;
  notes?: string;
  unit_id: string;
  network_id: string;
  requested_by?: string;
  approved_by?: string;
  creator_name?: string;
  approver_name?: string;
  items: {
    id: string;
    quantity_requested: number;
    unit_price?: number;
    ingredient_id?: string;
    ingredient_name: string;
    ingredient_unit_measure: string;
  }[];
}

export const purchaseService = {
  getOrders: async (unitId?: string): Promise<FirestoreOrder[]> => {
    try {
      let ordersQuery;
      if (unitId) {
         ordersQuery = query(collectionGroup(db, 'orders'), where('unit_id', '==', unitId));
      } else {
         ordersQuery = query(collectionGroup(db, 'orders'));
      }
      const snapshot = await getDocs(ordersQuery);
      return snapshot.docs.map(doc => ({ id: doc.id, ...(doc.data() as any) }) as FirestoreOrder);
    } catch (error) {
      console.error("Error fetching orders:", error);
      return [];
    }
  },

  getOrderById: async (orderId: string): Promise<FirestoreOrder | null> => {
    try {
      const snapshot = await getDocs(collectionGroup(db, 'orders'));
      const orderDoc = snapshot.docs.find(d => d.id === orderId);
      if (!orderDoc) return null;
      return { id: orderDoc.id, ...orderDoc.data() } as FirestoreOrder;
    } catch (error) {
      console.error("Error fetching order:", error);
      return null;
    }
  },

  updateOrderStatus: async (orderId: string, updates: Partial<FirestoreOrder>): Promise<void> => {
    const snapshot = await getDocs(collectionGroup(db, 'orders'));
    const orderDoc = snapshot.docs.find(d => d.id === orderId);
    if (!orderDoc) throw new Error("Order not found");

    await updateDoc(orderDoc.ref, updates);
  },

  receivePurchaseOrder: async (purchaseOrderId: string): Promise<void> => {
    const snapshot = await getDocs(collectionGroup(db, 'orders'));
    const orderDoc = snapshot.docs.find(d => d.id === purchaseOrderId);
    if (!orderDoc) throw new Error("Order not found");

    const orderData = orderDoc.data() as FirestoreOrder;

    const batch = writeBatch(db);

    // Update order status
    batch.update(orderDoc.ref, {
      status: 'entregue',
      delivered_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    });

    // Client-side batch stock movement
    // Normally this should be a Cloud Function, but processing client-side as requested
    const unitId = orderData.unit_id;
    const networkId = orderData.network_id || 'codex_network_default';
    const inventoryRef = collection(db, 'networks', networkId, 'units', unitId, 'inventory');

    for (const item of (orderData.items || [])) {
       // Search for the ingredient in the unit's inventory
       const invQuery = query(inventoryRef, where('ingredient_name', '==', item.ingredient_name));
       const invSnap = await getDocs(invQuery);

       if (!invSnap.empty) {
         const invDoc = invSnap.docs[0];
         const currentStock = invDoc.data().stock || 0;
         batch.update(invDoc.ref, { stock: currentStock + item.quantity_requested });
       } else {
         // Create new inventory item if not exists
         const newInvRef = doc(inventoryRef);
         batch.set(newInvRef, {
           ingredient_name: item.ingredient_name,
           unit_measure: item.ingredient_unit_measure,
           stock: item.quantity_requested,
           last_updated: new Date().toISOString()
         });
       }

       // Optionally add an audit trail movement document
       const movementsRef = doc(collection(db, 'networks', networkId, 'units', unitId, 'stock_movements'));
       batch.set(movementsRef, {
         type: 'IN',
         quantity: item.quantity_requested,
         ingredient_name: item.ingredient_name,
         order_id: purchaseOrderId,
         date: new Date().toISOString()
       });
    }

    await batch.commit();
  }
};
