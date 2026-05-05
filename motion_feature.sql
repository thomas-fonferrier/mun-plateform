-- Adds proposal workflow fields for motions.
-- Run this once on your Supabase database.

alter table public.motions
  add column if not exists motion_type text,
  add column if not exists proposer_participant_id uuid references public.participants(id) on delete set null,
  add column if not exists proposer_country_code text,
  add column if not exists proposer_country_name text;

do $$
declare
  existing_constraint text;
begin
  for existing_constraint in
    select conname
    from pg_constraint
    where conrelid = 'public.motions'::regclass
      and contype = 'c'
      and pg_get_constraintdef(oid) ilike '%status%'
  loop
    execute format('alter table public.motions drop constraint %I', existing_constraint);
  end loop;

  alter table public.motions
    add constraint motions_status_check
    check (status in ('proposed', 'voting', 'passed', 'failed', 'withdrawn', 'ignored'));
end $$;
