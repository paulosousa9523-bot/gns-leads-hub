
CREATE TABLE public.leads (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  vendedor TEXT NOT NULL,
  nome TEXT NOT NULL,
  phone TEXT NOT NULL,
  veiculo TEXT,
  tribunal TEXT,
  processo TEXT,
  status TEXT NOT NULL DEFAULT 'novo',
  obs TEXT,
  followup DATE,
  criado TIMESTAMPTZ NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.leads TO anon, authenticated;
GRANT ALL ON public.leads TO service_role;

ALTER TABLE public.leads ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Open read leads" ON public.leads FOR SELECT USING (true);
CREATE POLICY "Open insert leads" ON public.leads FOR INSERT WITH CHECK (true);
CREATE POLICY "Open update leads" ON public.leads FOR UPDATE USING (true) WITH CHECK (true);
CREATE POLICY "Open delete leads" ON public.leads FOR DELETE USING (true);

ALTER TABLE public.leads REPLICA IDENTITY FULL;
ALTER PUBLICATION supabase_realtime ADD TABLE public.leads;
