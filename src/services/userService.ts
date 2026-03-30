import { db } from "@/lib/firebase";
import { collection, query, where, getDocs, doc, setDoc, updateDoc, deleteDoc, collectionGroup, getDoc } from "firebase/firestore";
import { AppRole } from "@/types/database";

// Instead of actual Auth creation (which requires Admin SDK), we will mock it or let them do it from Firebase Console
// But we'll save the user roles mapping
export const userService = {
  getUnits: async () => {
    const snap = await getDocs(collectionGroup(db, 'units'));
    return snap.docs.map(d => ({ id: d.id, name: d.data().name }));
  },
  
  getTrainings: async (networkId: string) => {
    const snap = await getDocs(query(collection(db, 'networks', networkId, 'trainings'), where('is_active', '==', true)));
    return snap.docs.map(d => ({ id: d.id, name: d.data().name, description: d.data().description }));
  },

  getUsers: async (networkId?: string) => {
    let q = query(collectionGroup(db, 'user_roles'));
    if (networkId) q = query(collectionGroup(db, 'user_roles'), where('network_id', '==', networkId));
    
    const snap = await getDocs(q);
    const users = [];

    // N+1 for profiles, minimal implementation
    for (const d of snap.docs) {
      const roleData = d.data();
      const profileSnap = await getDoc(doc(db, 'users', d.id)); // Assuming users/{uid} holds profile
      const pData = profileSnap.exists() ? profileSnap.data() : { full_name: 'Usuário sem nome', email: 'Sem email' };
      
      let unitName = 'Todas';
      if (roleData.unit_id) {
         try {
           const unitDoc = await getDocs(query(collectionGroup(db, 'units'), where('id', '==', roleData.unit_id)));
           if (!unitDoc.empty) unitName = unitDoc.docs[0].data().name;
         } catch {}
      }

      users.push({
        id: roleData.user_id || d.id,
        name: pData.full_name || 'Usuário sem nome',
        email: pData.email || 'Sem email',
        role: roleData.role,
        unit: unitName,
        unitId: roleData.unit_id || '',
        isActive: roleData.is_active !== false
      });
    }
    return users;
  },

  updateUserRole: async (userId: string, targetRole: AppRole, targetUnitId: string | null) => {
    const roleRef = doc(db, 'user_roles', userId);
    await updateDoc(roleRef, { role: targetRole, unit_id: targetUnitId });
  },

  updateUserProfile: async (userId: string, newName: string) => {
    const profileRef = doc(db, 'users', userId);
    await setDoc(profileRef, { full_name: newName }, { merge: true });
  },

  toggleUserActive: async (userId: string, currentStatus: boolean) => {
    const roleRef = doc(db, 'user_roles', userId);
    await updateDoc(roleRef, { is_active: !currentStatus });
  },

  deleteUserRole: async (userId: string) => {
    const roleRef = doc(db, 'user_roles', userId);
    await deleteDoc(roleRef);
  },

  getUserTrainingProgress: async (userId: string) => {
    const pRef = collection(db, 'users', userId, 'training_progress');
    const pDocs = await getDocs(pRef);
    return pDocs.docs.map(d => ({
       training_id: d.id,
       status: d.data().status,
       score: d.data().score,
       started_at: d.data().started_at,
       completed_at: d.data().completed_at
    }));
  },

  assignTraining: async (userId: string, trainingId: string) => {
    await setDoc(doc(db, 'users', userId, 'training_progress', trainingId), {
       status: 'pendente',
       score: 0,
       started_at: null
    }, { merge: true });
  },

  removeTraining: async (userId: string, trainingId: string) => {
    await deleteDoc(doc(db, 'users', userId, 'training_progress', trainingId));
  }
};
