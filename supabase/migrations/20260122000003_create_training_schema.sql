-- Tabela de Módulos de Treinamento
CREATE TABLE IF NOT EXISTS training_modules (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL,
  description text,
  network_id uuid NOT NULL REFERENCES networks(id),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Tabela de Vídeos de Treinamento
CREATE TABLE IF NOT EXISTS training_videos (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  module_id uuid NOT NULL REFERENCES training_modules(id) ON DELETE CASCADE,
  title text NOT NULL,
  video_url text NOT NULL,
  duration_seconds integer,
  order_index integer DEFAULT 0,
  created_at timestamptz DEFAULT now()
);

-- Tabela de Progresso de Treinamento
CREATE TABLE IF NOT EXISTS training_progress (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id),
  video_id uuid NOT NULL REFERENCES training_videos(id) ON DELETE CASCADE,
  completed_at timestamptz DEFAULT now(),
  UNIQUE(user_id, video_id)
);

-- RLS para Treinamentos
ALTER TABLE training_modules ENABLE ROW LEVEL SECURITY;
ALTER TABLE training_videos ENABLE ROW LEVEL SECURITY;
ALTER TABLE training_progress ENABLE ROW LEVEL SECURITY;

-- Policies
CREATE POLICY "Users can view training modules from their network"
ON training_modules FOR SELECT
USING (
  network_id IN (
    SELECT network_id FROM user_roles 
    WHERE user_id = auth.uid() 
    AND is_active = true
  )
);

CREATE POLICY "Users can view training videos from their network"
ON training_videos FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM training_modules tm
    JOIN user_roles ur ON ur.network_id = tm.network_id
    WHERE tm.id = training_videos.module_id
    AND ur.user_id = auth.uid()
    AND ur.is_active = true
  )
);

CREATE POLICY "Users can manage their own progress"
ON training_progress FOR ALL
USING (user_id = auth.uid());
