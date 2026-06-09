import { createClient } from "@supabase/supabase-js";
const admin = createClient(process.env.SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!);
const PW = "gns2026";
let page = 1;
const all: { id: string; email: string | null }[] = [];
while (true) {
  const { data, error } = await admin.auth.admin.listUsers({ page, perPage: 200 });
  if (error) { console.error(error); process.exit(1); }
  all.push(...data.users.map(u => ({ id: u.id, email: u.email ?? null })));
  if (data.users.length < 200) break;
  page++;
}
console.log("Total usuários:", all.length);
let ok = 0, fail = 0;
for (const u of all) {
  const { error } = await admin.auth.admin.updateUserById(u.id, { password: PW });
  if (error) { fail++; console.error("FAIL", u.email, error.message); }
  else { ok++; console.log("OK", u.email); }
}
console.log(`\nDone. ok=${ok} fail=${fail}`);
