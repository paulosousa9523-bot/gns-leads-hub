import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import type { Lead } from "./leads";

/**
 * Verifica duplicidade de lead em todo o CRM (bypass RLS via service role),
 * para impedir que um vendedor cadastre um cliente que já exista em outra carteira.
 */
const CheckInput = z.object({
  processo: z.string().trim().optional().nullable(),
  cpf: z.string().trim().optional().nullable(),
  cnpj: z.string().trim().optional().nullable(),
  phones: z.array(z.string().trim().min(1)).max(10).optional().default([]),
  nome: z.string().trim().optional().nullable(),
});

export type DuplicateMatch = {
  id: string;
  nome: string;
  vendedor: string;
  status: string;
  motivo: string;
};

const LEAD_COLUMNS = "id, vendedor, nome, phone, phone2, phone3, phone4, phone5, cnpj, cpf, veiculo, tipo_processo, tribunal, processo, valor_causa, status, obs, followup, movido_em, criado, chamado, contrato_status, responsavel_juridico, responsavel_juridico_em, responsavel_juridico_por";

export const checkLeadDuplicate = createServerFn({ method: "POST" })
  .inputValidator((input: unknown) => CheckInput.parse(input))
  .handler(async ({ data }): Promise<{ duplicate: DuplicateMatch | null }> => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const onlyDigits = (s: string | null | undefined) => (s || "").replace(/\D/g, "");

    const procDigits = onlyDigits(data.processo);
    const cpfDigits = onlyDigits(data.cpf);
    const cnpjDigits = onlyDigits(data.cnpj);
    const phoneDigitsList = (data.phones ?? [])
      .map(onlyDigits)
      .filter((p) => p.length >= 8);

    type Row = { id: string; nome: string; vendedor: string; status: string; processo: string | null; cpf: string | null; cnpj: string | null; phone: string; phone2: string | null; phone3: string | null; phone4: string | null; phone5: string | null };

    // 1) Processo (mais forte)
    if (procDigits.length >= 6) {
      const { data: rows } = await supabaseAdmin
        .from("leads")
        .select("id, nome, vendedor, status, processo")
        .limit(2000);
      const hit = (rows as Row[] | null)?.find((r) => onlyDigits(r.processo) === procDigits);
      if (hit) return { duplicate: { id: hit.id, nome: hit.nome, vendedor: hit.vendedor, status: hit.status, motivo: "Número do processo" } };
    }

    // 2) CPF/CNPJ
    if (cpfDigits.length >= 11 || cnpjDigits.length >= 14) {
      const { data: rows } = await supabaseAdmin
        .from("leads")
        .select("id, nome, vendedor, status, cpf, cnpj")
        .limit(5000);
      const hit = (rows as Row[] | null)?.find((r) =>
        (cpfDigits.length >= 11 && onlyDigits(r.cpf) === cpfDigits) ||
        (cnpjDigits.length >= 14 && onlyDigits(r.cnpj) === cnpjDigits)
      );
      if (hit) return { duplicate: { id: hit.id, nome: hit.nome, vendedor: hit.vendedor, status: hit.status, motivo: cpfDigits ? "CPF" : "CNPJ" } };
    }

    // 3) Telefones (qualquer um igual a qualquer um dos 5 do banco)
    if (phoneDigitsList.length) {
      const { data: rows } = await supabaseAdmin
        .from("leads")
        .select("id, nome, vendedor, status, phone, phone2, phone3, phone4, phone5")
        .limit(5000);
      const hit = (rows as Row[] | null)?.find((r) => {
        const existing = [r.phone, r.phone2, r.phone3, r.phone4, r.phone5]
          .map(onlyDigits)
          .filter((p) => p.length >= 8);
        return existing.some((e) => phoneDigitsList.some((p) => e === p || e.endsWith(p) || p.endsWith(e)));
      });
      if (hit) return { duplicate: { id: hit.id, nome: hit.nome, vendedor: hit.vendedor, status: hit.status, motivo: "Telefone" } };
    }

    return { duplicate: null };
  });

export const fetchVisibleLeads = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }): Promise<Lead[]> => {
    const { supabase, userId } = context;
    const [{ data: profileRaw }, { data: rolesRaw }] = await Promise.all([
      supabase
        .from("profiles" as never)
        .select("display_name, restricted_vendors")
        .eq("id", userId)
        .maybeSingle(),
      supabase.from("user_roles" as never).select("role").eq("user_id", userId),
    ]);

    const profile = profileRaw as { display_name: string; restricted_vendors: string[] | null } | null;
    const roles = ((rolesRaw as unknown as { role: string }[]) ?? []).map((r) => r.role);
    if (!profile || roles.length === 0) return [];

    const isManager = roles.includes("gestor") || roles.includes("juridico");
    const isRestrictedAdmin = roles.includes("admin_restrito");
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    let query = supabaseAdmin.from("leads").select(LEAD_COLUMNS).order("criado", { ascending: false });
    if (isRestrictedAdmin && profile.restricted_vendors?.length) {
      query = query.in("vendedor", profile.restricted_vendors);
    } else if (!isManager) {
      query = query.or(`vendedor.eq.${profile.display_name},status.eq.funil`);
    }

    const { data, error } = await query;
    if (error) throw new Error(error.message);
    return (data ?? []) as Lead[];
  });
