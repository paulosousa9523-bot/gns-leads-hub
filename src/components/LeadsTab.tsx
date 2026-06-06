import { useMemo, useState } from "react";
import type { Lead, LeadStatus } from "@/lib/leads";
import { STATUS_LABEL, STATUS_ORDER } from "@/lib/leads";
import { LeadCard } from "./LeadCard";
import type { Session } from "@/lib/auth";
import { supabase } from "@/integrations/supabase/client";

export function LeadsTab({ leads, session }: { leads: Lead[]; session: Session }) {
  // Paulo Jurídico vê apenas as colunas de fechamento
  const COLUMNS: LeadStatus[] = session.isLegal
    ? (["contrato", "cliente_fechado"] as LeadStatus[])
    : STATUS_ORDER;

  const [activeCol, setActiveCol] = useState<LeadStatus>(COLUMNS[0]);

  // Visibilidade por coluna:
  //  - Jurídico: vê todos os contratos fechados de todos os vendedores
  //  - Funil: todos veem tudo
  //  - Demais: vendedor só vê os próprios; gestor vê tudo
  const visibleByCol = useMemo(() => {
    const map = {} as Record<LeadStatus, Lead[]>;
    for (const s of COLUMNS) {
      const inCol = leads.filter((l) => l.status === s);
      if (s === "funil" || session.isManager) {
        map[s] = inCol;
      } else {
        map[s] = inCol.filter((l) => l.vendedor === session.name);
      }
    }
    return map;
  }, [leads, session, COLUMNS]);

  const onDrop = async (e: React.DragEvent, col: LeadStatus) => {
    e.preventDefault();
    const id = e.dataTransfer.getData("text/plain");
    if (!id) return;
    const lead = leads.find((l) => l.id === id);
    if (!lead || lead.status === col) return;
    const patch: Partial<Lead> = { status: col, movido_em: new Date().toISOString() };
    // Se puxar do Funil Geral para uma coluna de esteira, vira do vendedor logado
    if (lead.status === "funil" && col !== "funil" && !session.isManager) {
      patch.vendedor = session.name;
    }
    await supabase.from("leads").update(patch).eq("id", lead.id);
  };

  const allowDrop = (e: React.DragEvent) => e.preventDefault();

  return (
    <div className="space-y-3 max-w-[1600px] mx-auto">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-bold">Esteira</h2>
        <div className="text-xs text-muted-foreground">{leads.length} leads</div>
      </div>

      {/* Chips mobile para escolher coluna */}
      <div className="lg:hidden flex gap-1.5 overflow-x-auto -mx-4 px-4 pb-1">
        {STATUS_ORDER.map((s) => {
          const n = visibleByCol[s].length;
          return (
            <button
              key={s}
              onClick={() => setActiveCol(s)}
              className={`shrink-0 text-xs font-semibold px-3 py-1.5 rounded-full border transition ${
                activeCol === s ? "bg-primary text-primary-foreground border-primary" : "bg-surface text-muted-foreground border-border"
              }`}
            >
              {STATUS_LABEL[s]} <span className="opacity-70">({n})</span>
            </button>
          );
        })}
      </div>

      {/* Mobile: 1 coluna ativa */}
      <div className="lg:hidden">
        <Column
          col={activeCol}
          leads={visibleByCol[activeCol]}
          session={session}
          onDrop={onDrop}
          allowDrop={allowDrop}
        />
      </div>

      {/* Desktop: kanban horizontal */}
      <div className="hidden lg:flex gap-3 overflow-x-auto pb-3">
        {STATUS_ORDER.map((s) => (
          <div key={s} className="shrink-0 w-72">
            <Column
              col={s}
              leads={visibleByCol[s]}
              session={session}
              onDrop={onDrop}
              allowDrop={allowDrop}
            />
          </div>
        ))}
      </div>
    </div>
  );
}

function Column({
  col,
  leads,
  session,
  onDrop,
  allowDrop,
}: {
  col: LeadStatus;
  leads: Lead[];
  session: Session;
  onDrop: (e: React.DragEvent, c: LeadStatus) => void;
  allowDrop: (e: React.DragEvent) => void;
}) {
  const isFunil = col === "funil";
  return (
    <div
      onDragOver={allowDrop}
      onDrop={(e) => onDrop(e, col)}
      className="bg-background border border-border rounded-xl p-2 min-h-[200px]"
    >
      <div className="flex items-center justify-between px-2 py-1.5 mb-2">
        <div className="text-xs font-bold uppercase tracking-wider">{STATUS_LABEL[col]}</div>
        <div className="text-[10px] text-muted-foreground">{leads.length}</div>
      </div>
      <div className="space-y-2">
        {leads.length === 0 && (
          <div className="text-center text-xs text-muted-foreground/60 py-6 border border-dashed border-border rounded-lg">
            Vazio
          </div>
        )}
        {leads.map((l) => {
          const isOwn = l.vendedor === session.name;
          const showPull = isFunil && !session.isManager && !isOwn;
          return (
            <LeadCard
              key={l.id}
              lead={l}
              session={session}
              showVendedor={isFunil || session.isManager}
              showPullButton={showPull}
              draggable={session.isManager || isOwn}
            />
          );
        })}
      </div>
    </div>
  );
}
