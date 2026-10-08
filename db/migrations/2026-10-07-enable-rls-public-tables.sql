-- 2026-10-07 — Security fix: enable Row Level Security on 9 public tables
--
-- Supabase Security Advisor flagged these tables as "Table publicly accessible"
-- (rls_disabled_in_public): they already had correct policies (tutors can only
-- touch their own rows via auth.uid(), admins via is_admin()), but RLS itself
-- was disabled, so every policy was ignored and the anon key could read, edit
-- and delete all data.
--
-- This migration simply turns RLS on; the existing policies are then enforced.
-- Verified afterwards:
--   * anon      -> can only read active rows of `programs`, nothing else
--   * tutor     -> reads/inserts only own rows; cannot touch another tutor's row
--   * student   -> sees none of the curation/assessment data
--   * admin     -> still sees every row (is_admin())
--
-- No application code changes were required: all writers use the session-aware
-- client (lib/auth) or the service-role client in server routes.

alter table public.programs               enable row level security;
alter table public.academic_assessments   enable row level security;
alter table public.ai_interview_assessments enable row level security;
alter table public.curation_results       enable row level security;
alter table public.psychology_assessments enable row level security;
alter table public.handwriting_assessments enable row level security;
alter table public.microteaching_assessments enable row level security;
alter table public.tutor_applications     enable row level security;
alter table public.curation_progress      enable row level security;
