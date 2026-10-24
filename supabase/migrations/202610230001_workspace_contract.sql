-- Idempotent Ruang Belajar migration. Preserve existing rows; no Sela tables touched.
begin;
create schema if not exists ruang_private;
revoke all on schema ruang_private from public,anon;
grant usage on schema ruang_private to authenticated;
create table if not exists public.ruang_workspaces (
 user_id uuid primary key references auth.users(id) on delete cascade,
 data jsonb not null, revision bigint not null default 1 check(revision>0),
 updated_at timestamptz not null default now()
);
alter table public.ruang_workspaces enable row level security;
drop policy if exists "Read own ruang workspace" on public.ruang_workspaces;
create policy "Read own ruang workspace" on public.ruang_workspaces for select to authenticated using((select auth.uid())=user_id);
drop policy if exists "Insert own ruang workspace" on public.ruang_workspaces;
drop policy if exists "Update own ruang workspace" on public.ruang_workspaces;
revoke all on public.ruang_workspaces from public,anon,authenticated;
grant select on public.ruang_workspaces to authenticated;

-- Bounded structural validation at the DB boundary. API semantic validation
-- additionally verifies catalogue IDs, dates, references, timer and overlaps.
create or replace function ruang_private.workspace_shape(d jsonb)
returns boolean language plpgsql immutable security invoker set search_path='' as $$
declare x jsonb; k text; f text; n integer;
begin
 if jsonb_typeof(d) is distinct from 'object' or d->>'version' is distinct from '3' then return false; end if;
 foreach k in array array['academic','timer','settings'] loop
  if jsonb_typeof(d->k) is distinct from 'object' then return false; end if;
 end loop;
 foreach k in array array['subjects','tasks','sessions'] loop
  if jsonb_typeof(d->k) is distinct from 'array' then return false; end if;
  n:=case k when 'subjects' then 100 when 'tasks' then 20000 else 100000 end;
  if jsonb_array_length(d->k)>n or (select count(*)<>count(distinct v->>'id') from jsonb_array_elements(d->k) v) then return false; end if;
  for x in select value from jsonb_array_elements(d->k) loop
   if jsonb_typeof(x) is distinct from 'object' or coalesce(x->>'id','') !~ '^[A-Za-z0-9_-]{1,100}$' then return false; end if;
   if k='subjects' then
    if jsonb_typeof(x->'name') is distinct from 'string' or length(btrim(x->>'name')) not between 1 and 80 or coalesce(x->>'color','') !~ '^#[0-9a-fA-F]{6}$' then return false; end if;
   elsif k='tasks' then
    if jsonb_typeof(x->'title') is distinct from 'string' or length(btrim(x->>'title')) not between 1 and 300 or jsonb_typeof(x->'done') is distinct from 'boolean' or coalesce(x->>'date','') !~ '^\d{4}-\d{2}-\d{2}$' then return false; end if;
    if x ? 'body' and (jsonb_typeof(x->'body') is distinct from 'string' or octet_length(x->>'body')>65536 or coalesce(x->>'format','') not in ('md','txt')) then return false; end if;
   else
    if coalesce(x->>'runId','') !~ '^[A-Za-z0-9_-]{1,100}$' or coalesce(x->>'subjectId','') !~ '^[A-Za-z0-9_-]{1,100}$' then return false; end if;
    foreach f in array array['start','end','durationMs'] loop
     if jsonb_typeof(x->f) is distinct from 'number' or (x->>f)::numeric<>trunc((x->>f)::numeric) or (x->>f)::numeric not between 0 and 8640000000000000 then return false; end if;
    end loop;
    if (x->>'end')::numeric-(x->>'start')::numeric<>(x->>'durationMs')::numeric then return false; end if;
   end if;
  end loop;
 end loop;
 if jsonb_typeof(d->'learning') is distinct from 'object' or d->'learning'->>'version' is distinct from '1' then return false; end if;
 if d ? 'learning' then
  if jsonb_typeof(d->'learning') is distinct from 'object' or d->'learning'->>'version' is distinct from '1' then return false; end if;
  foreach k in array array['planner','occurrences','reminders'] loop
   if jsonb_typeof(d->'learning'->k) is distinct from 'object' then return false; end if;
  end loop;
  foreach k in array array['notes','resources','timeEdits'] loop
   if jsonb_typeof(d->'learning'->k) is distinct from 'array' or jsonb_array_length(d->'learning'->k)>(case k when 'timeEdits' then 500 else 2000 end) then return false; end if;
   for x in select value from jsonb_array_elements(d->'learning'->k) loop
    if jsonb_typeof(x) is distinct from 'object' or coalesce(x->>'id','') !~ '^[A-Za-z0-9_-]{1,100}$' then return false; end if;
    if k<>'timeEdits' and (jsonb_typeof(x->'body') is distinct from 'string' or octet_length(x->>'body')>65536 or length(coalesce(x->>'title','')) not between 1 and 160 or coalesce(x->>'format','') not in ('md','txt')) then return false; end if;
   end loop;
  end loop;
 end if;
 return true;
exception when others then return false;
end;
$$;
revoke all on function ruang_private.workspace_shape(jsonb) from public,anon;
grant execute on function ruang_private.workspace_shape(jsonb) to authenticated;
-- JSONB separator spaces need headroom over the API's 3 MiB canonical budget.
-- NOT VALID preserves legacy rows while enforcing constraints on future writes.
do $$ begin
 if not exists(select from pg_constraint where conname='ruang_workspace_budget' and conrelid='public.ruang_workspaces'::regclass) then
  alter table public.ruang_workspaces add constraint ruang_workspace_budget check(octet_length(data::text)<=4194304) not valid;
 end if;
 if not exists(select from pg_constraint where conname='ruang_workspace_shape' and conrelid='public.ruang_workspaces'::regclass) then
  alter table public.ruang_workspaces add constraint ruang_workspace_shape check(ruang_private.workspace_shape(data)) not valid;
 end if;
end $$;
create or replace function ruang_private.save_workspace(p_data jsonb,p_expected_revision bigint,p_expected_user_id uuid)
returns bigint language plpgsql security definer set search_path='' as $$
declare next_revision bigint; caller uuid:=auth.uid();
begin
 if caller is null then raise exception 'AUTH_REQUIRED'; end if;
 if p_expected_user_id is distinct from caller then raise exception 'ACCOUNT_CHANGED'; end if;
 if p_expected_revision is null or p_expected_revision<0 or p_expected_revision>=9007199254740991 then raise exception 'INVALID_REVISION'; end if;
 if octet_length(p_data::text)>4194304 then raise exception 'CAPACITY'; end if;
 if not ruang_private.workspace_shape(p_data) then raise exception 'INVALID_DATA'; end if;
 if p_expected_revision=0 then
  insert into public.ruang_workspaces(user_id,data,revision) values(caller,p_data,1)
  on conflict(user_id) do nothing returning revision into next_revision;
 else
  update public.ruang_workspaces set data=p_data,revision=revision+1,updated_at=now()
  where user_id=caller and revision=p_expected_revision returning revision into next_revision;
 end if;
 if next_revision is null then raise exception 'CLOUD_CONFLICT'; end if;
 return next_revision;
end;
$$;
revoke all on function ruang_private.save_workspace(jsonb,bigint,uuid) from public,anon;
grant execute on function ruang_private.save_workspace(jsonb,bigint,uuid) to authenticated;
-- The exposed RPC never elevates privileges itself.
create or replace function public.save_ruang_workspace(p_data jsonb,p_expected_revision bigint,p_expected_user_id uuid)
returns bigint language sql security invoker set search_path='' as $$
 select ruang_private.save_workspace(p_data,p_expected_revision,p_expected_user_id);
$$;
revoke all on function public.save_ruang_workspace(jsonb,bigint,uuid) from public,anon;
grant execute on function public.save_ruang_workspace(jsonb,bigint,uuid) to authenticated;
commit;
