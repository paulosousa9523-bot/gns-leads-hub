import { supabase } from "@/integrations/supabase/client";

export const VENDEDORES = [
  "TREINAMENTO",
  "Maria Eveline",
  "Ana Clara",
  "Milena Morais",
  "Tatyanna Carvalho",
  "Raíssa Alves",
  "Gabriel Henrique",
  "Gabriel Morais",
  "Luiz Guilherme",
  "Evandro",
  "Augusto Santos",
  "Matheus Fiaux",
  "Vitor Benício",
  "Josiane Cardoso",
  "Raphael Chagas",
  "Vitor Damasceno",
  "Paulo Sousa",
  "Hosanna Pinheiro",
  "Emilly Ribeiro",
  "Jessica",
];

export const GESTOR_NAME = "Paulo (Gestor)";
export const JURIDICO_NAME = "Paulo (Jurídico)";
export const HOSANNA_NAME = "Hosanna (Admin)";
export const JURIDICOS_EXTRAS = ["Gabriele", "Isabela", "Maria"] as const;
export const HOSANNA_VENDEDORES = [
  "Vitor Damasceno",
  "Matheus Fiaux",
  "Josiane Cardoso",
  "Raphael Chagas",
  "Augusto Santos",
  "Vitor Benício",
  "Hosanna Pinheiro",
];

const STAFF_EMAILS: Record<string, string> = {
  "TREINAMENTO": "treinamento@gns-leads.app",
  [GESTOR_NAME]: "paulo.gestor@gns-leads.app",
  [JURIDICO_NAME]: "paulo.juridico@gns-leads.app",
  [HOSANNA_NAME]: "hosanna.admin@gns-leads.app",
  "Gabriele": "gabriele@gns-leads.app",
  "Isabela": "isabela@gns-leads.app",
  "Maria": "maria.juridica@gns-leads.app",
  "Raphael Chagas": "rafael.chagas@gns-leads.app",
  // Email original mantido para preservar o login após renomear o vendedor
  "Raíssa Alves": "raissa.cristine@gns-leads.app",
};

export const ALL_LOGIN_NAMES = [...VENDEDORES, GESTOR_NAME, JURIDICO_NAME, HOSANNA_NAME, ...JURIDICOS_EXTRAS];

export type Session = {
  name: string;
  isManager: boolean;
  isLegal?: boolean;
  restrictedVendors?: string[];
};

function slugify(name: string): string {
  return name
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, ".")
    .replace(/^\.|\.$/g, "");
}

export function emailForName(name: string): string {
  return STAFF_EMAILS[name] ?? `${slugify(name)}@gns-leads.app`;
}

let _session: Session | null = null;
const AUTH_TIMEOUT_MS = 8_000;
const SESSION_TIMEOUT_MS = 4_000;

export function getSession(): Session | null {
  return _session;
}

function withTimeout<T>(promise: PromiseLike<T>, ms: number): Promise<T> {
  return new Promise((resolve, reject) => {
    const timer = globalThis.setTimeout(() => reject(new Error("auth_timeout")), ms);
    promise.then(
      (value) => {
        globalThis.clearTimeout(timer);
        resolve(value);
      },
      (error) => {
        globalThis.clearTimeout(timer);
        reject(error);
      },
    );
  });
}

function isAuthStorageKey(key: string) {
  const k = key.toLowerCase();
  return k.startsWith("sb-") || k.startsWith("supabase.") || k.includes("supabase");
}

export function clearLocalSupabaseTokens() {
  if (typeof window === "undefined") return;
  try {
    Object.keys(localStorage)
      .filter(isAuthStorageKey)
      .forEach((k) => localStorage.removeItem(k));
  } catch {
    /* storage may be unavailable in private mode */
  }
  try {
    Object.keys(sessionStorage)
      .filter(isAuthStorageKey)
      .forEach((k) => sessionStorage.removeItem(k));
  } catch {
    /* storage may be unavailable in private mode */
  }
  try {
    document.cookie.split(";").forEach((cookie) => {
      const name = cookie.split("=")[0]?.trim();
      if (!name || !isAuthStorageKey(name)) return;
      document.cookie = `${name}=; Max-Age=0; expires=Thu, 01 Jan 1970 00:00:00 GMT; path=/; SameSite=Lax`;
      document.cookie = `${name}=; Max-Age=0; expires=Thu, 01 Jan 1970 00:00:00 GMT; path=/`;
    });
  } catch {
    /* cookies may be unavailable */
  }
}

export async function loadSession(): Promise<Session | null> {
  // 1) Read from local storage first — instantaneous, no network. This means
  // "no cookies/tokens" shows the login screen immediately instead of hanging.
  let localSession: { user: { id: string; email?: string | null } } | null = null;
  try {
    const { data: sessionRes } = await withTimeout(supabase.auth.getSession(), SESSION_TIMEOUT_MS);
    localSession = sessionRes?.session ?? null;
  } catch {
    clearLocalSupabaseTokens();
    _session = null;
    return null;
  }
  if (!localSession) {
    _session = null;
    return null;
  }

  // 2) Validate against the server, but tolerate failures (e.g. expired refresh
  // token or transient network issue) by clearing the local session so the user
  // simply lands on the login screen — never stuck on "Carregando…".
  let userId = localSession.user.id;
  let userEmail = localSession.user.email ?? null;
  try {
    const { data: userRes, error } = await withTimeout(supabase.auth.getUser(), AUTH_TIMEOUT_MS);
    if (error || !userRes?.user) throw error ?? new Error("no user");
    userId = userRes.user.id;
    userEmail = userRes.user.email ?? userEmail;
  } catch {
    clearLocalSupabaseTokens();
    await withTimeout(supabase.auth.signOut({ scope: "local" }), SESSION_TIMEOUT_MS).catch(() => {});
    _session = null;
    return null;
  }

  let profile: unknown = null;
  let roles: unknown = null;
  try {
    [{ data: profile }, { data: roles }] = await withTimeout(Promise.all([
      supabase
        .from("profiles" as never)
        .select("display_name, restricted_vendors")
        .eq("id", userId)
        .maybeSingle(),
      supabase.from("user_roles" as never).select("role").eq("user_id", userId),
    ]), AUTH_TIMEOUT_MS);
  } catch {
    clearLocalSupabaseTokens();
    await withTimeout(supabase.auth.signOut({ scope: "local" }), SESSION_TIMEOUT_MS).catch(() => {});
    _session = null;
    return null;
  }
  const prof = profile as { display_name: string; restricted_vendors: string[] | null } | null;
  const roleList = ((roles as unknown as { role: string }[]) ?? []).map((r) => r.role);
  const roleSet = new Set(roleList);
  _session = {
    name: prof?.display_name ?? userEmail ?? "Usuário",
    isManager:
      roleSet.has("gestor") || roleSet.has("juridico") || roleSet.has("admin_restrito"),
    isLegal: roleSet.has("juridico"),
    restrictedVendors: roleSet.has("admin_restrito")
      ? prof?.restricted_vendors ?? undefined
      : undefined,
  };
  return _session;
}

export async function signInWithName(
  name: string,
  password: string,
): Promise<{ ok: boolean; session?: Session; error?: string }> {
  const email = emailForName(name);
  // Tokens antigos/quebrados podem fazer o signIn falhar silenciosamente —
  // limpamos antes para garantir um login limpo, sem precisar de "limpar cookies".
  clearLocalSupabaseTokens();
  const { error } = await withTimeout(
    supabase.auth.signInWithPassword({ email, password }),
    AUTH_TIMEOUT_MS,
  ).catch((err) => ({ error: err as Error }));
  if (error) {
    clearLocalSupabaseTokens();
    return { ok: false, error: error.message };
  }
  const session = await loadSession();
  if (!session) return { ok: false, error: "Sessão inválida" };
  return { ok: true, session };
}

export async function signOut(): Promise<void> {
  // Sempre faz logout LOCAL primeiro (não depende da rede), depois tenta o
  // logout global de melhor esforço. Assim "Sair" funciona mesmo offline ou
  // com sessão já expirada no servidor.
  try {
    await withTimeout(supabase.auth.signOut({ scope: "local" }), SESSION_TIMEOUT_MS);
  } catch {
    /* ignore */
  }
  clearLocalSupabaseTokens();
  withTimeout(supabase.auth.signOut(), SESSION_TIMEOUT_MS).catch(() => {});
  _session = null;
}

// Back-compat alias
export const clearSession = signOut;

