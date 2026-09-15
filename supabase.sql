-- RS Chatrabash cloud sync
-- Run this in Supabase SQL Editor.
-- The app stores one JSON document per authenticated user.

create table if not exists public.mess_data (
  user_id uuid primary key references auth.users(id) on delete cascade,
  payload jsonb not null,
  updated_at timestamptz not null default now()
);

alter table public.mess_data enable row level security;

drop policy if exists "Users can read their own mess data" on public.mess_data;
create policy "Users can read their own mess data"
on public.mess_data for select
to authenticated
using (auth.uid() = user_id);

drop policy if exists "Users can insert their own mess data" on public.mess_data;
create policy "Users can insert their own mess data"
on public.mess_data for insert
to authenticated
with check (auth.uid() = user_id);

drop policy if exists "Users can update their own mess data" on public.mess_data;
create policy "Users can update their own mess data"
on public.mess_data for update
to authenticated
using (auth.uid() = user_id)
with check (auth.uid() = user_id);

create index if not exists mess_data_updated_at_idx on public.mess_data(updated_at);
