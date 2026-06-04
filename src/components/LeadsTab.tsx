import { useMemo, useState } from "react";
import type { Lead, LeadStatus } from "@/lib/leads";
import { STATUS_LABEL, STATUS_ORDER } from "@/lib/leads";
import { LeadCard } from "./LeadCard";
import type { Session } from "@/lib/auth";

export function LeadsTab({ leads, session }: { leads: Lead[]; session: Session }) {
  const [filter, setFilter] = useState<LeadStatus | "all">("all");

  const visible = useMemo(() => {
    let l = leads;
    if (!session.isManager) l = l.filter((x) => x.vendedor === session.name);
    if (filter !== "all") l = l.filter((x) => x.status === filter);
    return l;
  }, [leads, session, filter]);

  return (
    <div className="space-y-4 max-w-2xl mx-auto">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-bold">Leads <span className="text-muted-foreground font-normal text-base">({visible.length})</span></h2>
      </div>
      <div className="flex gap-1.5 overflow-x-auto -mx-4 px-4 pb-1">
        <Chip active={filter === "all"} onClick={() => setFilter("all")}>Todos</Chip>
        {STATUS_ORDER.map((s) => (
          <Chip key={s} active={filter === s} onClick={() => setFilter(s)}>{STATUS_LABEL[s]}</Chip>
        ))}
      </div>
      <div className="space-y-3">
        {visible.length === 0 && (
          <div className="text-center text-muted-foreground text-sm py-12 border border-dashed border-border rounded-xl">
            Nenhum lead aqui ainda.
          </div>
        )}
        {visible.map((l) => <LeadCard key={l.id} lead={l} showVendedor={session.isManager} />)}
      </div>
    </div>
  );
}

function Chip({ active, onClick, children }: { active: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      onClick={onClick}
      className={`shrink-0 text-xs font-semibold px-3 py-1.5 rounded-full border transition ${
        active ? "bg-primary text-primary-foreground border-primary" : "bg-surface text-muted-foreground border-border hover:border-primary/50"
      }`}
    >
      {children}
    </button>
  );
}
