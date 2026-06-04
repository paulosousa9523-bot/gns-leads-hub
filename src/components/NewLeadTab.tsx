import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { computeFollowup, STATUS_LABEL, STATUS_ORDER, type LeadStatus } from "@/lib/leads";
import type { Session } from "@/lib/auth";

export function NewLeadTab({ session }: { session: Session }) {
  const [form, setForm] = useState({
    nome: "", phone: "", veiculo: "", tribunal: "", processo: "",
    status: "novo" as LeadStatus, obs: "",
  });
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState("");

  const save = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.nome || !form.phone) {
      setMsg("Nome e telefone são obrigatórios");
      return;
    }
    setSaving(true);
    setMsg("");
    const { error } = await supabase.from("leads").insert({
      vendedor: session.name,
      nome: form.nome,
      phone: form.phone,
      veiculo: form.veiculo || null,
      tribunal: form.tribunal || null,
      processo: form.processo || null,
      status: form.status,
      obs: form.obs || null,
      followup: computeFollowup(form.status),
    });
    setSaving(false);
    if (error) {
      setMsg("Erro: " + error.message);
    } else {
      setMsg("Lead salvo!");
      setForm({ nome: "", phone: "", veiculo: "", tribunal: "", processo: "", status: "novo", obs: "" });
      setTimeout(() => setMsg(""), 2000);
    }
  };

  return (
    <form onSubmit={save} className="space-y-3 max-w-lg mx-auto">
      <h2 className="text-xl font-bold">Nova lead</h2>
      <Field label="Nome do cliente *"><input required className="input" value={form.nome} onChange={(e) => setForm({ ...form, nome: e.target.value })} /></Field>
      <Field label="Telefone (com DDD) *"><input required className="input" placeholder="11 99999-9999" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} /></Field>
      <Field label="Veículo"><input className="input" placeholder="Ex: Caminhão Volvo FH 540" value={form.veiculo} onChange={(e) => setForm({ ...form, veiculo: e.target.value })} /></Field>
      <Field label="Tribunal"><input className="input" placeholder="Ex: TJ-SP" value={form.tribunal} onChange={(e) => setForm({ ...form, tribunal: e.target.value })} /></Field>
      <Field label="Número do processo"><input className="input" value={form.processo} onChange={(e) => setForm({ ...form, processo: e.target.value })} /></Field>
      <Field label="Status inicial">
        <select className="input" value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value as LeadStatus })}>
          {STATUS_ORDER.map((s) => <option key={s} value={s}>{STATUS_LABEL[s]}</option>)}
        </select>
      </Field>
      <Field label="Observações">
        <textarea className="input min-h-[80px]" value={form.obs} onChange={(e) => setForm({ ...form, obs: e.target.value })} />
      </Field>
      {msg && <div className="text-sm text-primary">{msg}</div>}
      <button type="submit" disabled={saving} className="w-full bg-primary text-primary-foreground font-semibold rounded-lg py-2.5 disabled:opacity-50">
        {saving ? "Salvando..." : "Salvar lead"}
      </button>
      <style>{`.input{width:100%;background:var(--color-muted);border:1px solid var(--color-border);border-radius:0.5rem;padding:0.5rem 0.75rem;font-size:0.875rem;color:var(--color-foreground)}.input:focus{outline:none;border-color:var(--color-primary)}`}</style>
    </form>
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
