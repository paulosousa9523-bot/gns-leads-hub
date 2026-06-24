import { useEffect, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { supabase } from "@/integrations/supabase/client";
import { uploadContractTemplate, getContractSignedUrl } from "@/lib/contracts.functions";
import { FileText, Upload, Download, Loader2 } from "lucide-react";
import type { Session } from "@/lib/auth";

interface TemplateRow {
  id: string;
  nome: string;
  storage_path: string;
  ativo: boolean;
  enviado_por: string | null;
  criado: string;
}

export function AdminContractTemplate({ session }: { session: Session }) {
  const [rows, setRows] = useState<TemplateRow[]>([]);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState("");
  const upFn = useServerFn(uploadContractTemplate);
  const signFn = useServerFn(getContractSignedUrl);

  const load = async () => {
    const { data } = await supabase
      .from("contract_templates" as never)
      .select("id, nome, storage_path, ativo, enviado_por, criado")
      .order("criado", { ascending: false });
    setRows(((data as unknown) as TemplateRow[]) || []);
  };
  useEffect(() => { load(); }, []);

  const onFile = async (file: File) => {
    setMsg("");
    if (!file.name.toLowerCase().endsWith(".docx")) {
      setMsg("Envie um arquivo .docx (Word).");
      return;
    }
    setBusy(true);
    try {
      const buf = await file.arrayBuffer();
      // base64 encode
      let bin = "";
      const bytes = new Uint8Array(buf);
      const chunk = 0x8000;
      for (let i = 0; i < bytes.length; i += chunk) {
        bin += String.fromCharCode.apply(null, Array.from(bytes.subarray(i, i + chunk)));
      }
      const base64 = btoa(bin);
      await upFn({ data: {
        nome: file.name,
        mime_type: file.type || "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
        tamanho: file.size,
        base64,
        uploader: session.name,
      } });
      setMsg("Modelo enviado com sucesso.");
      await load();
    } catch (e) {
      setMsg("Erro: " + (e as Error).message);
    } finally {
      setBusy(false);
      setTimeout(() => setMsg(""), 4000);
    }
  };

  const baixar = async (r: TemplateRow) => {
    const { url } = await signFn({ data: { storage_path: r.storage_path } });
    window.open(url, "_blank");
  };

  return (
    <section className="bg-surface border border-border rounded-xl">
      <div className="px-3 py-2 border-b border-border flex items-center gap-2">
        <FileText className="w-3.5 h-3.5 text-primary" />
        <span className="text-xs font-bold uppercase tracking-wider">Modelo de contrato (.docx)</span>
        {msg && <span className="text-[11px] text-primary ml-auto">{msg}</span>}
      </div>
      <div className="p-3 space-y-2">
        <p className="text-[11px] text-muted-foreground">
          Faça upload do modelo .docx com as variáveis {"{{nome_cliente}}, {{cpf_cliente}}"} etc. O modelo enviado vira o padrão ativo do CRM.
        </p>
        <label className="inline-flex items-center gap-2 bg-primary text-primary-foreground px-3 py-1.5 rounded-md text-xs font-semibold cursor-pointer">
          {busy ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Upload className="w-3.5 h-3.5" />}
          {busy ? "Enviando..." : "Enviar novo modelo"}
          <input
            type="file"
            accept=".docx,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
            disabled={busy}
            className="hidden"
            onChange={(e) => {
              const f = e.target.files?.[0];
              if (f) onFile(f);
              e.currentTarget.value = "";
            }}
          />
        </label>
        {rows.length === 0 ? (
          <div className="text-[11px] text-muted-foreground">Nenhum modelo cadastrado.</div>
        ) : (
          <ul className="divide-y divide-border">
            {rows.map((r) => (
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
                <button onClick={() => baixar(r)} className="text-primary inline-flex items-center gap-1 text-[11px] font-semibold shrink-0">
                  <Download className="w-3 h-3" /> Baixar
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>
    </section>
  );
}
