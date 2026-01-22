  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    // 1. Executa o Login
    const { data, error } = await signIn(email, password);

    if (error) {
      toast.error("Erro ao fazer login", { description: error.message });
      setLoading(false);
      return;
    }

    // 2. Verificação crítica: Sessão foi criada?
    if (data.session) {
      // Opcional: Pequeno delay ou verificação para garantir que o AuthContext pegou a mudança
      // Mas geralmente, o navigate funciona se o AuthContext for reativo o suficiente.
      
      toast.success("Login realizado com sucesso!");
      navigate("/dashboard");
    } else {
       // Caso raro onde não há erro mas também não há sessão (ex: email confirm pendente se estivesse ativo)
       setLoading(false);
    }
  };
-- Enable RLS on profiles if not already enabled
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- Allow users to read their own profile
DROP POLICY IF EXISTS "Users can read own profile" ON public.profiles;
CREATE POLICY "Users can read own profile" 
ON public.profiles 
FOR SELECT 
USING (auth.uid() = id);

-- Allow users to update their own profile
DROP POLICY IF EXISTS "Users can update own profile" ON public.profiles;
CREATE POLICY "Users can update own profile" 
ON public.profiles 
FOR UPDATE 
USING (auth.uid() = id);

-- Enable RLS on user_roles
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

-- Allow users to read their own roles
DROP POLICY IF EXISTS "Users can read own roles" ON public.user_roles;
CREATE POLICY "Users can read own roles" 
ON public.user_roles 
FOR SELECT 
USING (auth.uid() = user_id);

-- Ensure the trigger for creating a profile exists and is correct
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER 
LANGUAGE plpgsql 
SECURITY DEFINER
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

-- Drop trigger if exists to ensure clean creation
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;

-- Create the trigger
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();
