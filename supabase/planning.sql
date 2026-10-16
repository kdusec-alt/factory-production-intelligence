-- Independent planning/settings storage. Production and IE tables are untouched.
create table public.factory_ie_management (
 record_key text primary key,
 payload jsonb not null check(jsonb_typeof(payload)='object'),
 revision integer not null default 1 check(revision>0),
 updated_at timestamptz not null default now()
);
create table public.factory_ie_management_audit (
 id bigint generated always as identity primary key,
 record_key text not null,
 previous_record jsonb,
 current_record jsonb not null,
 changed_at timestamptz not null default now()
);
alter table public.factory_ie_management enable row level security;
alter table public.factory_ie_management_audit enable row level security;
revoke all on public.factory_ie_management,public.factory_ie_management_audit from public,anon,authenticated;
revoke all on sequence public.factory_ie_management_audit_id_seq from public,anon,authenticated;
grant select,insert,update on public.factory_ie_management to service_role;
grant select,insert on public.factory_ie_management_audit to service_role;
grant usage,select on sequence public.factory_ie_management_audit_id_seq to service_role;
create function public.save_factory_ie_management(p_key text,p_payload jsonb,p_expected_revision integer)
returns public.factory_ie_management language plpgsql security invoker set search_path=public,pg_temp as $$
declare old public.factory_ie_management; saved public.factory_ie_management;
begin
 if length(p_key)>60 or jsonb_typeof(p_payload)<>'object' or length(p_payload::text)>30000 then raise exception 'INVALID_PLANNING_DATA';end if;
 perform pg_advisory_xact_lock(hashtextextended('ie-management|'||p_key,2026));
 select * into old from public.factory_ie_management where record_key=p_key for update;
 if found then
  if p_expected_revision is distinct from old.revision then raise exception 'PLANNING_REVISION_CONFLICT';end if;
  update public.factory_ie_management set payload=p_payload,revision=old.revision+1,updated_at=now() where record_key=p_key returning * into saved;
 else
  if coalesce(p_expected_revision,0)<>0 then raise exception 'PLANNING_REVISION_CONFLICT';end if;
  insert into public.factory_ie_management(record_key,payload) values(p_key,p_payload) returning * into saved;
 end if;
 insert into public.factory_ie_management_audit(record_key,previous_record,current_record) values(p_key,case when old.record_key is not null then to_jsonb(old) else null end,to_jsonb(saved));
 return saved;
end;
$$;
revoke all on function public.save_factory_ie_management(text,jsonb,integer) from public,anon,authenticated;
grant execute on function public.save_factory_ie_management(text,jsonb,integer) to service_role;
