import { createClient } from '@supabase/supabase-js';
const sb = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false }});
const vendors = [
  { email: 'lucas.mesquita@gns-leads.app', display: 'Lucas Mesquita' },
  { email: 'ana.siqueira@gns-leads.app', display: 'Ana Siqueira' },
];
const password = 'gns2026';
const { data: list } = await sb.auth.admin.listUsers({ page: 1, perPage: 1000 });
for (const v of vendors) {
  let user = list.users.find(u => u.email === v.email);
  if (!user) {
    const { data, error } = await sb.auth.admin.createUser({ email: v.email, password, email_confirm: true, user_metadata: { display_name: v.display }});
    if (error) { console.error('create', v.email, error.message); continue; }
    user = data.user;
    console.log('created', v.display, user.id);
  } else {
    await sb.auth.admin.updateUserById(user.id, { password });
    console.log('exists', v.display, user.id);
  }
  await sb.from('profiles').upsert({ id: user.id, display_name: v.display }, { onConflict: 'id' });
  const { data: existing } = await sb.from('user_roles').select('*').eq('user_id', user.id).eq('role','vendedor');
  if (!existing || existing.length === 0) {
    const { error: rErr } = await sb.from('user_roles').insert({ user_id: user.id, role: 'vendedor' });
    if (rErr) console.error('role', v.email, rErr.message); else console.log('role added', v.display);
  } else console.log('role exists', v.display);
}
console.log('done');
