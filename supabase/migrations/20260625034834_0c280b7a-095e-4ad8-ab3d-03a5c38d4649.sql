
-- Indexes by digits to accelerate duplicate detection
CREATE INDEX IF NOT EXISTS leads_cpf_digits_idx
  ON public.leads (regexp_replace(coalesce(cpf,''), '\D', '', 'g'))
  WHERE cpf IS NOT NULL AND cpf <> '';

CREATE INDEX IF NOT EXISTS leads_cnpj_digits_idx
  ON public.leads (regexp_replace(coalesce(cnpj,''), '\D', '', 'g'))
  WHERE cnpj IS NOT NULL AND cnpj <> '';

CREATE INDEX IF NOT EXISTS leads_phone_digits_idx
  ON public.leads (regexp_replace(coalesce(phone,''), '\D', '', 'g'))
  WHERE phone IS NOT NULL AND phone <> '';

-- RPC: retorna o primeiro lead duplicado encontrado, usando os índices acima.
CREATE OR REPLACE FUNCTION public.find_lead_duplicate(
  _processo text,
  _cpf text,
  _cnpj text,
  _phones text[]
) RETURNS TABLE(id uuid, nome text, vendedor text, status text, motivo text)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_proc text := regexp_replace(coalesce(_processo,''), '\D', '', 'g');
  v_cpf text := regexp_replace(coalesce(_cpf,''), '\D', '', 'g');
  v_cnpj text := regexp_replace(coalesce(_cnpj,''), '\D', '', 'g');
  v_phones text[] := ARRAY(
    SELECT regexp_replace(p, '\D', '', 'g')
    FROM unnest(coalesce(_phones, ARRAY[]::text[])) p
    WHERE length(regexp_replace(p, '\D', '', 'g')) >= 8
  );
BEGIN
  IF length(v_proc) >= 6 THEN
    RETURN QUERY
      SELECT l.id, l.nome, l.vendedor, l.status::text, 'Número do processo'::text
      FROM public.leads l
      WHERE regexp_replace(coalesce(l.processo,''), '\D', '', 'g') = v_proc
      LIMIT 1;
    IF FOUND THEN RETURN; END IF;
  END IF;

  IF length(v_cpf) >= 11 THEN
    RETURN QUERY
      SELECT l.id, l.nome, l.vendedor, l.status::text, 'CPF'::text
      FROM public.leads l
      WHERE regexp_replace(coalesce(l.cpf,''), '\D', '', 'g') = v_cpf
      LIMIT 1;
    IF FOUND THEN RETURN; END IF;
  END IF;

  IF length(v_cnpj) >= 14 THEN
    RETURN QUERY
      SELECT l.id, l.nome, l.vendedor, l.status::text, 'CNPJ'::text
      FROM public.leads l
      WHERE regexp_replace(coalesce(l.cnpj,''), '\D', '', 'g') = v_cnpj
      LIMIT 1;
    IF FOUND THEN RETURN; END IF;
  END IF;

  IF array_length(v_phones, 1) IS NOT NULL THEN
    RETURN QUERY
      SELECT l.id, l.nome, l.vendedor, l.status::text, 'Telefone'::text
      FROM public.leads l
      WHERE regexp_replace(coalesce(l.phone,''), '\D', '', 'g') = ANY (v_phones)
         OR regexp_replace(coalesce(l.phone2,''), '\D', '', 'g') = ANY (v_phones)
         OR regexp_replace(coalesce(l.phone3,''), '\D', '', 'g') = ANY (v_phones)
         OR regexp_replace(coalesce(l.phone4,''), '\D', '', 'g') = ANY (v_phones)
         OR regexp_replace(coalesce(l.phone5,''), '\D', '', 'g') = ANY (v_phones)
      LIMIT 1;
  END IF;
END;
$$;

REVOKE ALL ON FUNCTION public.find_lead_duplicate(text, text, text, text[]) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.find_lead_duplicate(text, text, text, text[]) TO authenticated, service_role;
