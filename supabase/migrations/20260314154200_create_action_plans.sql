-- Create Action Plans table for Checklist non-conformities
CREATE TYPE action_plan_status AS ENUM ('PENDING', 'IN_PROGRESS', 'RESOLVED', 'VERIFIED_BY_MANAGER');

CREATE TABLE checklist_action_plans (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  response_id uuid NOT NULL REFERENCES checklist_item_responses(id) ON DELETE CASCADE,
  unit_id uuid NOT NULL REFERENCES units(id) ON DELETE CASCADE,
  assigned_to uuid REFERENCES profiles(id) ON DELETE SET NULL,
  status action_plan_status DEFAULT 'PENDING' NOT NULL,
  description text NOT NULL,
  resolution_notes text,
  resolution_evidence_url text,
  due_date timestamp with time zone,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now()
);

-- Indexes
CREATE INDEX idx_checklist_action_plans_unit_id ON checklist_action_plans(unit_id);
CREATE INDEX idx_checklist_action_plans_response_id ON checklist_action_plans(response_id);
CREATE INDEX idx_checklist_action_plans_status ON checklist_action_plans(status);

-- Enable RLS
ALTER TABLE checklist_action_plans ENABLE ROW LEVEL SECURITY;

-- Basic RLS Policies (Users can see and edit plans for their units)
CREATE POLICY "Users can view action plans for their units" ON checklist_action_plans
  FOR SELECT
  USING (
    unit_id IN (
      SELECT unit_id FROM user_roles WHERE user_id = auth.uid() AND is_active = true
    )
    OR
    unit_id IN (
      SELECT unit_id FROM user_units WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Users can insert action plans for their units" ON checklist_action_plans
  FOR INSERT
  WITH CHECK (
    unit_id IN (
      SELECT unit_id FROM user_roles WHERE user_id = auth.uid() AND is_active = true
    )
    OR
    unit_id IN (
      SELECT unit_id FROM user_units WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Users can update action plans for their units" ON checklist_action_plans
  FOR UPDATE
  USING (
    unit_id IN (
      SELECT unit_id FROM user_roles WHERE user_id = auth.uid() AND is_active = true
    )
    OR
    unit_id IN (
      SELECT unit_id FROM user_units WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Users can delete action plans for their units" ON checklist_action_plans
  FOR DELETE
  USING (
     EXISTS (
        SELECT 1 FROM user_roles WHERE user_id = auth.uid() AND role IN ('admin_rede', 'gerente') AND unit_id = checklist_action_plans.unit_id AND is_active = true
     )
  );


