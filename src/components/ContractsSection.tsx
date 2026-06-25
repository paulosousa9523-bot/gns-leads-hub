import { useEffect, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { supabase } from "@/integrations/supabase/client";
import {
  generateContract,
  getContractSignedUrl,
  CONTRACT_TYPES,
  CONTRACT_TYPE_LABEL,
  type ContractType,
} from "@/lib/contracts.functions";
import { FileText, Download, Loader2, Printer, X } from "lucide-react";
import { logAction } from "@/lib/actionLog";
import type { Session } from "@/lib/auth";

interface ContractRow {
  id: string;
  tipo: ContractType;
  nome_arquivo: string;
  storage_path: string;
  gerado_por: string;
  criado: string;
}

export function ContractsSection({ leadId, leadNome, session }: { leadId: string; leadNome: string; session: Session }) {
  const [rows, setRows] = useState<ContractRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string>("");
  const [pickerOpen, setPickerOpen] = useState(false);
  const [sel, setSel] = useState<Record<ContractType, boolean>>({
    procuracao: true,
    hipossuficiencia: true,
    honorarios: true,
  });
  const genFn = useServerFn(generateContract);
  const signFn = useServerFn(getContractSignedUrl);

  const load = async () => {
    const { data } = await supabase
      .from("generated_contracts" as never)
      .select("id, tipo, nome_arquivo, storage_path, gerado_por, criado")
      .eq("lead_id", leadId)
      .order("criado", { ascending: false });
    setRows(((data as unknown) as ContractRow[]) || []);
    setLoading(false);
  };

  useEffect(() => { load(); /* eslint-disable-next-line react-hooks/exhaustive-deps */ }, [leadId]);

  const abrirPicker = () => {
    setErr("");
    if (!leadNome?.trim()) {
      setErr("Preencha o nome do cliente antes de gerar o contrato.");
      return;
    }
    setPickerOpen(true);
  };

  const confirmarGerar = async () => {
    const tipos = CONTRACT_TYPES.filter((t) => sel[t]);
    if (tipos.length === 0) { setErr("Selecione ao menos um documento."); return; }
    setBusy(true);
    setErr("");
    try {
      const res = await genFn({ data: { leadId, geradoPor: session.name, tipos } });
      await logAction(session.name, "edicao", leadId, { acao: "contrato_gerado", tipos });
      setPickerOpen(false);
      if (res.erros && res.erros.length) setErr("Alguns falharam: " + res.erros.join(" | "));
      await load();
    } catch (e) {
      setErr((e as Error).message || "Falha ao gerar contrato.");
    } finally {
      setBusy(false);
    }
  };

  const baixar = async (r: ContractRow) => {
    try {
      const { url } = await signFn({ data: { storage_path: r.storage_path } });
      window.open(url, "_blank");
    } catch (e) {
      alert((e as Error).message);
    }
  };

  return (
    <div className="bg-primary/5 border border-primary/30 rounded-lg p-2.5 space-y-2">
      <div className="flex items-center gap-2">
        <FileText className="w-4 h-4 text-primary" />
        <span className="text-[11px] font-semibold uppercase tracking-wider text-primary">Contratos</span>
      </div>
      <button
        onClick={abrirPicker}
        disabled={busy}
        className="w-full inline-flex items-center justify-center gap-2 bg-primary text-primary-foreground text-xs font-semibold px-3 py-2 rounded-md disabled:opacity-50"
      >
        {busy ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <FileText className="w-3.5 h-3.5" />}
        {busy ? "Gerando..." : "Gerar contrato"}
      </button>
      {err && <div className="text-[11px] text-danger">{err}</div>}
      <div className="text-[10px] text-muted-foreground leading-tight">
        Para salvar em PDF, abra o .docx baixado e use “Imprimir → Salvar como PDF”.
      </div>

      {loading ? (
        <div className="text-[11px] text-muted-foreground">Carregando…</div>
      ) : rows.length === 0 ? (
        <div className="text-[11px] text-muted-foreground">Nenhum contrato gerado.</div>
      ) : (
        <ul className="divide-y divide-border">
          {rows.map((r) => (
            <li key={r.id} className="py-1.5 flex items-center justify-between gap-2">
              <div className="min-w-0">
                <div className="text-xs truncate">
                  <span className="text-[9px] bg-primary/15 text-primary border border-primary/30 px-1.5 py-0.5 rounded mr-1.5 uppercase">
                    {CONTRACT_TYPE_LABEL[r.tipo] ?? r.tipo}
                  </span>
                  {r.nome_arquivo}
                </div>
                <div className="text-[10px] text-muted-foreground truncate">
                  por {r.gerado_por} · {new Date(r.criado).toLocaleString("pt-BR")}
                </div>
              </div>
              <div className="flex items-center gap-1 shrink-0">
                <button onClick={() => baixar(r)} className="text-primary inline-flex items-center gap-1 text-[11px] font-semibold">
                  <Download className="w-3 h-3" /> Word
                </button>
                <button onClick={() => baixar(r)} title="Abra o .docx e use Imprimir → Salvar como PDF" className="text-muted-foreground inline-flex items-center gap-1 text-[11px]">
                  <Printer className="w-3 h-3" /> PDF
                </button>
              </div>
            </li>
          ))}
        </ul>
      )}

      {pickerOpen && (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4" onClick={() => !busy && setPickerOpen(false)}>
          <div className="bg-background border border-border rounded-xl w-full max-w-sm p-4 space-y-3" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between">
              <div className="text-sm font-bold">Quais documentos gerar?</div>
              <button onClick={() => setPickerOpen(false)} disabled={busy} className="text-muted-foreground">
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="space-y-1.5">
              {CONTRACT_TYPES.map((t) => (
                <label key={t} className="flex items-center gap-2 text-xs cursor-pointer p-2 rounded border border-border hover:bg-muted/50">
                  <input
                    type="checkbox"
                    checked={sel[t]}
                    onChange={(e) => setSel((s) => ({ ...s, [t]: e.target.checked }))}
                  />
                  <span className="font-semibold">{CONTRACT_TYPE_LABEL[t]}</span>
                </label>
              ))}
            </div>
            <div className="flex items-center justify-between gap-2">
              <button
                type="button"
                onClick={() => setSel({ procuracao: true, hipossuficiencia: true, honorarios: true })}
                className="text-[11px] text-primary font-semibold"
              >
                Selecionar todos
              </button>
              <button
                onClick={confirmarGerar}
                disabled={busy}
                className="inline-flex items-center gap-2 bg-primary text-primary-foreground text-xs font-semibold px-3 py-2 rounded-md disabled:opacity-50"
              >
                {busy ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <FileText className="w-3.5 h-3.5" />}
                {busy ? "Gerando..." : "Gerar"}
              </button>
            </div>
            {err && <div className="text-[11px] text-danger">{err}</div>}
          </div>
        </div>
      )}
    </div>
  );
}
