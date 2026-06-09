CREATE TYPE public.call_status AS ENUM (
  'iniciando','em_curso','atendida','nao_atendida','ocupado','falhou','encerrada'
);

CREATE TABLE public.call_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  lead_id uuid NOT NULL REFERENCES public.leads(id) ON DELETE CASCADE,
  usuario text NOT NULL,
  telefone text NOT NULL,
  status public.call_status NOT NULL DEFAULT 'iniciando',
  duracao_segundos integer NOT NULL DEFAULT 0,
  provider text,
  provider_call_sid text,
  recording_url text,
  observacoes text,
  iniciado_em timestamptz NOT NULL DEFAULT now(),
  encerrado_em timestamptz,
  criado timestamptz NOT NULL DEFAULT now(),
  atualizado timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX call_logs_lead_id_idx ON public.call_logs(lead_id);
CREATE INDEX call_logs_usuario_idx ON public.call_logs(usuario);
CREATE INDEX call_logs_iniciado_em_idx ON public.call_logs(iniciado_em DESC);
CREATE UNIQUE INDEX call_logs_provider_sid_idx
  ON public.call_logs(provider, provider_call_sid)
  WHERE provider_call_sid IS NOT NULL;

GRANT SELECT, INSERT ON public.call_logs TO authenticated;
GRANT ALL ON public.call_logs TO service_role;

ALTER TABLE public.call_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY call_logs_select ON public.call_logs
  FOR SELECT TO authenticated
  USING (
    public.has_role(auth.uid(), 'gestor')
    OR public.has_role(auth.uid(), 'juridico')
    OR public.has_role(auth.uid(), 'admin_restrito')
    OR usuario = public.current_display_name()
  );

CREATE POLICY call_logs_insert ON public.call_logs
  FOR INSERT TO authenticated
  WITH CHECK (
    auth.uid() IS NOT NULL
    AND usuario = public.current_display_name()
  );

CREATE OR REPLACE FUNCTION public.touch_call_logs_atualizado()
RETURNS trigger LANGUAGE plpgsql SET search_path = public AS $$
BEGIN NEW.atualizado := now(); RETURN NEW; END $$;

CREATE TRIGGER call_logs_touch
  BEFORE UPDATE ON public.call_logs
  FOR EACH ROW EXECUTE FUNCTION public.touch_call_logs_atualizado();