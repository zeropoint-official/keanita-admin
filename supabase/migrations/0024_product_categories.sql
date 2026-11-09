-- ============================================================
-- 0024 Product categories become data, not a hard-coded enum.
--
-- Before: products.category was the enum product_category ('juice','yogurt'),
-- and every label lived in app + dashboard code — a new category meant a
-- migration plus a new app build. Now staff add/rename/reorder categories
-- from the dashboard and the app reads them from this table.
--
-- `key` is a stable latin slug (never shown to users, never changed after
-- creation); `name` / `plural_name` are the Greek labels.
-- ============================================================

create table product_categories (
  key          text primary key check (key ~ '^[a-z0-9_]+$'),
  name         text not null,              -- singular, e.g. «Χυμός» (product badge)
  plural_name  text not null,              -- plural, e.g. «Χυμοί» (filter chip)
  emoji        text,                       -- fallback icon when a product has no art
  sort_order   integer not null default 0,
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now()
);

create trigger product_categories_updated before update on product_categories
  for each row execute function set_updated_at();

insert into product_categories (key, name, plural_name, emoji, sort_order) values
  ('juice',  'Χυμός',    'Χυμοί',     '🧃', 0),
  ('yogurt', 'Γιαούρτι', 'Γιαούρτια', '🥛', 1),
  ('milk',   'Γάλα',     'Γάλατα',    '🥛', 2);

-- enum → text + foreign key (a product can't point at a missing category,
-- and a category that still has products can't be deleted).
alter table products alter column category drop default;
alter table products alter column category type text using category::text;
alter table products
  add constraint products_category_fkey foreign key (category)
  references product_categories(key) on update cascade on delete restrict;
alter table products alter column category set default 'juice';
create index products_category_idx on products(category);
drop type product_category;

-- Choco Milk is milk, not juice.
update products set category = 'milk' where name ilike '%choco%milk%';

-- Same access model as the other content tables: everyone reads, editors write.
alter table product_categories enable row level security;
create policy "product_categories_public_read" on product_categories for select using (true);
create policy "product_categories_staff_all" on product_categories for all
  using (is_staff('editor')) with check (is_staff('editor'));
