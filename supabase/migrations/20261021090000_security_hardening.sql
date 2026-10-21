-- Security-Advisor-Befunde vom 21.10.2026 beheben.
-- 1) RLS auf 8 Tabellen (nur Admins, wie bei den anderen Tabellen)
-- 2) 2 Views auf security_invoker umstellen
-- 3) search_path bei allen eigenen Funktionen fixieren
-- 4) Trigger-/Hilfsfunktionen nicht mehr per API aufrufbar
-- Nicht Teil davon: "Leaked Password Protection" (Dashboard-Schalter).

-- 1) RLS + Admin-Policy
do $$
declare t text;
begin
  foreach t in array array[
    'pos_product_archive','ingredient_prices','product_recipes',
    'product_costing_meta','schrankerl_product_costs',
    'schrankerl_weekly_orders','schrankerl_weekly_summary','shopify_daily'
  ] loop
    execute format('alter table public.%I enable row level security', t);
    execute format('drop policy if exists %I on public.%I', t || '_admin_all', t);
    execute format(
      'create policy %I on public.%I for all to authenticated using (public.is_admin()) with check (public.is_admin())',
      t || '_admin_all', t);
  end loop;
end $$;

-- 2) Views laufen mit den Rechten der abfragenden Person
alter view public.category_stats set (security_invoker = on);
alter view public.category_monthly set (security_invoker = on);

-- 3) search_path fixieren (alle Funktionen sind SECURITY INVOKER)
do $$
declare f record;
begin
  for f in
    select p.oid::regprocedure as sig
    from pg_proc p join pg_namespace n on n.oid = p.pronamespace
    where n.nspname = 'public' and p.prokind = 'f' and not p.prosecdef
  loop
    execute format('alter function %s set search_path = public, pg_temp', f.sig);
  end loop;
end $$;

-- 4) handle_new_user ist nur ein Auth-Trigger, is_admin nur für eingeloggte Nutzer
revoke execute on function public.handle_new_user() from public, anon, authenticated;
revoke execute on function public.is_admin() from public, anon;
grant execute on function public.is_admin() to authenticated;
