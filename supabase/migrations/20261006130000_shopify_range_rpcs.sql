-- Shopify-Seite: Zeitraum (von-bis) und Jahresübersicht.
-- Regeln wie src/lib/vergleich.ts: fehlende Vorjahresmonate zählen nicht als 0,
-- der laufende Monat bleibt aus dem Vergleich (nicht aus der Summe), jeder
-- Prozentwert nennt sein Vergleichsfenster.
-- (Bereits live angewendet; diese Datei ist die Repo-Kopie zur Versionierung.)

create or replace function de_month_label(p date) returns text
language sql immutable as $$
  select (array['Jän','Feb','Mär','Apr','Mai','Jun','Jul','Aug','Sep','Okt','Nov','Dez'])[extract(month from p)::int]
         || ' ' || to_char(p, 'YY');
$$;

create or replace function de_span_label(p_first date, p_last date) returns text
language sql immutable as $$
  select case when p_first = p_last then de_month_label(p_first)
              else de_month_label(p_first) || '–' || de_month_label(p_last) end;
$$;

create or replace function calc_range_yoy(p_cur numeric, p_prev numeric, p_n bigint, p_n_total bigint, p_first date, p_last date)
returns table (pct numeric, available boolean, note text) language plpgsql immutable as $$
begin
  if p_n = 0 then
    return query select null::numeric, false, 'kein Vorjahresvergleich (Vorjahresdaten fehlen oder Monat läuft noch)';
  elsif p_cur is null or p_prev is null then
    return query select null::numeric, false, 'keine Daten für Vergleich';
  elsif p_prev = 0 then
    return query select null::numeric, false, 'Vorjahreswert war 0';
  else
    return query select round(((p_cur - p_prev) / p_prev) * 100, 1), true,
      format('%s vs. %s%s', de_span_label(p_first, p_last),
             de_span_label((p_first - interval '1 year')::date, (p_last - interval '1 year')::date),
             case when p_n < p_n_total then format(' (%s von %s Monaten)', p_n, p_n_total) else '' end);
  end if;
end;
$$;

create or replace function get_shopify_range_kpis(p_from date, p_to date)
returns table (
  metric_key text, label text, unit text, value numeric, compare_value numeric,
  compare_pct numeric, compare_available boolean, compare_note text
) language plpgsql stable as $$
declare
  a record;
  v_net numeric;
  r record;
begin
  with m as (
    select gs::date as p from generate_series(date_trunc('month', p_from)::date, date_trunc('month', p_to)::date, interval '1 month') gs
  ), j as (
    select m.p,
      c.payout_amount ca, c.orders_count co, c.conversion_rate cc, c.sessions cs, (c.period_start is not null) has_c,
      v.payout_amount va, v.orders_count vo, v.conversion_rate vc, v.sessions vs, (v.period_start is not null) has_v,
      (date_trunc('month', m.p) = date_trunc('month', current_date)) running
    from m
    left join shopify_monthly c on c.period_start = m.p and c.period_type = 'monthly'
    left join shopify_monthly v on v.period_start = (m.p - interval '1 year')::date and v.period_type = 'monthly'
  )
  select
    count(*) n_total,
    count(*) filter (where has_c) n_data,
    count(*) filter (where has_c and has_v and not running) n_u,
    min(p) filter (where has_c and has_v and not running) first_u,
    max(p) filter (where has_c and has_v and not running) last_u,
    sum(ca) gross, sum(co) orders, sum(cs) sessions,
    sum(cc * cs) filter (where cc is not null and cs is not null) conv_w,
    sum(cs) filter (where cc is not null and cs is not null) conv_s,
    sum(ca) filter (where has_c and has_v and not running) gross_u,
    sum(va) filter (where has_c and has_v and not running) gross_prev_u,
    sum(co) filter (where has_c and has_v and not running) orders_u,
    sum(vo) filter (where has_c and has_v and not running) orders_prev_u,
    sum(cs) filter (where has_c and has_v and not running) sessions_u,
    sum(vs) filter (where has_c and has_v and not running) sessions_prev_u,
    sum(cc * cs) filter (where has_c and has_v and not running and cc is not null and cs is not null and vc is not null and vs is not null) conv_w_u,
    sum(cs) filter (where has_c and has_v and not running and cc is not null and cs is not null and vc is not null and vs is not null) conv_s_u,
    sum(vc * vs) filter (where has_c and has_v and not running and cc is not null and cs is not null and vc is not null and vs is not null) conv_w_prev_u,
    sum(vs) filter (where has_c and has_v and not running and cc is not null and cs is not null and vc is not null and vs is not null) conv_s_prev_u
  into a from j;

  select sum(net_sales) into v_net from shopify_daily
    where day_date >= date_trunc('month', p_from)::date and day_date < (date_trunc('month', p_to) + interval '1 month');

  select * into r from calc_range_yoy(a.gross_u, a.gross_prev_u, a.n_u, a.n_total, a.first_u, a.last_u);
  return query select 'revenue_gross'::text, 'Umsatz brutto (total_sales)'::text, 'EUR'::text, a.gross, a.gross_prev_u, r.pct, r.available, r.note;

  -- Netto-Reihe startet 09/2026, es gibt kein Vorjahr zum Vergleichen
  return query select 'revenue_net'::text, 'Umsatz netto'::text, 'EUR'::text, v_net, null::numeric, null::numeric, false,
    'netto-Reihe startet erst 09/2026'::text;

  select * into r from calc_range_yoy(a.orders_u, a.orders_prev_u, a.n_u, a.n_total, a.first_u, a.last_u);
  return query select 'orders'::text, 'Bestellungen'::text, 'count'::text, a.orders::numeric, a.orders_prev_u::numeric, r.pct, r.available, r.note;

  select * into r from calc_range_yoy(
    case when coalesce(a.orders_u,0) > 0 then a.gross_u / a.orders_u end,
    case when coalesce(a.orders_prev_u,0) > 0 then a.gross_prev_u / a.orders_prev_u end,
    a.n_u, a.n_total, a.first_u, a.last_u);
  return query select 'aov'::text, 'Ø Bestellwert (AOV)'::text, 'EUR'::text,
    case when coalesce(a.orders,0) > 0 then round(a.gross / a.orders, 2) end,
    case when coalesce(a.orders_prev_u,0) > 0 then round(a.gross_prev_u / a.orders_prev_u, 2) end,
    r.pct, r.available, r.note;

  select * into r from calc_range_yoy(
    case when coalesce(a.conv_s_u,0) > 0 then a.conv_w_u / a.conv_s_u end,
    case when coalesce(a.conv_s_prev_u,0) > 0 then a.conv_w_prev_u / a.conv_s_prev_u end,
    case when coalesce(a.conv_s_u,0) > 0 then a.n_u else 0 end, a.n_total, a.first_u, a.last_u);
  return query select 'conversion_rate'::text, 'Conversion Rate'::text, 'percent'::text,
    case when coalesce(a.conv_s,0) > 0 then a.conv_w / a.conv_s end,
    case when coalesce(a.conv_s_prev_u,0) > 0 then a.conv_w_prev_u / a.conv_s_prev_u end,
    r.pct, r.available, r.note;

  select * into r from calc_range_yoy(a.sessions_u, a.sessions_prev_u, a.n_u, a.n_total, a.first_u, a.last_u);
  return query select 'sessions'::text, 'Onlineshop-Sitzungen'::text, 'count'::text, a.sessions::numeric, a.sessions_prev_u::numeric, r.pct, r.available, r.note;
end;
$$;

create or replace function get_shopify_monthly_series(p_from date, p_to date)
returns table (period_start date, revenue_gross numeric, orders integer, prev_revenue_gross numeric)
language sql stable as $$
  select m.p::date, c.payout_amount, c.orders_count, v.payout_amount
  from generate_series(date_trunc('month', p_from)::date, date_trunc('month', p_to)::date, interval '1 month') as m(p)
  left join shopify_monthly c on c.period_start = m.p::date and c.period_type = 'monthly'
  left join shopify_monthly v on v.period_start = (m.p - interval '1 year')::date and v.period_type = 'monthly'
  order by m.p;
$$;

create or replace function get_shopify_top_products_range(p_from date, p_to date, p_limit int default 5)
returns table (product_title text, net_sales numeric, gross_sales numeric, orders integer)
language sql stable as $$
  select product_title, sum(net_sales), sum(gross_sales), sum(orders)::integer
  from shopify_product_monthly
  where period_start >= date_trunc('month', p_from)::date and period_start <= date_trunc('month', p_to)::date
  group by product_title
  order by sum(net_sales) desc
  limit p_limit;
$$;

create or replace function get_shopify_range_status(p_from date, p_to date)
returns table (status text, detail text) language plpgsql stable as $$
declare v_total int; v_have int;
begin
  select count(*), count(s.period_start) into v_total, v_have
  from generate_series(date_trunc('month', p_from)::date, date_trunc('month', p_to)::date, interval '1 month') as m(p)
  left join shopify_monthly s on s.period_start = m.p::date and s.period_type = 'monthly';
  if v_have = 0 then
    return query select 'missing', 'Keine Shopify-Daten in diesem Zeitraum.';
  elsif v_have < v_total then
    return query select 'stale', format('Nur %s von %s Monaten haben Daten.', v_have, v_total);
  else
    return query select 'ok', format('Alle %s Monate vollständig.', v_total);
  end if;
end;
$$;
