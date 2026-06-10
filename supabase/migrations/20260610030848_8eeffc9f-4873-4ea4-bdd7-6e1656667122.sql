
-- Rename Raíssa Cristine → Raíssa Alves (preserve all data)
ALTER TABLE public.profiles DISABLE TRIGGER USER;

UPDATE public.profiles
   SET display_name = 'Raíssa Alves'
 WHERE display_name = 'Raíssa Cristine';

UPDATE public.leads
   SET vendedor = 'Raíssa Alves'
 WHERE vendedor = 'Raíssa Cristine';

UPDATE public.lead_actions
   SET usuario = 'Raíssa Alves'
 WHERE usuario = 'Raíssa Cristine';

UPDATE public.call_logs
   SET usuario = 'Raíssa Alves'
 WHERE usuario = 'Raíssa Cristine';

-- Corrigir restricted_vendors da Hosanna: Rafael -> Raphael (rename anterior)
UPDATE public.profiles
   SET restricted_vendors = array_replace(restricted_vendors, 'Rafael Chagas', 'Raphael Chagas')
 WHERE display_name = 'Hosanna (Admin)';

ALTER TABLE public.profiles ENABLE TRIGGER USER;

-- Garantir que admin_restrito (Hosanna) consiga atualizar leads dos vendedores dela
DROP POLICY IF EXISTS leads_update_internal ON public.leads;
CREATE POLICY leads_update_internal ON public.leads
  FOR UPDATE TO authenticated
  USING (
    has_role(auth.uid(), 'gestor'::app_role)
    OR has_role(auth.uid(), 'juridico'::app_role)
    OR (has_role(auth.uid(), 'admin_restrito'::app_role)
        AND vendedor = ANY (COALESCE(current_restricted_vendors(), ARRAY[]::text[])))
    OR (vendedor = current_display_name())
    OR (status = 'funil' AND is_internal_staff())
  )
  WITH CHECK (
    has_role(auth.uid(), 'gestor'::app_role)
    OR has_role(auth.uid(), 'juridico'::app_role)
    OR (has_role(auth.uid(), 'admin_restrito'::app_role)
        AND vendedor = ANY (COALESCE(current_restricted_vendors(), ARRAY[]::text[])))
    OR (vendedor = current_display_name())
  );

-- Permitir DELETE de cards também para admin_restrito sobre seus vendedores
DROP POLICY IF EXISTS leads_delete_gestor ON public.leads;
CREATE POLICY leads_delete_internal ON public.leads
  FOR DELETE TO authenticated
  USING (
    has_role(auth.uid(), 'gestor'::app_role)
    OR (has_role(auth.uid(), 'admin_restrito'::app_role)
        AND vendedor = ANY (COALESCE(current_restricted_vendors(), ARRAY[]::text[])))
  );

-- Preencher 'criado' em cards antigos sem data, usando movido_em como fallback
UPDATE public.leads
   SET criado = COALESCE(criado, movido_em, now())
 WHERE criado IS NULL;
