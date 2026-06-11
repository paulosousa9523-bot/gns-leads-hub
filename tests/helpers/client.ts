import { createClient, type SupabaseClient } from "@supabase/supabase-js";

const URL = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL!;
const KEY = process.env.VITE_SUPABASE_PUBLISHABLE_KEY || process.env.SUPABASE_PUBLISHABLE_KEY!;

if (!URL || !KEY) {
  throw new Error("Missing VITE_SUPABASE_URL / VITE_SUPABASE_PUBLISHABLE_KEY in env for e2e tests");
}

export const TEST_PASSWORD = "gns2026";
export const VENDOR_EMAIL = process.env.E2E_VENDOR_EMAIL || "evandro@gns-leads.app";
export const VENDOR_NAME = process.env.E2E_VENDOR_NAME || "Evandro";
export const GESTOR_EMAIL = process.env.E2E_GESTOR_EMAIL || "paulo.gestor@gns-leads.app";

export function makeClient(): SupabaseClient {
  // Each test gets its own client with its own in-memory session.
  return createClient(URL, KEY, {
    auth: { persistSession: false, autoRefreshToken: false, storage: undefined },
  });
}

export async function signIn(client: SupabaseClient, email: string, password = TEST_PASSWORD) {
  const { data, error } = await client.auth.signInWithPassword({ email, password });
  if (error) throw new Error(`Sign-in failed for ${email}: ${error.message}`);
  if (!data.session) throw new Error("No session after sign-in");
  return data.session;
}

export function uniqueProcesso(): string {
  // 20-digit numeric string, formatted: 0000000-00.0000.0.00.0000
  const n = Date.now().toString().padStart(13, "0").slice(-13);
  const rand = Math.floor(Math.random() * 9999999).toString().padStart(7, "0");
  const raw = (rand + n).slice(0, 20);
  return `${raw.slice(0, 7)}-${raw.slice(7, 9)}.${raw.slice(9, 13)}.${raw.slice(13, 14)}.${raw.slice(14, 16)}.${raw.slice(16, 20)}`;
}

export function uniquePhone(): string {
  const tail = Math.floor(Math.random() * 1e8).toString().padStart(8, "0");
  return `11 9${tail.slice(0, 4)}-${tail.slice(4, 8)}`;
}
