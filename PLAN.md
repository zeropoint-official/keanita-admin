# Keanita Admin Dashboard — Build Plan

Web dashboard for Keanita staff. Next.js (App Router) + shadcn/ui + Supabase, hosted on Vercel.
Same Supabase project as the app: `jwxbhcmytgytbhhamace`.

Legend: **[ME]** = Claude does it · **[YOU]** = needs you (account access, decisions, credentials) · ☐ todo · ☑ done

---

## Phase 0 — Foundations

| | Who | Task |
|---|---|---|
| ☑ | ME | Scaffold `keanita-admin` repo (Next.js 15, TS, Tailwind, shadcn/ui, supabase-js, git init) |
| ☑ | ME | Write `PLAN.md` (this file) and `README.md` |
| ☐ | YOU | Confirm the Supabase project `jwxbhcmytgytbhhamace` is the one to use for production (not a throwaway). If not, create one and give me the new URL + anon key + service-role key. |
| ☐ | YOU | Tell me what is currently in that DB (run in Supabase SQL editor: `select table_name from information_schema.tables where table_schema='public'`) — direct DB access is blocked from my side. Or: run `supabase login` + `supabase link --project-ref jwxbhcmytgytbhhamace` in `keanita-admin/` so I can push migrations with the CLI. |
| ☐ | YOU | Create `keanita-admin/.env.local` from `.env.example` (anon key + service-role key from Supabase → Project Settings → API). |

## Phase 1 — Database schema (source of truth for app + dashboard)

| | Who | Task |
|---|---|---|
| ☑ | ME | `supabase/migrations/0001_core.sql`: `profiles` (parents, extends auth.users), `kids` (name, dob, gender, status pending/approved/rejected/expired, member_id, reject_reason), `staff` (role admin/editor/viewer) |
| ☑ | ME | `0002_content.sql`: `events` (+ targeting/notification flags, highlights), `event_registrations` (kid_id), `products`, `stores`, `store_categories`, `store_discounts`, `activities` (puzzles/PDFs), `characters`, `home_sliders`, `app_settings` (key/value), `pages` (terms/about rich text) |
| ☑ | ME | `0003_rewards.sql`: `reward_rules`, `points_ledger`, `gifts`, `redemptions` (status requested/approved/shipped/rejected), `qr_codes`, balance view |
| ☑ | ME | `0004_notifications.sql`: `push_campaigns` (audience, schedule, stats), `notifications` (per user inbox), `device_tokens`, `contact_messages` |
| ☑ | ME | `0005_rls.sql`: RLS on every table — public read for published content; users read/write only their own rows; `staff` full access by role |
| ☑ | ME | `0006_storage.sql`: buckets `events`, `products`, `stores`, `activities`, `characters`, `sliders`, `avatars` + policies |
| ☑ | ME | `0007_automation.sql`: pg_cron jobs — kid expiry at 11, point expiry at 12 months, birthday + event-reminder triggers (enqueue into `push_campaigns`) |
| ☑ | ME | `supabase/seed.sql`: seed from the app's mock data (products, characters, stores, activities, gifts, reward rules, settings) so the dashboard isn't empty |
| ☐ | YOU | Apply migrations: `supabase db push` (after link) or paste each file into the SQL editor. Tell me if anything errors. |
| ☐ | YOU | Decide: (a) keep manual kid approval + age-11 expiry from the old app, or auto-approve? (b) KP point values per action (I'll seed sensible defaults you can edit in Settings later). |

## Phase 2 — Dashboard core

| | Who | Task |
|---|---|---|
| ☑ | ME | Auth: staff login (email/password via Supabase Auth), middleware guarding `/(dashboard)`, role check against `staff` table |
| ☑ | ME | App shell: sidebar nav, header, toasts, data-table component, image-upload component (Supabase Storage), rich-text/markdown editor, color picker |
| ☐ | ME | Typed Supabase client (generated `database.types.ts`) + server actions pattern for privileged writes |
| ☐ | ME | **Overview** page: member counts, pending approvals, upcoming events, KP issued/spent, pending redemptions, birthdays next 7 days |
| ☐ | YOU | Create the first staff user: sign up in Supabase Auth dashboard (Authentication → Users → Add user) with your email, then run the SQL I'll give you to insert into `staff` as `admin`. |

## Phase 3 — Content sections (parity with old admin)

| | Who | Task |
|---|---|---|
| ☐ | ME | **Events & Seminars**: list/create/edit, type, image, highlights, show-on-home, hero-slider, push targeting (date + age range), registrations tab + CSV export + check-in |
| ☐ | ME | **Home screen**: hero slider CRUD with ordering + scheduling + deep link; quick-action tile toggles; product chips |
| ☐ | ME | **Products**: CRUD with highlights, ingredients, nutrition table, colors, ordering |
| ☐ | ME | **Stores & Discounts**: store CRUD, multiple discounts per store, categories, logo upload |
| ☐ | ME | **Activities**: puzzles + DIY PDFs — image + PDF upload, category, publish toggle |
| ☐ | ME | **Characters**: edit the 5 profiles |
| ☐ | ME | **Pages & Settings**: Terms, About/story, contact info, social links, emergency number, membership tier labels, birthday/intro video, force-update version |
| ☐ | YOU | Supply any missing media: original product PNGs, character art, brand assets in high-res (current ones are copied from the old app / mock). |
| ☐ | YOU | Give me the old-app media folder (or confirm evenziademo3.com stays up) so I can migrate the 63MB of PDFs into Storage. |

## Phase 4 — Members

| | Who | Task |
|---|---|---|
| ☐ | ME | **Members**: parent list with search (name/mobile/email), detail page (kids, KP, registrations, notifications, devices), deactivate |
| ☐ | ME | **Kids**: approve / reject with reason / expire; queues Pending, Rejected, Expiring soon; CSV export; birthday export |
| ☐ | ME | Manual KP adjustment with note (writes to ledger, audit-logged) |
| ☐ | YOU | Fresh production DB dump + media from the agency (see KEANITA-PROJECT-GUIDE checklist). Until then we work with the 2022 test dump. |
| ☐ | ME | Import script: old MySQL users/kids/registrations/stores → Supabase (bcrypt hashes carried over) |

## Phase 5 — Rewards & Gifts (add-on)

| | Who | Task |
|---|---|---|
| ☐ | ME | **Reward rules**: editable point values (daily login, streak tiers, game per-fruit + daily cap, event RSVP, profile completion, QR scan), point expiry months |
| ☐ | ME | **Gift catalog**: CRUD, cost, digital/physical, stock, requires-approval, active |
| ☐ | ME | **Redemptions** queue: approve / ship / reject (auto-refund KP) |
| ☐ | ME | **QR codes**: generate batches (CSV/PDF export), view scans |
| ☐ | ME | Leaderboard view |
| ☐ | YOU | Decide how physical gifts are fulfilled (pickup at KEAN / courier / at events) and whether QR-on-packaging will actually happen. |

## Phase 6 — Push notifications

| | Who | Task |
|---|---|---|
| ☐ | ME | **Campaigns**: compose (title, body, type, deep link), audience (all / district / kid age range / membership status / test device), send now or schedule, history with delivered/opened |
| ☐ | ME | Edge Function `send-push` (Expo Push API) + cron dispatcher for scheduled campaigns, birthday wishes, event reminders |
| ☐ | ME | Automation settings UI: birthday text (GR/EN), optional KP gift, reminder lead time |
| ☐ | YOU | Expo account access token (expo.dev → Access tokens) → Supabase Edge Function secret `EXPO_ACCESS_TOKEN`. For production iOS/Android push also need the app's EAS project set up (already part of the RN work). |

## Phase 7 — Wire the RN app to the same DB

| | Who | Task |
|---|---|---|
| ☐ | ME | Replace `data/mock/*` in `nextjs-sample/` with Supabase queries (React Query), device-token registration, KP ledger calls, kid registration flow, gift redemption, event RSVP per kid |
| ☐ | ME | Same for `keanita-web` if you want the web port live too |
| ☐ | YOU | Test on a real device via Expo Go / dev build |

## Phase 8 — Deploy & handover

| | Who | Task |
|---|---|---|
| ☐ | ME | `vercel.json`, env var list, `npm run build` clean, preview deploy |
| ☐ | YOU | `vercel login` (or add me to the team), create project `keanita-admin`, set env vars (I'll give the exact list), point `admin.<domain>` DNS |
| ☐ | YOU | Create GitHub repo `zeropoint-official/keanita-admin` and add remote (I'll push) |
| ☐ | ME | Staff user guide (Greek) — short README with screenshots per section |
| ☐ | YOU | Create staff accounts for Keanita managers; walk them through it |

---

## Important: existing data in the Supabase project
`public.profiles` was created earlier by `nextjs-sample/migration/profiles_schema.sql` and holds the **~7,961 imported parent accounts** (with bcrypt passwords in `auth.users`). Column names there are `firstname`/`lastname`/`legacy_id` — migrations extend that table, never recreate it. Kids (10,972 in the old dump) are not imported yet (Phase 4).

## Decisions already made
- Separate repo `keanita-admin/` (not inside `keanita-web`). Staff auth is email/password; parents keep the app's email/password login.
- Content CRUD goes through RLS with the staff session; privileged ops (KP adjust, redemptions, sends) go through server actions with the service-role key.
- Greek UI for the dashboard (staff are Greek-speaking), code/identifiers in English.

## Open questions for Keanita
1. Manual kid approval + expiry at 11 — keep?
2. Physical gift fulfilment method.
3. QR codes on packaging — real or drop it?
4. Which districts/areas list to use for audience targeting (old `districts`/`areas` tables exist in the dump).
