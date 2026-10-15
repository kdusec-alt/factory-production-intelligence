-- Factory Production Intelligence V1.6 - Supabase PostgreSQL
-- Run once in Supabase SQL Editor. All table reads/writes are blocked for anon/authenticated.
-- Only the Edge Function, with service-role credentials and staff/admin link secret, may access records.
create extension if not exists pgcrypto;

create table if not exists public.production_entries (
  id uuid primary key default gen_random_uuid(),
  production_date date not null,
  factory text not null check (factory in ('A','B','C','D')),
  line text not null check (line ~ '^[A-D]0[1-7]$'),
  process text not null check (process in ('gc','asm')),
  operator_name text not null check (char_length(operator_name) between 2 and 80),
  output_total integer not null check (output_total between 0 and 20000),
  normal_hc integer not null check (normal_hc between 1 and 1000),
  normal_hours numeric(5,2) not null check (normal_hours between 0.5 and 16),
  ot_output integer check (ot_output between 0 and 20000),
  ot_hc integer check (ot_hc between 1 and 1000),
  ot_hours numeric(5,2) check (ot_hours between 0 and 16),
  no_ot boolean not null default false,
  models jsonb not null default '[]'::jsonb check (jsonb_typeof(models)='array'),
  notes text not null default '' check (char_length(notes)<=500),
  revision integer not null default 1 check (revision>=1),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint unique_line_daily unique (production_date, factory, line, process),
  constraint line_matches_factory check (left(line,1)=factory and (factory<>'D' or line<>'D07')),
  constraint ot_consistency check (
    (no_ot and ot_output=0 and ot_hc is null and ot_hours=0)
    or (not no_ot and ((ot_output is null and ot_hc is null and ot_hours is null)
      or (ot_output is not null and ot_hc is not null and ot_hours>0 and ot_output<=output_total)))
  )
);

create table if not exists public.production_entry_audit (
  id bigint generated always as identity primary key,
  entry_id uuid not null references public.production_entries(id) on delete restrict,
  event text not null check (event in ('created','updated')),
  operator_name text not null,
  previous_record jsonb,
  current_record jsonb not null,
  saved_at timestamptz not null default now()
);

create index if not exists production_entries_date_idx on public.production_entries(production_date desc, factory, line);
create index if not exists production_audit_entry_idx on public.production_entry_audit(entry_id,saved_at desc);

alter table public.production_entries enable row level security;
alter table public.production_entry_audit enable row level security;
revoke all on table public.production_entries from anon, authenticated;
revoke all on table public.production_entry_audit from anon, authenticated;
revoke all on sequence public.production_entry_audit_id_seq from anon, authenticated;

-- Atomic upsert + audit, with revision checks to prevent concurrent overwrites.
create or replace function public.save_factory_entry(p_record jsonb, p_expected_revision integer default null)
returns public.production_entries
language plpgsql security definer set search_path=public
as $$
declare
  current_row public.production_entries%rowtype;
  saved_row public.production_entries%rowtype;
  is_update boolean := false;
  p_date date := (p_record->>'production_date')::date;
  p_factory text := p_record->>'factory';
  p_line text := p_record->>'line';
  p_process text := p_record->>'process';
begin
  -- Lock the logical record key, including the first insert, to avoid races.
  perform pg_advisory_xact_lock(hashtextextended(p_date::text||'|'||p_factory||'|'||p_line||'|'||p_process, 2026));
  select * into current_row from public.production_entries
   where production_date=p_date and factory=p_factory and line=p_line and process=p_process
   for update;
  if found then
    if p_expected_revision is null or p_expected_revision <> current_row.revision then
      raise exception 'REVISION_CONFLICT:%',current_row.revision using errcode='P0001';
    end if;
    is_update := true;
    update public.production_entries set
      operator_name=p_record->>'operator_name',
      output_total=(p_record->>'output_total')::integer,
      normal_hc=(p_record->>'normal_hc')::integer,
      normal_hours=(p_record->>'normal_hours')::numeric,
      ot_output=(p_record->>'ot_output')::integer,
      ot_hc=(p_record->>'ot_hc')::integer,
      ot_hours=(p_record->>'ot_hours')::numeric,
      no_ot=(p_record->>'no_ot')::boolean,
      models=p_record->'models',
      notes=coalesce(p_record->>'notes',''),
      revision=current_row.revision+1,
      updated_at=now()
      where id=current_row.id
      returning * into saved_row;
  else
    if p_expected_revision is not null then
      raise exception 'REVISION_CONFLICT:0' using errcode='P0001';
    end if;
    insert into public.production_entries (
      production_date,factory,line,process,operator_name,output_total,normal_hc,normal_hours,
      ot_output,ot_hc,ot_hours,no_ot,models,notes
    ) values (
      p_date,p_factory,p_line,p_process,p_record->>'operator_name',
      (p_record->>'output_total')::integer,(p_record->>'normal_hc')::integer,(p_record->>'normal_hours')::numeric,
      (p_record->>'ot_output')::integer,(p_record->>'ot_hc')::integer,(p_record->>'ot_hours')::numeric,
      (p_record->>'no_ot')::boolean,p_record->'models',coalesce(p_record->>'notes','')
    ) returning * into saved_row;
  end if;
  insert into public.production_entry_audit(entry_id,event,operator_name,previous_record,current_record)
   values(saved_row.id,case when is_update then 'updated' else 'created' end,
     saved_row.operator_name,case when is_update then to_jsonb(current_row) else null end,to_jsonb(saved_row));
  return saved_row;
end;
$$;
revoke all on function public.save_factory_entry(jsonb,integer) from public, anon, authenticated;
grant execute on function public.save_factory_entry(jsonb,integer) to service_role;

-- Hashed private access keys; no plaintext keys in public source.
create table if not exists public.factory_link_credentials(
 key_hash text primary key check(key_hash ~ '^[0-9a-f]{64}$'),
 role text not null check(role in ('staff','admin')),
 active boolean not null default true,
 created_at timestamptz not null default now()
);
alter table public.factory_link_credentials enable row level security;
revoke all on public.factory_link_credentials from public,anon,authenticated;
grant select on public.factory_link_credentials to service_role;

-- V1.7: NBY is the only factory. Legacy column "factory" holds A-D building letters.
alter table public.production_entries add column if not exists plant text not null default 'NBY';
alter table public.production_entries drop constraint if exists production_entries_plant_only_nby;
alter table public.production_entries add constraint production_entries_plant_only_nby check(plant='NBY');
create table if not exists public.historical_process_daily(
 production_date date not null,
 plant text not null default 'NBY' check(plant='NBY'),
 process text not null check(process in ('gc','asm')),
 normal_output integer not null check(normal_output>=0),
 normal_hc integer not null check(normal_hc>0),
 normal_hours numeric(5,2) not null check(normal_hours>0 and normal_hours<=16),
 source_name text not null,
 created_at timestamptz not null default now(),
 primary key(production_date,plant,process)
);
alter table public.historical_process_daily enable row level security;
revoke all on public.historical_process_daily from public,anon,authenticated;
grant select on public.historical_process_daily to service_role;
-- Factory-wide historical source data is private, never commit it into public GitHub.
