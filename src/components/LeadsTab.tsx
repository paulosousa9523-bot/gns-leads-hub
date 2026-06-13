import { useMemo, useState } from "react";
import type { Lead, LeadStatus } from "@/lib/leads";
import { STATUS_LABEL, STATUS_ORDER, digitsOnly } from "@/lib/leads";
import { LeadCard } from "./LeadCard";
import type { Session } from "@/lib/auth";
import { supabase } from "@/integrations/supabase/client";
import { logAction } from "@/lib/actionLog";
import { Search } from "lucide-react";

export function LeadsTab({ leads, session }: { leads: Lead[]; session: Session }) {
  // Jurídico: contratos fechados + clientes digitados
  // Hosanna (admin restrito): todas as colunas mas só dos vendedores permitidos
  const COLUMNS: LeadStatus[] = session.isLegal
    ? (["contrato", "cliente_fechado", "cliente_digitado"] as LeadStatus[])
    : STATUS_ORDER.filter((s) => s !== "cliente_digitado");

  const [query, setQuery] = useState("");

  // Vendedor vê próprios; gestor/jurídico/Hosanna vê todos (Hosanna filtrado por restrictedVendors)
  // EXCEÇÃO: contrato/cliente_fechado/cliente_digitado: vendedor só vê os seus
  const filteredByOwnership = useMemo(() => {
    let base = leads;
    if (session.restrictedVendors) {
      base = base.filter((l) => session.restrictedVendors!.includes(l.vendedor));
    }
    if (!session.isManager && !session.isLegal) {
      // Vendedor: tudo é próprio (inclusive negociação/contrato/fechado/digitado) — EXCETO Funil Geral que é compartilhado
      base = base.filter((l) => l.status === "funil" || l.vendedor === session.name);
    }
    return base;
  }, [leads, session]);

  const searched = useMemo(() => {
    const q = query.trim();
    if (!q) return filteredByOwnership;
    const qDigits = digitsOnly(q);
    const qLower = q.toLowerCase();
    return filteredByOwnership.filter((l) => {
      // Busca numérica (telefone/processo/CPF/CNPJ) — match parcial em qualquer posição
      if (qDigits.length >= 2) {
        const phones = [l.phone, l.phone2, l.phone3, l.phone4, l.phone5].filter(Boolean) as string[];
        if (phones.some((p) => digitsOnly(p).includes(qDigits))) return true;
        if (digitsOnly(l.processo).includes(qDigits)) return true;
        if (digitsOnly(l.cpf).includes(qDigits)) return true;
        if (digitsOnly(l.cnpj).includes(qDigits)) return true;
      }
      // Busca textual ampla — nome, vendedor, tribunal, tipo, observações e campos brutos
      const haystack = [
        l.nome, l.vendedor, l.tribunal, l.tipo_processo, l.obs,
        l.processo, l.cpf, l.cnpj,
        l.phone, l.phone2, l.phone3, l.phone4, l.phone5,
      ].filter(Boolean).join(" ").toLowerCase();
      return haystack.includes(qLower);
    });
  }, [filteredByOwnership, query]);

  const visibleByCol = useMemo(() => {
    const map = {} as Record<LeadStatus, Lead[]>;
    for (const s of COLUMNS) {
      // Não-chamados sobem; chamados (cards azuis) vão para o final da fileira
      map[s] = searched
        .filter((l) => l.status === s)
        .sort((a, b) => {
          const ca = a.chamado ? 1 : 0;
          const cb = b.chamado ? 1 : 0;
          if (ca !== cb) return ca - cb;
          return new Date(b.movido_em).getTime() - new Date(a.movido_em).getTime();
        });
    }
    return map;
  }, [searched, COLUMNS]);

  const onDrop = async (e: React.DragEvent, col: LeadStatus) => {
    e.preventDefault();
    const id = e.dataTransfer.getData("text/plain");
    if (!id) return;
    const lead = leads.find((l) => l.id === id);
    if (!lead || lead.status === col) return;
    const patch: Record<string, unknown> = { status: col, movido_em: new Date().toISOString() };
    const pulled = lead.status === "funil" && col !== "funil" && !session.isManager;
    if (pulled) patch.vendedor = session.name;
    await supabase.from("leads").update(patch as never).eq("id", lead.id);
    logAction(session.name, "status_alterado", lead.id, { de: lead.status, para: col });
    if (col === "cliente_fechado") logAction(session.name, "lead_fechado", lead.id);
    if (pulled) logAction(session.name, "lead_puxado", lead.id, { de_vendedor: lead.vendedor });
  };

  const allowDrop = (e: React.DragEvent) => e.preventDefault();

  return (
    <div className="space-y-3 max-w-[1800px] mx-auto">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h2 className="text-xl font-bold">Esteira</h2>
        <div className="flex items-center gap-2 flex-1 sm:flex-initial sm:min-w-[280px]">
          <div className="relative flex-1">
            <Search className="w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Buscar por telefone, processo, CPF, nome..."
              className="w-full bg-muted border border-border rounded-md pl-7 pr-2.5 py-1.5 text-xs focus:outline-none focus:border-primary"
            />
          </div>
          <div className="text-xs text-muted-foreground whitespace-nowrap">{searched.length} leads</div>
        </div>
      </div>

      {/* Kanban com rolagem horizontal sempre visível */}
      <div className="kanban-scroll pb-3">
        <div className="flex gap-3 min-w-max">
          {COLUMNS.map((s) => (
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
  const showVendedor = session.isManager || session.isLegal || isFunil;
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
          const showPull = isFunil && !session.isManager && !session.isLegal && !isOwn;
          return (
            <LeadCard
              key={l.id}
              lead={l}
              session={session}
              showVendedor={showVendedor}
              showPullButton={showPull}
              draggable={session.isManager || isOwn}
            />
          );
        })}
      </div>
    </div>
  );
}
