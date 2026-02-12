create table if not exists public.reservations (
  id uuid not null default gen_random_uuid(),
  created_at timestamp with time zone not null default now(),
  reservation_date timestamp with time zone not null,
  customer_name text not null,
  customer_phone text not null,
  email text,
  party_size integer not null default 2,
  table_number integer,
  status text not null default 'pending', -- pending, confirmed, cancelled, seated
  notes text,
  constraint reservations_pkey primary key (id)
);

alter table public.reservations enable row level security;

create policy "Enable all access for authenticated users" on public.reservations
  for all to authenticated using (true) with check (true);

create policy "Enable insert for anon users" on public.reservations
  for insert to anon with check (true);

-- Allow public read access (for checking availability)
create policy "Enable read access for anon users" on public.reservations
  for select using (true);

-- Add to realtime publication
do $$
begin
  if not exists (select 1 from pg_publication_tables where pubname = 'supabase_realtime' and tablename = 'reservations') then
    alter publication supabase_realtime add table public.reservations;
  end if;
end
$$;
