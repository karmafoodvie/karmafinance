-- Ampelsystem/Checklist: Datenvollständigkeit pro Monat, analog zur bestehenden
-- Finanzen-Automatisierung (Wolt/Foodora/B2B-Odoo-Exporte).
-- Bereits live auf dem Supabase-Projekt angewendet (apply_migration) - diese
-- Datei ist die Repo-Kopie, damit die Migration auch versioniert ist.

create or replace function get_monthly_data_checklist(p_period_start date)
returns table (
  source_key text,
  source_label text,
  status text,
  detail text,
  last_updated timestamptz
)
language plpgsql
as $$
declare
  v_month_start date := date_trunc('month', p_period_start)::date;
  v_period_end date := (v_month_start + interval '1 month - 1 day')::date;
  v_is_current_month boolean := date_trunc('month', p_period_start) = date_trunc('month', current_date);
  v_days_expected int;
  v_active_locations int;
begin
  select count(*) into v_active_locations from locations where active;

  v_days_expected := case
    when v_is_current_month then greatest(extract(day from current_date)::int - 1, 0)
    else extract(day from v_period_end)::int
  end;

  -- 1) Kassensystem: Tagesumsätze
  return query
  select
    'pos_order'::text,
    'Kassensystem – Tagesumsätze'::text,
    case
      when v_days_expected = 0 then 'yellow'
      when count(distinct o.day_date) >= greatest(v_days_expected - 1, 1) then 'green'
      when count(distinct o.day_date) > 0 then 'yellow'
      else 'red'
    end,
    format('%s von erwarteten %s Tagen vorhanden (zuletzt: %s)',
      count(distinct o.day_date), v_days_expected, coalesce(max(o.day_date)::text, '–')),
    max(o.updated_at)
  from pos_order_daily o
  join locations l on l.code = o.location_code and l.active
  where o.day_date between v_month_start and v_period_end;

  -- 2) Kassensystem: Gerichte/Kategorien
  return query
  select
    'pos_meal'::text,
    'Kassensystem – Gerichte/Kategorien'::text,
    case
      when v_days_expected = 0 then 'yellow'
      when count(distinct day_date) >= greatest(v_days_expected - 1, 1) then 'green'
      when count(distinct day_date) > 0 then 'yellow'
      else 'red'
    end,
    format('%s von erwarteten %s Tagen vorhanden (zuletzt: %s)',
      count(distinct day_date), v_days_expected, coalesce(max(day_date)::text, '–')),
    max(updated_at)
  from pos_meal_daily
  where day_date between v_month_start and v_period_end;

  -- 3) Kassensystem: Produktebene
  return query
  select
    'pos_product'::text,
    'Kassensystem – Produktebene (Shop)'::text,
    case when count(*) > 0 then 'green' else 'red' end,
    format('%s Produktzeilen (Shop, nicht Pop-up) für diesen Monat', count(*)),
    max(updated_at)
  from pos_product_monthly
  where period_start = v_month_start and category = 'Shop' and is_popup = false;

  -- 4) Wolt
  return query
  select
    'wolt'::text, 'Wolt-Auszahlungen'::text,
    case
      when count(w.*) >= (select count(*) from locations where active and has_wolt) then 'green'
      when count(w.*) > 0 then 'yellow'
      else 'red'
    end,
    format('%s von %s Standorten erfasst', count(w.*), (select count(*) from locations where active and has_wolt)),
    max(w.updated_at)
  from locations l
  left join wolt_location_payout w on w.location_code = l.code and w.period_start = v_month_start
  where l.active and l.has_wolt;

  -- 5) Foodora
  return query
  select
    'foodora'::text, 'Foodora-Auszahlungen'::text,
    case
      when count(f.*) >= (select count(*) from locations where active and has_foodora) then 'green'
      when count(f.*) > 0 then 'yellow'
      else 'red'
    end,
    format('%s von %s Standorten erfasst', count(f.*), (select count(*) from locations where active and has_foodora)),
    max(f.updated_at)
  from locations l
  left join foodora_location_payout f on f.location_code = l.code and f.period_start = v_month_start
  where l.active and l.has_foodora;

  -- 6) B2B
  return query
  select
    'b2b'::text, 'B2B-Verkaufskanäle (Odoo-Export)'::text,
    case when count(*) > 0 then 'green' else 'red' end,
    format('%s Kanal-Zeilen für diesen Monat', count(*)),
    max(updated_at)
  from b2b_channel_monthly
  where period_start = v_month_start;

  -- 7) Shopify
  return query
  select
    'shopify'::text, 'Shopify-Webshop'::text,
    case when count(*) > 0 then 'green' else 'red' end,
    format('%s Monats-Zeile(n) vorhanden', count(*)),
    max(updated_at)
  from shopify_monthly
  where period_start = v_month_start;

  -- 8) TGTG
  return query
  select
    'tgtg'::text, 'Too Good To Go'::text,
    case
      when count(t.*) >= (select count(*) from locations where active) then 'green'
      when count(t.*) > 0 then 'yellow'
      else 'red'
    end,
    format('%s von %s Standorten erfasst', count(t.*), (select count(*) from locations where active)),
    max(t.updated_at)
  from locations l
  left join tgtg_location_payout t on t.location_code = l.code and t.period_start = v_month_start and t.period_type = 'month'
  where l.active;

end;
$$;

comment on function get_monthly_data_checklist(date) is
  'Ampelsystem für die Finanz-App: prüft pro Monat, ob alle benötigten Datenquellen (Kassensystem, Wolt, Foodora, B2B, Shopify, TGTG) vorhanden/vollständig sind. status: green=vollständig, yellow=teilweise, red=fehlt.';

-- Verifikations-Check: Kassensystem Tagesumsätze vs. Produktebene-Summe je Standort.
-- Ein gewisser Abstand ist NORMAL (Rabatte/Gebühren laufen in Odoo separat unter
-- Kategorie "All", nicht unter "Shop") - das ist kein automatischer Fehlerbeweis,
-- sondern ein Hinweis zum Gegenchecken.
create or replace function check_pos_revenue_consistency(p_period_start date)
returns table (
  location_code text,
  location_name text,
  order_daily_revenue numeric,
  product_monthly_revenue numeric,
  diff numeric,
  diff_pct numeric,
  status text
)
language sql
as $$
  select
    l.code,
    l.name,
    coalesce(od.rev, 0),
    coalesce(pm.rev, 0),
    coalesce(od.rev,0) - coalesce(pm.rev,0) as diff,
    case when coalesce(od.rev,0) = 0 then null
      else round(100 * (coalesce(od.rev,0) - coalesce(pm.rev,0)) / od.rev, 1)
    end as diff_pct,
    case
      when coalesce(od.rev,0) = 0 and coalesce(pm.rev,0) = 0 then 'yellow'
      when abs(coalesce(od.rev,0) - coalesce(pm.rev,0)) <= 0.03 * greatest(coalesce(od.rev,0), 1) then 'green'
      when abs(coalesce(od.rev,0) - coalesce(pm.rev,0)) <= 0.08 * greatest(coalesce(od.rev,0), 1) then 'yellow'
      else 'red'
    end as status
  from locations l
  left join (
    select location_code, sum(revenue) rev
    from pos_order_daily
    where day_date >= date_trunc('month', p_period_start)::date
      and day_date < (date_trunc('month', p_period_start) + interval '1 month')::date
    group by location_code
  ) od on od.location_code = l.code
  left join (
    select location_code, sum(revenue) rev
    from pos_product_monthly
    where period_start = date_trunc('month', p_period_start)::date and category = 'Shop' and is_popup = false
    group by location_code
  ) pm on pm.location_code = l.code
  where l.active
  order by l.sort_order;
$$;

comment on function check_pos_revenue_consistency(date) is
  'Vergleicht pos_order_daily-Umsatz (alle Kanäle) gegen pos_product_monthly Shop-Summe je Standort. ~2-3% Differenz ist normal (Rabatte/Gebühren laufen separat unter Odoo-Kategorie "All"). status: green=plausibel, yellow=prüfen, red=auffällig.';
