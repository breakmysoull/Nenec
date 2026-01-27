
-- =================================================================
-- CORREÇÃO CRÍTICA DE PERMISSÕES (GRANTS)
-- =================================================================

-- 1. Garantir uso do schema public
GRANT USAGE ON SCHEMA public TO anon, authenticated, service_role;

-- 2. Permissões explícitas para PROFILES
-- Sem isso, mesmo com RLS correto, o usuário recebe erro de permissão (ou 406)
GRANT SELECT, INSERT, UPDATE ON TABLE public.profiles TO authenticated;
GRANT SELECT ON TABLE public.profiles TO anon; -- Caso precise ler perfil público
GRANT ALL ON TABLE public.profiles TO service_role;

-- 3. Permissões explícitas para USER_ROLES
GRANT SELECT ON TABLE public.user_roles TO authenticated;
GRANT ALL ON TABLE public.user_roles TO service_role;

-- 4. Permissões explícitas para UNITS e NETWORKS (necessário para o fluxo de roles)
GRANT SELECT ON TABLE public.units TO authenticated;
GRANT SELECT ON TABLE public.networks TO authenticated;

-- =================================================================
-- VERIFICAÇÃO DE INTEGRIDADE (TRIGGER)
-- =================================================================

-- Reforça a trigger para garantir que ela roda como SECURITY DEFINER (bypass RLS na criação)
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER 
LANGUAGE plpgsql 
SECURITY DEFINER -- CRÍTICO: Roda com permissões de admin, não do usuário logado
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (id, email, full_name)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.email)
  )
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END;
$$;
