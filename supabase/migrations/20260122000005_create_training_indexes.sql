-- Índices para performance nas tabelas de treinamento

-- Trainings
CREATE INDEX IF NOT EXISTS idx_trainings_network_id ON trainings(network_id);
CREATE INDEX IF NOT EXISTS idx_trainings_target_role ON trainings(target_role);
CREATE INDEX IF NOT EXISTS idx_trainings_is_active ON trainings(is_active);

-- Training Videos
CREATE INDEX IF NOT EXISTS idx_training_videos_training_id ON training_videos(training_id);
CREATE INDEX IF NOT EXISTS idx_training_videos_order_index ON training_videos(order_index);

-- Training Steps
CREATE INDEX IF NOT EXISTS idx_training_steps_training_id ON training_steps(training_id);

-- User Training Progress
CREATE INDEX IF NOT EXISTS idx_user_training_progress_user_id ON user_training_progress(user_id);
CREATE INDEX IF NOT EXISTS idx_user_training_progress_training_id ON user_training_progress(training_id);
CREATE INDEX IF NOT EXISTS idx_user_training_progress_status ON user_training_progress(status);
