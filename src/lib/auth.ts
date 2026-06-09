import { supabase } from "@/integrations/supabase/client";

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
  "Augusto Santos",
  "Matheus Fiaux",
  "Vitor Benício",
  "Josiane Cardoso",
  "Rafael Chagas",
  "Vitor Damasceno",
  "Paulo Sousa",
  "Hosanna Pinheiro",
];

export const GESTOR_NAME = "Paulo (Gestor)";
export const GESTOR_PASSWORD = "gns2026";

export const JURIDICO_NAME = "Paulo (Jurídico)";
export const JURIDICO_PASSWORD = "juridico2026";

// Hosanna: admin parcial, vê só um subconjunto de vendedores
export const HOSANNA_NAME = "Hosanna (Admin)";
export const HOSANNA_PASSWORD = "hosanna2026";
export const HOSANNA_VENDEDORES = [
  "Vitor Damasceno",
  "Matheus Fiaux",
  "Josiane Cardoso",
  "Rafael Chagas",
  "Augusto Santos",
  "Vitor Benício",
  "Hosanna Pinheiro",
];

const KEY = "gns_leads_session";

export type Session = {
  name: string;
  isManager: boolean;
  isLegal?: boolean;
  /** Quando definido, o usuário só enxerga leads destes vendedores */
  restrictedVendors?: string[];
};

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

/** Verifica a senha do vendedor na tabela vendedor_senhas. Se não houver registro, permite login (compatibilidade). */
export async function verifyVendedorPassword(vendedor: string, senha: string): Promise<{ ok: boolean; needsPassword: boolean }> {
  const { data } = await supabase
    .from("vendedor_senhas" as never)
    .select("senha")
    .eq("vendedor", vendedor)
    .maybeSingle();
  const row = data as { senha: string } | null;
  if (!row) return { ok: true, needsPassword: false };
  return { ok: row.senha === senha, needsPassword: true };
}
