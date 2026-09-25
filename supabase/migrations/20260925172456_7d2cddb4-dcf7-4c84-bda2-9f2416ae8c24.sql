-- ROLES
CREATE TYPE public.app_role AS ENUM ('god','super_admin','admin','colaborador','estafeta');

CREATE TABLE public.profiles (
  id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  nome text NOT NULL DEFAULT '',
  telefone text,
  carta_conducao text,
  base text,
  ativo boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.profiles TO authenticated;
GRANT ALL ON public.profiles TO service_role;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

CREATE TABLE public.user_roles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role public.app_role NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, role)
);
GRANT SELECT ON public.user_roles TO authenticated;
GRANT ALL ON public.user_roles TO service_role;
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

CREATE OR REPLACE FUNCTION public.has_role(_user_id uuid, _role public.app_role)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = _user_id AND role = _role);
$$;

CREATE OR REPLACE FUNCTION public.is_gestor(_user_id uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = _user_id AND role IN ('god','super_admin','admin','colaborador')
  );
$$;

CREATE POLICY "profiles_select_self_or_gestor" ON public.profiles FOR SELECT TO authenticated
  USING (id = auth.uid() OR public.is_gestor(auth.uid()));
CREATE POLICY "profiles_update_self_or_gestor" ON public.profiles FOR UPDATE TO authenticated
  USING (id = auth.uid() OR public.is_gestor(auth.uid()));
CREATE POLICY "profiles_insert_self" ON public.profiles FOR INSERT TO authenticated
  WITH CHECK (id = auth.uid());

CREATE POLICY "user_roles_select_self_or_gestor" ON public.user_roles FOR SELECT TO authenticated
  USING (user_id = auth.uid() OR public.is_gestor(auth.uid()));

-- signup trigger: profile + first user becomes admin
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE has_any boolean;
BEGIN
  INSERT INTO public.profiles (id, nome)
  VALUES (NEW.id, COALESCE(NEW.raw_user_meta_data->>'nome', split_part(NEW.email, '@', 1)))
  ON CONFLICT (id) DO NOTHING;

  SELECT EXISTS (SELECT 1 FROM public.user_roles) INTO has_any;
  INSERT INTO public.user_roles (user_id, role)
  VALUES (NEW.id, CASE WHEN has_any THEN 'estafeta'::public.app_role ELSE 'admin'::public.app_role END)
  ON CONFLICT DO NOTHING;
  RETURN NEW;
END;
$$;

CREATE TRIGGER on_auth_user_created
AFTER INSERT ON auth.users FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS trigger LANGUAGE plpgsql SET search_path = public AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END;
$$;
CREATE TRIGGER profiles_updated_at BEFORE UPDATE ON public.profiles FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- VEHICLES
CREATE TABLE public.vehicles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  matricula text NOT NULL UNIQUE,
  modelo text NOT NULL DEFAULT '',
  estado text NOT NULL DEFAULT 'ativa',
  km integer NOT NULL DEFAULT 0,
  proxima_manutencao date,
  estafeta_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.vehicles TO authenticated;
GRANT ALL ON public.vehicles TO service_role;
ALTER TABLE public.vehicles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "vehicles_select" ON public.vehicles FOR SELECT TO authenticated
  USING (public.is_gestor(auth.uid()) OR estafeta_id = auth.uid());
CREATE POLICY "vehicles_write" ON public.vehicles FOR ALL TO authenticated
  USING (public.is_gestor(auth.uid())) WITH CHECK (public.is_gestor(auth.uid()));

-- ROUTES
CREATE TABLE public.delivery_routes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  nome text NOT NULL,
  data date NOT NULL DEFAULT current_date,
  estafeta_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  vehicle_id uuid REFERENCES public.vehicles(id) ON DELETE SET NULL,
  estado text NOT NULL DEFAULT 'planeada',
  valor_por_parada numeric(10,2) NOT NULL DEFAULT 0.70,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.delivery_routes TO authenticated;
GRANT ALL ON public.delivery_routes TO service_role;
ALTER TABLE public.delivery_routes ENABLE ROW LEVEL SECURITY;
CREATE POLICY "routes_select" ON public.delivery_routes FOR SELECT TO authenticated
  USING (public.is_gestor(auth.uid()) OR estafeta_id = auth.uid());
CREATE POLICY "routes_update_own" ON public.delivery_routes FOR UPDATE TO authenticated
  USING (public.is_gestor(auth.uid()) OR estafeta_id = auth.uid());
CREATE POLICY "routes_insert_gestor" ON public.delivery_routes FOR INSERT TO authenticated
  WITH CHECK (public.is_gestor(auth.uid()));
CREATE POLICY "routes_delete_gestor" ON public.delivery_routes FOR DELETE TO authenticated
  USING (public.is_gestor(auth.uid()));

-- STOPS
CREATE TABLE public.stops (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  route_id uuid NOT NULL REFERENCES public.delivery_routes(id) ON DELETE CASCADE,
  ordem integer NOT NULL DEFAULT 1,
  tipo text NOT NULL DEFAULT 'entrega',
  cliente text NOT NULL DEFAULT '',
  telefone text,
  morada text NOT NULL,
  codigo_postal text,
  lat double precision,
  lng double precision,
  objetos integer NOT NULL DEFAULT 1,
  estado text NOT NULL DEFAULT 'pendente',
  checklist jsonb NOT NULL DEFAULT '{}'::jsonb,
  assinatura_nome text,
  foto_url text,
  motivo_insucesso text,
  iniciada_em timestamptz,
  concluida_em timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.stops TO authenticated;
GRANT ALL ON public.stops TO service_role;
ALTER TABLE public.stops ENABLE ROW LEVEL SECURITY;
CREATE POLICY "stops_select" ON public.stops FOR SELECT TO authenticated
  USING (public.is_gestor(auth.uid()) OR EXISTS (
    SELECT 1 FROM public.delivery_routes r WHERE r.id = route_id AND r.estafeta_id = auth.uid()));
CREATE POLICY "stops_update" ON public.stops FOR UPDATE TO authenticated
  USING (public.is_gestor(auth.uid()) OR EXISTS (
    SELECT 1 FROM public.delivery_routes r WHERE r.id = route_id AND r.estafeta_id = auth.uid()));
CREATE POLICY "stops_insert_gestor" ON public.stops FOR INSERT TO authenticated
  WITH CHECK (public.is_gestor(auth.uid()));
CREATE POLICY "stops_delete_gestor" ON public.stops FOR DELETE TO authenticated
  USING (public.is_gestor(auth.uid()));

-- TIME ENTRIES
CREATE TABLE public.time_entries (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  tipo text NOT NULL,
  lat double precision,
  lng double precision,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.time_entries TO authenticated;
GRANT ALL ON public.time_entries TO service_role;
ALTER TABLE public.time_entries ENABLE ROW LEVEL SECURITY;
CREATE POLICY "time_entries_select" ON public.time_entries FOR SELECT TO authenticated
  USING (user_id = auth.uid() OR public.is_gestor(auth.uid()));
CREATE POLICY "time_entries_insert_self" ON public.time_entries FOR INSERT TO authenticated
  WITH CHECK (user_id = auth.uid());

-- EXPENSES
CREATE TABLE public.expenses (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  route_id uuid REFERENCES public.delivery_routes(id) ON DELETE SET NULL,
  tipo text NOT NULL DEFAULT 'combustivel',
  valor numeric(10,2) NOT NULL DEFAULT 0,
  descricao text,
  data date NOT NULL DEFAULT current_date,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.expenses TO authenticated;
GRANT ALL ON public.expenses TO service_role;
ALTER TABLE public.expenses ENABLE ROW LEVEL SECURITY;
CREATE POLICY "expenses_select" ON public.expenses FOR SELECT TO authenticated
  USING (user_id = auth.uid() OR public.is_gestor(auth.uid()));
CREATE POLICY "expenses_insert_self" ON public.expenses FOR INSERT TO authenticated
  WITH CHECK (user_id = auth.uid());
CREATE POLICY "expenses_update" ON public.expenses FOR UPDATE TO authenticated
  USING (user_id = auth.uid() OR public.is_gestor(auth.uid()));
CREATE POLICY "expenses_delete" ON public.expenses FOR DELETE TO authenticated
  USING (user_id = auth.uid() OR public.is_gestor(auth.uid()));

-- MAINTENANCE
CREATE TABLE public.maintenance_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  vehicle_id uuid NOT NULL REFERENCES public.vehicles(id) ON DELETE CASCADE,
  criado_por uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  descricao text NOT NULL,
  estado text NOT NULL DEFAULT 'aberto',
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.maintenance_requests TO authenticated;
GRANT ALL ON public.maintenance_requests TO service_role;
ALTER TABLE public.maintenance_requests ENABLE ROW LEVEL SECURITY;
CREATE POLICY "maint_select" ON public.maintenance_requests FOR SELECT TO authenticated
  USING (public.is_gestor(auth.uid()) OR criado_por = auth.uid());
CREATE POLICY "maint_insert" ON public.maintenance_requests FOR INSERT TO authenticated
  WITH CHECK (criado_por = auth.uid() OR public.is_gestor(auth.uid()));
CREATE POLICY "maint_update_gestor" ON public.maintenance_requests FOR UPDATE TO authenticated
  USING (public.is_gestor(auth.uid()));

-- SEED
INSERT INTO public.vehicles (id, matricula, modelo, estado, km, proxima_manutencao) VALUES
  ('11111111-1111-4111-8111-111111111111','AA-12-BB','Renault Kangoo','ativa',84210,'2026-11-15'),
  ('22222222-2222-4222-8222-222222222222','CC-34-DD','Peugeot Partner','manutencao',132500,'2026-10-02');

INSERT INTO public.delivery_routes (id, nome, data, vehicle_id, estado, valor_por_parada) VALUES
  ('33333333-3333-4333-8333-333333333333','Lisboa Centro - Manhã', current_date, '11111111-1111-4111-8111-111111111111','planeada',0.85);

INSERT INTO public.stops (route_id, ordem, tipo, cliente, telefone, morada, codigo_postal, lat, lng, objetos) VALUES
  ('33333333-3333-4333-8333-333333333333',1,'entrega','Ana Marques','+351912000001','Rua Augusta 24, Lisboa','1100-048',38.7118,-9.1394,2),
  ('33333333-3333-4333-8333-333333333333',2,'entrega','João Pinto','+351912000002','Praça do Comércio 8, Lisboa','1100-148',38.7075,-9.1364,1),
  ('33333333-3333-4333-8333-333333333333',3,'entrega','Sofia Lopes','+351912000003','Av. da Liberdade 110, Lisboa','1250-096',38.7205,-9.1454,3),
  ('33333333-3333-4333-8333-333333333333',4,'recolha','Loja Bairro Alto','+351912000004','Rua da Rosa 55, Lisboa','1200-386',38.7139,-9.1459,1),
  ('33333333-3333-4333-8333-333333333333',5,'entrega','Miguel Costa','+351912000005','Rua Garrett 12, Lisboa','1200-204',38.7107,-9.1417,1),
  ('33333333-3333-4333-8333-333333333333',6,'entrega','Clara Nunes','+351912000006','Campo de Ourique 300, Lisboa','1350-000',38.7186,-9.1671,2);