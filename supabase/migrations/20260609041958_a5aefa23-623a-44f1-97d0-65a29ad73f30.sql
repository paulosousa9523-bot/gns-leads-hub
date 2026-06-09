
-- =========================================================
-- 1) Enum de papéis
-- =========================================================
DO $$ BEGIN
  CREATE TYPE public.app_role AS ENUM ('vendedor','gestor','juridico','admin_restrito');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- =========================================================
-- 2) Tabela profiles
-- =========================================================
CREATE TABLE IF NOT EXISTS public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  display_name TEXT NOT NULL UNIQUE,
  restricted_vendors TEXT[],
  criado TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, UPDATE ON public.profiles TO authenticated;
GRANT ALL ON public.profiles TO service_role;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "profiles_read_all_auth" ON public.profiles;
CREATE POLICY "profiles_read_all_auth" ON public.profiles
  FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS "profiles_update_self" ON public.profiles;
CREATE POLICY "profiles_update_self" ON public.profiles
  FOR UPDATE TO authenticated USING (id = auth.uid()) WITH CHECK (id = auth.uid());

-- =========================================================
-- 3) Tabela user_roles
-- =========================================================
CREATE TABLE IF NOT EXISTS public.user_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role public.app_role NOT NULL,
  UNIQUE (user_id, role)
);
GRANT SELECT ON public.user_roles TO authenticated;
GRANT ALL ON public.user_roles TO service_role;
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "user_roles_read_own" ON public.user_roles;
CREATE POLICY "user_roles_read_own" ON public.user_roles
  FOR SELECT TO authenticated USING (user_id = auth.uid());

-- =========================================================
-- 4) Helpers (security definer)
-- =========================================================
CREATE OR REPLACE FUNCTION public.has_role(_user_id uuid, _role public.app_role)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = _user_id AND role = _role)
$$;

CREATE OR REPLACE FUNCTION public.current_display_name()
RETURNS text LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT display_name FROM public.profiles WHERE id = auth.uid()
$$;

CREATE OR REPLACE FUNCTION public.current_restricted_vendors()
RETURNS text[] LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT restricted_vendors FROM public.profiles WHERE id = auth.uid()
$$;

CREATE OR REPLACE FUNCTION public.is_internal_staff()
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = auth.uid())
$$;

-- =========================================================
-- 5) Trigger: criar profile automaticamente
-- =========================================================
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_name text;
BEGIN
  v_name := COALESCE(NEW.raw_user_meta_data->>'display_name', NEW.email);
  INSERT INTO public.profiles (id, display_name)
  VALUES (NEW.id, v_name)
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- =========================================================
-- 6) leads — políticas restritivas
-- =========================================================
DROP POLICY IF EXISTS "Open delete leads" ON public.leads;
DROP POLICY IF EXISTS "Open insert leads" ON public.leads;
DROP POLICY IF EXISTS "Open read leads"   ON public.leads;
DROP POLICY IF EXISTS "Open update leads" ON public.leads;
REVOKE ALL ON public.leads FROM anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.leads TO authenticated;

CREATE POLICY "leads_select_internal" ON public.leads FOR SELECT TO authenticated
USING (
  public.has_role(auth.uid(),'gestor')
  OR public.has_role(auth.uid(),'juridico')
  OR (
    public.has_role(auth.uid(),'admin_restrito')
    AND vendedor = ANY(COALESCE(public.current_restricted_vendors(), ARRAY[]::text[]))
  )
  OR vendedor = public.current_display_name()
  OR status = 'funil'
);

CREATE POLICY "leads_insert_internal" ON public.leads FOR INSERT TO authenticated
WITH CHECK (
  public.has_role(auth.uid(),'gestor')
  OR vendedor = public.current_display_name()
);

CREATE POLICY "leads_update_internal" ON public.leads FOR UPDATE TO authenticated
USING (
  public.has_role(auth.uid(),'gestor')
  OR public.has_role(auth.uid(),'juridico')
  OR vendedor = public.current_display_name()
  OR status = 'funil'
)
WITH CHECK (
  public.has_role(auth.uid(),'gestor')
  OR public.has_role(auth.uid(),'juridico')
  OR vendedor = public.current_display_name()
);

CREATE POLICY "leads_delete_gestor" ON public.leads FOR DELETE TO authenticated
USING (public.has_role(auth.uid(),'gestor'));

-- =========================================================
-- 7) lead_documents — políticas restritivas
-- =========================================================
DROP POLICY IF EXISTS "open delete lead_documents" ON public.lead_documents;
DROP POLICY IF EXISTS "open insert lead_documents" ON public.lead_documents;
DROP POLICY IF EXISTS "open read lead_documents"   ON public.lead_documents;
DROP POLICY IF EXISTS "open update lead_documents" ON public.lead_documents;
REVOKE ALL ON public.lead_documents FROM anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.lead_documents TO authenticated;

CREATE POLICY "lead_documents_select" ON public.lead_documents FOR SELECT TO authenticated
USING (EXISTS (SELECT 1 FROM public.leads l WHERE l.id = lead_id));
CREATE POLICY "lead_documents_insert" ON public.lead_documents FOR INSERT TO authenticated
WITH CHECK (EXISTS (SELECT 1 FROM public.leads l WHERE l.id = lead_id));
CREATE POLICY "lead_documents_update_staff" ON public.lead_documents FOR UPDATE TO authenticated
USING (public.has_role(auth.uid(),'gestor') OR public.has_role(auth.uid(),'juridico'))
WITH CHECK (public.has_role(auth.uid(),'gestor') OR public.has_role(auth.uid(),'juridico'));
CREATE POLICY "lead_documents_delete_staff" ON public.lead_documents FOR DELETE TO authenticated
USING (public.has_role(auth.uid(),'gestor') OR public.has_role(auth.uid(),'juridico'));

-- =========================================================
-- 8) lead_actions — gestores leem; qualquer logado insere
-- =========================================================
DROP POLICY IF EXISTS "Open insert lead_actions" ON public.lead_actions;
DROP POLICY IF EXISTS "Open read lead_actions"   ON public.lead_actions;
REVOKE ALL ON public.lead_actions FROM anon;
GRANT SELECT, INSERT ON public.lead_actions TO authenticated;

CREATE POLICY "lead_actions_insert_auth" ON public.lead_actions FOR INSERT TO authenticated
WITH CHECK (true);
CREATE POLICY "lead_actions_select_staff" ON public.lead_actions FOR SELECT TO authenticated
USING (
  public.has_role(auth.uid(),'gestor')
  OR public.has_role(auth.uid(),'juridico')
  OR public.has_role(auth.uid(),'admin_restrito')
);

-- =========================================================
-- 9) Drop vendedor_senhas (substituído por Supabase Auth)
-- =========================================================
DROP TABLE IF EXISTS public.vendedor_senhas;

-- =========================================================
-- 10) Storage: lead-docs restrito a staff autenticado
-- =========================================================
DROP POLICY IF EXISTS "open read lead-docs"   ON storage.objects;
DROP POLICY IF EXISTS "open insert lead-docs" ON storage.objects;
DROP POLICY IF EXISTS "open update lead-docs" ON storage.objects;
DROP POLICY IF EXISTS "open delete lead-docs" ON storage.objects;

CREATE POLICY "lead-docs select staff" ON storage.objects FOR SELECT TO authenticated
USING (bucket_id = 'lead-docs' AND public.is_internal_staff());
CREATE POLICY "lead-docs insert staff" ON storage.objects FOR INSERT TO authenticated
WITH CHECK (bucket_id = 'lead-docs' AND public.is_internal_staff());
CREATE POLICY "lead-docs update staff" ON storage.objects FOR UPDATE TO authenticated
USING (bucket_id = 'lead-docs' AND public.is_internal_staff())
WITH CHECK (bucket_id = 'lead-docs' AND public.is_internal_staff());
CREATE POLICY "lead-docs delete staff" ON storage.objects FOR DELETE TO authenticated
USING (
  bucket_id = 'lead-docs' AND (
    public.has_role(auth.uid(),'gestor') OR public.has_role(auth.uid(),'juridico')
  )
);
