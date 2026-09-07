-- Karma Food Finanzübersicht — initiales Schema
-- MVP-Scope: Standorte (Shops), Shopify, Wolt, Foodora.
-- TGTG / Schrankerl / Stadtgemeinde / Marketing / Social-Quality
-- kommen in Ausbaustufe 2 als eigene Migrationen dazu.

-- ---------------------------------------------------------------
-- Rollen & Profile
-- ---------------------------------------------------------------
create table if not exists public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  email text not null,
  full_name text,
  role text not null default 'admin' check (role in ('admin', 'limited')),
  created_at timestamptz not null default now()
);

comment on table public.profiles is
  'Ein Profil pro Login. role=admin sieht alle Finanzdaten. role=limited
   ist für später reserviert (z.B. Dinesh mit eingeschränkten Rechten) —
   aktuell hat limited noch KEINEN Zugriff auf die Finanztabellen, bis
   der genaue Umfang der Sonderrechte definiert ist.';

-- Bei jedem neuen auth.users-Eintrag automatisch ein Profil anlegen.
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  insert into public.profiles (id, email, full_name)
  values (new.id, new.email, new.raw_user_meta_data ->> 'full_name')
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

-- ---------------------------------------------------------------
-- Stammdaten: Standorte
-- ---------------------------------------------------------------
create table if not exists public.locations (
  code text primary key,
  name text not null,
  active boolean not null default true,
  has_wolt boolean not null default true,
  has_foodora boolean not null default true,
  sort_order int not null default 0
);

insert into public.locations (code, name, active, sort_order) values
  ('boerse-1010', 'Börse (1010)', true, 1),
  ('lb-1010', 'Laurenzerberg (1010)', true, 2),
  ('ausstellungsstrasse-1020', 'Ausstellungsstraße (1020)', true, 3),
  ('stadtplatz-3400', 'Stadtplatz (3400, Klosterneuburg)', true, 4),
  ('inkustrasse-3400', 'Inkustraße (3400, Klosterneuburg)', true, 5),
  ('neustiftgasse-1070', 'Neustiftgasse (1070) — historisch', false, 6)
on conflict (code) do nothing;

-- ---------------------------------------------------------------
-- Gemeinsame updated_at / updated_by Trigger-Funktion
-- ---------------------------------------------------------------
create or replace function public.set_updated_meta()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  new.updated_by = auth.uid();
  return new;
end;
$$;

-- ---------------------------------------------------------------
-- Shops / Lunch-Locations — monatliche Kennzahlen
-- ---------------------------------------------------------------
create table if not exists public.location_monthly (
  id uuid primary key default gen_random_uuid(),
  location_code text not null references public.locations (code),
  period_start date not null,
  period_type text not null default 'monthly' check (period_type in ('monthly', 'weekly')),
  revenue_net numeric(12, 2),          -- Gesamtpreis abzüglich Rabatte
  discounts_total numeric(12, 2),      -- Rabatte gesamt
  revenue_prev_year_manual numeric(12, 2), -- manueller Vorjahreswert (Backfill, solange keine echten Vorjahresdaten in der DB liegen)
  note text,
  created_by uuid references public.profiles (id),
  updated_by uuid references public.profiles (id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (location_code, period_start, period_type)
);

drop trigger if exists trg_location_monthly_updated on public.location_monthly;
create trigger trg_location_monthly_updated
  before update on public.location_monthly
  for each row execute procedure public.set_updated_meta();

-- ---------------------------------------------------------------
-- Shopify — monatliche Kennzahlen
-- ---------------------------------------------------------------
create table if not exists public.shopify_monthly (
  id uuid primary key default gen_random_uuid(),
  period_start date not null,
  period_type text not null default 'monthly' check (period_type in ('monthly', 'weekly')),
  payout_amount numeric(12, 2),
  orders_count int,
  conversion_rate numeric(6, 4),   -- z.B. 0.0025 = 0,25%
  sessions int,
  payout_prev_year_manual numeric(12, 2),
  updated_by uuid references public.profiles (id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (period_start, period_type)
);

drop trigger if exists trg_shopify_monthly_updated on public.shopify_monthly;
create trigger trg_shopify_monthly_updated
  before update on public.shopify_monthly
  for each row execute procedure public.set_updated_meta();

-- ---------------------------------------------------------------
-- Wolt — Auszahlung pro Standort (Gesamt wird im Frontend summiert)
-- ---------------------------------------------------------------
create table if not exists public.wolt_location_payout (
  id uuid primary key default gen_random_uuid(),
  location_code text not null references public.locations (code),
  period_start date not null,
  period_type text not null default 'monthly' check (period_type in ('monthly', 'weekly')),
  payout_amount numeric(12, 2),
  updated_by uuid references public.profiles (id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (location_code, period_start, period_type)
);

drop trigger if exists trg_wolt_location_payout_updated on public.wolt_location_payout;
create trigger trg_wolt_location_payout_updated
  before update on public.wolt_location_payout
  for each row execute procedure public.set_updated_meta();

-- ---------------------------------------------------------------
-- Foodora — Gesamtwerte (Gross Sales, Provision, Bestellungen)
-- ---------------------------------------------------------------
create table if not exists public.foodora_monthly (
  id uuid primary key default gen_random_uuid(),
  period_start date not null,
  period_type text not null default 'monthly' check (period_type in ('monthly', 'weekly')),
  gross_sales numeric(12, 2),
  commission_pct numeric(6, 4),     -- z.B. 0.14 = 14% (lt. Vertrag)
  commission_amount numeric(12, 2),
  payout_total numeric(12, 2),
  orders_count int,
  updated_by uuid references public.profiles (id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (period_start, period_type)
);

drop trigger if exists trg_foodora_monthly_updated on public.foodora_monthly;
create trigger trg_foodora_monthly_updated
  before update on public.foodora_monthly
  for each row execute procedure public.set_updated_meta();

-- Foodora — Auszahlung pro Standort
create table if not exists public.foodora_location_payout (
  id uuid primary key default gen_random_uuid(),
  location_code text not null references public.locations (code),
  period_start date not null,
  period_type text not null default 'monthly' check (period_type in ('monthly', 'weekly')),
  payout_amount numeric(12, 2),
  updated_by uuid references public.profiles (id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (location_code, period_start, period_type)
);

drop trigger if exists trg_foodora_location_payout_updated on public.foodora_location_payout;
create trigger trg_foodora_location_payout_updated
  before update on public.foodora_location_payout
  for each row execute procedure public.set_updated_meta();

-- ---------------------------------------------------------------
-- Row Level Security
-- Grundprinzip: nur eingeloggte Profile mit role='admin' dürfen
-- Finanzdaten lesen/schreiben. 'limited' ist aktuell komplett
-- gesperrt (siehe Kommentar bei profiles) — sobald der Umfang für
-- z.B. Dinesh feststeht, hier gezielt neue Policies ergänzen statt
-- 'limited' pauschal freizuschalten.
-- ---------------------------------------------------------------
alter table public.profiles enable row level security;
alter table public.locations enable row level security;
alter table public.location_monthly enable row level security;
alter table public.shopify_monthly enable row level security;
alter table public.wolt_location_payout enable row level security;
alter table public.foodora_monthly enable row level security;
alter table public.foodora_location_payout enable row level security;

create or replace function public.is_admin()
returns boolean
language sql
security definer set search_path = public
stable
as $$
  select exists (
    select 1 from public.profiles
    where id = auth.uid() and role = 'admin'
  );
$$;

-- profiles: jede:r sieht das eigene Profil, admins sehen alle
drop policy if exists "profiles_select_own_or_admin" on public.profiles;
create policy "profiles_select_own_or_admin"
  on public.profiles for select
  using (id = auth.uid() or public.is_admin());

drop policy if exists "profiles_update_own" on public.profiles;
create policy "profiles_update_own"
  on public.profiles for update
  using (id = auth.uid())
  with check (id = auth.uid());

-- locations: alle eingeloggten Nutzer:innen dürfen die Stammdaten lesen
drop policy if exists "locations_select_authenticated" on public.locations;
create policy "locations_select_authenticated"
  on public.locations for select
  to authenticated
  using (true);

-- Finanztabellen: voller Zugriff nur für admins
do $$
declare
  t text;
begin
  foreach t in array array[
    'location_monthly',
    'shopify_monthly',
    'wolt_location_payout',
    'foodora_monthly',
    'foodora_location_payout'
  ]
  loop
    execute format(
      'drop policy if exists "%1$s_admin_all" on public.%1$s;', t
    );
    execute format(
      'create policy "%1$s_admin_all" on public.%1$s for all using (public.is_admin()) with check (public.is_admin());',
      t
    );
  end loop;
end $$;
