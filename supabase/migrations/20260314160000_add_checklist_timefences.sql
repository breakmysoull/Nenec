-- Add timefence columns to the checklists table
ALTER TABLE checklists ADD COLUMN IF NOT EXISTS timefence_start time without time zone;
ALTER TABLE checklists ADD COLUMN IF NOT EXISTS timefence_end time without time zone;

-- Optional: Add a comment to describe the fields
COMMENT ON COLUMN checklists.timefence_start IS 'Hora inicial permitida para a execução do checklist (HH:MM:SS)';
COMMENT ON COLUMN checklists.timefence_end IS 'Hora final permitida para a execução do checklist (HH:MM:SS)';
