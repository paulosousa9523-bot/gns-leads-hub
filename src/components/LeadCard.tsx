import { useState } from "react";
import type { Lead, LeadStatus, ContratoStatus } from "@/lib/leads";
import {
  STATUS_LABEL,
  STATUS_STYLE,
  STATUS_ORDER,
  DIA_COLUMNS,
  TIPO_PROCESSO_OPTIONS,
  CONTRATO_STATUS_OPTIONS,
  RESPONSAVEIS_JURIDICOS,
  normalizePhoneForWa,
  timeAgo,
  dayProgress,
  businessHoursSince,
  formatProcesso,
  formatCurrencyBR,
  parseCurrencyInput,
} from "@/lib/leads";
import { supabase } from "@/integrations/supabase/client";
import type { Session } from "@/lib/auth";
import { MessageCircle, Pencil, X, Download, Phone, PhoneOff, Trash2, CalendarClock } from "lucide-react";
import { DocsManager } from "./DocsManager";
import { ContractsSection } from "./ContractsSection";
import { PROCESS_DOC_CATEGORIES, OBS_DOC_CATEGORIES } from "@/lib/leads";
import { logAction } from "@/lib/actionLog";
import { useServerFn } from "@tanstack/react-start";
import { startCall } from "@/lib/calls.functions";

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
  const [chamado, setChamado] = useState<boolean>(!!lead.chamado);
  const [calling, setCalling] = useState(false);
  const startCallFn = useServerFn(startCall);

  const isDia = (DIA_COLUMNS as LeadStatus[]).includes(lead.status);
  const progress = isDia ? Math.min(1, dayProgress(lead.movido_em)) : 0;
  const hrs = businessHoursSince(lead.movido_em);
  const progressColor = hrs >= 20 ? "bg-danger" : hrs >= 12 ? "bg-warning" : "bg-primary";

  const alertFollowup = lead.status === "dia_5" && hrs >= 20;
  const borderColor =
    lead.status === "cliente_fechado" ? "border-l-primary"
    : alertFollowup ? "border-l-danger"
    : "border-l-border";

  const phones = [lead.phone, lead.phone2, lead.phone3, lead.phone4, lead.phone5].filter(Boolean) as string[];

  const openWa = (p: string) => {
    logAction(session.name, "whatsapp_clique", lead.id, { telefone: p });
    window.open(`https://wa.me/${normalizePhoneForWa(p)}`, "_blank");
  };

  const pull = async (e: React.MouseEvent) => {
    e.stopPropagation();
    await supabase.from("leads").update({
      vendedor: session.name,
      status: "dia_1",
      movido_em: new Date().toISOString(),
    }).eq("id", lead.id);
    logAction(session.name, "lead_puxado", lead.id, { de_vendedor: lead.vendedor });
  };

  const toggleChamado = async (e: React.MouseEvent) => {
    e.stopPropagation();
    e.preventDefault();
    const prev = chamado;
    const next = !prev;
    // Atualiza UI imediatamente — qualquer erro reverte o estado local sem derrubar a árvore.
    setChamado(next);
    try {
      const { error } = await supabase
        .from("leads")
        .update({ chamado: next } as never)
        .eq("id", lead.id);
      if (error) {
        console.error("[toggleChamado] update falhou:", error);
        setChamado(prev);
        return;
      }
      try {
        if (next) {
          await logAction(session.name, "chamado_marcado", lead.id);
        } else {
          await logAction(session.name, "edicao", lead.id, { campos: ["chamado"], chamado: next });
        }
      } catch (logErr) {
        console.warn("[toggleChamado] logAction falhou (silencioso):", logErr);
      }
    } catch (err) {
      console.error("[toggleChamado] exceção inesperada:", err);
      setChamado(prev);
    }
  };

  const toggleOpen = () => {
    const next = !open;
    setOpen(next);
    if (next) logAction(session.name, "lead_aberto", lead.id);
  };

  const handleCall = async (e: React.MouseEvent, telefone: string) => {
    e.stopPropagation();
    if (calling) return;
    setCalling(true);
    try {
      const res = await startCallFn({ data: { leadId: lead.id, telefone } });
      const link = res?.telLink ?? `tel:${telefone.replace(/[^\d+]/g, "")}`;
      window.location.href = link;
      if (!chamado) {
        setChamado(true);
        await supabase.from("leads").update({ chamado: true } as never).eq("id", lead.id);
      }
    } catch (err) {
      console.error("startCall falhou", err);
      window.location.href = `tel:${telefone.replace(/[^\d+]/g, "")}`;
    } finally {
      setCalling(false);
    }
  };

  const onDragStart = (e: React.DragEvent) => {
    e.dataTransfer.setData("text/plain", lead.id);
    e.dataTransfer.effectAllowed = "move";
  };

  const cardClass = chamado
    ? `bg-called text-called-foreground border-called/60 border-l-4 ${borderColor}`
    : `bg-surface border-border border-l-4 ${borderColor}`;

  return (
    <>
      <div
        draggable={draggable}
        onDragStart={draggable ? onDragStart : undefined}
        className={`${cardClass} border rounded-lg p-3 space-y-2 ${draggable ? "cursor-grab active:cursor-grabbing" : ""}`}
      >
        <button onClick={toggleOpen} className="w-full text-left">
          {lead.processo && (
            <div className={`text-[10px] font-mono uppercase tracking-wider truncate ${chamado ? "text-primary" : "text-primary"}`}>
              Proc. {formatProcesso(lead.processo)}
            </div>
          )}
          <div className="flex items-start justify-between gap-2">
            <h3 className="font-semibold text-sm truncate flex-1">{lead.nome}</h3>
            <span className={`text-[10px] shrink-0 ${chamado ? "text-called-foreground/70" : "text-muted-foreground"}`}>{timeAgo(lead.movido_em)}</span>
          </div>
          {(lead.cnpj || lead.cpf) && (
            <div className={`text-[11px] truncate ${chamado ? "text-called-foreground/80" : "text-muted-foreground/80"}`}>
              {lead.cnpj && <>CNPJ {lead.cnpj}</>}
              {lead.cnpj && lead.cpf && " · "}
              {lead.cpf && <>CPF {lead.cpf}</>}
            </div>
          )}
          <div className={`text-xs mt-0.5 truncate ${chamado ? "text-called-foreground/90" : "text-muted-foreground"}`}>{lead.phone}</div>
          {(lead.tipo_processo || lead.tribunal) && (
            <div className={`text-[11px] mt-0.5 truncate ${chamado ? "text-called-foreground/70" : "text-muted-foreground/70"}`}>
              {lead.tipo_processo || "—"} · {lead.tribunal || "—"}
            </div>
          )}
          {lead.valor_causa != null && (
            <div className="text-[11px] font-semibold text-primary mt-1 truncate">
              💰 Valor da causa: {formatCurrencyBR(lead.valor_causa)}
            </div>
          )}
          <div className={`text-[10px] mt-1 inline-flex items-center gap-1 ${chamado ? "text-called-foreground/70" : "text-muted-foreground/80"}`}>
            <CalendarClock className="w-3 h-3" />
            {lead.criado
              ? <>Criado em: {new Date(lead.criado).toLocaleString("pt-BR", { day: "2-digit", month: "2-digit", year: "numeric", hour: "2-digit", minute: "2-digit" })}</>
              : <>Data de criação não registrada</>}
          </div>
          {showVendedor && (
            <div className={`inline-block mt-1.5 ml-2 text-[10px] px-1.5 py-0.5 rounded ${chamado ? "bg-called-foreground/15 text-called-foreground" : "bg-muted text-muted-foreground"}`}>
              {lead.vendedor}
            </div>
          )}
        </button>

        {isDia && (
          <div className={`h-1 rounded-full overflow-hidden ${chamado ? "bg-called-foreground/20" : "bg-muted"}`}>
            <div className={`h-full ${progressColor} transition-all`} style={{ width: `${progress * 100}%` }} />
          </div>
        )}

        <div className="grid grid-cols-2 gap-1.5">
          <button
            onClick={(e) => handleCall(e, lead.phone)}
            disabled={calling}
            className="inline-flex items-center justify-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-md bg-primary text-primary-foreground hover:opacity-90 disabled:opacity-50"
          >
            <Phone className="w-3.5 h-3.5" /> {calling ? "Ligando..." : "Ligar"}
          </button>
          <button
            onClick={toggleChamado}
            className={`inline-flex items-center justify-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-md transition ${
              chamado
                ? "bg-called-foreground/15 text-called-foreground border border-called-foreground/30 hover:bg-called-foreground/25"
                : "bg-muted border border-border hover:border-primary"
            }`}
          >
            {chamado ? <><PhoneOff className="w-3.5 h-3.5" /> Chamado</> : <><Phone className="w-3.5 h-3.5" /> Marcar chamado</>}
          </button>
        </div>

        {showPullButton && (
          <button
            onClick={pull}
            className="w-full inline-flex items-center justify-center gap-1.5 bg-primary text-primary-foreground text-xs font-semibold px-3 py-1.5 rounded-md hover:opacity-90"
          >
            <Download className="w-3.5 h-3.5" /> Puxar para minha esteira
          </button>
        )}

        {open && (
          <div className={`pt-2 border-t space-y-2 text-sm ${chamado ? "border-called-foreground/20" : "border-border"}`}>
            <div>
              <div className={`text-[10px] uppercase tracking-wider ${chamado ? "text-called-foreground/70" : "text-muted-foreground"}`}>Status</div>
              <span className={`inline-block text-[10px] uppercase tracking-wider px-2 py-0.5 rounded-full border ${STATUS_STYLE[lead.status] ?? "bg-muted text-muted-foreground border-border"}`}>
                {STATUS_LABEL[lead.status] ?? (lead.status || "—")}
              </span>
            </div>
            {phones.length > 1 && (
              <div>
                <div className={`text-[10px] uppercase tracking-wider ${chamado ? "text-called-foreground/70" : "text-muted-foreground"}`}>Telefones</div>
                <div className="space-y-1">
                  {phones.map((p, i) => (
                    <div key={i} className="flex items-center justify-between text-xs gap-2">
                      <span className="truncate">{p}</span>
                      <div className="flex items-center gap-2 shrink-0">
                        <button onClick={(e) => handleCall(e, p)} disabled={calling} className="text-primary inline-flex items-center gap-1 disabled:opacity-50">
                          <Phone className="w-3 h-3" /> Ligar
                        </button>
                        <button onClick={() => openWa(p)} className="text-primary inline-flex items-center gap-1">
                          <MessageCircle className="w-3 h-3" /> WA
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
            {lead.obs && (
              <div>
                <div className={`text-[10px] uppercase tracking-wider ${chamado ? "text-called-foreground/70" : "text-muted-foreground"}`}>Observações</div>
                <div className="text-xs whitespace-pre-wrap">{lead.obs}</div>
              </div>
            )}
            <div className="flex flex-wrap gap-2 pt-1">
              <button onClick={() => openWa(lead.phone)} className="inline-flex items-center gap-1.5 bg-primary text-primary-foreground text-xs font-semibold px-2.5 py-1.5 rounded-md">
                <MessageCircle className="w-3.5 h-3.5" /> WhatsApp
              </button>
              <button onClick={() => setEdit(true)} className={`inline-flex items-center gap-1.5 text-xs font-semibold px-2.5 py-1.5 rounded-md hover:border-primary ${chamado ? "bg-called-foreground/10 border border-called-foreground/30" : "bg-muted border border-border"}`}>
                <Pencil className="w-3.5 h-3.5" /> Editar
              </button>
              <button
                onClick={async (e) => {
                  e.stopPropagation();
                  if (!confirm(`Excluir definitivamente o card de "${lead.nome}"? Esta ação não pode ser desfeita.`)) return;
                  const { error } = await supabase.from("leads").delete().eq("id", lead.id);
                  if (error) { alert("Erro ao excluir: " + error.message); return; }
                  logAction(session.name, "edicao", lead.id, { acao: "excluido", nome: lead.nome });
                }}
                className="inline-flex items-center gap-1.5 text-xs font-semibold px-2.5 py-1.5 rounded-md bg-danger/10 text-danger border border-danger/40 hover:bg-danger/20"
                title="Excluir card"
              >
                <Trash2 className="w-3.5 h-3.5" /> Excluir
              </button>
            </div>
          </div>
        )}
      </div>

      {edit && <EditModal lead={lead} session={session} onClose={() => setEdit(false)} />}
    </>
  );
}

function EditModal({ lead, session, onClose }: { lead: Lead; session: Session; onClose: () => void }) {
  const canEditJuridico = !!session.isLegal || session.name === "Paulo (Gestor)";
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
    contrato_status: (lead.contrato_status ?? "") as ContratoStatus | "",
    responsavel_juridico: lead.responsavel_juridico ?? "",
    nacionalidade: lead.nacionalidade ?? "",
    estado_civil: lead.estado_civil ?? "",
    profissao: lead.profissao ?? "",
    endereco_cliente: lead.endereco_cliente ?? "",
    numero_endereco: lead.numero_endereco ?? "",
    bairro_cliente: lead.bairro_cliente ?? "",
    cep_cliente: lead.cep_cliente ?? "",
    rg_cliente: lead.rg_cliente ?? "",
  });
  const [showPessoais, setShowPessoais] = useState(false);
  const [saving, setSaving] = useState(false);

  // Vendedor só vê listagem dos próprios docs; admin/jurídico vê e baixa todos
  // Lista de documentos sempre visível para quem tem acesso ao card.
  const canSeeDocList = true;

  const save = async () => {
    setSaving(true);
    const valorCausa = parseCurrencyInput(form.valor_causa);
    if (Number.isNaN(valorCausa)) {
      alert("Informe um valor da causa válido, ex: 12345,67");
      setSaving(false);
      return;
    }
    const statusChanged = form.status !== lead.status;
    const obsChanged = (form.obs || "") !== (lead.obs || "");
    const changedFields: string[] = [];
    const fields: (keyof typeof form)[] = ["nome","cnpj","cpf","phone","phone2","phone3","phone4","phone5","tipo_processo","tribunal","processo","valor_causa"];
    for (const f of fields) {
      const before = (lead as unknown as Record<string, unknown>)[f];
      const after = form[f];
      if ((before ?? "") !== (after ?? "")) changedFields.push(f);
    }
    const contratoStatusChanged = canEditJuridico && (form.contrato_status || null) !== (lead.contrato_status || null);
    const responsavelChanged = canEditJuridico && (form.responsavel_juridico || null) !== (lead.responsavel_juridico || null);
    const nowIso = new Date().toISOString();
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
      processo: form.processo ? formatProcesso(form.processo) : null,
      valor_causa: valorCausa,
      status: form.status,
      obs: form.obs || null,
      nacionalidade: form.nacionalidade || null,
      estado_civil: form.estado_civil || null,
      profissao: form.profissao || null,
      endereco_cliente: form.endereco_cliente || null,
      numero_endereco: form.numero_endereco || null,
      bairro_cliente: form.bairro_cliente || null,
      cep_cliente: form.cep_cliente || null,
      rg_cliente: form.rg_cliente || null,
      ...(statusChanged ? { movido_em: nowIso } : {}),
      ...(canEditJuridico ? {
        contrato_status: form.contrato_status || null,
        responsavel_juridico: form.responsavel_juridico || null,
        ...(responsavelChanged ? {
          responsavel_juridico_em: form.responsavel_juridico ? nowIso : null,
          responsavel_juridico_por: form.responsavel_juridico ? session.name : null,
        } : {}),
      } as never : {}),
    } as never).eq("id", lead.id);
    if (changedFields.length) logAction(session.name, "edicao", lead.id, { campos: changedFields });
    if (obsChanged) logAction(session.name, "observacao_alterada", lead.id);
    if (statusChanged) {
      logAction(session.name, "status_alterado", lead.id, { de: lead.status, para: form.status });
      if (form.status === "cliente_fechado") logAction(session.name, "lead_fechado", lead.id);
    }
    if (contratoStatusChanged) {
      logAction(session.name, "contrato_status_alterado", lead.id, { de: lead.contrato_status ?? null, para: form.contrato_status || null });
    }
    if (responsavelChanged) {
      logAction(session.name, "responsavel_juridico_atribuido", lead.id, { de: lead.responsavel_juridico ?? null, para: form.responsavel_juridico || null });
    }
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
          <div className="space-y-2">
            <Field label="Número do processo">
              <input
                className="input"
                placeholder="0000000-00.0000.0.00.0000"
                value={form.processo}
                onChange={(e) => setForm({ ...form, processo: formatProcesso(e.target.value) })}
              />
            </Field>
            <div className="bg-muted/30 border border-border rounded-lg p-2.5">
              <DocsManager
                leadId={lead.id}
                categories={PROCESS_DOC_CATEGORIES}
                filterCategories={PROCESS_DOC_CATEGORIES}
                title="Documentos do processo"
                hideList={!canSeeDocList}
              />
            </div>
          </div>
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
          <Field label="Valor da causa (R$)">
            <input className="input" inputMode="decimal" placeholder="0,00" value={form.valor_causa} onChange={(e) => setForm({ ...form, valor_causa: e.target.value })} />
          </Field>
          <Field label="Coluna">
            <select className="input" value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value as Lead["status"] })}>
              {STATUS_ORDER.map((s) => <option key={s} value={s}>{STATUS_LABEL[s]}</option>)}
            </select>
          </Field>
          {canEditJuridico && (
            <div className="bg-primary/5 border border-primary/30 rounded-lg p-2.5 space-y-2">
              <div className="text-[11px] font-semibold uppercase tracking-wider text-primary">Controle Jurídico</div>
              <Field label="Status do contrato">
                <select className="input" value={form.contrato_status} onChange={(e) => setForm({ ...form, contrato_status: e.target.value as ContratoStatus | "" })}>
                  <option value="">— não definido —</option>
                  {CONTRATO_STATUS_OPTIONS.map((s) => <option key={s.value} value={s.value}>{s.label}</option>)}
                </select>
              </Field>
              <Field label="Responsável Jurídico">
                <select className="input" value={form.responsavel_juridico} onChange={(e) => setForm({ ...form, responsavel_juridico: e.target.value })}>
                  <option value="">— não atribuído —</option>
                  {RESPONSAVEIS_JURIDICOS.map((n) => <option key={n} value={n}>{n}</option>)}
                </select>
              </Field>
              {lead.responsavel_juridico_em && (
                <div className="text-[10px] text-muted-foreground">
                  Atribuído por <b>{lead.responsavel_juridico_por ?? "—"}</b> em {new Date(lead.responsavel_juridico_em).toLocaleString("pt-BR")}
                </div>
              )}
            </div>
          )}

          {/* Dados pessoais para preenchimento de contrato */}
          <div className="bg-muted/20 border border-border rounded-lg p-2.5 space-y-2">
            <button
              type="button"
              onClick={() => setShowPessoais((v) => !v)}
              className="w-full flex items-center justify-between text-[11px] font-semibold uppercase tracking-wider text-primary"
            >
              <span>Dados pessoais (contrato)</span>
              <span className="text-muted-foreground">{showPessoais ? "ocultar" : "mostrar"}</span>
            </button>
            {showPessoais && (
              <div className="space-y-2">
                <div className="grid grid-cols-2 gap-2">
                  <Field label="Nacionalidade"><input className="input" value={form.nacionalidade} onChange={(e) => setForm({ ...form, nacionalidade: e.target.value })} /></Field>
                  <Field label="Estado civil"><input className="input" value={form.estado_civil} onChange={(e) => setForm({ ...form, estado_civil: e.target.value })} /></Field>
                </div>
                <Field label="Profissão"><input className="input" value={form.profissao} onChange={(e) => setForm({ ...form, profissao: e.target.value })} /></Field>
                <Field label="RG"><input className="input" value={form.rg_cliente} onChange={(e) => setForm({ ...form, rg_cliente: e.target.value })} /></Field>
                <Field label="Endereço"><input className="input" value={form.endereco_cliente} onChange={(e) => setForm({ ...form, endereco_cliente: e.target.value })} /></Field>
                <div className="grid grid-cols-2 gap-2">
                  <Field label="Número"><input className="input" value={form.numero_endereco} onChange={(e) => setForm({ ...form, numero_endereco: e.target.value })} /></Field>
                  <Field label="Bairro"><input className="input" value={form.bairro_cliente} onChange={(e) => setForm({ ...form, bairro_cliente: e.target.value })} /></Field>
                </div>
                <Field label="CEP"><input className="input" value={form.cep_cliente} onChange={(e) => setForm({ ...form, cep_cliente: e.target.value })} /></Field>
              </div>
            )}
          </div>

          <ContractsSection leadId={lead.id} leadNome={form.nome} session={session} />

          <Field label="Observações">
            <textarea className="input min-h-[80px]" value={form.obs} onChange={(e) => setForm({ ...form, obs: e.target.value })} />
          </Field>
          <div className="bg-muted/30 border border-border rounded-lg p-2.5">
            <DocsManager
              leadId={lead.id}
              categories={OBS_DOC_CATEGORIES}
              filterCategories={OBS_DOC_CATEGORIES}
              title="Anexos das observações (Petição Inicial / Contrato)"
              hideList={!canSeeDocList}
            />
          </div>
          {/* Lista única de TODOS os documentos do lead — garante que nada some por filtro de categoria */}
          <div className="bg-muted/20 border border-border rounded-lg p-2.5">
            <DocsManager
              leadId={lead.id}
              categories={[...PROCESS_DOC_CATEGORIES, ...OBS_DOC_CATEGORIES]}
              title="Todos os documentos do lead"
              showOnlyList
            />
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
