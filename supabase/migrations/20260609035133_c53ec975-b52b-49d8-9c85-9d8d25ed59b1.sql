-- Campo "chamado" no lead (azul marinho quando true)
ALTER TABLE public.leads ADD COLUMN IF NOT EXISTS chamado boolean NOT NULL DEFAULT false;

-- Tabela de senhas dos vendedores (gerenciada pelo admin)
CREATE TABLE IF NOT EXISTS public.vendedor_senhas (
  vendedor text PRIMARY KEY,
  senha text NOT NULL,
  criado timestamptz NOT NULL DEFAULT now(),
  atualizado timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.vendedor_senhas TO anon, authenticated;
GRANT ALL ON public.vendedor_senhas TO service_role;
ALTER TABLE public.vendedor_senhas ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "open all vendedor_senhas" ON public.vendedor_senhas;
CREATE POLICY "open all vendedor_senhas" ON public.vendedor_senhas FOR ALL USING (true) WITH CHECK (true);