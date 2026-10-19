-- Academic curation upgrade: per-subject results, per-level pass, curated specializations.
alter table public.academic_assessments
  add column if not exists subject_results jsonb not null default '[]'::jsonb,
  add column if not exists passed_subjects text[] not null default '{}'::text[],
  add column if not exists failed_subjects text[] not null default '{}'::text[],
  add column if not exists attempt_number integer not null default 1,
  add column if not exists level_passed boolean not null default false;

-- Allow multiple attempts per level (previously one row per tutor+progress).
alter table public.academic_assessments
  drop constraint if exists academic_assessments_tutor_id_curation_progress_id_key;

create index if not exists idx_academic_assessments_tutor_level
  on public.academic_assessments (tutor_id, level_targeted, created_at desc);

alter table public.curation_results
  add column if not exists verified_grade_levels text[] not null default '{}'::text[],
  add column if not exists specializations_sd text[] not null default '{}'::text[],
  add column if not exists specializations_smp text[] not null default '{}'::text[],
  add column if not exists specializations_sma text[] not null default '{}'::text[],
  add column if not exists academic_details jsonb not null default '{}'::jsonb,
  add column if not exists academic_passed_levels text[] not null default '{}'::text[],
  add column if not exists academic_failed_subjects jsonb not null default '{}'::jsonb,
  add column if not exists academic_completed_at timestamptz;

alter table public.matches
  add column if not exists completion_type text
    check (completion_type in ('natural','mutual','unilateral'));

alter table public.match_schedules
  add column if not exists completion_type text
    check (completion_type in ('natural','mutual','unilateral'));

-- Backfill completion type from the existing termination request / completion notification.
update public.match_schedules
set completion_type = case
  when termination_request->>'type' = 'unilateral' then 'unilateral'
  when termination_request->>'type' = 'mutual' and termination_request->>'status' = 'approved' then 'mutual'
  when completion_notification->>'type' = 'natural' then 'natural'
  when status = 'completed' and termination_request is null then 'natural'
  else null
end
where completion_type is null;

update public.matches m
set completion_type = s.completion_type
from public.match_schedules s
where s.match_id = m.id and m.completion_type is null and s.completion_type is not null;

-- Legacy approved tutors: seed curated fields from their declared teaching interests.
insert into public.curation_results
  (tutor_id, curation_progress_id, verified_grade_levels, specializations_sd, specializations_smp, specializations_sma, status)
select
  t.id, cp.id, coalesce(t.verified_grade_levels, '{}'::text[]),
  coalesce(t.specializations_sd, '{}'::text[]),
  coalesce(t.specializations_smp, '{}'::text[]),
  coalesce(t.specializations_sma, '{}'::text[]),
  'pending_review'
from public.tutors t
join public.curation_progress cp on cp.tutor_id = t.id
where t.approval_status in ('approved','active')
on conflict (tutor_id, curation_progress_id) do update set
  verified_grade_levels = excluded.verified_grade_levels,
  specializations_sd = excluded.specializations_sd,
  specializations_smp = excluded.specializations_smp,
  specializations_sma = excluded.specializations_sma,
  updated_at = now();
