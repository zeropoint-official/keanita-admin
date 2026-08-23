# keanita-admin

Staff dashboard for the Keanita Kids Club RN app (`../nextjs-sample`). Next.js 16 App Router, shadcn/ui, Supabase (`jwxbhcmytgytbhhamace`), deploys to Vercel.

- UI language: Greek. Code/identifiers: English. Brand red `#E60C10`.
- Content CRUD: browser supabase client through RLS (`src/lib/supabase/client.ts`).
- Privileged ops (KP adjust, redemptions, push sends, approvals): server actions + `createAdminClient()` after `requireStaff('editor'|'admin')`, and write an `audit_log` row.
- Schema: `supabase/migrations/*.sql` — add a new numbered file, never edit applied ones.
- Regenerate types after schema changes: `npm run db:types`.
- Track progress in `PLAN.md` (tick boxes).

<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->
