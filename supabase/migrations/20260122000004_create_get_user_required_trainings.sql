-- Função para buscar treinamentos obrigatórios do usuário
CREATE OR REPLACE FUNCTION public.get_user_required_trainings(p_user_id uuid)
RETURNS TABLE (
  id uuid,
  name text,
  description text,
  is_mandatory boolean,
  status training_status,
  progress integer,
  type text
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_network_id uuid;
  v_role app_role;
BEGIN
  -- Obter role e network do usuário
  SELECT role, network_id INTO v_role, v_network_id
  FROM user_roles
  WHERE user_id = p_user_id AND is_active = true
  LIMIT 1;

  RETURN QUERY
  SELECT 
    t.id,
    t.name,
    t.description,
    t.is_mandatory,
    COALESCE(ut.status, 'pendente'::training_status) as status,
    COALESCE(ut.score, 0) as progress,
    CASE 
      WHEN t.is_mandatory THEN 'obrigatorio'
      WHEN t.target_role = v_role THEN 'cargo'
      ELSE 'opcional'
    END as type
  FROM trainings t
  LEFT JOIN user_training_progress ut ON ut.training_id = t.id AND ut.user_id = p_user_id
  WHERE t.network_id = v_network_id
  AND t.is_active = true
  AND (
    t.is_mandatory = true 
    OR t.target_role = v_role
    OR t.target_role IS NULL
  );
END;
$$;

-- Grant execute permission
GRANT EXECUTE ON FUNCTION public.get_user_required_trainings(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_user_required_trainings(uuid) TO service_role;
