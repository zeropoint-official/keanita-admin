-- ============================================================
-- 0022 ΚΕΑΝΙΤΑ CASING: KEAN asked that the brand name always read in
-- capitals ("Όπου υπάρχει η λέξη ΚΕΑΝΙΤΑ να είναι κεφάλαια"). Staff-entered
-- copy still carries "Keanita" / "Κεανίτα" in a handful of places.
--
-- Data-only, same shape as the one-time backfill in 0019. Idempotent: the
-- replacement cannot match its own output, so re-running changes nothing.
--
-- Column lists verified against the live schema (information_schema), not the
-- migration files. Only prose columns are touched. image_url / file_url / link_target and the
-- slug/key identifiers are deliberately left alone — the app's deep links use
-- the `keanita://` scheme and storage paths are case-sensitive, so rewriting
-- those would break navigation and images.
-- ============================================================

update characters set
  name           = regexp_replace(name,           'Keanita|Κεανίτα|Κεανιτα', 'ΚΕΑΝΙΤΑ', 'g'),
  tagline        = regexp_replace(tagline,        'Keanita|Κεανίτα|Κεανιτα', 'ΚΕΑΝΙΤΑ', 'g'),
  description    = regexp_replace(description,    'Keanita|Κεανίτα|Κεανιτα', 'ΚΕΑΝΙΤΑ', 'g'),
  best_friend    = regexp_replace(best_friend,    'Keanita|Κεανίτα|Κεανιτα', 'ΚΕΑΝΙΤΑ', 'g'),
  power          = regexp_replace(power,          'Keanita|Κεανίτα|Κεανιτα', 'ΚΕΑΝΙΤΑ', 'g'),
  favorite_juice = regexp_replace(favorite_juice, 'Keanita|Κεανίτα|Κεανιτα', 'ΚΕΑΝΙΤΑ', 'g')
where concat_ws(' ', name, tagline, description, best_friend, power, favorite_juice)
      ~ '(Keanita|Κεανίτα|Κεανιτα)';

update events set
  title       = regexp_replace(title,       'Keanita|Κεανίτα|Κεανιτα', 'ΚΕΑΝΙΤΑ', 'g'),
  description = regexp_replace(description, 'Keanita|Κεανίτα|Κεανιτα', 'ΚΕΑΝΙΤΑ', 'g'),
  time_label  = regexp_replace(time_label,  'Keanita|Κεανίτα|Κεανιτα', 'ΚΕΑΝΙΤΑ', 'g'),
  location    = regexp_replace(location,    'Keanita|Κεανίτα|Κεανιτα', 'ΚΕΑΝΙΤΑ', 'g')
where concat_ws(' ', title, description, time_label, location)
      ~ '(Keanita|Κεανίτα|Κεανιτα)';

update home_sliders set
  title    = regexp_replace(title,    'Keanita|Κεανίτα|Κεανιτα', 'ΚΕΑΝΙΤΑ', 'g'),
  subtitle = regexp_replace(subtitle, 'Keanita|Κεανίτα|Κεανιτα', 'ΚΕΑΝΙΤΑ', 'g')
where concat_ws(' ', title, subtitle)
      ~ '(Keanita|Κεανίτα|Κεανιτα)';

update products set
  name        = regexp_replace(name,        'Keanita|Κεανίτα|Κεανιτα', 'ΚΕΑΝΙΤΑ', 'g'),
  tagline     = regexp_replace(tagline,     'Keanita|Κεανίτα|Κεανιτα', 'ΚΕΑΝΙΤΑ', 'g'),
  description = regexp_replace(description, 'Keanita|Κεανίτα|Κεανιτα', 'ΚΕΑΝΙΤΑ', 'g')
where concat_ws(' ', name, tagline, description)
      ~ '(Keanita|Κεανίτα|Κεανιτα)';

update gifts set
  name        = regexp_replace(name,        'Keanita|Κεανίτα|Κεανιτα', 'ΚΕΑΝΙΤΑ', 'g'),
  description = regexp_replace(description, 'Keanita|Κεανίτα|Κεανιτα', 'ΚΕΑΝΙΤΑ', 'g')
where concat_ws(' ', name, description)
      ~ '(Keanita|Κεανίτα|Κεανιτα)';

update activities set
  title    = regexp_replace(title,    'Keanita|Κεανίτα|Κεανιτα', 'ΚΕΑΝΙΤΑ', 'g'),
  category = regexp_replace(category, 'Keanita|Κεανίτα|Κεανιτα', 'ΚΕΑΝΙΤΑ', 'g')
where concat_ws(' ', title, category)
      ~ '(Keanita|Κεανίτα|Κεανιτα)';

-- pages.body_md is long-form markdown that may legitimately contain links, so
-- only rewrite rows carrying no URL at all.
update pages set
  title   = regexp_replace(title,   'Keanita|Κεανίτα|Κεανιτα', 'ΚΕΑΝΙΤΑ', 'g'),
  body_md = regexp_replace(body_md, 'Keanita|Κεανίτα|Κεανιτα', 'ΚΕΑΝΙΤΑ', 'g')
where concat_ws(' ', title, body_md) ~ '(Keanita|Κεανίτα|Κεανιτα)'
  and coalesce(body_md, '') !~ '://';
