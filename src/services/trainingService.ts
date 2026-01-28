
import { supabase } from "@/lib/supabase";
import { Database } from "@/integrations/supabase/types";

export type TrainingStatus = Database["public"]["Enums"]["training_status"];

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
    const { data, error } = await supabase
      .rpc('get_user_required_trainings', {
        p_user_id: userId
      });

    if (error) {
      console.error('Error fetching user trainings:', error);
      throw error;
    }

    return data as Training[];
  },

  getTrainingDetails: async (trainingId: string, userId: string): Promise<TrainingDetails> => {
    // 1. Get Training Info
    const { data: training, error: tError } = await supabase
      .from('trainings')
      .select('*')
      .eq('id', trainingId)
      .single();
    
    if (tError) throw tError;

    // 2. Get Videos
    const { data: videos, error: vError } = await supabase
      .from('training_videos')
      .select('*')
      .eq('training_id', trainingId)
      .order('order_index');

    if (vError) throw vError;

    // 3. Get Steps
    const { data: steps, error: sError } = await supabase
      .from('training_steps')
      .select('*')
      .eq('training_id', trainingId)
      .order('order_index');

    if (sError) throw sError;

    // 4. Get User Progress (completed steps)
    const { data: userSteps, error: usError } = await supabase
      .from('user_training_steps')
      .select('training_step_id')
      .eq('user_id', userId);

    if (usError) throw usError;

    // 5. Get User Status (to match Training interface)
    const { data: userProgress } = await supabase
      .from('user_training_progress')
      .select('status, score')
      .eq('user_id', userId)
      .eq('training_id', trainingId)
      .single();

    return {
      id: training.id,
      name: training.name,
      description: training.description,
      is_mandatory: training.is_mandatory || false,
      status: userProgress?.status || 'pendente',
      progress: userProgress?.score || 0, // Using score as progress for now
      type: training.is_mandatory ? 'obrigatorio' : 'opcional', // Simplified logic
      videos: videos || [],
      steps: steps || [],
      completedStepIds: userSteps?.map(s => s.training_step_id) || []
    };
  },

  startTraining: async (trainingId: string, userId: string): Promise<void> => {
    // Check if progress exists
    const { data: existing } = await supabase
      .from('user_training_progress')
      .select('id')
      .eq('training_id', trainingId)
      .eq('user_id', userId)
      .single();

    if (!existing) {
      const { error } = await supabase
        .from('user_training_progress')
        .insert({
          training_id: trainingId,
          user_id: userId,
          status: 'em_andamento',
          started_at: new Date().toISOString()
        });

      if (error) throw error;
    }
  },

  toggleStep: async (stepId: string, userId: string, isChecked: boolean): Promise<void> => {
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

  completeTraining: async (trainingId: string, userId: string): Promise<void> => {
    const { error } = await supabase.from('user_training_progress').update({
      status: 'concluido',
      completed_at: new Date().toISOString(),
      score: 100
    }).eq('user_id', userId).eq('training_id', trainingId);
    
    if (error) throw error;
  }
};
