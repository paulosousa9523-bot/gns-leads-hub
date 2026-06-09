DROP POLICY IF EXISTS lead_actions_insert_auth ON public.lead_actions;
CREATE POLICY lead_actions_insert_auth ON public.lead_actions
  FOR INSERT TO authenticated
  WITH CHECK (
    auth.uid() IS NOT NULL
    AND usuario = public.current_display_name()
  );