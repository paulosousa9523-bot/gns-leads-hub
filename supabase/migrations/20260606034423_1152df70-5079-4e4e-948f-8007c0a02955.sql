
CREATE TABLE public.lead_documents (
  id uuid primary key default gen_random_uuid(),
  lead_id uuid not null references public.leads(id) on delete cascade,
  categoria text not null,
  nome_arquivo text not null,
  storage_path text not null,
  mime_type text,
  tamanho bigint,
  criado timestamptz not null default now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.lead_documents TO anon, authenticated;
GRANT ALL ON public.lead_documents TO service_role;

ALTER TABLE public.lead_documents ENABLE ROW LEVEL SECURITY;

CREATE POLICY "open read lead_documents" ON public.lead_documents FOR SELECT USING (true);
CREATE POLICY "open insert lead_documents" ON public.lead_documents FOR INSERT WITH CHECK (true);
CREATE POLICY "open update lead_documents" ON public.lead_documents FOR UPDATE USING (true) WITH CHECK (true);
CREATE POLICY "open delete lead_documents" ON public.lead_documents FOR DELETE USING (true);

CREATE INDEX idx_lead_documents_lead ON public.lead_documents(lead_id);

-- Storage policies for lead-docs bucket (private bucket, open access for the app)
CREATE POLICY "open read lead-docs" ON storage.objects FOR SELECT USING (bucket_id = 'lead-docs');
CREATE POLICY "open insert lead-docs" ON storage.objects FOR INSERT WITH CHECK (bucket_id = 'lead-docs');
CREATE POLICY "open update lead-docs" ON storage.objects FOR UPDATE USING (bucket_id = 'lead-docs') WITH CHECK (bucket_id = 'lead-docs');
CREATE POLICY "open delete lead-docs" ON storage.objects FOR DELETE USING (bucket_id = 'lead-docs');
