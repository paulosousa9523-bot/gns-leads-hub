
-- 1. Tighten leads SELECT/UPDATE — remove open `status = 'funil'` branch
DROP POLICY IF EXISTS leads_select_internal ON public.leads;
CREATE POLICY leads_select_internal ON public.leads
  FOR SELECT TO authenticated
  USING (
    has_role(auth.uid(), 'gestor'::app_role)
    OR has_role(auth.uid(), 'juridico'::app_role)
    OR (has_role(auth.uid(), 'admin_restrito'::app_role) AND (vendedor = ANY (COALESCE(current_restricted_vendors(), ARRAY[]::text[]))))
    OR (vendedor = current_display_name())
    OR (status = 'funil'::text AND is_internal_staff())
  );

DROP POLICY IF EXISTS leads_update_internal ON public.leads;
CREATE POLICY leads_update_internal ON public.leads
  FOR UPDATE TO authenticated
  USING (
    has_role(auth.uid(), 'gestor'::app_role)
    OR has_role(auth.uid(), 'juridico'::app_role)
    OR (vendedor = current_display_name())
    OR (status = 'funil'::text AND is_internal_staff())
  )
  WITH CHECK (
    has_role(auth.uid(), 'gestor'::app_role)
    OR has_role(auth.uid(), 'juridico'::app_role)
    OR (vendedor = current_display_name())
  );

-- 2. Prevent display_name impersonation: trigger blocks non-gestor from changing display_name
CREATE OR REPLACE FUNCTION public.prevent_display_name_change()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.display_name IS DISTINCT FROM OLD.display_name
     AND NOT has_role(auth.uid(), 'gestor'::app_role) THEN
    RAISE EXCEPTION 'Apenas gestores podem alterar o nome de exibição';
  END IF;
  IF NEW.restricted_vendors IS DISTINCT FROM OLD.restricted_vendors
     AND NOT has_role(auth.uid(), 'gestor'::app_role) THEN
    RAISE EXCEPTION 'Apenas gestores podem alterar vendedores restritos';
  END IF;
  RETURN NEW;
END
$$;

DROP TRIGGER IF EXISTS profiles_guard_immutable ON public.profiles;
CREATE TRIGGER profiles_guard_immutable
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.prevent_display_name_change();

-- Also let gestores update other users' profiles (e.g., to fix display names)
DROP POLICY IF EXISTS profiles_update_gestor ON public.profiles;
CREATE POLICY profiles_update_gestor ON public.profiles
  FOR UPDATE TO authenticated
  USING (has_role(auth.uid(), 'gestor'::app_role))
  WITH CHECK (has_role(auth.uid(), 'gestor'::app_role));

-- 3. Tighten lead_documents INSERT — require ownership or staff role
DROP POLICY IF EXISTS lead_documents_insert ON public.lead_documents;
CREATE POLICY lead_documents_insert ON public.lead_documents
  FOR INSERT TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.leads l
      WHERE l.id = lead_documents.lead_id
        AND (
          has_role(auth.uid(), 'gestor'::app_role)
          OR has_role(auth.uid(), 'juridico'::app_role)
          OR has_role(auth.uid(), 'admin_restrito'::app_role)
          OR l.vendedor = current_display_name()
        )
    )
  );

-- 4. Realtime: require internal staff to subscribe to channel messages
ALTER TABLE realtime.messages ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS realtime_staff_only_select ON realtime.messages;
CREATE POLICY realtime_staff_only_select ON realtime.messages
  FOR SELECT TO authenticated
  USING (public.is_internal_staff());

DROP POLICY IF EXISTS realtime_staff_only_insert ON realtime.messages;
CREATE POLICY realtime_staff_only_insert ON realtime.messages
  FOR INSERT TO authenticated
  WITH CHECK (public.is_internal_staff());
