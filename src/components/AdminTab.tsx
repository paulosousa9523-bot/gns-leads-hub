import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { ACTION_LABEL, type ActionType } from "@/lib/actionLog";
import { VENDEDORES } from "@/lib/auth";
import type { Lead } from "@/lib/leads";

interface ActionRow {
  id: string;
  lead_id: string | null;
  usuario: string;
  acao: ActionType;
  detalhes: Record<string, unknown> | null;
  criado: string;
}

export function AdminTab({ leads }: { leads: Lead[] }) {
  const [rows, setRows] = useState<ActionRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterVend, setFilterVend] = useState<string>("");
  const [filterLead, setFilterLead] = useState<string>("");

  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      const { data } = await supabase
        .from("lead_actions" as never)
        .select("*")
        .order("criado", { ascending: false })
        .limit(2000);
      if (!cancelled) {
        setRows(((data as unknown) as ActionRow[]) || []);
        setLoading(false);
      }
    };
    load();
    const ch = supabase
      .channel("lead_actions-admin")
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "lead_actions" }, (p) => {
        setRows((cur) => [p.new as ActionRow, ...cur].slice(0, 2000));
      })
      .subscribe();
    return () => { cancelled = true; supabase.removeChannel(ch); };
  }, []);

  const leadMap = useMemo(() => {
    const m = new Map<string, Lead>();
    leads.forEach((l) => m.set(l.id, l));
    return m;
  }, [leads]);

  const stats = useMemo(() => {
    // Leads trabalhados por vendedor (qualquer ação interna no lead)
    const trabalhadosByVend = new Map<string, Set<string>>();
    const lastByVend = new Map<string, string>();
    const interactedLeadIds = new Set<string>();
    for (const r of rows) {
      if (!lastByVend.has(r.usuario)) lastByVend.set(r.usuario, r.criado);
      if (r.lead_id) {
        interactedLeadIds.add(r.lead_id);
        if (!trabalhadosByVend.has(r.usuario)) trabalhadosByVend.set(r.usuario, new Set());
        trabalhadosByVend.get(r.usuario)!.add(r.lead_id);
      }
    }
    const semInteracao = leads.filter((l) => !interactedLeadIds.has(l.id)).length;
    const vendedores = VENDEDORES.map((v) => ({
      nome: v,
      leads: trabalhadosByVend.get(v)?.size || 0,
      ultima: lastByVend.get(v) || null,
      acoes: rows.filter((r) => r.usuario === v).length,
    })).sort((a, b) => b.leads - a.leads);
    return { vendedores, semInteracao };
  }, [rows, leads]);

  const filtered = useMemo(() => {
    return rows.filter((r) => {
      if (filterVend && r.usuario !== filterVend) return false;
      if (filterLead) {
        const ld = r.lead_id ? leadMap.get(r.lead_id) : null;
        const q = filterLead.toLowerCase();
        const hay = `${ld?.nome || ""} ${ld?.processo || ""} ${r.lead_id || ""}`.toLowerCase();
        if (!hay.includes(q)) return false;
      }
      return true;
    });
  }, [rows, filterVend, filterLead, leadMap]);

  const fmt = (iso: string) =>
    new Date(iso).toLocaleString("pt-BR", { day: "2-digit", month: "2-digit", year: "2-digit", hour: "2-digit", minute: "2-digit" });

  return (
    <div className="space-y-4 max-w-5xl mx-auto">
      <div>
        <h2 className="text-xl font-bold">Administração — Auditoria</h2>
        <p className="text-xs text-muted-foreground">Visível apenas para administradores. Vendedores não enxergam estes dados.</p>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
        <Card label="Leads sem interação" value={String(stats.semInteracao)} />
        <Card label="Ações registradas" value={String(rows.length)} />
        <Card label="Vendedores ativos" value={String(stats.vendedores.filter((v) => v.acoes > 0).length)} />
      </div>

      <section className="bg-surface border border-border rounded-xl overflow-hidden">
        <div className="px-3 py-2 border-b border-border text-xs font-bold uppercase tracking-wider">Por vendedor</div>
        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead className="bg-muted/40">
              <tr>
                <th className="text-left p-2">Vendedor</th>
                <th className="text-right p-2">Leads trabalhados</th>
                <th className="text-right p-2">Ações</th>
                <th className="text-left p-2">Última atividade</th>
              </tr>
            </thead>
            <tbody>
              {stats.vendedores.map((v) => (
                <tr key={v.nome} className="border-t border-border">
                  <td className="p-2 font-medium">{v.nome}</td>
                  <td className="p-2 text-right">{v.leads}</td>
                  <td className="p-2 text-right">{v.acoes}</td>
                  <td className="p-2 text-muted-foreground">{v.ultima ? fmt(v.ultima) : "—"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <section className="bg-surface border border-border rounded-xl">
        <div className="px-3 py-2 border-b border-border flex flex-wrap items-center gap-2">
          <span className="text-xs font-bold uppercase tracking-wider mr-auto">Histórico de ações</span>
          <select className="bg-muted border border-border rounded-md px-2 py-1 text-xs" value={filterVend} onChange={(e) => setFilterVend(e.target.value)}>
            <option value="">Todos vendedores</option>
            {VENDEDORES.map((v) => <option key={v} value={v}>{v}</option>)}
          </select>
          <input className="bg-muted border border-border rounded-md px-2 py-1 text-xs" placeholder="Filtrar por lead / processo" value={filterLead} onChange={(e) => setFilterLead(e.target.value)} />
        </div>
        <div className="max-h-[60vh] overflow-y-auto">
          {loading && <div className="p-4 text-xs text-muted-foreground">Carregando...</div>}
          {!loading && filtered.length === 0 && <div className="p-4 text-xs text-muted-foreground">Nenhum registro.</div>}
          <ul className="divide-y divide-border">
            {filtered.map((r) => {
              const ld = r.lead_id ? leadMap.get(r.lead_id) : null;
              return (
                <li key={r.id} className="p-2.5 text-xs">
                  <div className="flex items-center justify-between gap-2">
                    <div className="font-semibold">{ACTION_LABEL[r.acao] || r.acao}</div>
                    <div className="text-muted-foreground">{fmt(r.criado)}</div>
                  </div>
                  <div className="text-muted-foreground">
                    {r.usuario}
                    {ld && <> · <span className="text-foreground">{ld.nome}</span>{ld.processo ? ` · Proc. ${ld.processo}` : ""}</>}
                    {!ld && r.lead_id && <> · lead {r.lead_id.slice(0, 8)}</>}
                  </div>
                  {r.detalhes && Object.keys(r.detalhes).length > 0 && (
                    <pre className="mt-1 bg-muted/40 border border-border rounded p-1.5 text-[10px] overflow-x-auto">{JSON.stringify(r.detalhes)}</pre>
                  )}
                </li>
              );
            })}
          </ul>
        </div>
      </section>
    </div>
  );
}

function Card({ label, value }: { label: string; value: string }) {
  return (
    <div className="bg-surface border border-border rounded-xl p-3">
      <div className="text-[10px] uppercase tracking-wider text-muted-foreground">{label}</div>
      <div className="text-2xl font-bold mt-1">{value}</div>
    </div>
  );
}
