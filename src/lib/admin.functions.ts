import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

const ResetSchema = z.object({
  display_name: z.string().min(1).max(120),
  new_password: z.string().min(8).max(72),
});

/**
 * Allows a logged-in gestor to reset another vendor's password.
 * Service-role admin import is kept inside the handler so that it does not
 * leak into the client bundle.
 */
export const adminResetPassword = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: unknown) => ResetSchema.parse(data))
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const { data: rolesRaw } = await supabase
      .from("user_roles" as never)
      .select("role")
      .eq("user_id", userId);
    const roles = (rolesRaw as unknown as { role: string }[]) ?? [];
    if (!roles.some((r) => r.role === "gestor")) {
      throw new Error("Acesso negado");
    }
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: profRaw } = await supabaseAdmin
      .from("profiles" as never)
      .select("id")
      .eq("display_name", data.display_name)
      .maybeSingle();
    const prof = profRaw as { id: string } | null;
    if (!prof) throw new Error("Usuário não encontrado");
    const { error } = await supabaseAdmin.auth.admin.updateUserById(prof.id, {
      password: data.new_password,
    });
    if (error) throw new Error(error.message);
    return { ok: true as const };
  });
