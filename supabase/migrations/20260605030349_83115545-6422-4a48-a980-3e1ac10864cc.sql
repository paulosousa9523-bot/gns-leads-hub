
ALTER TABLE public.leads
  ADD COLUMN IF NOT EXISTS cnpj text,
  ADD COLUMN IF NOT EXISTS phone2 text,
  ADD COLUMN IF NOT EXISTS phone3 text,
  ADD COLUMN IF NOT EXISTS phone4 text,
  ADD COLUMN IF NOT EXISTS phone5 text,
  ADD COLUMN IF NOT EXISTS movido_em timestamptz NOT NULL DEFAULT now();

ALTER TABLE public.leads ALTER COLUMN status SET DEFAULT 'dia_1';

UPDATE public.leads SET status = CASE
  WHEN status = 'novo' THEN 'dia_1'
  WHEN status = 'contato' THEN 'dia_2'
  WHEN status = 'respondeu' THEN 'dia_3'
  WHEN status = 'qualificado' THEN 'negociacao'
  WHEN status = 'fechado' THEN 'contrato'
  WHEN status = 'convertido' THEN 'cliente_fechado'
  ELSE status
END
WHERE status IN ('novo','contato','respondeu','qualificado','fechado','convertido');
