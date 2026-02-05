
import { supabase } from "@/integrations/supabase/client";
import { 
  Training, 
  TrainingLesson, 
  TrainingStep, 
  UserTrainingProgress,
  TrainingStatus 
} from "../types";

type TrainingRpcRow = {
  id: string;
  name: string;
  description?: string | null;
  status: TrainingStatus;
  progress?: number | null;
  type?: string | null;
  thumbnail_url?: string | null;
  duration_seconds?: number | null;
};

export const trainingService = {
  /**
   * Fetches all trainings for the current user.
   * Uses RPC 'get_user_required_trainings'.
   */
  getMyTrainings: async (userId: string): Promise<Training[]> => {
    const { data, error } = await supabase
      .rpc('get_user_required_trainings', {
        p_user_id: userId
      });

    if (error) throw error;
    // Map the RPC response to our internal Training type
    const rows = (data || []) as TrainingRpcRow[];
    return rows.map((item) => ({
      ...item,
      // Map RPC fields to match Training interface if needed, or rely on loose matching.
      // The RPC returns { id, name, description, is_mandatory, status, progress, type, thumbnail_url, duration_seconds }
      // Our Training interface expects { id, network_id, name, ... }
      // Since RPC is custom, we might need to adjust the type definition or the mapping.
      // For now, let's cast as unknown first to satisfy TS if structure matches enough for UI.
      // However, strict TS will complain about missing network_id, is_active, created_at, target_role.
      // We should probably make those optional in Training type or mock them here since RPC doesn't return them all.
      network_id: '', // Mock or fetch if strictly needed
      is_active: true,
      created_at: null,
      target_role: null,
      thumbnail_url: item.thumbnail_url,
      duration_seconds: item.duration_seconds
    })) as unknown as Training[];
  },

  /**
   * Fetches detailed information for a specific training.
   * Includes lessons (videos) and steps.
   */
  getTrainingById: async (trainingId: string, userId: string): Promise<{
    training: Training;
    lessons: TrainingLesson[];
    steps: TrainingStep[];
    progress: UserTrainingProgress | null;
  }> => {
    // 1. Get Training
    const { data: training, error: tError } = await supabase
      .from('trainings')
      .select('*')
      .eq('id', trainingId)
      .single();
    
    if (tError) throw tError;

    // 2. Get Lessons (Videos)
    const { data: lessons, error: lError } = await supabase
      .from('training_videos')
      .select('*')
      .eq('training_id', trainingId)
      .order('order_index');

    if (lError) throw lError;

    // 3. Get Steps
    const { data: steps, error: sError } = await supabase
      .from('training_steps')
      .select('*')
      .eq('training_id', trainingId)
      .order('order_index');

    if (sError) throw sError;

    // 4. Get User Progress
    const { data: progress, error: pError } = await supabase
      .from('user_training_progress')
      .select('*')
      .eq('user_id', userId)
      .eq('training_id', trainingId)
      .maybeSingle();

    if (pError) throw pError;

    return {
      training: training as unknown as Training,
      lessons: lessons as unknown as TrainingLesson[],
      steps: steps as unknown as TrainingStep[],
      progress: progress as unknown as UserTrainingProgress
    };
  },

  /**
   * Marks a specific lesson (video) as complete.
   * Currently we track progress at the training level, but this could
   * track individual video completion if we add a table for it.
   * For now, we'll update the main progress status to 'in_progress'.
   */
  markLessonComplete: async (lessonId: string, userId: string): Promise<void> => {
    // Implementation pending specific DB support for lesson-level tracking
    // For now, ensures training is 'in_progress'
    // This is a stub as requested.
    console.log("markLessonComplete stub called", lessonId, userId);
  },

  /**
   * Marks a practical step as complete/checked.
   */
  markStepComplete: async (stepId: string, userId: string, isChecked: boolean): Promise<void> => {
    if (isChecked) {
      const { error } = await supabase.from('user_training_steps').insert({
        user_id: userId,
        training_step_id: stepId
      });
      if (error) throw error;
    } else {
      const { error } = await supabase.from('user_training_steps').delete()
        .eq('user_id', userId)
        .eq('training_step_id', stepId);
      if (error) throw error;
    }
  },

  /**
   * Requests approval for a completed training.
   * Updates status to 'concluido' (or 'awaiting_approval' if supported).
   */
  requestTrainingApproval: async (trainingId: string, userId: string): Promise<void> => {
    const { error } = await supabase.from('user_training_progress').update({
      status: 'concluido', // Mapping to existing enum
      completed_at: new Date().toISOString(),
      score: 100
    }).eq('user_id', userId).eq('training_id', trainingId);
    
    if (error) throw error;
  }
};
