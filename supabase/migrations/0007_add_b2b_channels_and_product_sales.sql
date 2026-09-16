-- B2B-Vertriebskanäle und kanalübergreifende Produktverkäufe.
-- Bereits auf der Produktiv-DB angewendet (Supabase-Migrationen
-- 20260915143847 / 20260915144727 / 20260915144916) — diese Datei hält den
-- Repo-Stand dazu passend.

-- ── B2B-Kanalumsätze pro Monat (Quelle: Odoo sale.order) ───────────────────
create table if not exists public.b2b_channel_monthly (
  id uuid primary key default gen_random_uuid(),
  channel_key text not null,
  period_start date not null,
  revenue_net numeric,
  note text,
  updated_by uuid references public.profiles(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint b2b_channel_monthly_uniq unique (channel_key, period_start)
);
comment on table public.b2b_channel_monthly is
  'Nettoumsatz je B2B-Verkaufskanal und Monat. Quelle: Odoo sale.order Export.';
alter table public.b2b_channel_monthly enable row level security;
drop policy if exists b2b_channel_monthly_admin_all on public.b2b_channel_monthly;
create policy b2b_channel_monthly_admin_all on public.b2b_channel_monthly
  for all using (is_admin()) with check (is_admin());
create index if not exists b2b_channel_monthly_period_idx
  on public.b2b_channel_monthly (period_start);

-- ── Kanal-Stammdaten ──────────────────────────────────────────────────────
-- channel_group trennt Handel (Produktverkauf an Gurkerl/Ototo/Alfies/Billa),
-- Kühlschränke (Schrankerl, Ritual Vend) und Catering. Catering ist ein
-- EIGENES Geschäft und zählt nicht zum B2B-Umsatz — es liegt hier nur im
-- selben Schema und wird in der App überall getrennt ausgewiesen.
create table if not exists public.b2b_channels (
  channel_key text primary key,
  label text not null,
  channel_group text not null
    check (channel_group in ('handel', 'vending', 'catering')),
  color text not null,
  sort_order integer not null default 0,
  active boolean not null default true
);
alter table public.b2b_channels enable row level security;
drop policy if exists b2b_channels_admin_all on public.b2b_channels;
create policy b2b_channels_admin_all on public.b2b_channels
  for all using (is_admin()) with check (is_admin());
drop policy if exists b2b_channels_select_authenticated on public.b2b_channels;
create policy b2b_channels_select_authenticated on public.b2b_channels
  for select to authenticated using (true);

insert into public.b2b_channels (channel_key, label, channel_group, color, sort_order) values
  ('schrankerl',  'Schrankerl',              'vending',  '#E94E1B', 1),
  ('ritualVend',  'Ritual Vend',             'vending',  '#FF8A50', 2),
  ('gurkerl',     'Gurkerl',                 'handel',   '#1baf7a', 3),
  ('ototo',       'Ototo',                   'handel',   '#6BCB9E', 4),
  ('alfies',      'Alfies',                  'handel',   '#4a3aa7', 5),
  ('billa',       'Billa/REWE/Ja!Natürlich', 'handel',   '#eda100', 6),
  ('catering',    'Catering & Events',       'catering', '#2a78d6', 7)
on conflict (channel_key) do update
  set label = excluded.label,
      channel_group = excluded.channel_group,
      color = excluded.color,
      sort_order = excluded.sort_order;

alter table public.b2b_channel_monthly
  drop constraint if exists b2b_channel_monthly_channel_fk;
alter table public.b2b_channel_monthly
  add constraint b2b_channel_monthly_channel_fk
  foreign key (channel_key) references public.b2b_channels (channel_key);

-- ── Shopify-Produktverkäufe pro Monat ─────────────────────────────────────
-- ACHTUNG: orders = Anzahl Bestellungen, die das Produkt enthalten.
-- ShopifyQL liefert auf Produktebene KEINE Stückzahl. Niemals mit
-- POS-Stückzahlen addieren.
create table if not exists public.shopify_product_monthly (
  id uuid primary key default gen_random_uuid(),
  period_start date not null,
  product_title text not null,
  orders integer,
  net_sales numeric,
  gross_sales numeric,
  updated_at timestamptz not null default now(),
  constraint shopify_product_monthly_uniq unique (period_start, product_title)
);
alter table public.shopify_product_monthly enable row level security;
drop policy if exists shopify_product_monthly_admin_all on public.shopify_product_monthly;
create policy shopify_product_monthly_admin_all on public.shopify_product_monthly
  for all using (is_admin()) with check (is_admin());
create index if not exists shopify_product_monthly_period_idx
  on public.shopify_product_monthly (period_start);

-- ── Namensabgleich über Kanäle hinweg ─────────────────────────────────────
create table if not exists public.product_alias (
  source_channel text not null,
  source_name text not null,
  canonical_name text not null,
  updated_at timestamptz not null default now(),
  primary key (source_channel, source_name)
);
comment on table public.product_alias is
  'Vereinheitlicht Produktnamen über Kanäle, z.B. Shopify "Mango Chili Hot Sauce" -> Kassa "Mango Chilli Hot Sauce".';
alter table public.product_alias enable row level security;
drop policy if exists product_alias_admin_all on public.product_alias;
create policy product_alias_admin_all on public.product_alias
  for all using (is_admin()) with check (is_admin());
drop policy if exists product_alias_select_authenticated on public.product_alias;
create policy product_alias_select_authenticated on public.product_alias
  for select to authenticated using (true);

insert into public.product_alias (source_channel, source_name, canonical_name) values
  ('shopify','Mango Chili Hot Sauce',          'Mango Chilli Hot Sauce'),
  ('shopify','Karma Food Currys Kochbuch',     'Curry Kochbuch'),
  ('shopify','Curry Pasten Trio',              'Pasten Trio'),
  ('shopify','Weducer Cup',                    'Weducer Coffeecup'),
  ('shopify','Curry Paste 3er Sparset',        'Curry Paste Sparset (3x3)'),
  ('shopify','Curry Pasten Sparset (3x3)',     'Curry Paste Sparset (3x3)'),
  ('shopify','Korma Paste 3er Sparset',        'Korma Paste Sparset (3x3)'),
  ('shopify','Madras Paste 3er Sparset',       'Madras Paste Sparset (3x3)'),
  ('pos','Chai Masala  -10% Pop Up',           'Chai Masala'),
  ('pos','Chai Sirup -10% Pop Up',             'Chai Sirup'),
  ('pos','Curry Party Starter Kit mit Karton', 'Curry Party Starter Kit')
on conflict (source_channel, source_name) do update
  set canonical_name = excluded.canonical_name, updated_at = now();

-- ── View: Produktverkäufe je Kanal und Monat ──────────────────────────────
-- quantity = Stückzahl, orders = Bestellungen (nur Shopify).
-- Nie beide gleichzeitig befüllt.
create or replace view public.product_sales_monthly
with (security_invoker = on) as
  select 'stores'::text as channel,
         coalesce(a.canonical_name, p.product_name) as product_name,
         p.period_start,
         sum(p.quantity) as quantity,
         null::integer as orders,
         sum(p.revenue) as revenue
  from public.pos_product_monthly p
  left join public.product_alias a
    on a.source_channel = 'pos' and a.source_name = p.product_name
  where p.category = 'Shop'
  group by 1, 2, 3

  union all

  select 'b2b_pos', coalesce(a.canonical_name, p.product_name), p.period_start,
         sum(p.quantity), null::integer, sum(p.revenue)
  from public.pos_product_monthly p
  left join public.product_alias a
    on a.source_channel = 'pos' and a.source_name = p.product_name
  where p.category = 'B2B'
  group by 1, 2, 3

  union all

  select 'catering', coalesce(a.canonical_name, p.product_name), p.period_start,
         sum(p.quantity), null::integer, sum(p.revenue)
  from public.pos_product_monthly p
  left join public.product_alias a
    on a.source_channel = 'pos' and a.source_name = p.product_name
  where p.category = 'Catering'
  group by 1, 2, 3

  union all

  select 'shopify', coalesce(a.canonical_name, s.product_title), s.period_start,
         null::numeric, sum(s.orders)::integer, sum(s.net_sales)
  from public.shopify_product_monthly s
  left join public.product_alias a
    on a.source_channel = 'shopify' and a.source_name = s.product_title
  group by 1, 2, 3

  union all

  select 'schrankerl', coalesce(a.canonical_name, o.product_name),
         date_trunc('month', o.delivery_date)::date,
         sum(o.quantity), null::integer, sum(o.amount_netto)
  from public.schrankerl_weekly_orders o
  left join public.product_alias a
    on a.source_channel = 'schrankerl' and a.source_name = o.product_name
  where o.delivery_date is not null
  group by 1, 2, 3;

comment on view public.product_sales_monthly is
  'Produktverkäufe je Kanal und Monat. quantity = Stück, orders = Bestellungen (nur Shopify). Namen über product_alias vereinheitlicht.';

grant select on public.product_sales_monthly to authenticated;
