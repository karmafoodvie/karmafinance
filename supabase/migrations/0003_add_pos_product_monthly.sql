-- Produktverkäufe pro Standort und Monat aus dem Odoo-POS
-- (Quelle: Pivot-Export "Kassensystemanalyse", report.pos.order).
-- Damit lässt sich beantworten, wie sich einzelne Produkte oder
-- Produktgruppen entwickelt haben — z.B. die Lunch Combos.
-- category unterscheidet Shop / Catering / B2B / Rabattzeilen ("All").
create table if not exists public.pos_product_monthly (
  id uuid primary key default gen_random_uuid(),
  location_code text not null references public.locations (code),
  period_start date not null,
  product_name text not null,
  category text not null default 'Shop',
  quantity numeric(12, 2),
  revenue numeric(12, 2),   -- Gesamtpreis, brutto nach Rabatten
  margin numeric(12, 2),
  updated_by uuid references public.profiles (id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (location_code, period_start, product_name, category)
);

drop trigger if exists trg_pos_product_monthly_updated on public.pos_product_monthly;
create trigger trg_pos_product_monthly_updated
  before update on public.pos_product_monthly
  for each row execute procedure public.set_updated_meta();

create index if not exists pos_product_monthly_period_idx
  on public.pos_product_monthly (period_start);
create index if not exists pos_product_monthly_product_idx
  on public.pos_product_monthly (product_name);

alter table public.pos_product_monthly enable row level security;

drop policy if exists "pos_product_monthly_admin_all" on public.pos_product_monthly;
create policy "pos_product_monthly_admin_all"
  on public.pos_product_monthly for all
  using (public.is_admin())
  with check (public.is_admin());
