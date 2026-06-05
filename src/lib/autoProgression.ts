import { useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { dayProgress, nextAutoStatus, type Lead } from "./leads";
import type { Session } from "./auth";

/**
 * A cada 60s, varre os leads do vendedor logado e avança os que já passaram 24h
 * na coluna atual (Dia 1 -> Dia 2 -> ... -> Dia 5 -> Funil Geral).
 * O gestor também roda a varredura para garantir consistência global.
 */
export function useAutoProgression(leads: Lead[], session: Session | null) {
  useEffect(() => {
    if (!session) return;
    let cancelled = false;

    const tick = async () => {
      if (cancelled) return;
      const candidates = leads.filter((l) => {
        if (!session.isManager && l.vendedor !== session.name) return false;
        return nextAutoStatus(l.status) !== null && dayProgress(l.movido_em) >= 1;
      });
      for (const lead of candidates) {
        const ns = nextAutoStatus(lead.status);
        if (!ns) continue;
        await supabase
          .from("leads")
          .update({ status: ns, movido_em: new Date().toISOString() })
          .eq("id", lead.id)
          .eq("movido_em", lead.movido_em); // evita corrida com outra aba
      }
    };

    tick();
    const id = setInterval(tick, 60_000);
    return () => {
      cancelled = true;
      clearInterval(id);
    };
  }, [leads, session]);
}
