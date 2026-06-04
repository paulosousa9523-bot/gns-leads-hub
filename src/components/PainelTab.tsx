import { useMemo, useState } from "react";
import type { Lead, LeadStatus } from "@/lib/leads";
import { followupState, STATUS_LABEL, STATUS_ORDER } from "@/lib/leads";
import type { Session } from "@/lib/auth";
import { VENDEDORES } from "@/lib/auth";

export function PainelTab({ leads, session }: { leads: Lead[]; session: Session }) {
  const [selected, setSelected] = useState<string>("__all__");

  const scoped = useMemo(() => {
    if (!session.isManager) return leads.filter((l) => l.vendedor === session.name);
    if (selected === "__all__") return leads;
    return leads.filter((l) => l.vendedor === selected);
  }, [leads, session, selected]);

  const stats = useMemo(() => computeStats(scoped), [scoped]);

  const perVendedor = useMemo(() => {
    if (!session.isManager) return [];
    const names = new Set<string>(VENDEDORES);
    leads.forEach((l) => names.add(l.vendedor));
    return Array.from(names)
      .map((nome) => {
        const ls = leads.filter((l) => l.vendedor === nome);
        return { nome, ...computeStats(ls) };
      })
      .sort((a, b) => b.total - a.total);
  }, [leads, session.isManager]);

  const maxTotal = Math.max(1, ...perVendedor.map((v) => v.total));

  return (
    <div className="space-y-4 max-w-2xl mx-auto">
      <div className="flex items-center justify-between gap-3">
        <h2 className="text-xl font-bold">Painel</h2>
        {session.isManager && (
          <select
            value={selected}
            onChange={(e) => setSelected(e.target.value)}
            className="bg-surface border border-border rounded-lg px-3 py-1.5 text-sm"
          >
            <option value="__all__">Equipe completa</option>
            {VENDEDORES.map((v) => (
              <option key={v} value={v}>
                {v}
              </option>
            ))}
          </select>
        )}
      </div>

      {session.isManager && selected !== "__all__" && (
        <div className="text-xs text-muted-foreground">
          Mostrando dados de <span className="text-primary font-semibold">{selected}</span>
        </div>
      )}

      <div className="grid grid-cols-2 gap-3">
        <Stat label="Total de leads" value={stats.total} />
        <Stat label="Follow-ups pendentes" value={stats.pendentes} tone={stats.pendentes ? "warn" : "ok"} />
        <div className="bg-surface border border-border rounded-xl p-4 col-span-2">
          <div className="text-xs uppercase tracking-wider text-muted-foreground">Convertidos</div>
          <div className="flex items-baseline justify-between mt-1">
            <div className="text-2xl font-bold">{stats.convertidos}</div>
            <div className="text-sm text-primary font-semibold">{stats.taxa}% conversão</div>
          </div>
          <div className="mt-2 h-2 bg-muted rounded-full overflow-hidden">
            <div className="h-full bg-primary" style={{ width: `${stats.taxa}%` }} />
          </div>
        </div>
        <Stat label="Qualificados" value={stats.qualificados} />
        <Stat label="Novos" value={stats.porStatus.novo || 0} />
      </div>

      <div className="bg-surface border border-border rounded-xl p-4 space-y-2">
        <h3 className="font-bold text-sm">Distribuição por status</h3>
        <div className="space-y-1.5">
          {STATUS_ORDER.map((s) => {
            const n = stats.porStatus[s] || 0;
            const pct = stats.total > 0 ? (n / stats.total) * 100 : 0;
            return (
              <div key={s} className="flex items-center gap-2 text-xs">
                <span className="w-20 text-muted-foreground">{STATUS_LABEL[s]}</span>
                <div className="flex-1 h-1.5 bg-muted rounded-full overflow-hidden">
                  <div className="h-full bg-primary" style={{ width: `${pct}%` }} />
                </div>
                <span className="w-6 text-right font-semibold">{n}</span>
              </div>
            );
          })}
        </div>
      </div>

      {session.isManager && (
        <div className="bg-surface border border-border rounded-xl p-4 space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="font-bold">Painel por vendedor</h3>
            <span className="text-[10px] uppercase tracking-wider text-muted-foreground">
              {perVendedor.filter((v) => v.total > 0).length} ativos
            </span>
          </div>
          {perVendedor.length === 0 && <p className="text-sm text-muted-foreground">Sem dados ainda.</p>}
          <div className="space-y-2">
            {perVendedor.map((v) => (
              <button
                key={v.nome}
                onClick={() => setSelected(v.nome)}
                className={`w-full text-left bg-background border rounded-lg p-3 transition hover:border-primary/50 ${
                  selected === v.nome ? "border-primary" : "border-border"
                }`}
              >
                <div className="flex items-center justify-between mb-2">
                  <span className="font-semibold text-sm">{v.nome}</span>
                  <span className="text-xs text-muted-foreground">
                    <span className="text-foreground font-bold">{v.total}</span> leads
                  </span>
                </div>
                <div className="h-1.5 bg-muted rounded-full overflow-hidden mb-2">
                  <div className="h-full bg-primary" style={{ width: `${(v.total / maxTotal) * 100}%` }} />
                </div>
                <div className="grid grid-cols-4 gap-1.5 text-[10px]">
                  <Mini label="Conv" value={v.convertidos} tone="primary" />
                  <Mini label="Qual" value={v.qualificados} />
                  <Mini label="Pend" value={v.pendentes} tone={v.pendentes ? "warn" : undefined} />
                  <Mini label="Taxa" value={`${v.taxa}%`} tone="primary" />
                </div>
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

type Stats = {
  total: number;
  pendentes: number;
  convertidos: number;
  qualificados: number;
  taxa: number;
  porStatus: Record<LeadStatus, number>;
};

function computeStats(leads: Lead[]): Stats {
  const total = leads.length;
  const pendentes = leads.filter((l) => {
    const s = followupState(l.followup, l.status);
    return s === "late" || s === "today";
  }).length;
  const convertidos = leads.filter((l) => l.status === "convertido").length;
  const qualificados = leads.filter((l) => l.status === "qualificado").length;
  const taxa = total > 0 ? Math.round((convertidos / total) * 100) : 0;
  const porStatus = STATUS_ORDER.reduce((acc, s) => {
    acc[s] = leads.filter((l) => l.status === s).length;
    return acc;
  }, {} as Record<LeadStatus, number>);
  return { total, pendentes, convertidos, qualificados, taxa, porStatus };
}

function Stat({ label, value, tone }: { label: string; value: number; tone?: "warn" | "ok" }) {
  const color = tone === "warn" ? "text-warning" : "text-foreground";
  return (
    <div className="bg-surface border border-border rounded-xl p-4">
      <div className="text-xs uppercase tracking-wider text-muted-foreground">{label}</div>
      <div className={`text-2xl font-bold mt-1 ${color}`}>{value}</div>
    </div>
  );
}

function Mini({ label, value, tone }: { label: string; value: number | string; tone?: "primary" | "warn" }) {
  const color = tone === "primary" ? "text-primary" : tone === "warn" ? "text-warning" : "text-foreground";
  return (
    <div className="bg-surface border border-border rounded px-1.5 py-1">
      <div className="text-muted-foreground uppercase tracking-wider">{label}</div>
      <div className={`font-bold ${color}`}>{value}</div>
    </div>
  );
}
