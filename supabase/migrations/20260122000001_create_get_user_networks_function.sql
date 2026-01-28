-- Função auxiliar para obter redes do usuário
CREATE OR REPLACE FUNCTION public.get_user_networks(p_user_id uuid)
RETURNS TABLE (network_id uuid)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  SELECT DISTINCT ur.network_id
  FROM user_roles ur
  WHERE ur.user_id = p_user_id
  AND ur.is_active = true;
END;
$$;

-- Grant execute permission
GRANT EXECUTE ON FUNCTION public.get_user_networks(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_user_networks(uuid) TO service_role;
