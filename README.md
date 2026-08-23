# Keanita Admin

Staff dashboard for the Keanita Kids Club app. Next.js 16 · shadcn/ui · Supabase · Vercel.

See **[PLAN.md](PLAN.md)** for the full build plan and who does what.

## Setup

```bash
cp .env.example .env.local   # fill in the Supabase keys
npm install
npm run dev                  # http://localhost:3000
```

## Database

Migrations live in `supabase/migrations/` (apply in order), seed data in `supabase/seed.sql`.

```bash
supabase login
supabase link --project-ref jwxbhcmytgytbhhamace
npm run db:push              # apply migrations
supabase db query < supabase/seed.sql     # or paste into SQL editor
npm run db:types             # regenerate src/lib/database.types.ts
node --env-file=.env.local scripts/upload-media.mjs   # push app images into Storage
```

Then create your staff login: Supabase → Authentication → Users → *Add user*, and run `supabase/make-admin.sql`.

## Layout

- `src/app/(auth)/login` — staff login
- `src/app/(dashboard)/*` — one folder per sidebar section (`src/components/layout/nav.ts`)
- `src/lib/supabase/{client,server,admin}.ts` — browser / SSR / service-role clients
- `src/lib/auth.ts` — `requireStaff(role)` guard
- `scripts/gen-seed.mjs` — regenerates `seed.sql` from the RN app's mock data
