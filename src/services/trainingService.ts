import { db } from "@/lib/firebase";
import { collectionGroup, getDocs, doc, getDoc, setDoc, updateDoc, deleteDoc, collection } from "firebase/firestore";

// The types should match what was exported before, since other files depend on them.
export type TrainingStatus = 'pendente' | 'em_andamento' | 'concluido';

export interface Training {
  id: string;
  name: string;
  description: string | null;
  is_mandatory: boolean;
  status: TrainingStatus;
  progress: number;
  type: 'obrigatorio' | 'cargo' | 'opcional';
}

export interface TrainingVideo {
  id: string;
  title: string | null;
  video_url: string | null;
  order_index: number | null;
  duration_seconds: number | null;
}

export interface TrainingStep {
  id: string;
  description: string | null;
  order_index: number | null;
  required: boolean | null;
}

export interface TrainingDetails extends Training {
  videos: TrainingVideo[];
  steps: TrainingStep[];
  completedStepIds: string[];
}

export const trainingService = {
  getUserTrainings: async (userId: string): Promise<Training[]> => {
    const trainingsSnap = await getDocs(collectionGroup(db, 'trainings'));
    
    const progressRef = collection(db, "users", userId, "training_progress");
    const progressSnap = await getDocs(progressRef);
    const progressMap = new Map();
    progressSnap.forEach(d => progressMap.set(d.id, d.data()));

    return trainingsSnap.docs.map(d => {
      const data = d.data();
      const p = progressMap.get(d.id);
      return {
        id: d.id,
        name: data.name || 'Sem nome',
        description: data.description || null,
        is_mandatory: data.is_mandatory || false,
        status: p ? p.status : 'pendente',
        progress: p ? p.score : 0,
        type: data.is_mandatory ? 'obrigatorio' : 'opcional'
      } as Training;
    });
  },

  getTrainingDetails: async (trainingId: string, userId: string): Promise<TrainingDetails> => {
    const trainingsSnap = await getDocs(collectionGroup(db, 'trainings'));
    const trainingDoc = trainingsSnap.docs.find(d => d.id === trainingId);
    
    if (!trainingDoc) throw new Error("Training not found");
    const trainingData = trainingDoc.data();
    
    const videosRef = collection(trainingDoc.ref, "videos");
    const videosSnap = await getDocs(videosRef);
    const videos = videosSnap.docs.map(d => ({id: d.id, ...d.data()})) as TrainingVideo[];

    const stepsRef = collection(trainingDoc.ref, "steps");
    const stepsSnap = await getDocs(stepsRef);
    const steps = stepsSnap.docs.map(d => ({id: d.id, ...d.data()})) as TrainingStep[];

    const pDoc = await getDoc(doc(db, "users", userId, "training_progress", trainingId));
    const pData = pDoc.exists() ? pDoc.data() : null;

    const stepsProgressRef = collection(db, "users", userId, "training_steps");
    const stepsProgressSnap = await getDocs(stepsProgressRef);
    const completedStepIds = stepsProgressSnap.docs.map(d => d.id);
    
    return {
      id: trainingId,
      name: trainingData.name || '',
      description: trainingData.description || '',
      is_mandatory: trainingData.is_mandatory || false,
      status: pData ? pData.status : 'pendente',
      progress: pData ? pData.score : 0,
      type: trainingData.is_mandatory ? 'obrigatorio' : 'opcional',
      videos: videos,
      steps: steps,
      completedStepIds: completedStepIds
    };
  },

  startTraining: async (trainingId: string, userId: string): Promise<void> => {
    const pRef = doc(db, "users", userId, "training_progress", trainingId);
    const pDoc = await getDoc(pRef);
    if (!pDoc.exists()) {
      await setDoc(pRef, {
        status: 'em_andamento',
        score: 0,
        started_at: new Date().toISOString()
      });
    }
  },

  toggleStep: async (stepId: string, userId: string, isChecked: boolean): Promise<void> => {
    const stepRef = doc(db, "users", userId, "training_steps", stepId);
    if (isChecked) {
      await setDoc(stepRef, { completed: true });
    } else {
      await deleteDoc(stepRef);
    }
  },

  completeTraining: async (trainingId: string, userId: string): Promise<void> => {
    const pRef = doc(db, "users", userId, "training_progress", trainingId);
    await setDoc(pRef, {
      status: 'concluido',
      score: 100,
      completed_at: new Date().toISOString()
    }, { merge: true });
  }
};
