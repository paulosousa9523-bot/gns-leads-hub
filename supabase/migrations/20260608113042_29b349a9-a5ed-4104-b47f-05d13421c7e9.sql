CREATE TABLE public.lead_actions (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  lead_id uuid REFERENCES public.leads(id) ON DELETE CASCADE,
  usuario text NOT NULL,
  acao text NOT NULL,
  detalhes jsonb,
  criado timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX lead_actions_lead_idx ON public.lead_actions(lead_id);
CREATE INDEX lead_actions_user_idx ON public.lead_actions(usuario);
CREATE INDEX lead_actions_criado_idx ON public.lead_actions(criado DESC);

GRANT SELECT, INSERT ON public.lead_actions TO anon, authenticated;
GRANT ALL ON public.lead_actions TO service_role;

ALTER TABLE public.lead_actions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Open insert lead_actions" ON public.lead_actions FOR INSERT TO public WITH CHECK (true);
CREATE POLICY "Open read lead_actions"   ON public.lead_actions FOR SELECT TO public USING (true);
