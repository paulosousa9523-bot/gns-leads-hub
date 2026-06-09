import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

const StartCallInput = z.object({
  leadId: z.string().uuid(),
  telefone: z.string().min(8).max(32),
  provider: z.string().min(1).max(32).optional(),
  observacoes: z.string().max(2000).optional(),
});

export type StartCallResult = {
  ok: boolean;
  callLogId?: string;
  telLink?: string;
  error?: string;
};

/**
 * Inicia uma chamada para um lead:
 * - valida que o lead existe e está acessível ao usuário (RLS)
 * - cria a linha em call_logs com status 'iniciando' em nome do usuário autenticado
 * - registra a ação 'ligacao_iniciada' no log de auditoria (lead_actions)
 * - retorna um tel: link como fallback caso o provedor (Twilio etc.) ainda não esteja configurado
 *
 * Quando o provedor for plugado, esta função fará a chamada via gateway e
 * preencherá provider/provider_call_sid; o webhook atualiza status/duração.
 */
export const startCall = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => StartCallInput.parse(input))
  .handler(async ({ data, context }): Promise<StartCallResult> => {
    const { supabase } = context;

    // 1. Confere acesso ao lead (RLS faz o filtro real)
    const { data: lead, error: leadErr } = await supabase
      .from("leads")
      .select("id, vendedor, nome")
      .eq("id", data.leadId)
      .maybeSingle();

    if (leadErr) return { ok: false, error: leadErr.message };
    if (!lead) return { ok: false, error: "Lead não encontrado ou sem acesso" };

    // 2. Cria o log inicial (RLS exige usuario = current_display_name())
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return { ok: false, error: "Sessão inválida" };

    const { data: profile } = await supabase
      .from("profiles")
      .select("display_name")
      .eq("id", user.id)
      .maybeSingle();

    const usuario = profile?.display_name ?? user.email ?? "Desconhecido";
    const telefoneNorm = data.telefone.replace(/[^\d+]/g, "");

    const { data: callLog, error: insErr } = await supabase
      .from("call_logs")
      .insert({
        lead_id: data.leadId,
        usuario,
        telefone: telefoneNorm,
        status: "iniciando",
        provider: data.provider ?? null,
        observacoes: data.observacoes ?? null,
      })
      .select("id")
      .single();

    if (insErr) return { ok: false, error: insErr.message };

    // 3. Auditoria (lead_actions) — silencioso para o vendedor
    await supabase.from("lead_actions").insert({
      lead_id: data.leadId,
      usuario,
      acao: "ligacao_iniciada",
      detalhes: `Tel: ${telefoneNorm}${data.provider ? ` via ${data.provider}` : ""}`,
    });

    return {
      ok: true,
      callLogId: callLog.id,
      telLink: `tel:${telefoneNorm}`,
    };
  });
