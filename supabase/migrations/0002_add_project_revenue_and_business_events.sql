-- Projekte & Pop-ups: unregelmäßige, projektbezogene Umsätze, die nicht zu
-- den fixen 6 Lunch-Locations gehören (z.B. VDW-Pop-up am Standort "IST",
-- künftige Events/Kooperationen). Freitext-Projektname statt fixer
-- location_code-Liste, weil das nicht planbar/wiederkehrend ist.
create table if not exists public.project_revenue (
  id uuid primary key default gen_random_uuid(),
  project_name text not null,
  period_start date not null,
  period_type text not null default 'monthly' check (period_type in ('monthly', 'weekly')),
  revenue_net numeric(12, 2),
  note text,
  updated_by uuid references public.profiles (id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (project_name, period_start, period_type)
);

drop trigger if exists trg_project_revenue_updated on public.project_revenue;
create trigger trg_project_revenue_updated
  before update on public.project_revenue
  for each row execute procedure public.set_updated_meta();

-- Ereignisse/Notizen: freie, datierte Einträge mit Hashtags, um Kontext zu
-- Umsatzschwankungen festzuhalten (z.B. "Vitrine aufgebaut",
-- "Schanigarten entfernt", "neues Menü", "neuer Koch"). Optional an einen
-- Standort gebunden (location_code null = allgemein/unternehmensweit).
create table if not exists public.business_events (
  id uuid primary key default gen_random_uuid(),
  event_date date not null,
  location_code text references public.locations (code),
  title text not null,
  note text,
  tags text[] not null default '{}',
  created_by uuid references public.profiles (id),
  updated_by uuid references public.profiles (id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

drop trigger if exists trg_business_events_updated on public.business_events;
create trigger trg_business_events_updated
  before update on public.business_events
  for each row execute procedure public.set_updated_meta();

create index if not exists business_events_date_idx on public.business_events (event_date desc);
create index if not exists business_events_tags_idx on public.business_events using gin (tags);

alter table public.project_revenue enable row level security;
alter table public.business_events enable row level security;

drop policy if exists "project_revenue_admin_all" on public.project_revenue;
create policy "project_revenue_admin_all"
  on public.project_revenue for all
  using (public.is_admin())
  with check (public.is_admin());

drop policy if exists "business_events_admin_all" on public.business_events;
create policy "business_events_admin_all"
  on public.business_events for all
  using (public.is_admin())
  with check (public.is_admin());
