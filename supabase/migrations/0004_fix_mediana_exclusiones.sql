-- Fix (PACKET §14 test 16 / Blueprint condition 5, "every filter publishes whom it leaves out"):
-- mediana_precio only counted zone acopios that HAD a price for the material, so an
-- acopio with no price vanished from both the included and the excluded counts.
-- Now every acopio in the zone is either included or excluded.

create or replace function public.mediana_precio(p_zona text, p_material text)
returns json language sql stable security definer set search_path = public
as $$
  with candidatos as (
    select a.id, pr.precio_kg,
           (select count(*) from boletas b
             where b.acopio_id = a.id and b.material = p_material and b.estado <> 'anulada'
               and semana_de(b.created_at) = semana_de(now())) as n
    from acopios a
    left join precios pr on pr.acopio_id = a.id and pr.material = p_material
    where a.zona = p_zona
  ),
  incl as (select precio_kg from candidatos where n >= 5 and precio_kg is not null)
  select json_build_object(
    'mediana', case when (select count(*) from incl) >= 3
                    then (select round(percentile_cont(0.5) within group (order by precio_kg)::numeric, 2) from incl)
               end,
    'acopios_incluidos', (select count(*) from incl),
    'acopios_excluidos', (select count(*) from candidatos) - (select count(*) from incl)
  );
$$;

revoke execute on function public.mediana_precio(text, text) from public;
grant execute on function public.mediana_precio(text, text) to anon, authenticated;
