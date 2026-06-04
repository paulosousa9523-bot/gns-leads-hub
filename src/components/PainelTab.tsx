import { useMemo } from "react";
import type { Lead } from "@/lib/leads";
import { followupState } from "@/lib/leads";
import type { Session } from "@/lib/auth";

export function PainelTab({ leads, session }: { leads: Lead[]; session: Session }) {
  const stats = useMemo(() => {
    const total = leads.length;
    const pendentes = leads.filter((l) => {
      const s = followupState(l.followup, l.status);
      return s === "late" || s === "today";
    }).length;
    const convertidos = leads.filter((l) => l.status === "convertido").length;
    const qualificados = leads.filter((l) => l.status === "qualificado").length;
    const taxa = total > 0 ? Math.round((convertidos / total) * 100) : 0;
    return { total, pendentes, convertidos, qualificados, taxa };
  }, [leads]);

  const ranking = useMemo(() => {
    if (!session.isManager) return [];
    const map = new Map<string, { total: number; conv: number }>();
    leads.forEach((l) => {
      const cur = map.get(l.vendedor) || { total: 0, conv: 0 };
      cur.total += 1;
      if (l.status === "convertido") cur.conv += 1;
      map.set(l.vendedor, cur);
    });
    const max = Math.max(1, ...Array.from(map.values()).map((v) => v.total));
    return Array.from(map.entries())
      .map(([nome, v]) => ({ nome, total: v.total, conv: v.conv, pct: (v.total / max) * 100 }))
      .sort((a, b) => b.total - a.total);
  }, [leads, session.isManager]);

  return (
    <div className="space-y-4 max-w-2xl mx-auto">
      <h2 className="text-xl font-bold">Painel</h2>

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
      </div>

      {session.isManager && (
        <div className="bg-surface border border-border rounded-xl p-4 space-y-3">
          <h3 className="font-bold">Ranking da equipe</h3>
          {ranking.length === 0 && <p className="text-sm text-muted-foreground">Sem dados ainda.</p>}
          <div className="space-y-3">
            {ranking.map((r) => (
              <div key={r.nome} className="space-y-1">
                <div className="flex items-center justify-between text-sm">
                  <span className="font-medium">{r.nome}</span>
                  <span className="text-muted-foreground">
                    <span className="text-foreground font-semibold">{r.total}</span> leads · <span className="text-primary font-semibold">{r.conv}</span> conv.
                  </span>
                </div>
                <div className="h-1.5 bg-muted rounded-full overflow-hidden">
                  <div className="h-full bg-primary" style={{ width: `${r.pct}%` }} />
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
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
