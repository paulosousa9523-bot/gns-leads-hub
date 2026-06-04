import { useState } from "react";
import type { Lead } from "@/lib/leads";
import { STATUS_LABEL, STATUS_STYLE, followupState, nextStatus, normalizePhoneForWa, computeFollowup, todayISO, STATUS_ORDER } from "@/lib/leads";
import { supabase } from "@/integrations/supabase/client";
import { MessageCircle, ChevronDown, ChevronRight, Pencil, ArrowRight, X } from "lucide-react";

interface Props {
  lead: Lead;
  showVendedor: boolean;
}

export function LeadCard({ lead, showVendedor }: Props) {
  const [open, setOpen] = useState(false);
  const [edit, setEdit] = useState(false);
  const fu = followupState(lead.followup, lead.status);

  const borderColor =
    lead.status === "convertido" ? "border-l-primary" :
    fu === "late" ? "border-l-danger" :
    fu === "today" ? "border-l-warning" :
    "border-l-border";

  const advance = async () => {
    const ns = nextStatus(lead.status);
    if (ns === lead.status) return;
    const fu = computeFollowup(ns);
    await supabase.from("leads").update({ status: ns, followup: fu }).eq("id", lead.id);
  };

  const openWa = () => {
    const num = normalizePhoneForWa(lead.phone);
    window.open(`https://wa.me/${num}`, "_blank");
  };

  const hideAdvance = lead.status === "convertido" || lead.status === "fechado";

  return (
    <>
      <div className={`bg-surface border border-border border-l-4 ${borderColor} rounded-xl p-4 space-y-2`}>
        <button onClick={() => setOpen(!open)} className="w-full flex items-start justify-between gap-3 text-left">
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2 flex-wrap">
              <h3 className="font-semibold truncate">{lead.nome}</h3>
              <span className={`text-[10px] uppercase tracking-wider px-2 py-0.5 rounded-full border ${STATUS_STYLE[lead.status]}`}>
                {STATUS_LABEL[lead.status]}
              </span>
            </div>
            <div className="text-sm text-muted-foreground mt-1 truncate">{lead.phone}</div>
            <div className="text-xs text-muted-foreground/80 mt-0.5 truncate">
              {lead.veiculo || "—"} · {lead.tribunal || "—"}
            </div>
            {showVendedor && (
              <div className="inline-block mt-1.5 text-[10px] px-1.5 py-0.5 rounded bg-muted text-muted-foreground">
                {lead.vendedor}
              </div>
            )}
            {fu !== "none" && (
              <div className={`text-xs mt-1.5 font-medium ${fu === "late" ? "text-danger" : "text-warning"}`}>
                {fu === "late" ? "⚠ Follow-up atrasado" : "● Follow-up hoje"} · {lead.followup}
              </div>
            )}
          </div>
          {open ? <ChevronDown className="w-4 h-4 text-muted-foreground shrink-0 mt-1" /> : <ChevronRight className="w-4 h-4 text-muted-foreground shrink-0 mt-1" />}
        </button>

        {open && (
          <div className="pt-2 border-t border-border space-y-2 text-sm">
            <div>
              <div className="text-xs uppercase tracking-wider text-muted-foreground">Processo</div>
              <div>{lead.processo || "—"}</div>
            </div>
            {lead.obs && (
              <div>
                <div className="text-xs uppercase tracking-wider text-muted-foreground">Observações</div>
                <div className="whitespace-pre-wrap">{lead.obs}</div>
              </div>
            )}
            <div className="flex flex-wrap gap-2 pt-2">
              <button onClick={openWa} className="inline-flex items-center gap-1.5 bg-primary text-primary-foreground text-sm font-semibold px-3 py-1.5 rounded-lg hover:opacity-90">
                <MessageCircle className="w-4 h-4" /> WhatsApp
              </button>
              {!hideAdvance && (
                <button onClick={advance} className="inline-flex items-center gap-1.5 bg-muted border border-border text-sm font-semibold px-3 py-1.5 rounded-lg hover:border-primary">
                  <ArrowRight className="w-4 h-4" /> Avançar
                </button>
              )}
              <button onClick={() => setEdit(true)} className="inline-flex items-center gap-1.5 bg-muted border border-border text-sm font-semibold px-3 py-1.5 rounded-lg hover:border-primary">
                <Pencil className="w-4 h-4" /> Editar
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
    phone: lead.phone,
    veiculo: lead.veiculo || "",
    tribunal: lead.tribunal || "",
    processo: lead.processo || "",
    status: lead.status,
    obs: lead.obs || "",
    followup: lead.followup || "",
  });
  const [saving, setSaving] = useState(false);

  const onStatusChange = (s: Lead["status"]) => {
    const fu = computeFollowup(s);
    setForm({ ...form, status: s, followup: fu || form.followup });
  };

  const save = async () => {
    setSaving(true);
    await supabase.from("leads").update({
      nome: form.nome,
      phone: form.phone,
      veiculo: form.veiculo || null,
      tribunal: form.tribunal || null,
      processo: form.processo || null,
      status: form.status,
      obs: form.obs || null,
      followup: form.followup || null,
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
          <Field label="Nome"><input className="input" value={form.nome} onChange={(e) => setForm({ ...form, nome: e.target.value })} /></Field>
          <Field label="Telefone"><input className="input" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} /></Field>
          <Field label="Veículo"><input className="input" value={form.veiculo} onChange={(e) => setForm({ ...form, veiculo: e.target.value })} /></Field>
          <Field label="Tribunal"><input className="input" value={form.tribunal} onChange={(e) => setForm({ ...form, tribunal: e.target.value })} /></Field>
          <Field label="Processo"><input className="input" value={form.processo} onChange={(e) => setForm({ ...form, processo: e.target.value })} /></Field>
          <Field label="Status">
            <select className="input" value={form.status} onChange={(e) => onStatusChange(e.target.value as Lead["status"])}>
              {STATUS_ORDER.map((s) => <option key={s} value={s}>{STATUS_LABEL[s]}</option>)}
            </select>
          </Field>
          <Field label="Follow-up">
            <input type="date" className="input" min={todayISO()} value={form.followup} onChange={(e) => setForm({ ...form, followup: e.target.value })} />
          </Field>
          <Field label="Observações">
            <textarea className="input min-h-[80px]" value={form.obs} onChange={(e) => setForm({ ...form, obs: e.target.value })} />
          </Field>
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
      <span className="text-xs uppercase tracking-wider text-muted-foreground">{label}</span>
      {children}
    </label>
  );
}
