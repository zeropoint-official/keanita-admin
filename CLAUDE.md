# keanita-admin

Staff dashboard for the Keanita Kids Club RN app (`../nextjs-sample`). Next.js 16 App Router, shadcn/ui, Supabase (`jwxbhcmytgytbhhamace`), deploys to Vercel.

- UI language: Greek. Code/identifiers: English. Brand red `#E60C10`.
- Content CRUD: browser supabase client through RLS (`src/lib/supabase/client.ts`).
- Privileged ops (KP adjust, redemptions, push sends, approvals): server actions + `createAdminClient()` after `requireStaff('editor'|'admin')`, and write an `audit_log` row.
- Schema: `supabase/migrations/*.sql` — add a new numbered file, never edit applied ones.
- Regenerate types after schema changes: `npm run db:types`.
- Track progress in `PLAN.md` (tick boxes).
