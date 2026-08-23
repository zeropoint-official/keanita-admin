// Create (or promote) a dashboard staff user. Uses the service-role key from .env.local.
// Usage: node --env-file=.env.local scripts/create-staff.mjs <email> <password> [admin|editor|viewer] ["Full Name"]
import { createClient } from '@supabase/supabase-js';

const [email, password, role = 'admin', fullName = email] = process.argv.slice(2);
if (!email || !password) {
  console.error('usage: node --env-file=.env.local scripts/create-staff.mjs <email> <password> [role] ["Full Name"]');
  process.exit(1);
}
const sb = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY, {
  auth: { persistSession: false, autoRefreshToken: false },
});

// find existing auth user by email, else create one
let userId;
const { data: list } = await sb.auth.admin.listUsers({ perPage: 1000 });
const existing = list?.users.find((u) => u.email?.toLowerCase() === email.toLowerCase());
if (existing) {
  userId = existing.id;
  const { error } = await sb.auth.admin.updateUserById(userId, { password, email_confirm: true });
  if (error) throw error;
  console.log(`auth user exists (${userId}) — password updated`);
} else {
  const { data, error } = await sb.auth.admin.createUser({ email, password, email_confirm: true });
  if (error) throw error;
  userId = data.user.id;
  console.log(`auth user created (${userId})`);
}

const { error } = await sb.from('staff').upsert({ id: userId, full_name: fullName, role });
if (error) throw error;
console.log(`✔ ${email} is now staff with role "${role}". Log in at /login.`);
