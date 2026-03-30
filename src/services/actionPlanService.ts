import { db, storage } from "@/lib/firebase";
import { collection, query, where, getDocs, updateDoc, doc, collectionGroup } from "firebase/firestore";
import { uploadBytes, getDownloadURL, ref } from "firebase/storage";
import { ChecklistActionPlan } from "@/types/database";

export const actionPlanService = {
  getPlans: async (unitId: string) => {
    try {
      const q = query(collectionGroup(db, 'action_plans'), where('unit_id', '==', unitId), where('status', 'in', ['PENDING', 'IN_PROGRESS']));
      const snap = await getDocs(q);
      return snap.docs.map(d => ({ id: d.id, ...d.data() } as ChecklistActionPlan));
    } catch (e) {
      console.error(e);
      return [];
    }
  },
  
  uploadPhoto: async (file: File, planId: string) => {
    const storageRef = ref(storage, `action_plans/${planId}-${Date.now()}.jpg`);
    await uploadBytes(storageRef, file, { contentType: file.type });
    return await getDownloadURL(storageRef);
  },

  resolvePlan: async (planId: string, status: string, notes: string, photoUrl: string) => {
    // We need the document reference, but we only have planId.
    // Query collection group first to find its ref
    const snap = await getDocs(query(collectionGroup(db, 'action_plans')));
    const planDoc = snap.docs.find(d => d.id === planId);
    if (!planDoc) throw new Error("Plan not found");

    await updateDoc(planDoc.ref, {
      status,
      resolution_notes: notes,
      resolution_evidence_url: photoUrl
    });
  }
};
