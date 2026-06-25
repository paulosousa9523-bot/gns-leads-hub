import { useEffect, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { supabase } from "@/integrations/supabase/client";
import {
  uploadContractTemplate,
  deleteContractTemplate,
  getContractSignedUrl,
  CONTRACT_TYPES,
  CONTRACT_TYPE_LABEL,
  type ContractType,
} from "@/lib/contracts.functions";
import { FileText, Upload, Download, Loader2, Trash2 } from "lucide-react";
import type { Session } from "@/lib/auth";

interface TemplateRow {
  id: string;
  tipo: ContractType;
  nome: string;
  storage_path: string;
  ativo: boolean;
  enviado_por: string | null;
  criado: string;
}

export function AdminContractTemplate({ session }: { session: Session }) {
  const [rows, setRows] = useState<TemplateRow[]>([]);
  const [busyTipo, setBusyTipo] = useState<ContractType | null>(null);
  const [msg, setMsg] = useState("");
  const upFn = useServerFn(uploadContractTemplate);
  const delFn = useServerFn(deleteContractTemplate);
  const signFn = useServerFn(getContractSignedUrl);

  const load = async () => {
    const { data } = await supabase
      .from("contract_templates" as never)
      .select("id, tipo, nome, storage_path, ativo, enviado_por, criado")
      .order("criado", { ascending: false });
    setRows(((data as unknown) as TemplateRow[]) || []);
  };
  useEffect(() => { load(); }, []);

  const onFile = async (tipo: ContractType, file: File) => {
    setMsg("");
    if (!file.name.toLowerCase().endsWith(".docx")) {
      setMsg("Envie um arquivo .docx (Word).");
      return;
    }
    setBusyTipo(tipo);
    try {
      const buf = await file.arrayBuffer();
      let bin = "";
      const bytes = new Uint8Array(buf);
      const chunk = 0x8000;
      for (let i = 0; i < bytes.length; i += chunk) {
        bin += String.fromCharCode.apply(null, Array.from(bytes.subarray(i, i + chunk)));
      }
      const base64 = btoa(bin);
      await upFn({ data: {
        tipo,
        nome: file.name,
        mime_type: file.type || "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
        tamanho: file.size,
        base64,
        uploader: session.name,
      } });
      setMsg(`Modelo de ${CONTRACT_TYPE_LABEL[tipo]} enviado.`);
      await load();
    } catch (e) {
      setMsg("Erro: " + (e as Error).message);
    } finally {
      setBusyTipo(null);
      setTimeout(() => setMsg(""), 4000);
    }
  };

  const baixar = async (r: TemplateRow) => {
    const { url } = await signFn({ data: { storage_path: r.storage_path } });
    window.open(url, "_blank");
  };

  const excluir = async (r: TemplateRow) => {
    if (!confirm(`Excluir o modelo "${r.nome}"?`)) return;
    try {
      await delFn({ data: { id: r.id } });
      await load();
    } catch (e) {
      alert((e as Error).message);
    }
  };

  return (
    <section className="bg-surface border border-border rounded-xl">
      <div className="px-3 py-2 border-b border-border flex items-center gap-2">
        <FileText className="w-3.5 h-3.5 text-primary" />
        <span className="text-xs font-bold uppercase tracking-wider">Modelos de contrato (.docx)</span>
        {msg && <span className="text-[11px] text-primary ml-auto truncate">{msg}</span>}
      </div>
      <div className="p-3 space-y-3">
        <p className="text-[11px] text-muted-foreground">
          Envie um modelo .docx para cada tipo, usando as variáveis {"{{nome_cliente}}, {{cpf_cliente}}"} etc.
        </p>
        {CONTRACT_TYPES.map((tipo) => {
          const itens = rows.filter((r) => r.tipo === tipo);
          const busy = busyTipo === tipo;
          return (
            <div key={tipo} className="border border-border rounded-lg p-2.5 space-y-2">
              <div className="flex items-center justify-between gap-2">
                <span className="text-xs font-bold uppercase">{CONTRACT_TYPE_LABEL[tipo]}</span>
                <label className="inline-flex items-center gap-1.5 bg-primary text-primary-foreground px-2.5 py-1 rounded-md text-[11px] font-semibold cursor-pointer shrink-0">
                  {busy ? <Loader2 className="w-3 h-3 animate-spin" /> : <Upload className="w-3 h-3" />}
                  {busy ? "Enviando..." : "Enviar"}
                  <input
                    type="file"
                    accept=".docx,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
                    disabled={busy}
                    className="hidden"
                    onChange={(e) => {
                      const f = e.target.files?.[0];
                      if (f) onFile(tipo, f);
                      e.currentTarget.value = "";
                    }}
                  />
                </label>
              </div>
              {itens.length === 0 ? (
                <div className="text-[11px] text-muted-foreground">Nenhum modelo cadastrado.</div>
              ) : (
                <ul className="divide-y divide-border">
                  {itens.map((r) => (
                    <li key={r.id} className="py-1.5 flex items-center justify-between gap-2">
                      <div className="min-w-0">
                        <div className="text-xs truncate flex items-center gap-2">
                          {r.nome}
                          {r.ativo && <span className="text-[9px] bg-primary/15 text-primary border border-primary/30 px-1.5 py-0.5 rounded">ATIVO</span>}
                        </div>
                        <div className="text-[10px] text-muted-foreground truncate">
                          por {r.enviado_por ?? "—"} · {new Date(r.criado).toLocaleString("pt-BR")}
                        </div>
                      </div>
                      <div className="flex items-center gap-2 shrink-0">
                        <button onClick={() => baixar(r)} className="text-primary inline-flex items-center gap-1 text-[11px] font-semibold">
                          <Download className="w-3 h-3" /> Baixar
                        </button>
                        <button onClick={() => excluir(r)} className="text-danger inline-flex items-center gap-1 text-[11px] font-semibold">
                          <Trash2 className="w-3 h-3" /> Excluir
                        </button>
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          );
        })}
      </div>
    </section>
  );
}
