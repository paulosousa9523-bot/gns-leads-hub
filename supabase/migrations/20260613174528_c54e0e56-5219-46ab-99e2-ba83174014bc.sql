
CREATE INDEX IF NOT EXISTS lead_actions_acao_criado_idx ON public.lead_actions (acao, criado DESC);

DO $$
DECLARE
  r RECORD;
BEGIN
  FOR r IN SELECT id, vendedor FROM public.leads WHERE vendedor = 'Paulo (Gestor)' LOOP
    INSERT INTO public.lead_actions (lead_id, usuario, acao, detalhes)
    VALUES (
      r.id,
      'Paulo (Gestor)',
      'transferencia_responsavel',
      jsonb_build_object(
        'de', 'Paulo (Gestor)',
        'para', 'Paulo Sousa',
        'motivo', 'Transferência automática: gestor não atua como vendedor',
        'em', now()
      )
    );
  END LOOP;

  UPDATE public.leads
  SET vendedor = 'Paulo Sousa', movido_em = now()
  WHERE vendedor = 'Paulo (Gestor)';
END $$;
