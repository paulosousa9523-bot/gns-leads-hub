import { useEffect, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { supabase } from "@/integrations/supabase/client";
import { generateContract, getContractSignedUrl } from "@/lib/contracts.functions";
import { FileText, Download, Loader2, Printer } from "lucide-react";
import { logAction } from "@/lib/actionLog";
import type { Session } from "@/lib/auth";

interface ContractRow {
  id: string;
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
  const genFn = useServerFn(generateContract);
  const signFn = useServerFn(getContractSignedUrl);

  const load = async () => {
    const { data } = await supabase
      .from("generated_contracts" as never)
      .select("id, nome_arquivo, storage_path, gerado_por, criado")
      .eq("lead_id", leadId)
      .order("criado", { ascending: false });
    setRows(((data as unknown) as ContractRow[]) || []);
    setLoading(false);
  };

  useEffect(() => { load(); /* eslint-disable-next-line react-hooks/exhaustive-deps */ }, [leadId]);

  const gerar = async () => {
    setErr("");
    if (!leadNome?.trim()) {
      setErr("Preencha o nome do cliente antes de gerar o contrato.");
      return;
    }
    setBusy(true);
    try {
      await genFn({ data: { leadId, geradoPor: session.name } });
      await logAction(session.name, "edicao", leadId, { acao: "contrato_gerado" });
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
        onClick={gerar}
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
                <div className="text-xs truncate">{r.nome_arquivo}</div>
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
    </div>
  );
}
