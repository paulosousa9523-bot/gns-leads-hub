import { createClient } from '@supabase/supabase-js';
const sb = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false }});
const email = 'jessica@gns-leads.app';
const password = 'gns2026';
const display = 'Jessica';
// Check existing
const { data: list } = await sb.auth.admin.listUsers({ page: 1, perPage: 1000 });
let user = list.users.find(u => u.email === email);
if (!user) {
  const { data, error } = await sb.auth.admin.createUser({ email, password, email_confirm: true, user_metadata: { display_name: display }});
  if (error) { console.error('create error', error); process.exit(1); }
  user = data.user;
  console.log('created', user.id);
} else {
  await sb.auth.admin.updateUserById(user.id, { password });
  console.log('exists', user.id);
}
// Ensure profile
await sb.from('profiles').upsert({ id: user.id, display_name: display }, { onConflict: 'id' });
// Ensure role
const { data: existingRole } = await sb.from('user_roles').select('*').eq('user_id', user.id).eq('role','vendedor');
if (!existingRole || existingRole.length === 0) {
  const { error: rErr } = await sb.from('user_roles').insert({ user_id: user.id, role: 'vendedor' });
  if (rErr) console.error('role err', rErr); else console.log('role inserted');
} else console.log('role already');
console.log('done');
