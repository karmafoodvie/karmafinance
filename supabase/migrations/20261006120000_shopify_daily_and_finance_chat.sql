-- Shopify-Seite Ausbau + Finanz-Chat Phase 1 (fixe Frage-Templates, read-only RPCs)
--
-- Teil 1: neue Tabelle shopify_daily (Tagesgranularität für die Shopify-Seite,
--         ab 01.09.2026 per Backfill befüllt, siehe Abschnitt "Backfill" unten)
-- Teil 2: zentrale Vorjahresvergleich-Regel als SQL-Helper (gleiche Regel wie
--         src/lib/vergleich.ts: fehlender Vorjahresmonat != 0%, laufender
--         Monat wird nie verglichen) -- lebt hier EINMAL serverseitig, damit
--         Dashboard, Shopify-Seite und Chat garantiert dieselbe Zahl sehen.
-- Teil 3: RPCs fuer die Shopify-Seite (KPIs, Tagesreihe, Top-Produkte)
-- Teil 4: RPCs fuer den Finanz-Chat Phase 1 (Standort-Umsatz) -- bewusst nur
--         auf Tabellen, deren Schema diese Session verifiziert hat
--         (pos_order_daily, shopify_monthly, shopify_product_monthly).
--         Kanal-Uebersicht (Wolt/Foodora/B2B/TGTG zusammen) ist NICHT Teil
--         dieser Migration, siehe README.

-- ============================================================
-- TEIL 1: shopify_daily
-- ============================================================

create table if not exists shopify_daily (
  day_date         date primary key,
  orders_count     integer       not null default 0,
  net_sales        numeric(12,2) not null default 0,
  total_sales      numeric(12,2) not null default 0,
  sessions         integer       not null default 0,
  conversion_rate  numeric(8,6)  not null default 0,
  updated_at       timestamptz   not null default now()
);

comment on table shopify_daily is
  'Tages-Granularitaet fuer die Shopify-Seite (ShopifyQL, GROUP BY day). '
  'total_sales = ShopifyQL total_sales (= shopify_monthly.payout_amount-Konvention, '
  'KEIN Bank-Payout netto Gebuehren). Wird ab 01.09.2026 befuellt, davor keine Zeilen.';

-- ============================================================
-- TEIL 2: Vorjahresvergleich-Helper
-- ============================================================
-- Regel (identisch zu src/lib/vergleich.ts -- bitte NICHT parallel eine
-- zweite Variante im Frontend pflegen, siehe README):
--   - laufender Kalendermonat wird nie verglichen (unvollstaendige Daten)
--   - fehlt die Vorjahreszeile komplett -> "kein Vorjahr", NIE als 0% werten
--   - Vorjahreswert = 0 (aber Zeile existiert) -> Prozent nicht berechenbar,
--     eigenes Flag statt Division durch 0

create or replace function calc_yoy_pct(
  p_period_start date,
  p_current numeric,
  p_has_current boolean,
  p_prior numeric,
  p_has_prior boolean
) returns table (
  yoy_pct numeric,
  yoy_available boolean,
  yoy_note text
) language plpgsql immutable as $$
begin
  if date_trunc('month', p_period_start) = date_trunc('month', current_date) then
    return query select null::numeric, false, 'laufender Monat, noch kein Vergleich';
  elsif not p_has_prior then
    return query select null::numeric, false, 'kein Vorjahr';
  elsif not p_has_current then
    return query select null::numeric, false, 'keine Daten fuer diesen Zeitraum';
  elsif p_prior = 0 then
    return query select null::numeric, false, 'Vorjahreswert war 0';
  else
    return query select
      round(((p_current - p_prior) / p_prior) * 100, 1),
      true,
      format('ggue. %s', to_char(p_period_start - interval '1 year', 'Mon YYYY'));
  end if;
end;
$$;

-- ============================================================
-- TEIL 3: RPCs fuer die Shopify-Seite
-- ============================================================

-- Eine Zeile pro KPI (Umsatz brutto, Umsatz netto, Bestellungen, AOV,
-- Conversion, Sessions) inkl. Vorjahres- ODER Vormonats-Vergleich,
-- gesteuert ueber p_compare_mode. Die Chat-Templates rufen dieselbe
-- Funktion auf wie die KPI-Leiste der Shopify-Seite -> garantiert gleiche
-- Zahl in Dashboard und Chat.
create or replace function get_shopify_period_kpis(
  p_period_start date,
  p_compare_mode text default 'yoy' -- 'yoy' | 'mom'
) returns table (
  metric_key text,
  label text,
  unit text,
  value numeric,
  compare_value numeric,
  compare_pct numeric,
  compare_available boolean,
  compare_note text
) language plpgsql stable as $$
declare
  v_compare_start date;
  v_cur record;
  v_cmp record;
  v_cur_found boolean;
  v_cmp_found boolean;
  v_cur_net numeric;
  v_cmp_net numeric;
  v_has_cur_net boolean;
  v_has_cmp_net boolean;
begin
  if p_compare_mode = 'mom' then
    v_compare_start := (p_period_start - interval '1 month')::date;
  else
    v_compare_start := (p_period_start - interval '1 year')::date;
  end if;

  -- WICHTIG: "record IS NOT NULL" ist in Postgres nur true, wenn ALLE Felder
  -- nicht-null sind (Row-Null-Falle). payout_prev_year_manual ist fast immer
  -- null -> deshalb FOUND direkt nach SELECT INTO festhalten statt die
  -- Record-Variable selbst zu prüfen.
  select * into v_cur from shopify_monthly
    where period_start = p_period_start and period_type = 'monthly';
  v_cur_found := FOUND;
  select * into v_cmp from shopify_monthly
    where period_start = v_compare_start and period_type = 'monthly';
  v_cmp_found := FOUND;

  select sum(net_sales) into v_cur_net from shopify_daily
    where day_date >= p_period_start and day_date < (p_period_start + interval '1 month');
  v_has_cur_net := v_cur_net is not null;

  select sum(net_sales) into v_cmp_net from shopify_daily
    where day_date >= v_compare_start and day_date < (v_compare_start + interval '1 month');
  v_has_cmp_net := v_cmp_net is not null;

  -- Umsatz brutto (ShopifyQL total_sales)
  return query
    select 'revenue_gross', 'Umsatz brutto (total_sales)', 'EUR',
           v_cur.payout_amount, v_cmp.payout_amount,
           yoy.yoy_pct, yoy.yoy_available, yoy.yoy_note
    from calc_yoy_pct(p_period_start, v_cur.payout_amount, v_cur_found,
                       v_cmp.payout_amount, v_cmp_found) yoy;

  -- Umsatz netto (nur verfuegbar, sobald shopify_daily befuellt ist)
  return query
    select 'revenue_net', 'Umsatz netto', 'EUR',
           v_cur_net, v_cmp_net,
           yoy.yoy_pct, yoy.yoy_available and v_has_cur_net and v_has_cmp_net,
           case when not v_has_cur_net then 'netto-Reihe startet erst 09/2026'
                else yoy.yoy_note end
    from calc_yoy_pct(p_period_start, v_cur_net, v_has_cur_net, v_cmp_net, v_has_cmp_net) yoy;

  -- Bestellungen
  return query
    select 'orders', 'Bestellungen', 'count',
           v_cur.orders_count::numeric, v_cmp.orders_count::numeric,
           yoy.yoy_pct, yoy.yoy_available, yoy.yoy_note
    from calc_yoy_pct(p_period_start, v_cur.orders_count, v_cur_found,
                       v_cmp.orders_count, v_cmp_found) yoy;

  -- AOV (abgeleitet, nicht eingegeben)
  return query
    select 'aov', 'Ø Bestellwert (AOV)', 'EUR',
           case when coalesce(v_cur.orders_count,0) > 0 then round(v_cur.payout_amount / v_cur.orders_count, 2) end,
           case when coalesce(v_cmp.orders_count,0) > 0 then round(v_cmp.payout_amount / v_cmp.orders_count, 2) end,
           yoy.yoy_pct, yoy.yoy_available, yoy.yoy_note
    from calc_yoy_pct(
      p_period_start,
      case when coalesce(v_cur.orders_count,0) > 0 then v_cur.payout_amount / v_cur.orders_count end,
      v_cur_found and coalesce(v_cur.orders_count,0) > 0,
      case when coalesce(v_cmp.orders_count,0) > 0 then v_cmp.payout_amount / v_cmp.orders_count end,
      v_cmp_found and coalesce(v_cmp.orders_count,0) > 0
    ) yoy;

  -- Conversion Rate
  return query
    select 'conversion_rate', 'Conversion Rate', 'percent',
           v_cur.conversion_rate, v_cmp.conversion_rate,
           yoy.yoy_pct, yoy.yoy_available, yoy.yoy_note
    from calc_yoy_pct(p_period_start, v_cur.conversion_rate, v_cur_found,
                       v_cmp.conversion_rate, v_cmp_found) yoy;

  -- Sessions
  return query
    select 'sessions', 'Onlineshop-Sitzungen', 'count',
           v_cur.sessions::numeric, v_cmp.sessions::numeric,
           yoy.yoy_pct, yoy.yoy_available, yoy.yoy_note
    from calc_yoy_pct(p_period_start, v_cur.sessions, v_cur_found,
                       v_cmp.sessions, v_cmp_found) yoy;
end;
$$;

-- Tagesreihe fuer den Chart (Monat des uebergebenen period_start)
create or replace function get_shopify_daily_series(p_period_start date)
returns table (
  day_date date,
  orders_count integer,
  net_sales numeric,
  total_sales numeric,
  sessions integer,
  conversion_rate numeric
) language sql stable as $$
  select day_date, orders_count, net_sales, total_sales, sessions, conversion_rate
  from shopify_daily
  where day_date >= p_period_start and day_date < (p_period_start + interval '1 month')
  order by day_date;
$$;

-- Top-Produkte nach Nettoumsatz fuer den gewaehlten Monat
create or replace function get_shopify_top_products(p_period_start date, p_limit int default 5)
returns table (
  product_title text,
  net_sales numeric,
  gross_sales numeric,
  orders integer
) language sql stable as $$
  select product_title, net_sales, gross_sales, orders
  from shopify_product_monthly
  where period_start = p_period_start
  order by net_sales desc
  limit p_limit;
$$;

-- Status-Hinweis fuer die Seite selbst (nicht erst im separaten Ampelsystem
-- sichtbar) -- 'ok' | 'missing' | 'stale'
create or replace function get_shopify_data_status(p_period_start date)
returns table (status text, detail text) language plpgsql stable as $$
declare
  v_row record;
  v_daily_count int;
  v_days_in_month int;
begin
  select * into v_row from shopify_monthly
    where period_start = p_period_start and period_type = 'monthly';

  if v_row is null then
    return query select 'missing', 'Noch keine Shopify-Daten fuer diesen Monat eingetragen.';
    return;
  end if;

  select count(*) into v_daily_count from shopify_daily
    where day_date >= p_period_start and day_date < (p_period_start + interval '1 month');
  v_days_in_month := extract(day from (date_trunc('month', p_period_start) + interval '1 month' - interval '1 day'));

  if date_trunc('month', p_period_start) = date_trunc('month', current_date) then
    return query select 'ok', format('Laufender Monat, Tagesdaten bis %s Tag(e) vorhanden.', v_daily_count);
  elsif v_daily_count = 0 then
    return query select 'stale', 'Monatssumme vorhanden, aber keine Tagesdaten (Chart bleibt leer).';
  elsif v_daily_count < v_days_in_month then
    return query select 'stale', format('Nur %s von %s Tagen vorhanden.', v_daily_count, v_days_in_month);
  else
    return query select 'ok', 'Vollstaendig.';
  end if;
end;
$$;

-- ============================================================
-- TEIL 4: RPCs fuer den Finanz-Chat Phase 1 (verifiziertes Schema)
-- ============================================================

-- Standort-Umsatz (pos_order_daily) fuer einen Monat inkl. Vorjahresvergleich
-- -- fuer das Chat-Template "Wie hat sich der Umsatz an den Standorten
-- entwickelt?" / "Welcher Standort ist Spitzenreiter?" (Sortierung dafuer
-- macht das Frontend, keine eigene RPC noetig).
create or replace function get_location_revenue_kpis(p_period_start date)
returns table (
  location_code text,
  revenue numeric,
  orders integer,
  compare_revenue numeric,
  compare_pct numeric,
  compare_available boolean,
  compare_note text
) language plpgsql stable as $$
begin
  -- Hinweis: der OUT-Parameter "location_code" (aus RETURNS TABLE) ist im
  -- ganzen Funktionskörper als Variable sichtbar -- ein CTE, das eine
  -- gleichnamige Spalte selektiert, wird sonst "ambiguous". Deshalb hier
  -- Tabellen-Alias + eigener CTE-Spaltenname ("loc").
  return query
  with cur as (
    select p.location_code as loc, sum(p.revenue) as revenue, sum(p.orders) as orders
    from pos_order_daily p
    where p.day_date >= p_period_start and p.day_date < (p_period_start + interval '1 month')
    group by p.location_code
  ),
  cmp as (
    select p.location_code as loc, sum(p.revenue) as revenue
    from pos_order_daily p
    where p.day_date >= (p_period_start - interval '1 year')
      and p.day_date < ((p_period_start - interval '1 year') + interval '1 month')
    group by p.location_code
  )
  select
    cur.loc,
    cur.revenue,
    cur.orders::integer,
    cmp.revenue,
    yoy.yoy_pct,
    yoy.yoy_available,
    yoy.yoy_note
  from cur
  left join cmp on cmp.loc = cur.loc
  cross join lateral calc_yoy_pct(p_period_start, cur.revenue, true, cmp.revenue, cmp.revenue is not null) yoy;
end;
$$;

-- Hinweis: Kanal-Uebersicht (Shops + Shopify + Wolt + Foodora + B2B + TGTG
-- in einer Antwort) ist bewusst NICHT Teil dieser Migration -- die exakten
-- Spaltennamen von wolt_location_payout / foodora_location_payout /
-- b2b_channel_monthly sind in dieser Session nicht verifiziert worden.
-- Siehe README "Offen / Phase 1.5".
