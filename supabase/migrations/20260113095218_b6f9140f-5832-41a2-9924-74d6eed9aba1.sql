-- 1. DROP existing problematic table and policies to start clean
DROP TABLE IF EXISTS public.worker_auth;
DROP TABLE IF EXISTS public.workers CASCADE;

-- 2. Create workers table (Now using auth.users.id as the Primary Key)
CREATE TABLE public.workers (
  -- Link directly to auth.users just like your profiles table
  id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE PRIMARY KEY,
  name TEXT NOT NULL,
  age INTEGER,
  gender TEXT,
  phone TEXT NOT NULL,
  email TEXT, -- Added for the Profile Page requirement
  has_whatsapp BOOLEAN DEFAULT true,
  work_type TEXT, 
  years_experience INTEGER DEFAULT 0,
  languages_spoken TEXT[] DEFAULT '{}',
  preferred_areas TEXT[] DEFAULT '{}',
  working_hours TEXT DEFAULT 'full_day',
  id_proof_url TEXT,
  avatar_url TEXT, -- For the profile picture
  residential_address TEXT,
  notes TEXT,
  status TEXT DEFAULT 'pending_verification', 
  verification_notes TEXT,
  verified_at TIMESTAMP WITH TIME ZONE,
  verified_by UUID,
  match_score INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- 3. Enable RLS
ALTER TABLE public.workers ENABLE ROW LEVEL SECURITY;

-- 4. Create Clean RLS Policies (No recursion)
-- Policy: Allow users to insert their own worker profile
CREATE POLICY "Users can insert own worker profile"
ON public.workers
FOR INSERT
WITH CHECK (auth.uid() = id);

-- Policy: Allow users to update only their own worker profile
CREATE POLICY "Users can update own worker profile"
ON public.workers
FOR UPDATE
USING (auth.uid() = id);

-- Policy: Allow users to view their own worker profile
CREATE POLICY "Users can view own worker profile"
ON public.workers
FOR SELECT
USING (auth.uid() = id);

-- Policy: Allow authenticated owners to see verified workers for matching
CREATE POLICY "Owners can view verified workers"
ON public.workers
FOR SELECT
USING (status = 'verified');

-- 5. Storage bucket setup for Documents
-- Note: Ensure 'worker-documents' bucket exists in your Supabase Dashboard
-- Policies for the bucket:
CREATE POLICY "Workers can upload their own docs"
ON storage.objects FOR INSERT
WITH CHECK (bucket_id = 'worker-documents' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Workers can view their own docs"
ON storage.objects FOR SELECT
USING (bucket_id = 'worker-documents' AND auth.uid()::text = (storage.foldername(name))[1]);

-- 6. Re-apply the timestamp trigger
CREATE TRIGGER update_workers_updated_at
BEFORE UPDATE ON public.workers
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();