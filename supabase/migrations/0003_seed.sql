-- F2 seed. Every person, acopio, price and sale here is INVENTED and labeled "(ejemplo)".
--
-- sembrar_ejemplo(acopio, inconsistente) fills one acopio with 10 aliases, prices,
-- two weeks of boletas and last week's outbound sales. With inconsistente = true,
-- last week's PET sales are 30% below PET bought (PACKET §14 test 15).
-- cargar_ejemplo() lets a logged-in operator load it into their own acopio.

create or replace function public.sembrar_ejemplo(p_acopio uuid, p_inconsistente boolean)
returns void language plpgsql security definer set search_path = public
as $$
declare
  v_alias text[] := array['Lupe','Toño','Chela','Beto','Rosa','Memo','Juana','Paco','Lalo','Mari'];
  v_peps uuid[];
  v_mats text[] := array['PET','PET','PET','Carton','Carton','Aluminio'];
  v_semana_actual timestamptz := (semana_de(now()))::timestamp at time zone 'America/Mexico_City';
  v_inicio timestamptz;
  v_fin timestamptz;
  v_folio int;
  v_kg numeric;
  v_mat text;
  v_fuente text;
  i int;
  w int;
begin
  insert into precios (acopio_id, material, precio_kg) values
    (p_acopio, 'PET', round((5.20 + random() * 0.6)::numeric, 2)),
    (p_acopio, 'Carton', round((2.00 + random() * 0.4)::numeric, 2)),
    (p_acopio, 'Aluminio', round((21 + random() * 3)::numeric, 2)),
    (p_acopio, 'Cobre', round((115 + random() * 10)::numeric, 2)),
    (p_acopio, 'Fierro', round((3.50 + random() * 0.6)::numeric, 2)),
    (p_acopio, 'Vidrio', round((0.70 + random() * 0.2)::numeric, 2))
  on conflict (acopio_id, material) do nothing;

  with ins as (
    insert into pepenadores (acopio_id, alias)
    select p_acopio, a || ' (ejemplo)' from unnest(v_alias) a
    returning id
  ) select array_agg(id) into v_peps from ins;

  select coalesce(max(folio), 0) into v_folio from boletas where acopio_id = p_acopio;

  -- w = 1: last week (12 boletas); w = 0: this week so far (8 boletas, >= 5 PET).
  for w in 0..1 loop
    v_inicio := v_semana_actual - make_interval(days => 7 * w);
    v_fin := least(v_inicio + interval '7 days', now());
    for i in 1..(case when w = 1 then 12 else 8 end) loop
      v_mat := case when i <= 5 then 'PET' else v_mats[1 + floor(random() * 6)::int] end;
      v_kg := round((case v_mat when 'Aluminio' then 3 + random() * 8 else 10 + random() * 30 end)::numeric, 2);
      v_fuente := case when i % 5 = 0 then 'manual' when i % 7 = 0 then 'foto_ia' else 'bascula_simulada' end;
      v_folio := v_folio + 1;
      insert into boletas (acopio_id, pepenador_id, folio, material, kg, precio_kg, total, fuente,
                           ia_confianza, estable_at, emision_ms, entrega, created_at)
      select p_acopio, v_peps[1 + (i % 10)], v_folio, v_mat, v_kg, pr.precio_kg,
             round(v_kg * pr.precio_kg, 2), v_fuente,
             case when v_fuente = 'foto_ia' then 0.9 end,
             null,
             case when v_fuente = 'bascula_simulada' then 1800 + floor(random() * 4500)::int end,
             case when i % 3 = 0 then 'impreso' when i % 3 = 1 then 'whatsapp' else 'ninguna' end,
             v_inicio + (v_fin - v_inicio) * (i::numeric / 13)
      from precios pr where pr.acopio_id = p_acopio and pr.material = v_mat;
    end loop;
  end loop;

  -- Last week's invented outbound invoices.
  insert into ventas_salientes (acopio_id, material, kg, semana, comprador)
  select acopio_id, material,
         round(sum(kg) * case when material = 'PET' and p_inconsistente then 0.70 else 0.97 end, 2),
         semana_de(created_at), 'Comprador mayorista (ejemplo)'
  from boletas
  where acopio_id = p_acopio and semana_de(created_at) = semana_de(now()) - 7 and estado <> 'anulada'
  group by acopio_id, material, semana_de(created_at);
end;
$$;

revoke execute on function public.sembrar_ejemplo(uuid, boolean) from public, anon, authenticated;

-- Loads the example set into the caller's own acopio, once.
create or replace function public.cargar_ejemplo()
returns void language plpgsql security definer set search_path = public
as $$
declare
  v_acopio uuid;
begin
  select id into v_acopio from acopios where owner_id = auth.uid() order by created_at limit 1;
  if v_acopio is null then
    raise exception 'sin acopio' using errcode = '42501';
  end if;
  if exists (select 1 from pepenadores where acopio_id = v_acopio and alias like '% (ejemplo)') then
    return;
  end if;
  perform sembrar_ejemplo(v_acopio, true);
end;
$$;

revoke execute on function public.cargar_ejemplo() from public, anon;
grant execute on function public.cargar_ejemplo() to authenticated;

-- Three invented acopios in Iztapalapa, owned by placeholder users that can never sign in.
insert into auth.users (id, instance_id, aud, role, email, encrypted_password,
                        raw_app_meta_data, raw_user_meta_data, created_at, updated_at)
values
  ('00000000-0000-4000-8000-000000000001', '00000000-0000-0000-0000-000000000000', 'authenticated',
   'authenticated', 'ejemplo1@mi-boleta.invalid', '', '{}', '{}', now(), now()),
  ('00000000-0000-4000-8000-000000000002', '00000000-0000-0000-0000-000000000000', 'authenticated',
   'authenticated', 'ejemplo2@mi-boleta.invalid', '', '{}', '{}', now(), now()),
  ('00000000-0000-4000-8000-000000000003', '00000000-0000-0000-0000-000000000000', 'authenticated',
   'authenticated', 'ejemplo3@mi-boleta.invalid', '', '{}', '{}', now(), now())
on conflict (id) do nothing;

insert into public.acopios (id, owner_id, nombre, zona) values
  ('00000000-0000-4000-9000-000000000001', '00000000-0000-4000-8000-000000000001', 'Acopio La Esperanza (ejemplo)', 'Iztapalapa'),
  ('00000000-0000-4000-9000-000000000002', '00000000-0000-4000-8000-000000000002', 'Recicladora El Sol (ejemplo)', 'Iztapalapa'),
  ('00000000-0000-4000-9000-000000000003', '00000000-0000-4000-8000-000000000003', 'Chatarrera Los Pinos (ejemplo)', 'Iztapalapa')
on conflict (id) do nothing;

select public.sembrar_ejemplo('00000000-0000-4000-9000-000000000001', true);
select public.sembrar_ejemplo('00000000-0000-4000-9000-000000000002', false);
select public.sembrar_ejemplo('00000000-0000-4000-9000-000000000003', false);
