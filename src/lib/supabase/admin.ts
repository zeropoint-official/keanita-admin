import { createClient } from '@supabase/supabase-js';
import type { Database } from '@/lib/database.types';

/**
 * Service-role client. Bypasses RLS. SERVER ONLY.
 * Use for privileged ops (KP adjustments, redemptions, push sends) after
 * verifying the caller is staff with `requireStaff()`.
 */
export function createAdminClient() {
  return createClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { persistSession: false, autoRefreshToken: false } },
  );
}
