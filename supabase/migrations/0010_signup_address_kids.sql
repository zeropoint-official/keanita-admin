-- ============================================================
-- 0010 SIGNUP: street-level address on profiles, max kids per parent,
-- Cyprus areas lookup, and server-side profile+kids creation at signup.
-- ============================================================

-- ---------- address columns (same names as the legacy users table) ----------
alter table profiles
  add column if not exists zipcode          text,
  add column if not exists street_address   text,
  add column if not exists building_name    text,
  add column if not exists household_number text;

-- ---------- max kids per parent (setting, default 10) ----------
insert into app_settings (key, value, description)
  values ('max_kids_per_parent', '10', 'Μέγιστος αριθμός παιδιών ανά γονέα')
  on conflict (key) do nothing;

create or replace function kids_enforce_limit() returns trigger language plpgsql security definer set search_path = public as $$
declare max_kids int; n int;
begin
  select coalesce((value->>0)::int, (value#>>'{}')::int, 10) into max_kids from app_settings where key = 'max_kids_per_parent';
  select count(*) into n from kids where parent_id = new.parent_id;
  if n >= coalesce(max_kids, 10) then
    raise exception 'max kids reached' using errcode = 'check_violation';
  end if;
  return new;
end $$;
drop trigger if exists kids_limit on kids;
create trigger kids_limit before insert on kids for each row execute function kids_enforce_limit();

-- ---------- Cyprus districts / areas lookup (imported from the legacy `areas` table) ----------
create table if not exists areas (
  id            serial primary key,
  area_gr       text not null,
  area_en       text,
  district_gr   text not null,
  district_en   text,
  old_import_id integer unique
);
create index if not exists areas_district_idx on areas(district_gr, area_gr);
alter table areas enable row level security;
drop policy if exists "areas_public_read" on areas;
create policy "areas_public_read" on areas for select using (true);
drop policy if exists "areas_staff_all" on areas;
create policy "areas_staff_all" on areas for all using (is_staff('editor')) with check (is_staff('editor'));

-- ---------- signup: copy metadata into profiles and create the kids rows ----------
-- The app calls supabase.auth.signUp({ options: { data: { firstname, lastname, mobile,
-- zipcode, district, city, area, street_address, building_name, household_number,
-- kids: [{first_name,last_name,dob,gender}] } } }). Running here (security definer,
-- no auth.uid()) means it also works when email confirmation is enabled.
create or replace function handle_new_user() returns trigger language plpgsql security definer set search_path = public as $$
declare m jsonb := coalesce(new.raw_user_meta_data, '{}'::jsonb); k jsonb; max_kids int; i int := 0;
begin
  insert into profiles (id, email, firstname, lastname, mobile, zipcode, district, city, area,
                        street_address, building_name, household_number)
  values (new.id, new.email, m->>'firstname', m->>'lastname', nullif(m->>'mobile',''), nullif(m->>'zipcode',''),
          nullif(m->>'district',''), nullif(m->>'city',''), nullif(m->>'area',''),
          nullif(m->>'street_address',''), nullif(m->>'building_name',''), nullif(m->>'household_number',''))
  on conflict (id) do update set
    firstname = coalesce(excluded.firstname, profiles.firstname),
    lastname  = coalesce(excluded.lastname,  profiles.lastname),
    mobile    = coalesce(excluded.mobile,    profiles.mobile),
    zipcode   = coalesce(excluded.zipcode,   profiles.zipcode),
    district  = coalesce(excluded.district,  profiles.district),
    city      = coalesce(excluded.city,      profiles.city),
    area      = coalesce(excluded.area,      profiles.area),
    street_address   = coalesce(excluded.street_address,   profiles.street_address),
    building_name    = coalesce(excluded.building_name,    profiles.building_name),
    household_number = coalesce(excluded.household_number, profiles.household_number);

  select coalesce((value->>0)::int, (value#>>'{}')::int, 10) into max_kids from app_settings where key = 'max_kids_per_parent';
  if jsonb_typeof(m->'kids') = 'array' then
    for k in select * from jsonb_array_elements(m->'kids') loop
      exit when i >= coalesce(max_kids, 10);
      if coalesce(k->>'first_name','') <> '' and (k->>'dob') is not null then
        insert into kids (parent_id, first_name, last_name, dob, gender, status)
        values (new.id, k->>'first_name', nullif(k->>'last_name',''), (k->>'dob')::date,
                case when k->>'gender' in ('boy','girl','other') then (k->>'gender')::gender else null end, 'pending');
        i := i + 1;
      end if;
    end loop;
  end if;
  return new;
end $$;
