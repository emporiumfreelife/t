-- ============================================================================
-- AUTOMATIC FOLLOWER COUNT UPDATES
-- Triggers to maintain accurate follower counts in profiles table
-- ============================================================================

-- ============================================================================
-- 1. Create function to update follower count when connection is added
-- ============================================================================
DROP FUNCTION IF EXISTS public.update_follower_count_on_follow() CASCADE;

CREATE OR REPLACE FUNCTION public.update_follower_count_on_follow()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- When a follow is added, increment the followed person's follower count
  IF TG_OP = 'INSERT' AND NEW.connection_type = 'follow' THEN
    UPDATE public.profiles
    SET followers_count = COALESCE(followers_count, 0) + 1
    WHERE id = NEW.connected_user_id;
    RETURN NEW;
  END IF;

  -- When a follow is deleted, decrement the followed person's follower count
  IF TG_OP = 'DELETE' AND OLD.connection_type = 'follow' THEN
    UPDATE public.profiles
    SET followers_count = GREATEST(0, COALESCE(followers_count, 0) - 1)
    WHERE id = OLD.connected_user_id;
    RETURN OLD;
  END IF;

  RETURN COALESCE(NEW, OLD);
END;
$$;

-- ============================================================================
-- 2. Create trigger on member_connections for follow updates
-- ============================================================================
DROP TRIGGER IF EXISTS trigger_update_follower_count_on_follow ON public.member_connections CASCADE;

CREATE TRIGGER trigger_update_follower_count_on_follow
AFTER INSERT OR DELETE ON public.member_connections
FOR EACH ROW
EXECUTE FUNCTION public.update_follower_count_on_follow();

-- ============================================================================
-- 3. Create function to update following count for the follower
-- ============================================================================
DROP FUNCTION IF EXISTS public.update_following_count_on_follow() CASCADE;

CREATE OR REPLACE FUNCTION public.update_following_count_on_follow()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- When a follow is added, increment the follower's following count
  IF TG_OP = 'INSERT' AND NEW.connection_type = 'follow' THEN
    UPDATE public.profiles
    SET following_count = COALESCE(following_count, 0) + 1
    WHERE id = NEW.member_id;
    RETURN NEW;
  END IF;

  -- When a follow is deleted, decrement the follower's following count
  IF TG_OP = 'DELETE' AND OLD.connection_type = 'follow' THEN
    UPDATE public.profiles
    SET following_count = GREATEST(0, COALESCE(following_count, 0) - 1)
    WHERE id = OLD.member_id;
    RETURN OLD;
  END IF;

  RETURN COALESCE(NEW, OLD);
END;
$$;

-- ============================================================================
-- 4. Create trigger on member_connections for following count updates
-- ============================================================================
DROP TRIGGER IF EXISTS trigger_update_following_count_on_follow ON public.member_connections CASCADE;

CREATE TRIGGER trigger_update_following_count_on_follow
AFTER INSERT OR DELETE ON public.member_connections
FOR EACH ROW
EXECUTE FUNCTION public.update_following_count_on_follow();

-- ============================================================================
-- 5. Recalculate existing follower counts (data cleanup)
-- ============================================================================
-- This updates all existing follower counts based on actual member_connections data

UPDATE public.profiles p
SET followers_count = (
  SELECT COUNT(*)
  FROM public.member_connections mc
  WHERE mc.connected_user_id = p.id
    AND mc.connection_type = 'follow'
);

UPDATE public.profiles p
SET following_count = (
  SELECT COUNT(*)
  FROM public.member_connections mc
  WHERE mc.member_id = p.id
    AND mc.connection_type = 'follow'
);

-- ============================================================================
-- 6. Verify triggers are created
-- ============================================================================
SELECT 
  trigger_name,
  event_object_table,
  event_manipulation,
  action_statement
FROM information_schema.triggers
WHERE trigger_name LIKE 'trigger_update_%follower%'
  AND trigger_schema = 'public'
ORDER BY trigger_name;

-- ============================================================================
-- 7. Verify follower counts are accurate
-- ============================================================================
SELECT 
  p.id,
  p.name,
  p.followers_count,
  (SELECT COUNT(*) FROM public.member_connections mc 
   WHERE mc.connected_user_id = p.id AND mc.connection_type = 'follow') as actual_follower_count,
  p.following_count,
  (SELECT COUNT(*) FROM public.member_connections mc 
   WHERE mc.member_id = p.id AND mc.connection_type = 'follow') as actual_following_count
FROM public.profiles p
WHERE p.account_type = 'creator'
ORDER BY p.followers_count DESC
LIMIT 20;
