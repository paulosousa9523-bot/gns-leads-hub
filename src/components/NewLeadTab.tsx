import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { STATUS_LABEL, STATUS_ORDER, TIPO_PROCESSO_OPTIONS, type LeadStatus } from "@/lib/leads";
import type { Session } from "@/lib/auth";

export function NewLeadTab({ session }: { session: Session }) {
  const [form, setForm] = useState({
    nome: "",
    cnpj: "",
    cpf: "",
    phone: "",
    phone2: "",
    phone3: "",
    phone4: "",
    phone5: "",
    tipo_processo: "",
    tribunal: "",
    processo: "",
    status: "dia_1" as LeadStatus,
    obs: "",
  });
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState("");

  const save = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.nome || !form.phone) {
      setMsg("Nome e telefone principal são obrigatórios");
      return;
    }
    setSaving(true);
    setMsg("");
    const { error } = await supabase.from("leads").insert({
      vendedor: session.name,
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
      status: form.status,
      obs: form.obs || null,
      movido_em: new Date().toISOString(),
    });
    setSaving(false);
    if (error) {
      setMsg("Erro: " + error.message);
    } else {
      setMsg("Lead salvo!");
      setForm({
        nome: "", cnpj: "", cpf: "", phone: "", phone2: "", phone3: "", phone4: "", phone5: "",
        tipo_processo: "", tribunal: "", processo: "", status: "dia_1", obs: "",
      });
      setTimeout(() => setMsg(""), 2000);
    }
  };

  return (
    <form onSubmit={save} className="space-y-3 max-w-lg mx-auto">
      <h2 className="text-xl font-bold">Nova lead</h2>
      <Field label="Nome do cliente *"><input required className="input" value={form.nome} onChange={(e) => setForm({ ...form, nome: e.target.value })} /></Field>
      <div className="grid grid-cols-2 gap-3">
        <Field label="CNPJ"><input className="input" placeholder="00.000.000/0000-00" value={form.cnpj} onChange={(e) => setForm({ ...form, cnpj: e.target.value })} /></Field>
        <Field label="CPF"><input className="input" placeholder="000.000.000-00" value={form.cpf} onChange={(e) => setForm({ ...form, cpf: e.target.value })} /></Field>
      </div>
      <Field label="Telefone 1 (com DDD) *"><input required className="input" placeholder="11 99999-9999" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} /></Field>
      <div className="grid grid-cols-2 gap-3">
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
      <Field label="Tribunal"><input className="input" placeholder="Ex: TJ-SP" value={form.tribunal} onChange={(e) => setForm({ ...form, tribunal: e.target.value })} /></Field>
      <Field label="Número do processo"><input className="input" value={form.processo} onChange={(e) => setForm({ ...form, processo: e.target.value })} /></Field>
      <Field label="Coluna inicial">
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
