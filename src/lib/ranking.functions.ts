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
