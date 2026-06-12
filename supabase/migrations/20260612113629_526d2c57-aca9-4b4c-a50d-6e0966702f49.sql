CREATE INDEX IF NOT EXISTS leads_criado_desc_idx ON public.leads (criado DESC);
CREATE INDEX IF NOT EXISTS leads_status_criado_idx ON public.leads (status, criado DESC);
CREATE INDEX IF NOT EXISTS leads_vendedor_status_criado_idx ON public.leads (vendedor, status, criado DESC);
CREATE INDEX IF NOT EXISTS lead_documents_lead_id_idx ON public.lead_documents (lead_id);

DROP POLICY IF EXISTS leads_delete_gestor ON public.leads;
DROP POLICY IF EXISTS leads_delete_internal ON public.leads;
CREATE POLICY leads_delete_internal ON public.leads
  FOR DELETE TO authenticated
  USING (
    public.has_role(auth.uid(), 'gestor'::public.app_role)
    OR public.has_role(auth.uid(), 'juridico'::public.app_role)
    OR (
      public.has_role(auth.uid(), 'admin_restrito'::public.app_role)
      AND vendedor = ANY (COALESCE(public.current_restricted_vendors(), ARRAY[]::text[]))
    )
    OR vendedor = public.current_display_name()
    OR (status = 'funil'::text AND public.is_internal_staff())
  );