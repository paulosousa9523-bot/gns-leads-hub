export type LeadStatus = "novo" | "contato" | "respondeu" | "qualificado" | "fechado" | "convertido";

export interface Lead {
  id: string;
  vendedor: string;
  nome: string;
  phone: string;
  veiculo: string | null;
  tribunal: string | null;
  processo: string | null;
  status: LeadStatus;
  obs: string | null;
  followup: string | null; // YYYY-MM-DD
  criado: string;
}

export const STATUS_ORDER: LeadStatus[] = ["novo", "contato", "respondeu", "qualificado", "fechado", "convertido"];

export const STATUS_LABEL: Record<LeadStatus, string> = {
  novo: "Novo",
  contato: "Contatado",
  respondeu: "Respondeu",
  qualificado: "Qualificado",
  fechado: "Fechado",
  convertido: "Convertido",
};

export const STATUS_STYLE: Record<LeadStatus, string> = {
  novo: "bg-info/15 text-info border-info/30",
  contato: "bg-primary/15 text-primary border-primary/30",
  respondeu: "bg-warning/15 text-warning border-warning/30",
  qualificado: "bg-purple/15 text-purple border-purple/30",
  fechado: "bg-danger/15 text-danger border-danger/30",
  convertido: "bg-primary/25 text-primary border-primary/50",
};

export function nextStatus(s: LeadStatus): LeadStatus {
  const i = STATUS_ORDER.indexOf(s);
  if (i < 0 || i >= STATUS_ORDER.length - 1) return s;
  return STATUS_ORDER[i + 1];
}

export function computeFollowup(status: LeadStatus): string | null {
  const days: Partial<Record<LeadStatus, number>> = { contato: 2, respondeu: 1, qualificado: 3 };
  const d = days[status];
  if (!d) return null;
  const date = new Date();
  date.setDate(date.getDate() + d);
  return date.toISOString().slice(0, 10);
}

export function todayISO(): string {
  return new Date().toISOString().slice(0, 10);
}

export function followupState(followup: string | null, status: LeadStatus): "none" | "today" | "late" {
  if (!followup) return "none";
  if (status === "convertido" || status === "fechado") return "none";
  const t = todayISO();
  if (followup < t) return "late";
  if (followup === t) return "today";
  return "none";
}

export function normalizePhoneForWa(phone: string): string {
  const digits = phone.replace(/\D/g, "");
  if (digits.startsWith("55")) return digits;
  return "55" + digits;
}
