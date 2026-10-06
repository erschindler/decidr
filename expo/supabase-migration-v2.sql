-- ============================================================================
-- DECIDR — Feature Migration v2 (idempotent, safe to re-run)
-- Adds: share tracking, saved debates, notifications, admin-protected
-- app_settings. Does NOT modify existing debate/vote/AI logic.
-- Run in Supabase Dashboard > SQL Editor > New Query > Paste > Run
-- ============================================================================

-- ============================================================
-- STEP 1: Ensure required columns exist (no-ops if present)
-- ============================================================
ALTER TABLE public.decisions ADD COLUMN IF NOT EXISTS share_count INTEGER NOT NULL DEFAULT 0;
ALTER TABLE public.profiles  ADD COLUMN IF NOT EXISTS is_admin BOOLEAN NOT NULL DEFAULT false;

CREATE INDEX IF NOT EXISTS idx_decisions_share_count ON public.decisions(share_count DESC);
CREATE INDEX IF NOT EXISTS idx_decisions_updated_at ON public.decisions(updated_at DESC);

-- ============================================================
-- STEP 2: Helper — secure admin check (used by RLS)
-- ============================================================
CREATE OR REPLACE FUNCTION public.is_decidr_admin()
RETURNS BOOLEAN
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
STABLE
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = auth.uid() AND is_admin = true
  );
$$;

-- ============================================================
-- STEP 3: APP SETTINGS — stored in DB, writable only by admins
-- Default: ads ENABLED = OFF (missing row => treated as OFF)
-- ============================================================
CREATE TABLE IF NOT EXISTS public.app_settings (
  key TEXT PRIMARY KEY,
  value JSONB NOT NULL DEFAULT '{}'::jsonb,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.app_settings ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "app_settings_select_authenticated" ON public.app_settings;
CREATE POLICY "app_settings_select_authenticated"
  ON public.app_settings FOR SELECT
  TO authenticated
  USING (true);

DROP POLICY IF EXISTS "app_settings_write_admin_only" ON public.app_settings;
CREATE POLICY "app_settings_write_admin_only"
  ON public.app_settings FOR INSERT
  TO authenticated
  WITH CHECK (public.is_decidr_admin());

DROP POLICY IF EXISTS "app_settings_update_admin_only" ON public.app_settings;
CREATE POLICY "app_settings_update_admin_only"
  ON public.app_settings FOR UPDATE
  TO authenticated
  USING (public.is_decidr_admin())
  WITH CHECK (public.is_decidr_admin());

DROP POLICY IF EXISTS "app_settings_delete_admin_only" ON public.app_settings;
CREATE POLICY "app_settings_delete_admin_only"
  ON public.app_settings FOR DELETE
  TO authenticated
  USING (public.is_decidr_admin());

-- Seed default settings row if missing (adsEnabled defaults to false = OFF)
INSERT INTO public.app_settings (key, value)
VALUES (
  'admin_settings',
  '{"adsEnabled": false, "debateTopicCharLimit": 500, "argumentCharLimit": 500, "debateTimeframeDays": 7, "moderationEnabled": true}'::jsonb
)
ON CONFLICT (key) DO NOTHING;

-- ============================================================
-- STEP 4: DECISION SHARES — share-event tracking
-- One row per user/decision/method (no inflation from repeats)
-- ============================================================
CREATE TABLE IF NOT EXISTS public.decision_shares (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  decision_id UUID NOT NULL REFERENCES public.decisions(id) ON DELETE CASCADE,
  method TEXT NOT NULL DEFAULT 'other',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (user_id, decision_id, method)
);

ALTER TABLE public.decision_shares ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "shares_select_authenticated" ON public.decision_shares;
CREATE POLICY "shares_select_authenticated"
  ON public.decision_shares FOR SELECT
  TO authenticated
  USING (true);

DROP POLICY IF EXISTS "shares_insert_own" ON public.decision_shares;
CREATE POLICY "shares_insert_own"
  ON public.decision_shares FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE INDEX IF NOT EXISTS idx_shares_decision ON public.decision_shares(decision_id);
CREATE INDEX IF NOT EXISTS idx_shares_user ON public.decision_shares(user_id);
CREATE INDEX IF NOT EXISTS idx_shares_created ON public.decision_shares(created_at DESC);

-- Keep a denormalized share_count on decisions for fast sorting
DROP TRIGGER IF EXISTS on_share_created ON public.decision_shares;
CREATE OR REPLACE FUNCTION public.handle_new_share()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE public.decisions
  SET share_count = share_count + 1
  WHERE id = NEW.decision_id;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_share_created
  AFTER INSERT ON public.decision_shares
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_share();

-- ============================================================
-- STEP 5: SAVED DEBATES — one save per user per debate
-- ============================================================
CREATE TABLE IF NOT EXISTS public.saved_debates (
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  decision_id UUID NOT NULL REFERENCES public.decisions(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (user_id, decision_id)
);

ALTER TABLE public.saved_debates ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "saved_select_own" ON public.saved_debates;
CREATE POLICY "saved_select_own"
  ON public.saved_debates FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "saved_insert_own" ON public.saved_debates;
CREATE POLICY "saved_insert_own"
  ON public.saved_debates FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "saved_delete_own" ON public.saved_debates;
CREATE POLICY "saved_delete_own"
  ON public.saved_debates FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);

CREATE INDEX IF NOT EXISTS idx_saved_user ON public.saved_debates(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_saved_decision ON public.saved_debates(decision_id);

-- ============================================================
-- STEP 6: NOTIFICATIONS — lightweight in-app notifications
-- Rows are created by SECURITY DEFINER triggers only, so no
-- client INSERT policy exists (users cannot forge notifications)
-- ============================================================
CREATE TABLE IF NOT EXISTS public.notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  actor_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  type TEXT NOT NULL,
  title TEXT NOT NULL,
  body TEXT,
  decision_id UUID REFERENCES public.decisions(id) ON DELETE CASCADE,
  is_read BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "notifications_select_own" ON public.notifications;
CREATE POLICY "notifications_select_own"
  ON public.notifications FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "notifications_update_own" ON public.notifications;
CREATE POLICY "notifications_update_own"
  ON public.notifications FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "notifications_delete_own" ON public.notifications;
CREATE POLICY "notifications_delete_own"
  ON public.notifications FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);

CREATE INDEX IF NOT EXISTS idx_notifications_user ON public.notifications(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_notifications_unread ON public.notifications(user_id) WHERE is_read = false;

-- 6a: Friend request received -> notify recipient
CREATE OR REPLACE FUNCTION public.notify_friend_request()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.status = 'pending' AND NEW.requester_id <> NEW.recipient_id THEN
    INSERT INTO public.notifications (user_id, actor_id, type, title, body)
    VALUES (
      NEW.recipient_id,
      NEW.requester_id,
      'friend_request',
      'New friend request',
      COALESCE(NEW.requester_name, 'Someone') || ' sent you a friend request'
    );
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_friendship_insert_notify ON public.friendships;
CREATE TRIGGER on_friendship_insert_notify
  AFTER INSERT ON public.friendships
  FOR EACH ROW
  EXECUTE FUNCTION public.notify_friend_request();

-- 6b: Friend request accepted -> notify the original requester
CREATE OR REPLACE FUNCTION public.notify_friend_accepted()
RETURNS TRIGGER AS $$
BEGIN
  IF OLD.status = 'pending' AND NEW.status = 'accepted' AND NEW.requester_id <> NEW.recipient_id THEN
    INSERT INTO public.notifications (user_id, actor_id, type, title, body)
    VALUES (
      NEW.requester_id,
      NEW.recipient_id,
      'friend_accepted',
      'Friend request accepted',
      COALESCE(NEW.recipient_name, 'Someone') || ' accepted your friend request'
    );
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_friendship_accept_notify ON public.friendships;
CREATE TRIGGER on_friendship_accept_notify
  AFTER UPDATE OF status ON public.friendships
  FOR EACH ROW
  EXECUTE FUNCTION public.notify_friend_accepted();

-- 6c: Share -> notify the debate creator (deduped per sharer per debate)
CREATE OR REPLACE FUNCTION public.notify_share()
RETURNS TRIGGER AS $$
DECLARE
  creator_id UUID;
BEGIN
  SELECT created_by INTO creator_id FROM public.decisions WHERE id = NEW.decision_id;
  IF creator_id IS NOT NULL AND creator_id <> NEW.user_id
     AND NOT EXISTS (
       SELECT 1 FROM public.notifications
       WHERE type = 'share'
         AND decision_id = NEW.decision_id
         AND actor_id = NEW.user_id
     ) THEN
    INSERT INTO public.notifications (user_id, actor_id, type, title, body, decision_id)
    VALUES (
      creator_id,
      NEW.user_id,
      'share',
      'Your debate was shared',
      (SELECT display_name FROM public.profiles WHERE id = NEW.user_id) || ' shared your debate',
      NEW.decision_id
    );
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_share_notify ON public.decision_shares;
CREATE TRIGGER on_share_notify
  AFTER INSERT ON public.decision_shares
  FOR EACH ROW
  EXECUTE FUNCTION public.notify_share();

-- 6d: Vote milestones -> notify debate creator
-- Runs LAST (name sorts after the existing on_vote_created counter trigger)
CREATE OR REPLACE FUNCTION public.notify_vote_milestone()
RETURNS TRIGGER AS $$
DECLARE
  new_total INTEGER;
  creator_id UUID;
BEGIN
  SELECT d.total_votes, d.created_by INTO new_total, creator_id
  FROM public.decisions d
  WHERE d.id = NEW.decision_id;

  IF creator_id IS NOT NULL AND creator_id <> NEW.user_id
     AND new_total IN (5, 10, 25, 50, 100, 250, 500, 1000, 2500, 5000, 10000) THEN
    INSERT INTO public.notifications (user_id, actor_id, type, title, body, decision_id)
    VALUES (
      creator_id,
      NEW.user_id,
      'vote_milestone',
      'Vote milestone reached',
      'Your debate hit ' || new_total || ' votes!',
      NEW.decision_id
    );
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS zz_notify_vote_milestone ON public.user_votes;
CREATE TRIGGER zz_notify_vote_milestone
  AFTER INSERT ON public.user_votes
  FOR EACH ROW
  EXECUTE FUNCTION public.notify_vote_milestone();

-- ============================================================
-- STEP 7: REALTIME — add new tables to the realtime publication
-- ============================================================
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime' AND tablename = 'notifications'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.notifications;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime' AND tablename = 'decision_shares'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.decision_shares;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime' AND tablename = 'saved_debates'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.saved_debates;
  END IF;
END $$;

-- ============================================================
-- STEP 8: PROMOTE YOURSELF TO ADMIN (run once, then delete row)
-- Replace the email below with YOUR Supabase account email:
-- UPDATE public.profiles SET is_admin = true
-- WHERE id = (SELECT id FROM auth.users WHERE email = 'you@example.com');
-- ============================================================

-- ============================================================
-- SOCIAL SHARE PREVIEW METADATA (OG tags)
-- The debate URLs shared by the app are https://thedecidr.app/debate/<id>
-- If/when a web landing page is served for that path, use meta like:
--   <title>DECIDR — <Debate Topic></title>
--   <meta property="og:title" content="DECIDR — <Debate Topic>">
--   <meta property="og:description" content="Choose your side and see what the AI Judge thinks.">
--   <meta property="og:url" content="https://thedecidr.app/debate/<id>">
--   <meta property="og:image" content="<1200x630 app creative>">
--   <meta name="twitter:card" content="summary_large_image">
-- NEVER put the AI verdict/reasoning in these tags (vote-before-reveal).
-- ============================================================

-- DONE. Existing debate, AI Judge, and vote flow are untouched.
