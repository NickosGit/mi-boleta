-- F2: full schema. RLS on every table; operators only see rows of acopios they own.
-- Boletas are never deleted: no DELETE policy and DELETE revoked. They change only
-- through the security definer functions below (issue, delivery, void, dispute).
-- Public access only through get_boleta / registrar_desacuerdo / mediana_precio.

-- ── helpers ─────────────────────────────────────────────────────────────────

create or replace function public.es_mi_acopio(p_acopio uuid)
returns boolean
language sql stable security definer set search_path = public
as $$
  select exists (select 1 from acopios where id = p_acopio and owner_id = auth.uid());
$$;

-- Weekly balance tolerance: ±10%. One constant, used by the view.
create or replace function public.balance_tolerancia()
returns numeric language sql immutable as $$ select 0.10::numeric $$;

-- Monday of the CDMX week a timestamp falls in.
create or replace function public.semana_de(p_ts timestamptz)
returns date language sql immutable as $$
  select date_trunc('week', p_ts at time zone 'America/Mexico_City')::date
$$;

-- ── tables ──────────────────────────────────────────────────────────────────

create table public.pepenadores (
  id uuid primary key default gen_random_uuid(),
  acopio_id uuid not null references public.acopios (id),
  alias text not null check (char_length(btrim(alias)) between 2 and 60),
  telefono text null check (telefono ~ '^[0-9]{10}$'),
  created_at timestamptz not null default now()
);
create index pepenadores_acopio_idx on public.pepenadores (acopio_id);

create table public.precios (
  id bigint generated always as identity primary key,
  acopio_id uuid not null references public.acopios (id),
  material text not null check (material in ('PET','Carton','Aluminio','Cobre','Fierro','Vidrio')),
  precio_kg numeric(8,2) not null check (precio_kg > 0),
  updated_at timestamptz not null default now(),
  unique (acopio_id, material)
);

create table public.scale_readings (
  id bigserial primary key,
  acopio_id uuid not null references public.acopios (id),
  kg numeric(7,2) not null check (kg >= 0),
  created_at timestamptz not null default now()
);
create index scale_readings_acopio_idx on public.scale_readings (acopio_id, created_at desc);

create table public.boletas (
  id uuid primary key default gen_random_uuid(),
  acopio_id uuid not null references public.acopios (id),
  pepenador_id uuid not null references public.pepenadores (id),
  folio int not null,
  material text not null check (material in ('PET','Carton','Aluminio','Cobre','Fierro','Vidrio')),
  kg numeric(7,2) not null check (kg between 0.01 and 2000),
  precio_kg numeric(8,2) not null check (precio_kg > 0),
  total numeric(10,2) not null,
  fuente text not null check (fuente in ('bascula_simulada','foto_ia','manual')),
  ia_confianza numeric null check (ia_confianza between 0 and 1),
  foto_path text null,
  estable_at timestamptz null,
  emision_ms int null,
  entrega text not null default 'ninguna' check (entrega in ('whatsapp','impreso','ninguna')),
  token uuid not null default gen_random_uuid() unique,
  estado text not null default 'emitida' check (estado in ('emitida','en_desacuerdo','anulada')),
  motivo_anulacion text null check (char_length(motivo_anulacion) <= 140),
  created_at timestamptz not null default now(),
  unique (acopio_id, folio),
  check (estado <> 'anulada' or char_length(btrim(motivo_anulacion)) >= 3)
);
create index boletas_acopio_idx on public.boletas (acopio_id, created_at desc);

create table public.desacuerdos (
  id bigint generated always as identity primary key,
  boleta_id uuid not null unique references public.boletas (id),
  origen text not null check (origen in ('pepenadora','operador')),
  nota text null check (char_length(nota) <= 280),
  created_at timestamptz not null default now()
);

-- Invented outbound invoices (what the acopio sold onward, per week).
create table public.ventas_salientes (
  id bigint generated always as identity primary key,
  acopio_id uuid not null references public.acopios (id),
  material text not null check (material in ('PET','Carton','Aluminio','Cobre','Fierro','Vidrio')),
  kg numeric(9,2) not null check (kg > 0),
  semana date not null,
  comprador text not null check (char_length(btrim(comprador)) between 2 and 80),
  created_at timestamptz not null default now()
);
create index ventas_acopio_idx on public.ventas_salientes (acopio_id, semana);

-- Per-user log for the /api/vision limit (20 per hour).
create table public.vision_llamadas (
  id bigint generated always as identity primary key,
  user_id uuid not null default auth.uid() references auth.users (id),
  created_at timestamptz not null default now()
);
create index vision_llamadas_user_idx on public.vision_llamadas (user_id, created_at desc);

-- ── RLS ─────────────────────────────────────────────────────────────────────

alter table public.pepenadores enable row level security;
alter table public.precios enable row level security;
alter table public.scale_readings enable row level security;
alter table public.boletas enable row level security;
alter table public.desacuerdos enable row level security;
alter table public.ventas_salientes enable row level security;
alter table public.vision_llamadas enable row level security;

create policy pep_select on public.pepenadores for select to authenticated using (es_mi_acopio(acopio_id));
create policy pep_insert on public.pepenadores for insert to authenticated with check (es_mi_acopio(acopio_id));
create policy pep_update on public.pepenadores for update to authenticated
  using (es_mi_acopio(acopio_id)) with check (es_mi_acopio(acopio_id));

create policy precios_select on public.precios for select to authenticated using (es_mi_acopio(acopio_id));
create policy precios_insert on public.precios for insert to authenticated with check (es_mi_acopio(acopio_id));
create policy precios_update on public.precios for update to authenticated
  using (es_mi_acopio(acopio_id)) with check (es_mi_acopio(acopio_id));

create policy scale_select on public.scale_readings for select to authenticated using (es_mi_acopio(acopio_id));
create policy scale_insert on public.scale_readings for insert to authenticated with check (es_mi_acopio(acopio_id));

-- Boletas: read only. Writes go through the functions below.
create policy boletas_select on public.boletas for select to authenticated using (es_mi_acopio(acopio_id));

create policy desacuerdos_select on public.desacuerdos for select to authenticated
  using (exists (select 1 from boletas b where b.id = boleta_id and es_mi_acopio(b.acopio_id)));

create policy ventas_select on public.ventas_salientes for select to authenticated using (es_mi_acopio(acopio_id));
create policy ventas_insert on public.ventas_salientes for insert to authenticated with check (es_mi_acopio(acopio_id));

create policy vision_select on public.vision_llamadas for select to authenticated using (user_id = auth.uid());
create policy vision_insert on public.vision_llamadas for insert to authenticated with check (user_id = auth.uid());

revoke all on public.pepenadores, public.precios, public.scale_readings, public.boletas,
  public.desacuerdos, public.ventas_salientes, public.vision_llamadas from anon;
revoke insert, update, delete, truncate on public.boletas, public.desacuerdos from authenticated;
revoke delete, truncate on public.pepenadores, public.precios, public.ventas_salientes,
  public.scale_readings, public.vision_llamadas from authenticated;

-- Live scale feed for /app/nueva (Realtime respects RLS).
alter publication supabase_realtime add table public.scale_readings;

-- ── operator functions ─────────────────────────────────────────────────────

-- Issue a boleta. The server computes folio, price, total and emision_ms.
create or replace function public.emitir_boleta(
  p_pepenador uuid,
  p_material text,
  p_kg numeric,
  p_fuente text,
  p_estable_at timestamptz default null,
  p_ia_confianza numeric default null,
  p_foto_path text default null
) returns table (id uuid, folio int, total numeric, token uuid, precio_kg numeric, emision_ms int)
language plpgsql security definer set search_path = public
as $$
declare
  v_acopio uuid;
  v_precio numeric(8,2);
  v_folio int;
  v_ms int;
begin
  select p.acopio_id into v_acopio from pepenadores p where p.id = p_pepenador;
  if v_acopio is null or not es_mi_acopio(v_acopio) then
    raise exception 'pepenador no encontrado' using errcode = '42501';
  end if;
  if p_kg is null or p_kg < 0.01 or p_kg > 2000 then
    raise exception 'kg fuera de rango' using errcode = '22023';
  end if;

  select pr.precio_kg into v_precio from precios pr where pr.acopio_id = v_acopio and pr.material = p_material;
  if v_precio is null then
    raise exception 'sin precio para %', p_material using errcode = '22023';
  end if;

  -- One folio sequence per acopio; serialize concurrent issues.
  perform pg_advisory_xact_lock(hashtext(v_acopio::text));
  select coalesce(max(b.folio), 0) + 1 into v_folio from boletas b where b.acopio_id = v_acopio;

  if p_estable_at is not null then
    v_ms := greatest(0, (extract(epoch from (clock_timestamp() - p_estable_at)) * 1000)::int);
  end if;

  return query
  insert into boletas (acopio_id, pepenador_id, folio, material, kg, precio_kg, total, fuente,
                       ia_confianza, foto_path, estable_at, emision_ms)
  values (v_acopio, p_pepenador, v_folio, p_material, round(p_kg, 2), v_precio,
          round(round(p_kg, 2) * v_precio, 2), p_fuente, p_ia_confianza, p_foto_path, p_estable_at, v_ms)
  returning boletas.id, boletas.folio, boletas.total, boletas.token, boletas.precio_kg, boletas.emision_ms;
end;
$$;

-- Record how the copy was delivered. No-op for anyone who doesn't own the boleta.
create or replace function public.marcar_entrega(p_token uuid, p_entrega text)
returns void language plpgsql security definer set search_path = public
as $$
begin
  if p_entrega not in ('whatsapp','impreso') then
    raise exception 'entrega inválida' using errcode = '22023';
  end if;
  update boletas set entrega = p_entrega where token = p_token and es_mi_acopio(acopio_id);
end;
$$;

-- Void with a visible reason. The row stays.
create or replace function public.anular_boleta(p_boleta uuid, p_motivo text)
returns void language plpgsql security definer set search_path = public
as $$
begin
  if p_motivo is null or char_length(btrim(p_motivo)) not between 3 and 140 then
    raise exception 'motivo de 3 a 140 caracteres' using errcode = '22023';
  end if;
  update boletas set estado = 'anulada', motivo_anulacion = btrim(p_motivo)
   where id = p_boleta and es_mi_acopio(acopio_id) and estado <> 'anulada';
end;
$$;

-- The operator records a dispute on the picker's behalf. Idempotent.
create or replace function public.registrar_desacuerdo_operador(p_boleta uuid, p_nota text default null)
returns void language plpgsql security definer set search_path = public
as $$
begin
  if p_nota is not null and char_length(p_nota) > 280 then
    raise exception 'nota de máximo 280 caracteres' using errcode = '22023';
  end if;
  if not exists (select 1 from boletas where id = p_boleta and es_mi_acopio(acopio_id)) then
    return;
  end if;
  insert into desacuerdos (boleta_id, origen, nota)
  values (p_boleta, 'operador', nullif(btrim(p_nota), ''))
  on conflict (boleta_id) do nothing;
  update boletas set estado = 'en_desacuerdo' where id = p_boleta and estado = 'emitida';
end;
$$;

-- ── public functions (token only, minimal fields, never telefono) ──────────

create or replace function public.get_boleta(p_token uuid)
returns json language sql stable security definer set search_path = public
as $$
  select json_build_object(
    'folio', b.folio,
    'fecha', b.created_at,
    'acopio', a.nombre,
    'zona', a.zona,
    'alias', p.alias,
    'material', b.material,
    'kg', b.kg,
    'precio_kg', b.precio_kg,
    'total', b.total,
    'fuente', b.fuente,
    'ia_confianza', b.ia_confianza,
    'estado', b.estado,
    'motivo_anulacion', b.motivo_anulacion,
    'en_desacuerdo', exists (select 1 from desacuerdos d where d.boleta_id = b.id)
  )
  from boletas b
  join acopios a on a.id = b.acopio_id
  join pepenadores p on p.id = b.pepenador_id
  where b.token = p_token;
$$;

-- The picker disputes from her copy. Idempotent; never deletes; the boleta keeps counting.
create or replace function public.registrar_desacuerdo(p_token uuid, p_nota text default null)
returns boolean language plpgsql security definer set search_path = public
as $$
declare
  v_id uuid;
begin
  if p_nota is not null and char_length(p_nota) > 280 then
    raise exception 'nota de máximo 280 caracteres' using errcode = '22023';
  end if;
  select id into v_id from boletas where token = p_token;
  if v_id is null then return false; end if;
  insert into desacuerdos (boleta_id, origen, nota)
  values (v_id, 'pepenadora', nullif(btrim(p_nota), ''))
  on conflict (boleta_id) do nothing;
  update boletas set estado = 'en_desacuerdo' where id = v_id and estado = 'emitida';
  return true;
end;
$$;

-- Zone median price. Only acopios with >= 5 non-voided boletas of this material this
-- week are included; the rest are counted as excluded. Null median under 3 included.
create or replace function public.mediana_precio(p_zona text, p_material text)
returns json language sql stable security definer set search_path = public
as $$
  with candidatos as (
    select a.id, pr.precio_kg,
           (select count(*) from boletas b
             where b.acopio_id = a.id and b.material = p_material and b.estado <> 'anulada'
               and semana_de(b.created_at) = semana_de(now())) as n
    from acopios a
    join precios pr on pr.acopio_id = a.id and pr.material = p_material
    where a.zona = p_zona
  ),
  incl as (select precio_kg from candidatos where n >= 5)
  select json_build_object(
    'mediana', case when (select count(*) from incl) >= 3
                    then (select round(percentile_cont(0.5) within group (order by precio_kg)::numeric, 2) from incl)
               end,
    'acopios_incluidos', (select count(*) from incl),
    'acopios_excluidos', (select count(*) from candidatos where n < 5)
  );
$$;

-- ── weekly balance (inconsistency at acopio + material + week, never on a person) ──

create view public.balance_semanal with (security_invoker = true) as
with entradas as (
  select acopio_id, material, semana_de(created_at) as semana,
         sum(kg) filter (where estado <> 'anulada') as kg_entrada,
         count(*) filter (where estado = 'anulada') as boletas_anuladas
  from boletas group by 1, 2, 3
),
salidas as (
  select acopio_id, material, semana, sum(kg) as kg_salida
  from ventas_salientes group by 1, 2, 3
)
select coalesce(e.acopio_id, s.acopio_id) as acopio_id,
       coalesce(e.material, s.material) as material,
       coalesce(e.semana, s.semana) as semana,
       coalesce(e.kg_entrada, 0) as kg_entrada,
       coalesce(s.kg_salida, 0) as kg_salida,
       coalesce(e.boletas_anuladas, 0) as boletas_anuladas,
       case
         when coalesce(s.kg_salida, 0) = 0 then 'sin_salidas'
         when abs(coalesce(s.kg_salida, 0) - coalesce(e.kg_entrada, 0))
              > balance_tolerancia() * coalesce(e.kg_entrada, 0) then 'inconsistente'
         else 'consistente'
       end as estado
from entradas e
full outer join salidas s
  on s.acopio_id = e.acopio_id and s.material = e.material and s.semana = e.semana;

grant select on public.balance_semanal to authenticated;
revoke all on public.balance_semanal from anon;

-- ── grants on functions ────────────────────────────────────────────────────

revoke execute on all functions in schema public from public, anon;
grant execute on function public.es_mi_acopio(uuid), public.balance_tolerancia(), public.semana_de(timestamptz),
  public.emitir_boleta(uuid, text, numeric, text, timestamptz, numeric, text),
  public.marcar_entrega(uuid, text), public.anular_boleta(uuid, text),
  public.registrar_desacuerdo_operador(uuid, text)
  to authenticated;
grant execute on function public.get_boleta(uuid), public.registrar_desacuerdo(uuid, text),
  public.mediana_precio(text, text)
  to anon, authenticated;

-- ── storage: private bucket for display photos (evidence, not proof) ───────

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('displays', 'displays', false, 5242880, array['image/jpeg', 'image/png'])
on conflict (id) do nothing;

create policy displays_insert on storage.objects for insert to authenticated
  with check (bucket_id = 'displays' and public.es_mi_acopio(((storage.foldername(name))[1])::uuid));
create policy displays_select on storage.objects for select to authenticated
  using (bucket_id = 'displays' and public.es_mi_acopio(((storage.foldername(name))[1])::uuid));
