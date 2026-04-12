-- ============================================================
-- DECIDR — Complete Supabase SQL Schema
-- Copy and paste this ENTIRE script into the Supabase SQL Editor
-- (Dashboard > SQL Editor > New Query > Paste > Run)
-- ============================================================

-- ============================================================
-- STEP 0: Clean up any previous runs (safe to re-run)
-- ============================================================
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
DROP TRIGGER IF EXISTS on_vote_created ON public.user_votes;
DROP TRIGGER IF EXISTS on_decision_created ON public.decisions;
DROP TRIGGER IF EXISTS set_updated_at_profiles ON public.profiles;
DROP TRIGGER IF EXISTS set_updated_at_decisions ON public.decisions;

DROP FUNCTION IF EXISTS public.handle_new_user() CASCADE;
DROP FUNCTION IF EXISTS public.handle_new_vote() CASCADE;
DROP FUNCTION IF EXISTS public.handle_new_decision() CASCADE;
DROP FUNCTION IF EXISTS public.update_updated_at() CASCADE;

DROP TABLE IF EXISTS public.reports CASCADE;
DROP TABLE IF EXISTS public.user_votes CASCADE;
DROP TABLE IF EXISTS public.decisions CASCADE;
DROP TABLE IF EXISTS public.profiles CASCADE;

-- ============================================================
-- STEP 1: PROFILES TABLE
-- Auto-created when a user signs up via auth trigger
-- ============================================================
CREATE TABLE public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  display_name TEXT NOT NULL DEFAULT 'User',
  avatar_url TEXT,
  decisions_created INTEGER NOT NULL DEFAULT 0,
  votes_cast INTEGER NOT NULL DEFAULT 0,
  ai_alignment_rate INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "profiles_select_all"
  ON public.profiles FOR SELECT
  USING (true);

CREATE POLICY "profiles_insert_own"
  ON public.profiles FOR INSERT
  WITH CHECK (auth.uid() = id);

CREATE POLICY "profiles_update_own"
  ON public.profiles FOR UPDATE
  USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);

-- ============================================================
-- STEP 2: AUTO-CREATE PROFILE ON SIGNUP
-- ============================================================
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, display_name, avatar_url)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data ->> 'display_name', 'User'),
    'https://api.dicebear.com/7.x/initials/png?seed=' ||
      COALESCE(NEW.raw_user_meta_data ->> 'display_name', 'U') ||
      '&backgroundColor=FF6B6B'
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user();

-- ============================================================
-- STEP 3: DECISIONS TABLE
-- ============================================================
CREATE TABLE public.decisions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  category TEXT NOT NULL DEFAULT 'random',
  side_a JSONB,
  side_b JSONB,
  votes_a INTEGER NOT NULL DEFAULT 0,
  votes_b INTEGER NOT NULL DEFAULT 0,
  total_votes INTEGER NOT NULL DEFAULT 0,
  created_by UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  justifications JSONB NOT NULL DEFAULT '[]'::jsonb,
  ai_judgment JSONB,
  ai_pending BOOLEAN NOT NULL DEFAULT false,
  status TEXT NOT NULL DEFAULT 'active',
  submission_mode TEXT NOT NULL DEFAULT 'full',
  side_a_contributor UUID REFERENCES public.profiles(id),
  side_b_contributor UUID REFERENCES public.profiles(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.decisions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "decisions_select_authenticated"
  ON public.decisions FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "decisions_insert_authenticated"
  ON public.decisions FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = created_by);

CREATE POLICY "decisions_update_owner_or_open"
  ON public.decisions FOR UPDATE
  TO authenticated
  USING (
    auth.uid() = created_by
    OR status IN ('open_topic', 'open_one_side')
  )
  WITH CHECK (true);

CREATE POLICY "decisions_delete_owner"
  ON public.decisions FOR DELETE
  TO authenticated
  USING (auth.uid() = created_by);

-- ============================================================
-- STEP 4: USER_VOTES TABLE
-- One vote per user per decision, votes are final
-- ============================================================
CREATE TABLE public.user_votes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  decision_id UUID NOT NULL REFERENCES public.decisions(id) ON DELETE CASCADE,
  side TEXT NOT NULL CHECK (side IN ('a', 'b')),
  justification TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(user_id, decision_id)
);

ALTER TABLE public.user_votes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "votes_select_authenticated"
  ON public.user_votes FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "votes_insert_own"
  ON public.user_votes FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

-- ============================================================
-- STEP 5: REPORTS TABLE (moderation / App Store compliance)
-- ============================================================
CREATE TABLE public.reports (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  reporter_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  decision_id UUID REFERENCES public.decisions(id) ON DELETE CASCADE,
  reason TEXT NOT NULL,
  details TEXT,
  status TEXT NOT NULL DEFAULT 'pending',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.reports ENABLE ROW LEVEL SECURITY;

CREATE POLICY "reports_insert_own"
  ON public.reports FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = reporter_id);

CREATE POLICY "reports_select_own"
  ON public.reports FOR SELECT
  TO authenticated
  USING (auth.uid() = reporter_id);

-- ============================================================
-- STEP 6: TRIGGERS — Auto-increment counters & justifications
-- ============================================================

-- 6a: When a vote is inserted, update decision vote counts + profile stats
CREATE OR REPLACE FUNCTION public.handle_new_vote()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.side = 'a' THEN
    UPDATE public.decisions
    SET votes_a = votes_a + 1,
        total_votes = total_votes + 1,
        updated_at = now()
    WHERE id = NEW.decision_id;
  ELSE
    UPDATE public.decisions
    SET votes_b = votes_b + 1,
        total_votes = total_votes + 1,
        updated_at = now()
    WHERE id = NEW.decision_id;
  END IF;

  UPDATE public.profiles
  SET votes_cast = votes_cast + 1,
      updated_at = now()
  WHERE id = NEW.user_id;

  IF NEW.justification IS NOT NULL AND NEW.justification != '' THEN
    UPDATE public.decisions
    SET justifications = justifications || jsonb_build_array(jsonb_build_object(
      'id', gen_random_uuid()::text,
      'userId', NEW.user_id::text,
      'userName', (SELECT display_name FROM public.profiles WHERE id = NEW.user_id),
      'side', NEW.side,
      'text', NEW.justification,
      'createdAt', now()::text
    ))
    WHERE id = NEW.decision_id;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_vote_created
  AFTER INSERT ON public.user_votes
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_vote();

-- 6b: When a decision is created, increment profile decisions_created
CREATE OR REPLACE FUNCTION public.handle_new_decision()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE public.profiles
  SET decisions_created = decisions_created + 1,
      updated_at = now()
  WHERE id = NEW.created_by;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_decision_created
  AFTER INSERT ON public.decisions
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_decision();

-- 6c: Auto-update updated_at on any row modification
CREATE OR REPLACE FUNCTION public.update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER set_updated_at_profiles
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at();

CREATE TRIGGER set_updated_at_decisions
  BEFORE UPDATE ON public.decisions
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at();

-- ============================================================
-- STEP 7: INDEXES for query performance
-- ============================================================
CREATE INDEX IF NOT EXISTS idx_decisions_created_by ON public.decisions(created_by);
CREATE INDEX IF NOT EXISTS idx_decisions_status ON public.decisions(status);
CREATE INDEX IF NOT EXISTS idx_decisions_category ON public.decisions(category);
CREATE INDEX IF NOT EXISTS idx_decisions_created_at ON public.decisions(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_decisions_total_votes ON public.decisions(total_votes DESC);
CREATE INDEX IF NOT EXISTS idx_user_votes_user_id ON public.user_votes(user_id);
CREATE INDEX IF NOT EXISTS idx_user_votes_decision_id ON public.user_votes(decision_id);
CREATE INDEX IF NOT EXISTS idx_user_votes_unique ON public.user_votes(user_id, decision_id);
CREATE INDEX IF NOT EXISTS idx_reports_decision_id ON public.reports(decision_id);
CREATE INDEX IF NOT EXISTS idx_reports_reporter ON public.reports(reporter_id);

-- ============================================================
-- STEP 8: REALTIME — Enable live updates for votes and decisions
-- ============================================================
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime' AND tablename = 'decisions'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.decisions;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime' AND tablename = 'user_votes'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.user_votes;
  END IF;
END $$;

-- ============================================================
-- DONE! Your Supabase backend for Decidr is fully configured.
--
-- NEXT STEPS:
-- 1. Go to Authentication > Settings in Supabase Dashboard
-- 2. Enable Email/Password sign-up (already on by default)
-- 3. Optionally enable Google, Apple, or X OAuth providers
-- 4. Your app will auto-connect using the system-provided
--    EXPO_PUBLIC_SUPABASE_URL and EXPO_PUBLIC_SUPABASE_ANON_KEY
-- ============================================================
