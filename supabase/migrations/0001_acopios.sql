-- F1: the operator's acopio, created on first login.
-- The rest of the schema (pepenadores, precios, boletas, ...) lands in F2.

create table public.acopios (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null default auth.uid() references auth.users (id) on delete restrict,
  nombre text not null check (char_length(btrim(nombre)) between 2 and 80),
  -- Self-declared alcaldía, used only to group the zone median price. Never GPS.
  zona text not null check (zona in (
    'Álvaro Obregón', 'Azcapotzalco', 'Benito Juárez', 'Coyoacán',
    'Cuajimalpa de Morelos', 'Cuauhtémoc', 'Gustavo A. Madero', 'Iztacalco',
    'Iztapalapa', 'La Magdalena Contreras', 'Miguel Hidalgo', 'Milpa Alta',
    'Tláhuac', 'Tlalpan', 'Venustiano Carranza', 'Xochimilco'
  )),
  created_at timestamptz not null default now()
);

create index acopios_owner_idx on public.acopios (owner_id);

alter table public.acopios enable row level security;

-- Operators only see and edit acopios they own. No DELETE policy: nothing is deleted.
create policy acopios_select_own on public.acopios
  for select to authenticated using (owner_id = (select auth.uid()));

create policy acopios_insert_own on public.acopios
  for insert to authenticated with check (owner_id = (select auth.uid()));

create policy acopios_update_own on public.acopios
  for update to authenticated
  using (owner_id = (select auth.uid()))
  with check (owner_id = (select auth.uid()));

revoke all on public.acopios from anon;
