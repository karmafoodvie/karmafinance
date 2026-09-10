-- Tägliche Verkäufe je Meal-Kategorie (Curry/Dal/Lasagne/Biryani/Bowl/Special
-- + Mix Portion, Lunch Combo, Wochensalat). Basis für "Umsatz pro Gericht":
-- pro Tag wird die Kategorie dem an dem Tag angebotenen Gericht zugeordnet.
create table if not exists public.pos_meal_daily (
  id uuid primary key default gen_random_uuid(),
  location_code text not null references public.locations (code),
  day_date date not null,
  category text not null,
  quantity numeric(12, 2),
  revenue numeric(12, 2),
  updated_at timestamptz not null default now(),
  unique (location_code, day_date, category)
);
create index if not exists pos_meal_daily_date_idx on public.pos_meal_daily (day_date);
create index if not exists pos_meal_daily_cat_idx on public.pos_meal_daily (category);

-- Menükalender: welches Gericht an welchem Tag in welcher Kategorie angeboten
-- wurde. Editierbar ohne Code-Änderung. Die eigentlichen Zeilen sind Daten
-- und werden separat eingespielt, nicht in dieser Schema-Migration.
create table if not exists public.menu_plan (
  id uuid primary key default gen_random_uuid(),
  day_date date not null,
  category text not null,
  dish_name text not null,
  price numeric(10, 2),
  menu_era text,
  updated_at timestamptz not null default now(),
  unique (day_date, category)
);
create index if not exists menu_plan_date_idx on public.menu_plan (day_date);

alter table public.pos_meal_daily enable row level security;
alter table public.menu_plan enable row level security;

drop policy if exists "pos_meal_daily_admin_all" on public.pos_meal_daily;
create policy "pos_meal_daily_admin_all" on public.pos_meal_daily for all
  using (public.is_admin()) with check (public.is_admin());

drop policy if exists "menu_plan_admin_all" on public.menu_plan;
create policy "menu_plan_admin_all" on public.menu_plan for all
  using (public.is_admin()) with check (public.is_admin());
drop policy if exists "menu_plan_select_authenticated" on public.menu_plan;
create policy "menu_plan_select_authenticated" on public.menu_plan for select
  to authenticated using (true);
