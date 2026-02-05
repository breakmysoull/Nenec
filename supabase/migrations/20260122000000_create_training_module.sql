-- Migration: Create Training Module (MVP)
-- Description: Implements the training module with tables for trainings, videos, steps, and user progress.
-- Note: Drops existing training tables from previous MVP schema to avoid conflicts.

-- 0. Cleanup old tables if they exist (to allow fresh creation of the requested schema)
DROP TABLE IF EXISTS public.user_trainings;
DROP TABLE IF EXISTS public.training_contents;
DROP TABLE IF EXISTS public.trainings;

-- 1. Tabela trainings
CREATE TABLE public.trainings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  network_id UUID REFERENCES public.networks(id) ON DELETE CASCADE NOT NULL,
  name TEXT NOT NULL,
  description TEXT,
  thumbnail_url TEXT, -- Added for MVP
  target_role app_role, -- Ex: 'operador', 'cozinha', 'gerente'
  is_mandatory BOOLEAN DEFAULT false,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- 2. Tabela training_videos
CREATE TABLE public.training_videos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  training_id UUID REFERENCES public.trainings(id) ON DELETE CASCADE NOT NULL,
  title TEXT,
  video_url TEXT,
  order_index INTEGER DEFAULT 0,
  duration_seconds INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- 3. Tabela training_steps
CREATE TABLE public.training_steps (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  training_id UUID REFERENCES public.trainings(id) ON DELETE CASCADE NOT NULL,
  description TEXT,
  order_index INTEGER DEFAULT 0,
  required BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- 4. Tabela user_training_progress
CREATE TABLE public.user_training_progress (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  training_id UUID REFERENCES public.trainings(id) ON DELETE CASCADE NOT NULL,
  status training_status DEFAULT 'pendente'::training_status,
  score INTEGER DEFAULT 0,
  started_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(user_id, training_id)
);

-- 5. Tabela user_training_steps
CREATE TABLE public.user_training_steps (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  training_step_id UUID REFERENCES public.training_steps(id) ON DELETE CASCADE NOT NULL,
  checked_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(user_id, training_step_id)
);

-- Indexes for performance
CREATE INDEX idx_trainings_network ON public.trainings(network_id);
CREATE INDEX idx_training_videos_training ON public.training_videos(training_id);
CREATE INDEX idx_training_steps_training ON public.training_steps(training_id);
CREATE INDEX idx_user_training_progress_user ON public.user_training_progress(user_id);
CREATE INDEX idx_user_training_progress_training ON public.user_training_progress(training_id);
CREATE INDEX idx_user_training_steps_user ON public.user_training_steps(user_id);

-- Enable Row Level Security (RLS)
ALTER TABLE public.trainings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.training_videos ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.training_steps ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_training_progress ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_training_steps ENABLE ROW LEVEL SECURITY;

-- RLS Policies

-- Trainings: Visible to users in the same network
CREATE POLICY "Users can view trainings in their network" ON public.trainings
  FOR SELECT USING (
    network_id IN (SELECT public.get_user_networks(auth.uid()))
  );

-- Training Videos: Visible if parent training is visible
CREATE POLICY "Users can view training videos" ON public.training_videos
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.trainings t
      WHERE t.id = training_videos.training_id
      AND t.network_id IN (SELECT public.get_user_networks(auth.uid()))
    )
  );

-- Training Steps: Visible if parent training is visible
CREATE POLICY "Users can view training steps" ON public.training_steps
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.trainings t
      WHERE t.id = training_steps.training_id
      AND t.network_id IN (SELECT public.get_user_networks(auth.uid()))
    )
  );

-- User Progress: Users can view and update their own progress
CREATE POLICY "Users can view own training progress" ON public.user_training_progress
  FOR SELECT USING (user_id = auth.uid());

CREATE POLICY "Users can update own training progress" ON public.user_training_progress
  FOR ALL USING (user_id = auth.uid());

-- User Steps: Users can view and update their own steps
CREATE POLICY "Users can view own training steps" ON public.user_training_steps
  FOR SELECT USING (user_id = auth.uid());

CREATE POLICY "Users can update own training steps" ON public.user_training_steps
  FOR ALL USING (user_id = auth.uid());
