
import { Database } from "@/integrations/supabase/types";

export type TrainingStatus = Database["public"]["Enums"]["training_status"];
export type AppRole = Database["public"]["Enums"]["app_role"];

export interface Training {
  id: string;
  network_id: string;
  name: string;
  description: string | null;
  thumbnail_url?: string | null; // Added
  target_role: AppRole | null;
  is_mandatory: boolean;
  is_active: boolean;
  created_at: string | null;
  // Computed/Joined fields
  status?: TrainingStatus;
  progress?: number;
  type?: 'obrigatorio' | 'cargo' | 'opcional';
  duration_seconds?: number; // Added
}

// In our current schema, a Training contains lessons (videos) directly.
// We alias Training to TrainingModule for compatibility with the prompt structure if needed,
// or we can treat TrainingModule as a section of a training if we had sections.
// For now, we will assume TrainingModule is synonymous with Training in this flat schema.
export type TrainingModule = Training;

export interface TrainingLesson {
  id: string;
  training_id: string;
  title: string | null;
  video_url: string | null;
  order_index: number | null;
  duration_seconds: number | null;
  created_at: string | null;
  // Computed
  is_completed?: boolean;
}

export interface TrainingStep {
  id: string;
  training_id: string;
  description: string | null;
  order_index: number | null;
  required: boolean | null;
  created_at: string | null;
  // Computed
  is_checked?: boolean;
}

export interface UserTrainingProgress {
  id: string;
  user_id: string;
  training_id: string;
  status: TrainingStatus;
  score: number | null;
  started_at: string | null;
  completed_at: string | null;
  created_at: string | null;
  updated_at: string | null;
}
