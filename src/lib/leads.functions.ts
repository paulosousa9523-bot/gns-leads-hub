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

const LEAD_COLUMNS = "id, vendedor, nome, phone, phone2, phone3, phone4, phone5, cnpj, cpf, veiculo, tipo_processo, tribunal, processo, valor_causa, status, obs, followup, movido_em, criado, chamado, contrato_status, responsavel_juridico, responsavel_juridico_em, responsavel_juridico_por, nacionalidade, estado_civil, profissao, endereco_cliente, numero_endereco, bairro_cliente, cep_cliente, rg_cliente";

export const checkLeadDuplicate = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => CheckInput.parse(input))
  .handler(async ({ data, context }): Promise<{ duplicate: DuplicateMatch | null }> => {
    // Usa RPC indexado em vez de varrer milhares de linhas a cada digitação.
    const { data: rows, error } = await context.supabase.rpc("find_lead_duplicate", {
      _processo: data.processo ?? "",
      _cpf: data.cpf ?? "",
      _cnpj: data.cnpj ?? "",
      _phones: data.phones ?? [],
    });
    if (error) throw new Error(error.message);
    const hit = (rows as Array<{ id: string; nome: string; vendedor: string; status: string; motivo: string }> | null)?.[0];
    return { duplicate: hit ?? null };
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

    // Pagina em blocos de 1000 para contornar o limite padrão do PostgREST
    // e garantir que gestor/jurídico vejam TODOS os cards (inclusive antigos).
    const PAGE = 1000;
    const all: Lead[] = [];
    for (let from = 0; ; from += PAGE) {
      let query = supabaseAdmin
        .from("leads")
        .select(LEAD_COLUMNS)
        .order("criado", { ascending: false })
        .range(from, from + PAGE - 1);
      if (isRestrictedAdmin && profile.restricted_vendors?.length) {
        query = query.in("vendedor", profile.restricted_vendors);
      } else if (!isManager) {
        query = query.or(`vendedor.eq.${profile.display_name},status.eq.funil`);
      }
      const { data, error } = await query;
      if (error) throw new Error(error.message);
      const rows = (data ?? []) as Lead[];
      all.push(...rows);
      if (rows.length < PAGE) break;
    }
    return all;
  });
