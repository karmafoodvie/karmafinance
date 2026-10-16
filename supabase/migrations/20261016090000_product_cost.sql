-- Wareneinsatz pro Produkt (Einkaufs-/Herstellkosten je Stück, netto).
-- Der Produktname entspricht dem vereinheitlichten Namen aus
-- public.product_sales_monthly (product_alias), damit Kosten und
-- Verkäufe zusammenpassen. Für Lunch Combos wird der Wareneinsatz der
-- ganzen Combo als ein Wert eingetragen.
-- vat_rate ist der Steuersatz des Verkaufspreises in Prozent (z.B. 10, 20).
-- Die Kassa-Umsätze sind brutto, die Marge wird deshalb auf Netto gerechnet.
create table if not exists public.product_cost (
  product_name text primary key,
  cost_net numeric(10, 2) not null check (cost_net >= 0),
  vat_rate numeric(4, 1) not null check (vat_rate in (0, 10, 13, 20)),
  note text,
  updated_by uuid references public.profiles (id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

drop trigger if exists trg_product_cost_updated on public.product_cost;
create trigger trg_product_cost_updated
  before update on public.product_cost
  for each row execute procedure public.set_updated_meta();

alter table public.product_cost enable row level security;

drop policy if exists "product_cost_admin_all" on public.product_cost;
create policy "product_cost_admin_all"
  on public.product_cost for all
  using (public.is_admin())
  with check (public.is_admin());
