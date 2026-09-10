-- Tägliche Bestellanzahl je Standort ("Auftrag" aus dem Odoo-Pivot). Basis für
-- Warenkorbgröße (revenue/orders) und Artikel-pro-Bestellung (items/orders) —
-- beides Kennzahlen, die es auf Kategorie-/Produktebene nicht gibt, weil dort
-- Bestellungen mit mehreren Artikeln mehrfach auftauchen würden.
create table if not exists public.pos_order_daily (
  id uuid primary key default gen_random_uuid(),
  location_code text not null references public.locations (code),
  day_date date not null,
  orders numeric(12, 2) not null,
  revenue numeric(12, 2),
  items numeric(12, 2),
  discount_sum numeric(12, 2),
  updated_at timestamptz not null default now(),
  unique (location_code, day_date)
);
create index if not exists pos_order_daily_date_idx on public.pos_order_daily (day_date);

alter table public.pos_order_daily enable row level security;

drop policy if exists "pos_order_daily_admin_all" on public.pos_order_daily;
create policy "pos_order_daily_admin_all" on public.pos_order_daily for all
  using (public.is_admin()) with check (public.is_admin());
