export type LeadStatus =
  | "funil"
  | "dia_1"
  | "dia_2"
  | "dia_3"
  | "dia_4"
  | "dia_5"
  | "negociacao"
  | "contrato"
  | "cliente_fechado";

export const TIPO_PROCESSO_OPTIONS = [
  "Busca e apreensão",
  "Execução de títulos extrajudicial",
  "Execução de títulos fiscal",
  "Revisional de contrato",
  "Procedimento comum cível",
  "Monitoria",
] as const;

// Categorias da área principal (ao lado do Número do Processo)
export const PROCESS_DOC_CATEGORIES = [
  "001 PROCURAÇÃO",
  "002 DECLARAÇÃO DE HIPOSSUFICIÊNCIA",
  "003 CNH",
  "004 COMPROVANTE DE RESIDÊNCIA",
  "005 TRÊS ÚLTIMOS EXTRATOS BANCÁRIOS OU CONTRACHEQUES",
  "006 DOCUMENTOS COMPROBATÓRIOS",
  "007 CTPS",
  "008 IRPJ",
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
  status: LeadStatus;
  obs: string | null;
  followup: string | null;
  movido_em: string;
  criado: string;
}

// Ordem das colunas do kanban (Funil Geral primeiro)
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
};

// Colunas de esteira pessoal (Dia 1 a Dia 5)
export const DIA_COLUMNS: LeadStatus[] = ["dia_1", "dia_2", "dia_3", "dia_4", "dia_5"];

// Próxima coluna para a progressão automática.
// Dia 5 -> Funil Geral. Funil Geral em diante para.
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

// "há 6h", "há 1d 4h", "agora"
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

// Progresso 0..1 das 24h decorridas; >1 indica vencido
export function dayProgress(iso: string): number {
  return (Date.now() - new Date(iso).getTime()) / ONE_DAY;
}

export function normalizePhoneForWa(phone: string): string {
  const digits = phone.replace(/\D/g, "");
  if (digits.startsWith("55")) return digits;
  return "55" + digits;
}

// Mantido para compatibilidade com o cálculo opcional de follow-up.
export function computeFollowup(_status: LeadStatus): string | null {
  return null;
}

// Mantido para compatibilidade. Não usado pelo Kanban.
export function followupState(_followup: string | null, _status: LeadStatus): "none" | "today" | "late" {
  return "none";
}
