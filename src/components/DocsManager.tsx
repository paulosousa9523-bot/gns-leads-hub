import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { DOC_CATEGORIES, type LeadDocument } from "@/lib/leads";
import { Paperclip, Trash2, Download, Upload } from "lucide-react";

const BUCKET = "lead-docs";

export function DocsManager({ leadId }: { leadId: string }) {
  const [docs, setDocs] = useState<LeadDocument[]>([]);
  const [categoria, setCategoria] = useState<string>(DOC_CATEGORIES[0]);
  const [uploading, setUploading] = useState(false);

  const load = async () => {
    const { data } = await supabase
      .from("lead_documents")
      .select("*")
      .eq("lead_id", leadId)
      .order("criado", { ascending: false });
    setDocs((data as LeadDocument[]) || []);
  };

  useEffect(() => {
    load();
  }, [leadId]);

  const upload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    if (!files.length) return;
    setUploading(true);
    for (const file of files) {
      const safe = file.name.replace(/[^a-zA-Z0-9._-]/g, "_");
      const path = `${leadId}/${Date.now()}_${safe}`;
      const { error } = await supabase.storage.from(BUCKET).upload(path, file);
      if (!error) {
        await supabase.from("lead_documents").insert({
          lead_id: leadId,
          categoria,
          nome_arquivo: file.name,
          storage_path: path,
          mime_type: file.type || null,
          tamanho: file.size,
        });
      }
    }
    setUploading(false);
    e.target.value = "";
    load();
  };

  const openDoc = async (d: LeadDocument) => {
    const { data } = await supabase.storage.from(BUCKET).createSignedUrl(d.storage_path, 60 * 10);
    if (data?.signedUrl) window.open(data.signedUrl, "_blank");
  };

  const removeDoc = async (d: LeadDocument) => {
    if (!confirm(`Remover ${d.nome_arquivo}?`)) return;
    await supabase.storage.from(BUCKET).remove([d.storage_path]);
    await supabase.from("lead_documents").delete().eq("id", d.id);
    load();
  };

  return (
    <div className="space-y-2">
      <div className="flex items-center gap-2">
        <Paperclip className="w-3.5 h-3.5 text-muted-foreground" />
        <span className="text-[10px] uppercase tracking-wider text-muted-foreground">Documentos ({docs.length})</span>
      </div>
      <div className="flex gap-2">
        <select
          className="flex-1 bg-muted border border-border rounded-md px-2 py-1.5 text-xs"
          value={categoria}
          onChange={(e) => setCategoria(e.target.value)}
        >
          {DOC_CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}
        </select>
        <label className={`inline-flex items-center gap-1 bg-primary text-primary-foreground text-xs font-semibold px-2.5 py-1.5 rounded-md cursor-pointer ${uploading ? "opacity-50" : ""}`}>
          <Upload className="w-3 h-3" />
          {uploading ? "..." : "Anexar"}
          <input type="file" multiple className="hidden" onChange={upload} disabled={uploading} />
        </label>
      </div>
      {docs.length > 0 && (
        <ul className="space-y-1 max-h-48 overflow-y-auto">
          {docs.map((d) => (
            <li key={d.id} className="flex items-center justify-between gap-2 bg-muted/40 border border-border rounded-md px-2 py-1.5">
              <div className="min-w-0 flex-1">
                <div className="text-[10px] text-primary font-semibold truncate">{d.categoria}</div>
                <div className="text-xs truncate">{d.nome_arquivo}</div>
              </div>
              <button onClick={() => openDoc(d)} className="text-primary p-1" title="Abrir">
                <Download className="w-3.5 h-3.5" />
              </button>
              <button onClick={() => removeDoc(d)} className="text-danger p-1" title="Remover">
                <Trash2 className="w-3.5 h-3.5" />
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
