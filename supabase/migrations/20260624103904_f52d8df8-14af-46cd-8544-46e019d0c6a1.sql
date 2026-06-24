
-- 1) Novos campos no cadastro do cliente
ALTER TABLE public.leads
  ADD COLUMN IF NOT EXISTS nacionalidade text,
  ADD COLUMN IF NOT EXISTS estado_civil text,
  ADD COLUMN IF NOT EXISTS profissao text,
  ADD COLUMN IF NOT EXISTS endereco_cliente text,
  ADD COLUMN IF NOT EXISTS numero_endereco text,
  ADD COLUMN IF NOT EXISTS bairro_cliente text,
  ADD COLUMN IF NOT EXISTS cep_cliente text,
  ADD COLUMN IF NOT EXISTS rg_cliente text;

-- 2) Modelos de contrato (somente um ativo por vez, mas mantém histórico)
CREATE TABLE IF NOT EXISTS public.contract_templates (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  nome text NOT NULL,
  storage_path text NOT NULL,
  mime_type text,
  tamanho bigint,
  ativo boolean NOT NULL DEFAULT true,
  enviado_por text,
  criado timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.contract_templates TO authenticated;
GRANT INSERT, UPDATE, DELETE ON public.contract_templates TO authenticated;
GRANT ALL ON public.contract_templates TO service_role;
ALTER TABLE public.contract_templates ENABLE ROW LEVEL SECURITY;
CREATE POLICY "auth read templates" ON public.contract_templates
  FOR SELECT TO authenticated USING (true);
CREATE POLICY "staff manage templates" ON public.contract_templates
  FOR ALL TO authenticated
  USING (public.is_internal_staff())
  WITH CHECK (public.is_internal_staff());

-- 3) Contratos gerados por lead
CREATE TABLE IF NOT EXISTS public.generated_contracts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  lead_id uuid NOT NULL REFERENCES public.leads(id) ON DELETE CASCADE,
  template_id uuid REFERENCES public.contract_templates(id) ON DELETE SET NULL,
  nome_arquivo text NOT NULL,
  storage_path text NOT NULL,
  mime_type text,
  tamanho bigint,
  gerado_por text NOT NULL,
  criado timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_generated_contracts_lead ON public.generated_contracts(lead_id);
GRANT SELECT, INSERT, DELETE ON public.generated_contracts TO authenticated;
GRANT ALL ON public.generated_contracts TO service_role;
ALTER TABLE public.generated_contracts ENABLE ROW LEVEL SECURITY;
CREATE POLICY "auth read contracts" ON public.generated_contracts
  FOR SELECT TO authenticated USING (true);
CREATE POLICY "auth insert contracts" ON public.generated_contracts
  FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "staff delete contracts" ON public.generated_contracts
  FOR DELETE TO authenticated USING (public.is_internal_staff());
