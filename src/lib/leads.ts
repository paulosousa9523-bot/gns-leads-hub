export type LeadStatus =
  | "funil"
  | "dia_1"
  | "dia_2"
  | "dia_3"
  | "dia_4"
  | "dia_5"
  | "negociacao"
  | "contrato"
  | "cliente_fechado"
  | "cliente_digitado";

export const TIPO_PROCESSO_OPTIONS = [
  "Busca e apreensão",
  "Execução de títulos extrajudicial",
  "Execução de títulos fiscal",
  "Revisional de contrato",
  "Procedimento comum cível",
  "Monitoria",
  "Compra de Carro",
] as const;

// Categorias da área principal (ao lado do Número do Processo)
export const PROCESS_DOC_CATEGORIES = [
  "001 PROCURAÇÃO",
  "002 DECLARAÇÃO DE HIPOSSUFICIÊNCIA",
  "003 CNH",
  "004 COMPROVANTE DE RESIDÊNCIA",
  "005 TRÊS ÚLTIMOS EXTRATOS BANCÁRIOS OU CONTRACHEQUES",
  "006 DOCUMENTOS COMPROBATÓRIOS",
  "006 CTPS",
  "007 IRPJ",
] as const;

// Categorias permitidas dentro da área de Observações
export const OBS_DOC_CATEGORIES = [
  "Petição Inicial",
  "Contrato de Financiamento ou Empréstimo",
] as const;

// Lista completa (compatibilidade)
export const DOC_CATEGORIES = [
  ...PROCESS_DOC_CATEGORIES,
  ...OBS_DOC_CATEGORIES,
] as const;

export type DocCategory = (typeof DOC_CATEGORIES)[number];

export interface LeadDocument {
  id: string;
  lead_id: string;
  categoria: string;
  nome_arquivo: string;
  storage_path: string;
  mime_type: string | null;
  tamanho: number | null;
  criado: string;
}

export interface Lead {
  id: string;
  vendedor: string;
  nome: string;
  phone: string;
  phone2: string | null;
  phone3: string | null;
  phone4: string | null;
  phone5: string | null;
  cnpj: string | null;
  cpf: string | null;
  veiculo: string | null;
  tipo_processo: string | null;
  tribunal: string | null;
  processo: string | null;
  valor_causa: number | null;
  status: LeadStatus;
  obs: string | null;
  followup: string | null;
  movido_em: string;
  criado: string;
  chamado?: boolean;
}

export const STATUS_ORDER: LeadStatus[] = [
  "funil",
  "dia_1",
  "dia_2",
  "dia_3",
  "dia_4",
  "dia_5",
  "negociacao",
  "contrato",
  "cliente_fechado",
  "cliente_digitado",
];

export const STATUS_LABEL: Record<LeadStatus, string> = {
  funil: "Funil Geral",
  dia_1: "Dia 1",
  dia_2: "Dia 2",
  dia_3: "Dia 3",
  dia_4: "Dia 4",
  dia_5: "Dia 5",
  negociacao: "Em Negociação",
  contrato: "Contrato Assinado",
  cliente_fechado: "Cliente Fechado",
  cliente_digitado: "Cliente Digitado",
};

export const STATUS_STYLE: Record<LeadStatus, string> = {
  funil: "bg-info/15 text-info border-info/30",
  dia_1: "bg-primary/15 text-primary border-primary/30",
  dia_2: "bg-primary/15 text-primary border-primary/30",
  dia_3: "bg-warning/15 text-warning border-warning/30",
  dia_4: "bg-warning/15 text-warning border-warning/30",
  dia_5: "bg-danger/15 text-danger border-danger/30",
  negociacao: "bg-purple/15 text-purple border-purple/30",
  contrato: "bg-primary/25 text-primary border-primary/50",
  cliente_fechado: "bg-primary/30 text-primary border-primary/60",
  cliente_digitado: "bg-info/20 text-info border-info/40",
};

// Colunas de esteira pessoal (Dia 1 a Dia 5)
export const DIA_COLUMNS: LeadStatus[] = ["dia_1", "dia_2", "dia_3", "dia_4", "dia_5"];

export function nextAutoStatus(s: LeadStatus): LeadStatus | null {
  const map: Partial<Record<LeadStatus, LeadStatus>> = {
    dia_1: "dia_2",
    dia_2: "dia_3",
    dia_3: "dia_4",
    dia_4: "dia_5",
    dia_5: "funil",
  };
  return map[s] ?? null;
}

export function todayISO(): string {
  return new Date().toISOString().slice(0, 10);
}

const ONE_HOUR = 60 * 60 * 1000;
const ONE_DAY = 24 * ONE_HOUR;

export function hoursSince(iso: string): number {
  return (Date.now() - new Date(iso).getTime()) / ONE_HOUR;
}

export function timeAgo(iso: string): string {
  const ms = Date.now() - new Date(iso).getTime();
  if (ms < 60_000) return "agora";
  const mins = Math.floor(ms / 60_000);
  if (mins < 60) return `há ${mins}min`;
  const hrs = Math.floor(ms / ONE_HOUR);
  if (hrs < 24) return `há ${hrs}h`;
  const days = Math.floor(ms / ONE_DAY);
  const remH = Math.floor((ms - days * ONE_DAY) / ONE_HOUR);
  return remH > 0 ? `há ${days}d ${remH}h` : `há ${days}d`;
}

export function businessMsSince(iso: string): number {
  const start = new Date(iso);
  const end = new Date();
  if (end <= start) return 0;
  let total = 0;
  const cur = new Date(start);
  while (cur < end) {
    const day = cur.getDay();
    const endOfDay = new Date(cur);
    endOfDay.setHours(24, 0, 0, 0);
    const segEnd = end < endOfDay ? end : endOfDay;
    if (day !== 0 && day !== 6) {
      total += segEnd.getTime() - cur.getTime();
    }
    cur.setTime(endOfDay.getTime());
  }
  return total;
}

export function businessHoursSince(iso: string): number {
  return businessMsSince(iso) / ONE_HOUR;
}

export function dayProgress(iso: string): number {
  return businessMsSince(iso) / ONE_DAY;
}

export function normalizePhoneForWa(phone: string): string {
  const digits = phone.replace(/\D/g, "");
  if (digits.startsWith("55")) return digits;
  return "55" + digits;
}

/** Aplica máscara CNJ: 0000000-00.0000.0.00.0000 */
export function formatProcesso(input: string): string {
  const d = (input || "").replace(/\D/g, "").slice(0, 20);
  if (!d) return "";
  let out = d.slice(0, 7);
  if (d.length > 7) out += "-" + d.slice(7, 9);
  if (d.length > 9) out += "." + d.slice(9, 13);
  if (d.length > 13) out += "." + d.slice(13, 14);
  if (d.length > 14) out += "." + d.slice(14, 16);
  if (d.length > 16) out += "." + d.slice(16, 20);
  return out;
}

export function digitsOnly(s: string | null | undefined): string {
  return (s || "").replace(/\D/g, "");
}

export function parseCurrencyInput(value: string): number | null {
  const raw = (value || "").trim();
  if (!raw) return null;

  const cleaned = raw.replace(/R\$|\s/g, "").replace(/[^\d,.-]/g, "");
  if (!/\d/.test(cleaned)) return Number.NaN;
  const lastComma = cleaned.lastIndexOf(",");
  const lastDot = cleaned.lastIndexOf(".");
  const lastSep = Math.max(lastComma, lastDot);
  const decimals = lastSep >= 0 ? cleaned.length - lastSep - 1 : 0;
  const decimalSep = lastSep >= 0 && decimals > 0 && decimals <= 2
    ? cleaned[lastSep]
    : "";
  const normalized = decimalSep
    ? `${cleaned.slice(0, lastSep).replace(/[.,]/g, "")}.${cleaned.slice(lastSep + 1).replace(/[.,]/g, "")}`
    : cleaned.replace(/[.,]/g, "");
  const parsed = Number(normalized);
  return Number.isFinite(parsed) ? parsed : Number.NaN;
}

export function formatCurrencyBR(value: number | string | null | undefined): string {
  if (value === null || value === undefined || value === "") return "";
  const numeric = typeof value === "number" ? value : Number(value);
  if (!Number.isFinite(numeric)) return "";
  return numeric.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

export function computeFollowup(_status: LeadStatus): string | null {
  return null;
}

export function followupState(_followup: string | null, _status: LeadStatus): "none" | "today" | "late" {
  return "none";
}
