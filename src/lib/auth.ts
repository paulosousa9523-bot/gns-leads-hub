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
  "Raphael Chagas",
  "Vitor Damasceno",
  "Paulo Sousa",
  "Hosanna Pinheiro",
];

export const GESTOR_NAME = "Paulo (Gestor)";
export const JURIDICO_NAME = "Paulo (Jurídico)";
export const HOSANNA_NAME = "Hosanna (Admin)";
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
  [GESTOR_NAME]: "paulo.gestor@gns-leads.app",
  [JURIDICO_NAME]: "paulo.juridico@gns-leads.app",
  [HOSANNA_NAME]: "hosanna.admin@gns-leads.app",
  "Raphael Chagas": "rafael.chagas@gns-leads.app",
};

export const ALL_LOGIN_NAMES = [...VENDEDORES, GESTOR_NAME, JURIDICO_NAME, HOSANNA_NAME];

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

export function getSession(): Session | null {
  return _session;
}

export async function loadSession(): Promise<Session | null> {
  const { data: userRes } = await supabase.auth.getUser();
  const user = userRes?.user;
  if (!user) {
    _session = null;
    return null;
  }
  const [{ data: profile }, { data: roles }] = await Promise.all([
    supabase
      .from("profiles" as never)
      .select("display_name, restricted_vendors")
      .eq("id", user.id)
      .maybeSingle(),
    supabase.from("user_roles" as never).select("role").eq("user_id", user.id),
  ]);
  const prof = profile as { display_name: string; restricted_vendors: string[] | null } | null;
  const roleList = ((roles as unknown as { role: string }[]) ?? []).map((r) => r.role);
  const roleSet = new Set(roleList);
  _session = {
    name: prof?.display_name ?? user.email ?? "Usuário",
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
): Promise<{ ok: boolean; error?: string }> {
  const email = emailForName(name);
  const { error } = await supabase.auth.signInWithPassword({ email, password });
  if (error) return { ok: false, error: error.message };
  await loadSession();
  return { ok: true };
}

export async function signOut(): Promise<void> {
  await supabase.auth.signOut();
  _session = null;
}

// Back-compat alias
export const clearSession = signOut;
