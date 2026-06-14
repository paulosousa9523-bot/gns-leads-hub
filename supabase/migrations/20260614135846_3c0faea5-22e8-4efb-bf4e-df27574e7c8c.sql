
ALTER TABLE public.leads
  ADD COLUMN IF NOT EXISTS contrato_status text,
  ADD COLUMN IF NOT EXISTS responsavel_juridico text,
  ADD COLUMN IF NOT EXISTS responsavel_juridico_em timestamptz,
  ADD COLUMN IF NOT EXISTS responsavel_juridico_por text;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'leads_contrato_status_check') THEN
    ALTER TABLE public.leads
      ADD CONSTRAINT leads_contrato_status_check
      CHECK (contrato_status IS NULL OR contrato_status IN ('andamento','finalizado','pendencia','aguardando_acao'));
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS leads_contrato_status_idx ON public.leads(contrato_status);
CREATE INDEX IF NOT EXISTS leads_responsavel_juridico_idx ON public.leads(responsavel_juridico);
