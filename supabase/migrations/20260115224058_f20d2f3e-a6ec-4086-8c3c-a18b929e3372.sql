-- Fix infinite recursion between workers/bookings RLS by removing workers-table references inside bookings policies

-- 1) Helper to get current user's worker_id without joining workers
create or replace function public.current_worker_id()
returns uuid
language sql
stable
security definer
set search_path = public
as $$
  select wa.worker_id
  from public.worker_auth wa
  where wa.user_id = auth.uid()
  limit 1
$$;

-- 2) Replace the bookings SELECT policy for workers (it previously joined workers and caused recursion)
drop policy if exists "Workers can view their assigned bookings" on public.bookings;

create policy "Workers can view their assigned bookings"
on public.bookings
for select
to authenticated
using (
  bookings.assigned_worker_id is not null
  and bookings.assigned_worker_id = public.current_worker_id()
);
