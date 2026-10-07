-- 2026-10-07 — Security hardening: SECURITY DEFINER wallet functions
--
-- The wallet mutation RPCs were executable by PUBLIC (i.e. anon + authenticated)
-- and had a mutable search_path:
--
--     wallet_deduct(p_student_id uuid, p_amount numeric)
--     wallet_credit_tutor(p_tutor_id uuid, p_amount numeric)
--     wallet_credit_platform(p_amount numeric)
--
-- Because they are SECURITY DEFINER, any visitor holding the public anon key
-- could call e.g. POST /rest/v1/rpc/wallet_deduct with an arbitrary student id
-- and amount and bypass RLS entirely — a direct money-handling hole.
--
-- The only caller (lib/auto-complete.tsx → autoCompleteExpiredSessions) runs
-- server-side with the service-role key, so EXECUTE is now limited to
-- service_role and the search_path is pinned.
--
-- is_admin() is intentionally left executable by anon/authenticated: it is used
-- inside RLS policies, reads only, and mutates nothing.

alter function public.wallet_deduct(uuid, numeric)          set search_path = public, pg_temp;
alter function public.wallet_credit_tutor(uuid, numeric)    set search_path = public, pg_temp;
alter function public.wallet_credit_platform(numeric)       set search_path = public, pg_temp;

revoke execute on function public.wallet_deduct(uuid, numeric)       from public, anon, authenticated;
revoke execute on function public.wallet_credit_tutor(uuid, numeric) from public, anon, authenticated;
revoke execute on function public.wallet_credit_platform(numeric)    from public, anon, authenticated;

grant execute on function public.wallet_deduct(uuid, numeric)        to service_role;
grant execute on function public.wallet_credit_tutor(uuid, numeric)  to service_role;
grant execute on function public.wallet_credit_platform(numeric)     to service_role;
