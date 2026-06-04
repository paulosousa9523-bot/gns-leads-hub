import { useState } from "react";
import { ROTEIRO } from "@/lib/roteiro";
import { Copy, Check } from "lucide-react";

function highlight(text: string) {
  const parts = text.split(/(\[Nome\]|\[veículo\]|\[tribunal\])/g);
  return parts.map((p, i) =>
    /\[Nome\]|\[veículo\]|\[tribunal\]/.test(p)
      ? <span key={i} className="text-primary font-semibold">{p}</span>
      : <span key={i}>{p}</span>
  );
}

export function RoteiroTab() {
  const [copied, setCopied] = useState<string>("");

  const copy = async (id: string, text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(id);
      setTimeout(() => setCopied(""), 1500);
    } catch {}
  };

  return (
    <div className="space-y-4 max-w-2xl mx-auto">
      <div>
        <h2 className="text-xl font-bold">Roteiro WhatsApp</h2>
        <p className="text-sm text-muted-foreground">5 etapas com variações A/B/C. Personalize os campos em destaque.</p>
      </div>
      {ROTEIRO.map((etapa) => (
        <div key={etapa.titulo} className="bg-surface border border-border rounded-xl p-4 space-y-3">
          <div>
            <h3 className="font-bold">{etapa.titulo}</h3>
            <p className="text-xs text-muted-foreground mt-1">💡 {etapa.dica}</p>
          </div>
          <div className="space-y-2">
            {etapa.variantes.map((v) => {
              const id = etapa.titulo + v.label;
              return (
                <div key={id} className="bg-muted border border-border rounded-lg p-3 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold">{v.label}</span>
                    <button onClick={() => copy(id, v.texto)} className="inline-flex items-center gap-1 text-xs text-primary font-semibold">
                      {copied === id ? <><Check className="w-3 h-3" /> Copiado</> : <><Copy className="w-3 h-3" /> Copiar</>}
                    </button>
                  </div>
                  <p className="text-sm whitespace-pre-wrap leading-relaxed">{highlight(v.texto)}</p>
                </div>
              );
            })}
          </div>
        </div>
      ))}
    </div>
  );
}
