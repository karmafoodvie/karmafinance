-- Überkategorien für Produkte (Hauptgerichte, Lunch Combos, Sweets, Drinks,
-- Beilagen & Snacks, Retail & Merch, Rabatte & Sonstiges). Zuordnung liegt in
-- einer eigenen Tabelle, damit sie ohne Code-Änderung gepflegt werden kann.
-- product_type unterscheidet bei Hauptgerichten Classic vs. Special.
-- Die eigentlichen Zuordnungen (product_group_map-Zeilen) sind Daten und
-- werden separat eingespielt, nicht in dieser Schema-Migration.
create table if not exists public.product_group_map (
  product_name text primary key,
  product_group text not null,
  product_type text,
  updated_at timestamptz not null default now()
);

alter table public.product_group_map enable row level security;

drop policy if exists "product_group_map_admin_all" on public.product_group_map;
create policy "product_group_map_admin_all"
  on public.product_group_map for all
  using (public.is_admin())
  with check (public.is_admin());

drop policy if exists "product_group_map_select_authenticated" on public.product_group_map;
create policy "product_group_map_select_authenticated"
  on public.product_group_map for select
  to authenticated using (true);
