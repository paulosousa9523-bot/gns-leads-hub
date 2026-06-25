
-- Add tipo to contract_templates and generated_contracts
ALTER TABLE public.contract_templates ADD COLUMN IF NOT EXISTS tipo text;
ALTER TABLE public.generated_contracts ADD COLUMN IF NOT EXISTS tipo text;

-- Backfill existing as 'procuracao' (most common first doc); user can re-upload as needed
UPDATE public.contract_templates SET tipo = 'procuracao' WHERE tipo IS NULL;
UPDATE public.generated_contracts SET tipo = 'procuracao' WHERE tipo IS NULL;

ALTER TABLE public.contract_templates
  ADD CONSTRAINT contract_templates_tipo_check
  CHECK (tipo IN ('procuracao','hipossuficiencia','honorarios'));

ALTER TABLE public.generated_contracts
  ADD CONSTRAINT generated_contracts_tipo_check
  CHECK (tipo IN ('procuracao','hipossuficiencia','honorarios'));

ALTER TABLE public.contract_templates ALTER COLUMN tipo SET NOT NULL;
ALTER TABLE public.generated_contracts ALTER COLUMN tipo SET NOT NULL;

-- Ensure only one active template per tipo
CREATE UNIQUE INDEX IF NOT EXISTS contract_templates_one_active_per_tipo
  ON public.contract_templates (tipo) WHERE ativo = true;

-- Allow staff to delete templates
DROP POLICY IF EXISTS "staff_delete_templates" ON public.contract_templates;
CREATE POLICY "staff_delete_templates" ON public.contract_templates
  FOR DELETE TO authenticated USING (public.is_internal_staff());
