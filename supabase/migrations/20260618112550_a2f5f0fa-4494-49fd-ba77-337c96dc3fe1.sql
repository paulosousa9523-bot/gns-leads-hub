
-- Index para acelerar busca de duplicatas por processo (digits-only)
CREATE INDEX IF NOT EXISTS leads_processo_digits_idx
  ON public.leads ((regexp_replace(coalesce(processo,''), '\D', '', 'g')))
  WHERE processo IS NOT NULL AND processo <> '';

-- Trigger de prevenção de duplicidade de número de processo (não destrutivo).
-- Compara apenas dígitos (>=6) e bloqueia INSERT/UPDATE quando já existe outro card com o mesmo processo.
CREATE OR REPLACE FUNCTION public.prevent_duplicate_processo()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_digits text;
  v_existing record;
BEGIN
  v_digits := regexp_replace(coalesce(NEW.processo, ''), '\D', '', 'g');
  IF length(v_digits) < 6 THEN
    RETURN NEW;
  END IF;
  SELECT id, vendedor, nome INTO v_existing
  FROM public.leads
  WHERE id <> NEW.id
    AND processo IS NOT NULL
    AND regexp_replace(processo, '\D', '', 'g') = v_digits
  LIMIT 1;
  IF FOUND THEN
    RAISE EXCEPTION 'Processo % já cadastrado no CRM (vendedor: %, cliente: %)',
      NEW.processo, v_existing.vendedor, v_existing.nome
      USING ERRCODE = 'unique_violation';
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_prevent_duplicate_processo ON public.leads;
CREATE TRIGGER trg_prevent_duplicate_processo
  BEFORE INSERT OR UPDATE OF processo ON public.leads
  FOR EACH ROW EXECUTE FUNCTION public.prevent_duplicate_processo();
