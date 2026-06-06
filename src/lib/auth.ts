export const VENDEDORES = [
  "Maria Eveline",
  "Ana Clara",
  "Milena Morais",
  "Tatyanna Carvalho",
  "Raíssa Cristine",
  "Gabriel Henrique",
  "Gabriel Morais",
  "Luiz Guilherme",
  "Evandro",
];

export const GESTOR_NAME = "Paulo (Gestor)";
export const GESTOR_PASSWORD = "gns2026";

export const JURIDICO_NAME = "Paulo (Jurídico)";
export const JURIDICO_PASSWORD = "juridico2026";

const KEY = "gns_leads_session";

export type Session = { name: string; isManager: boolean; isLegal?: boolean };

export function getSession(): Session | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = localStorage.getItem(KEY);
    return raw ? (JSON.parse(raw) as Session) : null;
  } catch {
    return null;
  }
}

export function setSession(s: Session) {
  localStorage.setItem(KEY, JSON.stringify(s));
}

export function clearSession() {
  localStorage.removeItem(KEY);
}
