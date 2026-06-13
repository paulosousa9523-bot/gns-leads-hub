import { useEffect, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { getGestorRanking, type RankingPayload, type RankingRow } from "@/lib/ranking.functions";
import { Trophy, FileText, PhoneCall } from "lucide-react";

type Period = "daily" | "weekly" | "monthly";

const PERIOD_LABEL: Record<Period, string> = {
  daily: "Hoje",
  weekly: "Últimos 7 dias",
  monthly: "Mês",
};

export function GestorDashboardTab() {
  const fetchRanking = useServerFn(getGestorRanking);
  const [data, setData] = useState<RankingPayload | null>(null);
  const [period, setPeriod] = useState<Period>("daily");
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      try {
        setLoading(true);
        const res = await fetchRanking();
        if (!cancelled) setData(res);
      } catch (e) {
        if (!cancelled) setErr((e as Error).message);
      } finally {
        if (!cancelled) setLoading(false);
      }
    };
    load();
    const id = setInterval(load, 60_000);
    return () => { cancelled = true; clearInterval(id); };
  }, [fetchRanking]);

  if (loading && !data) return <div className="text-sm text-muted-foreground">Carregando ranking…</div>;
  if (err) return <div className="text-sm text-danger">Erro: {err}</div>;
  if (!data) return null;

  const rows: RankingRow[] = data[period];

  return (
    <div className="space-y-5">
      <div>
        <div className="text-[10px] uppercase tracking-[0.2em] text-primary font-semibold">Dashboard do Gestor</div>
        <h2 className="text-lg font-semibold">Ranking de Produtividade</h2>
        <p className="text-xs text-muted-foreground mt-1">
          Pontuação = 0,5 por card criado + 0,5 por cliente chamado.
        </p>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <KpiCard icon={<FileText className="w-4 h-4" />} label="Cards criados (mês)" value={data.totals.cards} />
        <KpiCard icon={<PhoneCall className="w-4 h-4" />} label="Chamados (mês)" value={data.totals.chamados} />
      </div>

      <div className="inline-flex rounded-lg border border-border p-0.5 text-xs">
        {(Object.keys(PERIOD_LABEL) as Period[]).map((p) => (
          <button
            key={p}
            onClick={() => setPeriod(p)}
            className={`px-3 py-1.5 rounded-md transition ${
              period === p ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:text-foreground"
            }`}
          >
            {PERIOD_LABEL[p]}
          </button>
        ))}
      </div>

      <div className="rounded-xl border border-border overflow-hidden">
        <div className="grid grid-cols-[40px_1fr_60px_60px_70px] gap-2 px-3 py-2 text-[10px] uppercase tracking-wider text-muted-foreground bg-surface/50 border-b border-border">
          <div>#</div>
          <div>Vendedor</div>
          <div className="text-right">Cards</div>
          <div className="text-right">Chamados</div>
          <div className="text-right">Pontos</div>
        </div>
        {rows.length === 0 && (
          <div className="px-3 py-6 text-center text-xs text-muted-foreground">Sem atividade no período.</div>
        )}
        {rows.map((r) => (
          <div
            key={r.usuario}
            className="grid grid-cols-[40px_1fr_60px_60px_70px] gap-2 px-3 py-2.5 items-center text-sm border-b border-border last:border-b-0"
          >
            <div className="flex items-center gap-1">
              {r.rank <= 3 ? (
                <Trophy className={`w-4 h-4 ${r.rank === 1 ? "text-yellow-500" : r.rank === 2 ? "text-gray-400" : "text-amber-700"}`} />
              ) : (
                <span className="text-xs text-muted-foreground">{r.rank}</span>
              )}
            </div>
            <div className="font-medium truncate">{r.usuario}</div>
            <div className="text-right tabular-nums">{r.cards}</div>
            <div className="text-right tabular-nums">{r.chamados}</div>
            <div className="text-right tabular-nums font-semibold">{r.points.toFixed(1)}</div>
          </div>
        ))}
      </div>
    </div>
  );
}

function KpiCard({ icon, label, value }: { icon: React.ReactNode; label: string; value: number }) {
  return (
    <div className="rounded-xl border border-border p-3 bg-surface/30">
      <div className="flex items-center gap-1.5 text-[10px] uppercase tracking-wider text-muted-foreground">
        {icon} {label}
      </div>
      <div className="text-2xl font-bold mt-1 tabular-nums">{value}</div>
    </div>
  );
}
