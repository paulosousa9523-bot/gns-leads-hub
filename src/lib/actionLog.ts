import { supabase } from "@/integrations/supabase/client";

export type ActionType =
  | "lead_aberto"
  | "lead_criado"
  | "lead_fechado"
  | "whatsapp_clique"
  | "edicao"
  | "status_alterado"
  | "observacao_alterada"
  | "anexo_adicionado"
  | "anexo_removido"
  | "lead_puxado"
  | "chamado_marcado"
  | "transferencia_responsavel";

export const ACTION_LABEL: Record<ActionType, string> = {
  lead_aberto: "Abriu lead",
  lead_criado: "Criou lead",
  lead_fechado: "Fechou lead",
  whatsapp_clique: "Clicou no WhatsApp",
  edicao: "Editou informações",
  status_alterado: "Alterou status",
  observacao_alterada: "Alterou observação",
  anexo_adicionado: "Adicionou anexo",
  anexo_removido: "Removeu anexo",
  lead_puxado: "Puxou lead do funil",
  chamado_marcado: "Marcou cliente como chamado",
  transferencia_responsavel: "Transferiu responsabilidade do card",
};

/**
 * Registro interno de ações. Silencioso: nunca exibe erros ao usuário e nunca
 * bloqueia o fluxo da interface.
 */
export async function logAction(
  usuario: string | undefined | null,
  acao: ActionType,
  leadId?: string | null,
  detalhes?: Record<string, unknown>,
): Promise<void> {
  if (!usuario) return;
  try {
    await supabase.from("lead_actions" as never).insert({
      lead_id: leadId ?? null,
      usuario,
      acao,
      detalhes: detalhes ?? null,
    } as never);
  } catch {
    // silencioso por design
  }
}
