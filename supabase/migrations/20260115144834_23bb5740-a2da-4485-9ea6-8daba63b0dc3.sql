-- =====================================================
-- FAST FOOD OPERATIONS PLATFORM - MVP DATABASE SCHEMA
-- =====================================================

-- 1. ENUM TYPES
-- =====================================================

-- User roles enum
CREATE TYPE public.app_role AS ENUM ('operador', 'lider_turno', 'gerente', 'admin_rede');

-- Stock movement types
CREATE TYPE public.stock_movement_type AS ENUM ('compra', 'producao', 'venda', 'perda', 'ajuste');

-- Order status
CREATE TYPE public.order_status AS ENUM ('pendente', 'aprovado', 'entregue', 'cancelado');

-- Checklist types
CREATE TYPE public.checklist_type AS ENUM ('abertura', 'praca', 'fechamento');

-- Checklist item types
CREATE TYPE public.checklist_item_type AS ENUM ('check', 'foto_obrigatoria', 'video_opcional');

-- Training status
CREATE TYPE public.training_status AS ENUM ('pendente', 'em_andamento', 'concluido');

-- Unit of measure
CREATE TYPE public.unit_measure AS ENUM ('kg', 'g', 'l', 'ml', 'un');

-- =====================================================
-- 2. NETWORKS & UNITS (Core multi-tenant structure)
-- =====================================================

-- Networks (Redes de restaurantes)
CREATE TABLE public.networks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  slug TEXT UNIQUE NOT NULL,
  logo_url TEXT,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Units (Unidades/Lojas)
CREATE TABLE public.units (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  network_id UUID REFERENCES public.networks(id) ON DELETE CASCADE NOT NULL,
  name TEXT NOT NULL,
  code TEXT NOT NULL,
  address TEXT,
  city TEXT,
  state TEXT,
  phone TEXT,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(network_id, code)
);

-- Shifts (Turnos)
CREATE TABLE public.shifts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  unit_id UUID REFERENCES public.units(id) ON DELETE CASCADE NOT NULL,
  name TEXT NOT NULL,
  start_time TIME NOT NULL,
  end_time TIME NOT NULL,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- =====================================================
-- 3. USERS & PERMISSIONS (RBAC System)
-- =====================================================

-- User profiles
CREATE TABLE public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  full_name TEXT NOT NULL,
  avatar_url TEXT,
  phone TEXT,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- User roles (role per unit)
CREATE TABLE public.user_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  network_id UUID REFERENCES public.networks(id) ON DELETE CASCADE NOT NULL,
  unit_id UUID REFERENCES public.units(id) ON DELETE CASCADE,
  role app_role NOT NULL,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(user_id, network_id, unit_id, role)
);

-- =====================================================
-- 4. PRODUCTS & RECIPES (Fichas Técnicas)
-- =====================================================

-- Ingredients (Ingredientes base)
CREATE TABLE public.ingredients (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  network_id UUID REFERENCES public.networks(id) ON DELETE CASCADE NOT NULL,
  name TEXT NOT NULL,
  unit_measure unit_measure NOT NULL,
  min_stock DECIMAL(10,3) DEFAULT 0,
  cost_per_unit DECIMAL(10,2) DEFAULT 0,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Products (Produtos finais)
CREATE TABLE public.products (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  network_id UUID REFERENCES public.networks(id) ON DELETE CASCADE NOT NULL,
  name TEXT NOT NULL,
  sku TEXT,
  description TEXT,
  price DECIMAL(10,2) DEFAULT 0,
  image_url TEXT,
  is_active BOOLEAN DEFAULT true,
  requires_training BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Recipes (Receitas - produto final)
CREATE TABLE public.recipes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id UUID REFERENCES public.products(id) ON DELETE CASCADE NOT NULL UNIQUE,
  name TEXT NOT NULL,
  instructions TEXT,
  prep_time_minutes INTEGER DEFAULT 0,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Recipe items (Ingredientes da receita)
CREATE TABLE public.recipe_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  recipe_id UUID REFERENCES public.recipes(id) ON DELETE CASCADE NOT NULL,
  ingredient_id UUID REFERENCES public.ingredients(id) ON DELETE CASCADE NOT NULL,
  quantity DECIMAL(10,3) NOT NULL,
  unit_measure unit_measure NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- =====================================================
-- 5. STOCK MANAGEMENT (Estoque Calculado)
-- =====================================================

-- Stock movements (Movimentações de estoque)
CREATE TABLE public.stock_movements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  unit_id UUID REFERENCES public.units(id) ON DELETE CASCADE NOT NULL,
  ingredient_id UUID REFERENCES public.ingredients(id) ON DELETE CASCADE NOT NULL,
  movement_type stock_movement_type NOT NULL,
  quantity DECIMAL(10,3) NOT NULL,
  reason TEXT,
  reference_id UUID,
  reference_type TEXT,
  created_by UUID REFERENCES public.profiles(id) NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- =====================================================
-- 6. ORDERS & SUPPLY (Pedidos)
-- =====================================================

-- Orders (Pedidos de fornecimento)
CREATE TABLE public.orders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  unit_id UUID REFERENCES public.units(id) ON DELETE CASCADE NOT NULL,
  status order_status DEFAULT 'pendente',
  notes TEXT,
  total_estimated DECIMAL(10,2) DEFAULT 0,
  requested_by UUID REFERENCES public.profiles(id) NOT NULL,
  approved_by UUID REFERENCES public.profiles(id),
  requested_at TIMESTAMPTZ DEFAULT now(),
  approved_at TIMESTAMPTZ,
  delivered_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Order items
CREATE TABLE public.order_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id UUID REFERENCES public.orders(id) ON DELETE CASCADE NOT NULL,
  ingredient_id UUID REFERENCES public.ingredients(id) ON DELETE CASCADE NOT NULL,
  quantity_requested DECIMAL(10,3) NOT NULL,
  quantity_delivered DECIMAL(10,3),
  unit_price DECIMAL(10,2) DEFAULT 0,
  is_auto_suggested BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- =====================================================
-- 7. CHECKLISTS (Com Evidência)
-- =====================================================

-- Checklist templates
CREATE TABLE public.checklists (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  network_id UUID REFERENCES public.networks(id) ON DELETE CASCADE NOT NULL,
  name TEXT NOT NULL,
  checklist_type checklist_type NOT NULL,
  description TEXT,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Checklist items (template)
CREATE TABLE public.checklist_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  checklist_id UUID REFERENCES public.checklists(id) ON DELETE CASCADE NOT NULL,
  title TEXT NOT NULL,
  description TEXT,
  item_type checklist_item_type DEFAULT 'check',
  order_index INTEGER DEFAULT 0,
  is_required BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Checklist responses (execução)
CREATE TABLE public.checklist_responses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  checklist_id UUID REFERENCES public.checklists(id) ON DELETE CASCADE NOT NULL,
  unit_id UUID REFERENCES public.units(id) ON DELETE CASCADE NOT NULL,
  shift_id UUID REFERENCES public.shifts(id),
  completed_by UUID REFERENCES public.profiles(id) NOT NULL,
  started_at TIMESTAMPTZ DEFAULT now(),
  completed_at TIMESTAMPTZ,
  is_complete BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Checklist item responses
CREATE TABLE public.checklist_item_responses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  response_id UUID REFERENCES public.checklist_responses(id) ON DELETE CASCADE NOT NULL,
  item_id UUID REFERENCES public.checklist_items(id) ON DELETE CASCADE NOT NULL,
  is_checked BOOLEAN DEFAULT false,
  notes TEXT,
  checked_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Checklist evidences (fotos/vídeos)
CREATE TABLE public.checklist_evidences (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  item_response_id UUID REFERENCES public.checklist_item_responses(id) ON DELETE CASCADE NOT NULL,
  file_url TEXT NOT NULL,
  file_type TEXT NOT NULL,
  uploaded_by UUID REFERENCES public.profiles(id) NOT NULL,
  uploaded_at TIMESTAMPTZ DEFAULT now()
);

-- =====================================================
-- 8. TRAINING (Treinamento Básico)
-- =====================================================

-- Training modules
CREATE TABLE public.trainings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  network_id UUID REFERENCES public.networks(id) ON DELETE CASCADE NOT NULL,
  name TEXT NOT NULL,
  description TEXT,
  target_role app_role,
  product_id UUID REFERENCES public.products(id),
  is_mandatory BOOLEAN DEFAULT false,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Training contents
CREATE TABLE public.training_contents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  training_id UUID REFERENCES public.trainings(id) ON DELETE CASCADE NOT NULL,
  title TEXT NOT NULL,
  content_type TEXT NOT NULL,
  content_url TEXT,
  content_text TEXT,
  duration_minutes INTEGER DEFAULT 0,
  order_index INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- User trainings (progresso)
CREATE TABLE public.user_trainings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  training_id UUID REFERENCES public.trainings(id) ON DELETE CASCADE NOT NULL,
  status training_status DEFAULT 'pendente',
  started_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  score INTEGER,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(user_id, training_id)
);

-- =====================================================
-- 9. FUTURE MODULES (Estrutura vazia para expansão)
-- =====================================================

-- Audit log (para auditoria futura)
CREATE TABLE public.audit_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES public.profiles(id),
  action TEXT NOT NULL,
  table_name TEXT,
  record_id UUID,
  old_data JSONB,
  new_data JSONB,
  ip_address TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Certifications (para certificações futuras)
CREATE TABLE public.certifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  network_id UUID REFERENCES public.networks(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  is_active BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- =====================================================
-- 10. ENABLE RLS ON ALL TABLES
-- =====================================================

ALTER TABLE public.networks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.units ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.shifts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ingredients ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.products ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.recipes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.recipe_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.stock_movements ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.order_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.checklists ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.checklist_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.checklist_responses ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.checklist_item_responses ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.checklist_evidences ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.trainings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.training_contents ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_trainings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.certifications ENABLE ROW LEVEL SECURITY;

-- =====================================================
-- 11. SECURITY DEFINER FUNCTIONS
-- =====================================================

-- Function to check user role
CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role app_role)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_roles
    WHERE user_id = _user_id
      AND role = _role
      AND is_active = true
  )
$$;

-- Function to get user's networks
CREATE OR REPLACE FUNCTION public.get_user_networks(_user_id UUID)
RETURNS SETOF UUID
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT DISTINCT network_id
  FROM public.user_roles
  WHERE user_id = _user_id
    AND is_active = true
$$;

-- Function to get user's units
CREATE OR REPLACE FUNCTION public.get_user_units(_user_id UUID)
RETURNS SETOF UUID
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT DISTINCT unit_id
  FROM public.user_roles
  WHERE user_id = _user_id
    AND is_active = true
    AND unit_id IS NOT NULL
$$;

-- Function to check if user has access to network
CREATE OR REPLACE FUNCTION public.has_network_access(_user_id UUID, _network_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_roles
    WHERE user_id = _user_id
      AND network_id = _network_id
      AND is_active = true
  )
$$;

-- Function to check if user has access to unit
CREATE OR REPLACE FUNCTION public.has_unit_access(_user_id UUID, _unit_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_roles
    WHERE user_id = _user_id
      AND (unit_id = _unit_id OR unit_id IS NULL)
      AND is_active = true
  )
$$;

-- =====================================================
-- 12. RLS POLICIES
-- =====================================================

-- Profiles policies
CREATE POLICY "Users can view own profile" ON public.profiles
  FOR SELECT USING (auth.uid() = id);

CREATE POLICY "Users can update own profile" ON public.profiles
  FOR UPDATE USING (auth.uid() = id);

CREATE POLICY "Users can insert own profile" ON public.profiles
  FOR INSERT WITH CHECK (auth.uid() = id);

-- Networks policies
CREATE POLICY "Users can view their networks" ON public.networks
  FOR SELECT USING (
    id IN (SELECT public.get_user_networks(auth.uid()))
  );

-- Units policies
CREATE POLICY "Users can view units in their networks" ON public.units
  FOR SELECT USING (
    network_id IN (SELECT public.get_user_networks(auth.uid()))
  );

-- Shifts policies
CREATE POLICY "Users can view shifts in their units" ON public.shifts
  FOR SELECT USING (
    unit_id IN (SELECT public.get_user_units(auth.uid()))
    OR EXISTS (
      SELECT 1 FROM public.units u
      WHERE u.id = unit_id
      AND u.network_id IN (SELECT public.get_user_networks(auth.uid()))
    )
  );

-- User roles policies (view own roles)
CREATE POLICY "Users can view own roles" ON public.user_roles
  FOR SELECT USING (user_id = auth.uid());

-- Ingredients policies
CREATE POLICY "Users can view ingredients in their networks" ON public.ingredients
  FOR SELECT USING (
    network_id IN (SELECT public.get_user_networks(auth.uid()))
  );

CREATE POLICY "Managers can manage ingredients" ON public.ingredients
  FOR ALL USING (
    network_id IN (SELECT public.get_user_networks(auth.uid()))
    AND (public.has_role(auth.uid(), 'gerente') OR public.has_role(auth.uid(), 'admin_rede'))
  );

-- Products policies
CREATE POLICY "Users can view products in their networks" ON public.products
  FOR SELECT USING (
    network_id IN (SELECT public.get_user_networks(auth.uid()))
  );

CREATE POLICY "Managers can manage products" ON public.products
  FOR ALL USING (
    network_id IN (SELECT public.get_user_networks(auth.uid()))
    AND (public.has_role(auth.uid(), 'gerente') OR public.has_role(auth.uid(), 'admin_rede'))
  );

-- Recipes policies
CREATE POLICY "Users can view recipes" ON public.recipes
  FOR SELECT USING (
    product_id IN (
      SELECT id FROM public.products 
      WHERE network_id IN (SELECT public.get_user_networks(auth.uid()))
    )
  );

-- Recipe items policies
CREATE POLICY "Users can view recipe items" ON public.recipe_items
  FOR SELECT USING (
    recipe_id IN (SELECT id FROM public.recipes)
  );

-- Stock movements policies
CREATE POLICY "Users can view stock in their units" ON public.stock_movements
  FOR SELECT USING (
    public.has_unit_access(auth.uid(), unit_id)
  );

CREATE POLICY "Operators can create stock movements" ON public.stock_movements
  FOR INSERT WITH CHECK (
    public.has_unit_access(auth.uid(), unit_id)
    AND created_by = auth.uid()
  );

-- Orders policies
CREATE POLICY "Users can view orders in their units" ON public.orders
  FOR SELECT USING (
    public.has_unit_access(auth.uid(), unit_id)
  );

CREATE POLICY "Users can create orders" ON public.orders
  FOR INSERT WITH CHECK (
    public.has_unit_access(auth.uid(), unit_id)
    AND requested_by = auth.uid()
  );

CREATE POLICY "Managers can update orders" ON public.orders
  FOR UPDATE USING (
    public.has_unit_access(auth.uid(), unit_id)
    AND (public.has_role(auth.uid(), 'gerente') OR public.has_role(auth.uid(), 'admin_rede'))
  );

-- Order items policies
CREATE POLICY "Users can view order items" ON public.order_items
  FOR SELECT USING (
    order_id IN (SELECT id FROM public.orders)
  );

CREATE POLICY "Users can manage order items" ON public.order_items
  FOR ALL USING (
    order_id IN (SELECT id FROM public.orders)
  );

-- Checklists policies
CREATE POLICY "Users can view checklists in their networks" ON public.checklists
  FOR SELECT USING (
    network_id IN (SELECT public.get_user_networks(auth.uid()))
  );

-- Checklist items policies
CREATE POLICY "Users can view checklist items" ON public.checklist_items
  FOR SELECT USING (
    checklist_id IN (SELECT id FROM public.checklists)
  );

-- Checklist responses policies
CREATE POLICY "Users can view responses in their units" ON public.checklist_responses
  FOR SELECT USING (
    public.has_unit_access(auth.uid(), unit_id)
  );

CREATE POLICY "Users can create responses" ON public.checklist_responses
  FOR INSERT WITH CHECK (
    public.has_unit_access(auth.uid(), unit_id)
    AND completed_by = auth.uid()
  );

CREATE POLICY "Users can update own responses" ON public.checklist_responses
  FOR UPDATE USING (completed_by = auth.uid());

-- Checklist item responses policies
CREATE POLICY "Users can view item responses" ON public.checklist_item_responses
  FOR SELECT USING (
    response_id IN (SELECT id FROM public.checklist_responses)
  );

CREATE POLICY "Users can manage item responses" ON public.checklist_item_responses
  FOR ALL USING (
    response_id IN (SELECT id FROM public.checklist_responses)
  );

-- Checklist evidences policies
CREATE POLICY "Users can view evidences" ON public.checklist_evidences
  FOR SELECT USING (
    item_response_id IN (SELECT id FROM public.checklist_item_responses)
  );

CREATE POLICY "Users can upload evidences" ON public.checklist_evidences
  FOR INSERT WITH CHECK (uploaded_by = auth.uid());

-- Trainings policies
CREATE POLICY "Users can view trainings in their networks" ON public.trainings
  FOR SELECT USING (
    network_id IN (SELECT public.get_user_networks(auth.uid()))
  );

-- Training contents policies
CREATE POLICY "Users can view training contents" ON public.training_contents
  FOR SELECT USING (
    training_id IN (SELECT id FROM public.trainings)
  );

-- User trainings policies
CREATE POLICY "Users can view own trainings" ON public.user_trainings
  FOR SELECT USING (user_id = auth.uid());

CREATE POLICY "Users can update own trainings" ON public.user_trainings
  FOR UPDATE USING (user_id = auth.uid());

CREATE POLICY "Users can insert own trainings" ON public.user_trainings
  FOR INSERT WITH CHECK (user_id = auth.uid());

-- Audit logs (only admins)
CREATE POLICY "Admins can view audit logs" ON public.audit_logs
  FOR SELECT USING (public.has_role(auth.uid(), 'admin_rede'));

-- Certifications (inactive for now)
CREATE POLICY "Users can view certifications" ON public.certifications
  FOR SELECT USING (
    network_id IN (SELECT public.get_user_networks(auth.uid()))
  );

-- =====================================================
-- 13. TRIGGERS
-- =====================================================

-- Function to update updated_at
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Apply updated_at triggers
CREATE TRIGGER update_networks_updated_at BEFORE UPDATE ON public.networks
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_units_updated_at BEFORE UPDATE ON public.units
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_profiles_updated_at BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_ingredients_updated_at BEFORE UPDATE ON public.ingredients
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_products_updated_at BEFORE UPDATE ON public.products
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_recipes_updated_at BEFORE UPDATE ON public.recipes
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_orders_updated_at BEFORE UPDATE ON public.orders
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_trainings_updated_at BEFORE UPDATE ON public.trainings
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_user_trainings_updated_at BEFORE UPDATE ON public.user_trainings
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_checklists_updated_at BEFORE UPDATE ON public.checklists
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Function to create profile on signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, email, full_name)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.email)
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger for new user signup
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- =====================================================
-- 14. STORAGE BUCKETS FOR EVIDENCES
-- =====================================================

INSERT INTO storage.buckets (id, name, public)
VALUES ('evidences', 'evidences', false)
ON CONFLICT (id) DO NOTHING;

-- Storage policies for evidences
CREATE POLICY "Users can upload evidences" ON storage.objects
  FOR INSERT WITH CHECK (
    bucket_id = 'evidences' 
    AND auth.role() = 'authenticated'
  );

CREATE POLICY "Users can view evidences" ON storage.objects
  FOR SELECT USING (
    bucket_id = 'evidences' 
    AND auth.role() = 'authenticated'
  );