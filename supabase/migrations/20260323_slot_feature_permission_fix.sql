-- Safety migration for production environments where custom tables were
-- created manually and table privileges were not granted to API roles.

create extension if not exists "uuid-ossp";
create extension if not exists pgcrypto;

alter table if exists public.profiles
  add column if not exists listing_slot_limit integer not null default 5,
  add column if not exists community_slot_limit integer not null default 3;

do $$
begin
  if to_regclass('public.slot_requests') is not null then
    execute 'alter table public.slot_requests enable row level security';
    execute 'grant select, insert, update, delete on table public.slot_requests to authenticated';
    execute 'grant select, insert, update, delete on table public.slot_requests to service_role';
  end if;

  if to_regclass('public.feature_requests') is not null then
    execute 'alter table public.feature_requests enable row level security';
    execute 'grant select, insert, update, delete on table public.feature_requests to authenticated';
    execute 'grant select, insert, update, delete on table public.feature_requests to service_role';
  end if;
end $$;
