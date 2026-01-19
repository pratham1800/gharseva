-- Drop the existing restrictive INSERT policy
DROP POLICY IF EXISTS "Authenticated users can create workers" ON public.workers;

-- Create a proper permissive INSERT policy for authenticated users
CREATE POLICY "Authenticated users can create workers"
ON public.workers
FOR INSERT
TO authenticated
WITH CHECK (auth.uid() IS NOT NULL);