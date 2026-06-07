import { useState } from "react";
import type { Lead, LeadStatus } from "@/lib/leads";
import {
  STATUS_LABEL,
  STATUS_STYLE,
  STATUS_ORDER,
  DIA_COLUMNS,
  TIPO_PROCESSO_OPTIONS,
  normalizePhoneForWa,
  timeAgo,
  dayProgress,
} from "@/lib/leads";
import { supabase } from "@/integrations/supabase/client";
import type { Session } from "@/lib/auth";
import { MessageCircle, Pencil, X, Download } from "lucide-react";
import { DocsManager } from "./DocsManager";
import { PROCESS_DOC_CATEGORIES, OBS_DOC_CATEGORIES } from "@/lib/leads";

interface Props {
  lead: Lead;
  session: Session;
  showVendedor?: boolean;
  showPullButton?: boolean;
  draggable?: boolean;
}

export function LeadCard({ lead, session, showVendedor, showPullButton, draggable }: Props) {
  const [open, setOpen] = useState(false);
  const [edit, setEdit] = useState(false);

  const isDia = (DIA_COLUMNS as LeadStatus[]).includes(lead.status);
  const progress = isDia ? Math.min(1, dayProgress(lead.movido_em)) : 0;
  const hrs = (Date.now() - new Date(lead.movido_em).getTime()) / 3_600_000;
  const progressColor = hrs >= 20 ? "bg-danger" : hrs >= 12 ? "bg-warning" : "bg-primary";

  const borderColor =
    lead.status === "cliente_fechado" ? "border-l-primary"
    : isDia && hrs >= 20 ? "border-l-danger"
    : "border-l-border";

  const phones = [lead.phone, lead.phone2, lead.phone3, lead.phone4, lead.phone5].filter(Boolean) as string[];

  const openWa = (p: string) => {
    window.open(`https://wa.me/${normalizePhoneForWa(p)}`, "_blank");
  };

  const pull = async (e: React.MouseEvent) => {
    e.stopPropagation();
    await supabase.from("leads").update({
      vendedor: session.name,
      status: "dia_1",
      movido_em: new Date().toISOString(),
    }).eq("id", lead.id);
  };

  const onDragStart = (e: React.DragEvent) => {
    e.dataTransfer.setData("text/plain", lead.id);
    e.dataTransfer.effectAllowed = "move";
  };

  return (
    <>
      <div
        draggable={draggable}
        onDragStart={draggable ? onDragStart : undefined}
        className={`bg-surface border border-border border-l-4 ${borderColor} rounded-lg p-3 space-y-2 ${draggable ? "cursor-grab active:cursor-grabbing" : ""}`}
      >
        <button onClick={() => setOpen(!open)} className="w-full text-left">
          {lead.processo && (
            <div className="text-[10px] font-mono uppercase tracking-wider text-primary truncate">
              Proc. {lead.processo}
            </div>
          )}
          <div className="flex items-start justify-between gap-2">
            <h3 className="font-semibold text-sm truncate flex-1">{lead.nome}</h3>
            <span className="text-[10px] text-muted-foreground shrink-0">{timeAgo(lead.movido_em)}</span>
          </div>
          {(lead.cnpj || lead.cpf) && (
            <div className="text-[11px] text-muted-foreground/80 truncate">
              {lead.cnpj && <>CNPJ {lead.cnpj}</>}
              {lead.cnpj && lead.cpf && " · "}
              {lead.cpf && <>CPF {lead.cpf}</>}
            </div>
          )}
          <div className="text-xs text-muted-foreground mt-0.5 truncate">{lead.phone}</div>
          {(lead.tipo_processo || lead.tribunal) && (
            <div className="text-[11px] text-muted-foreground/70 mt-0.5 truncate">
              {lead.tipo_processo || "—"} · {lead.tribunal || "—"}
            </div>
          )}
          {lead.valor_causa != null && (
            <div className="text-[11px] text-primary/90 mt-0.5 truncate">
              Valor da causa: {Number(lead.valor_causa).toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}
            </div>
          )}
          {showVendedor && (
            <div className="inline-block mt-1.5 text-[10px] px-1.5 py-0.5 rounded bg-muted text-muted-foreground">
              {lead.vendedor}
            </div>
          )}
        </button>

        {isDia && (
          <div className="h-1 bg-muted rounded-full overflow-hidden">
            <div className={`h-full ${progressColor} transition-all`} style={{ width: `${progress * 100}%` }} />
          </div>
        )}

        {showPullButton && (
          <button
            onClick={pull}
            className="w-full inline-flex items-center justify-center gap-1.5 bg-primary text-primary-foreground text-xs font-semibold px-3 py-1.5 rounded-md hover:opacity-90"
          >
            <Download className="w-3.5 h-3.5" /> Puxar para minha esteira
          </button>
        )}

        {open && (
          <div className="pt-2 border-t border-border space-y-2 text-sm">
            <div>
              <div className="text-[10px] uppercase tracking-wider text-muted-foreground">Status</div>
              <span className={`inline-block text-[10px] uppercase tracking-wider px-2 py-0.5 rounded-full border ${STATUS_STYLE[lead.status]}`}>
                {STATUS_LABEL[lead.status]}
              </span>
            </div>
            {phones.length > 1 && (
              <div>
                <div className="text-[10px] uppercase tracking-wider text-muted-foreground">Telefones</div>
                <div className="space-y-1">
                  {phones.map((p, i) => (
                    <div key={i} className="flex items-center justify-between text-xs">
                      <span>{p}</span>
                      <button onClick={() => openWa(p)} className="text-primary inline-flex items-center gap-1">
                        <MessageCircle className="w-3 h-3" /> WA
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}
            {lead.processo && (
              <div>
                <div className="text-[10px] uppercase tracking-wider text-muted-foreground">Processo</div>
                <div className="text-xs">{lead.processo}</div>
              </div>
            )}
            {lead.obs && (
              <div>
                <div className="text-[10px] uppercase tracking-wider text-muted-foreground">Observações</div>
                <div className="text-xs whitespace-pre-wrap">{lead.obs}</div>
              </div>
            )}
            <div className="flex flex-wrap gap-2 pt-1">
              <button onClick={() => openWa(lead.phone)} className="inline-flex items-center gap-1.5 bg-primary text-primary-foreground text-xs font-semibold px-2.5 py-1.5 rounded-md">
                <MessageCircle className="w-3.5 h-3.5" /> WhatsApp
              </button>
              <button onClick={() => setEdit(true)} className="inline-flex items-center gap-1.5 bg-muted border border-border text-xs font-semibold px-2.5 py-1.5 rounded-md hover:border-primary">
                <Pencil className="w-3.5 h-3.5" /> Editar
              </button>
            </div>
          </div>
        )}
      </div>

      {edit && <EditModal lead={lead} onClose={() => setEdit(false)} />}
    </>
  );
}

function EditModal({ lead, onClose }: { lead: Lead; onClose: () => void }) {
  const [form, setForm] = useState({
    nome: lead.nome,
    cnpj: lead.cnpj || "",
    cpf: lead.cpf || "",
    phone: lead.phone,
    phone2: lead.phone2 || "",
    phone3: lead.phone3 || "",
    phone4: lead.phone4 || "",
    phone5: lead.phone5 || "",
    tipo_processo: lead.tipo_processo || "",
    tribunal: lead.tribunal || "",
    processo: lead.processo || "",
    valor_causa: lead.valor_causa != null ? String(lead.valor_causa) : "",
    status: lead.status,
    obs: lead.obs || "",
  });
  const [saving, setSaving] = useState(false);

  const save = async () => {
    setSaving(true);
    const statusChanged = form.status !== lead.status;
    await supabase.from("leads").update({
      nome: form.nome,
      cnpj: form.cnpj || null,
      cpf: form.cpf || null,
      phone: form.phone,
      phone2: form.phone2 || null,
      phone3: form.phone3 || null,
      phone4: form.phone4 || null,
      phone5: form.phone5 || null,
      tipo_processo: form.tipo_processo || null,
      tribunal: form.tribunal || null,
      processo: form.processo || null,
      valor_causa: form.valor_causa ? Number(form.valor_causa.replace(",", ".")) : null,
      status: form.status,
      obs: form.obs || null,
      ...(statusChanged ? { movido_em: new Date().toISOString() } : {}),
    }).eq("id", lead.id);
    setSaving(false);
    onClose();
  };



  return (
    <div className="fixed inset-0 z-50 bg-black/60 flex items-end sm:items-center justify-center p-0 sm:p-4">
      <div className="bg-surface border border-border rounded-t-2xl sm:rounded-2xl w-full max-w-md max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between p-4 border-b border-border sticky top-0 bg-surface">
          <h2 className="font-bold">Editar lead</h2>
          <button onClick={onClose}><X className="w-5 h-5" /></button>
        </div>
        <div className="p-4 space-y-3">
          <Field label="Número do processo"><input className="input" value={form.processo} onChange={(e) => setForm({ ...form, processo: e.target.value })} /></Field>
          <Field label="Nome"><input className="input" value={form.nome} onChange={(e) => setForm({ ...form, nome: e.target.value })} /></Field>
          <div className="grid grid-cols-2 gap-2">
            <Field label="CNPJ"><input className="input" value={form.cnpj} onChange={(e) => setForm({ ...form, cnpj: e.target.value })} /></Field>
            <Field label="CPF"><input className="input" value={form.cpf} onChange={(e) => setForm({ ...form, cpf: e.target.value })} /></Field>
          </div>
          <Field label="Telefone 1"><input className="input" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} /></Field>
          <div className="grid grid-cols-2 gap-2">
            <Field label="Telefone 2"><input className="input" value={form.phone2} onChange={(e) => setForm({ ...form, phone2: e.target.value })} /></Field>
            <Field label="Telefone 3"><input className="input" value={form.phone3} onChange={(e) => setForm({ ...form, phone3: e.target.value })} /></Field>
            <Field label="Telefone 4"><input className="input" value={form.phone4} onChange={(e) => setForm({ ...form, phone4: e.target.value })} /></Field>
            <Field label="Telefone 5"><input className="input" value={form.phone5} onChange={(e) => setForm({ ...form, phone5: e.target.value })} /></Field>
          </div>
          <Field label="Tipo de processo">
            <select className="input" value={form.tipo_processo} onChange={(e) => setForm({ ...form, tipo_processo: e.target.value })}>
              <option value="">Selecione...</option>
              {TIPO_PROCESSO_OPTIONS.map((t) => <option key={t} value={t}>{t}</option>)}
            </select>
          </Field>
          <Field label="Tribunal"><input className="input" value={form.tribunal} onChange={(e) => setForm({ ...form, tribunal: e.target.value })} /></Field>
          <Field label="Coluna">
            <select className="input" value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value as Lead["status"] })}>
              {STATUS_ORDER.map((s) => <option key={s} value={s}>{STATUS_LABEL[s]}</option>)}
            </select>
          </Field>
          <Field label="Observações">
            <textarea className="input min-h-[80px]" value={form.obs} onChange={(e) => setForm({ ...form, obs: e.target.value })} />
          </Field>
          <div className="pt-2 border-t border-border">
            <DocsManager leadId={lead.id} />
          </div>
        </div>
        <div className="p-4 border-t border-border flex gap-2 sticky bottom-0 bg-surface">
          <button onClick={onClose} className="flex-1 bg-muted border border-border rounded-lg py-2.5 font-semibold">Cancelar</button>
          <button onClick={save} disabled={saving} className="flex-1 bg-primary text-primary-foreground rounded-lg py-2.5 font-semibold disabled:opacity-50">
            {saving ? "Salvando..." : "Salvar"}
          </button>
        </div>
      </div>
      <style>{`.input{width:100%;background:var(--color-muted);border:1px solid var(--color-border);border-radius:0.5rem;padding:0.5rem 0.75rem;font-size:0.875rem;color:var(--color-foreground)}.input:focus{outline:none;border-color:var(--color-primary)}`}</style>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block space-y-1">
      <span className="text-[10px] uppercase tracking-wider text-muted-foreground">{label}</span>
      {children}
    </label>
  );
}
