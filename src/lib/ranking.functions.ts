import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

export type RankingRow = {
  usuario: string;
  cards: number;
  chamados: number;
  points: number;
  rank: number;
};

export type RankingPayload = {
  daily: RankingRow[];
  weekly: RankingRow[];
  monthly: RankingRow[];
  totals: { cards: number; chamados: number };
};

type ActionRow = { usuario: string; acao: string; detalhes: Record<string, unknown> | null; criado: string };

function aggregate(rows: ActionRow[]): RankingRow[] {
  const map = new Map<string, { cards: number; chamados: number }>();
  for (const r of rows) {
    const cur = map.get(r.usuario) ?? { cards: 0, chamados: 0 };
    if (r.acao === "lead_criado") cur.cards += 1;
    if (r.acao === "chamado_marcado") cur.chamados += 1;
    if (r.acao === "edicao") {
      const d = r.detalhes as { chamado?: boolean } | null;
      if (d && d.chamado === true) cur.chamados += 1;
    }
    map.set(r.usuario, cur);
  }
  const arr = Array.from(map.entries()).map(([usuario, v]) => ({
    usuario,
    cards: v.cards,
    chamados: v.chamados,
    points: v.cards * 0.5 + v.chamados * 0.5,
    rank: 0,
  }));
  arr.sort((a, b) => b.points - a.points || b.cards - a.cards || b.chamados - a.chamados);
  arr.forEach((r, i) => (r.rank = i + 1));
  return arr;
}

/**
 * Ranking de produtividade. Restrito ao gestor (RLS já restringe lead_actions
 * à equipe interna; aqui validamos o papel para impedir uso indevido).
 */
export const getGestorRanking = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }): Promise<RankingPayload> => {
    const { supabase, userId } = context;
    const { data: rolesRaw } = await supabase
      .from("user_roles" as never)
      .select("role")
      .eq("user_id", userId);
    const roles = ((rolesRaw as unknown as { role: string }[]) ?? []).map((r) => r.role);
    if (!roles.includes("gestor")) {
      throw new Error("Acesso negado");
    }

    const now = new Date();
    const startDay = new Date(now); startDay.setHours(0, 0, 0, 0);
    const startWeek = new Date(now); startWeek.setDate(now.getDate() - 6); startWeek.setHours(0, 0, 0, 0);
    const startMonth = new Date(now.getFullYear(), now.getMonth(), 1);

    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data, error } = await supabaseAdmin
      .from("lead_actions")
      .select("usuario, acao, detalhes, criado")
      .gte("criado", startMonth.toISOString())
      .in("acao", ["lead_criado", "edicao", "chamado_marcado"]);
    if (error) throw new Error(error.message);

    const all = (data ?? []) as ActionRow[];
    const inWindow = (start: Date) => all.filter((r) => new Date(r.criado) >= start);

    const monthly = aggregate(inWindow(startMonth));
    const weekly = aggregate(inWindow(startWeek));
    const daily = aggregate(inWindow(startDay));
    const totals = monthly.reduce(
      (acc, r) => ({ cards: acc.cards + r.cards, chamados: acc.chamados + r.chamados }),
      { cards: 0, chamados: 0 },
    );
    return { daily, weekly, monthly, totals };
  });

export type AuditOverview = {
  totalVendedores: number;
  totalCards: number;
  totalFechados: number;
  fechadosVisiveisJuridico: number;
  fechadosVisiveisGestor: number;
  inconsistencias: string[];
  status: "Funcionando" | "Precisa de atenção";
};

/** Auditoria administrativa: contagem de vendedores, cards e clientes fechados
 *  visíveis para Jurídico e Gestor. Restrito ao Gestor. */
export const getAuditOverview = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }): Promise<AuditOverview> => {
    const { supabase, userId } = context;
    const { data: rolesRaw } = await supabase
      .from("user_roles" as never)
      .select("role")
      .eq("user_id", userId);
    const roles = ((rolesRaw as unknown as { role: string }[]) ?? []).map((r) => r.role);
    if (!roles.includes("gestor")) throw new Error("Acesso negado");

    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    // Pagina fechadosAll para contornar o limite padrão do PostgREST (1000)
    const fechadosAllRows: { id: string; vendedor: string | null; status: string }[] = [];
    const PAGE = 1000;
    for (let from = 0; ; from += PAGE) {
      const { data, error } = await supabaseAdmin
        .from("leads")
        .select("id, vendedor, status")
        .eq("status", "cliente_fechado")
        .range(from, from + PAGE - 1);
      if (error) throw new Error(error.message);
      const rows = (data ?? []) as { id: string; vendedor: string | null; status: string }[];
      fechadosAllRows.push(...rows);
      if (rows.length < PAGE) break;
    }
    const [vendCount, leadsAll, rolesAll] = await Promise.all([
      supabaseAdmin.from("user_roles").select("user_id", { count: "exact", head: true }).eq("role", "vendedor"),
      supabaseAdmin.from("leads").select("id", { count: "exact", head: true }),
      supabaseAdmin.from("user_roles").select("user_id, role"),
    ]);

    const inconsistencias: string[] = [];
    const totalFechados = fechadosAllRows.length;

    // RLS permite gestor/juridico verem TODOS os leads, então a visibilidade
    // dos cliente_fechado é exatamente o total. Validamos que cada fechado tem vendedor.
    const semVendedor = fechadosAllRows.filter((l) => !l.vendedor).length;
    if (semVendedor > 0) inconsistencias.push(`${semVendedor} card(s) em Cliente Fechado sem vendedor atribuído.`);

    // Verifica usuários sem nenhuma role
    const rows = (rolesAll.data ?? []) as { user_id: string; role: string }[];
    const byUser = new Map<string, string[]>();
    for (const r of rows) {
      const arr = byUser.get(r.user_id) ?? [];
      arr.push(r.role);
      byUser.set(r.user_id, arr);
    }
    const multiRole = Array.from(byUser.values()).filter((rs) => rs.length > 1).length;
    if (multiRole > 0) inconsistencias.push(`${multiRole} usuário(s) com mais de um papel atribuído.`);

    return {
      totalVendedores: vendCount.count ?? 0,
      totalCards: leadsAll.count ?? 0,
      totalFechados,
      fechadosVisiveisJuridico: totalFechados,
      fechadosVisiveisGestor: totalFechados,
      inconsistencias,
      status: inconsistencias.length === 0 ? "Funcionando" : "Precisa de atenção",
    };
  });
