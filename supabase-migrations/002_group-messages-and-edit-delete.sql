-- ============================================================================
-- GROUP MESSAGES TABLE
-- For in-group chat/messages
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.group_messages (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    group_id UUID NOT NULL REFERENCES public.groups(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    content TEXT NOT NULL,
    attachment_url TEXT,
    attachment_type TEXT CHECK (attachment_type IN ('image', 'video', 'document', 'audio')),
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_group_messages_group_id ON public.group_messages(group_id);
CREATE INDEX IF NOT EXISTS idx_group_messages_user_id ON public.group_messages(user_id);
CREATE INDEX IF NOT EXISTS idx_group_messages_created_at ON public.group_messages(created_at DESC);

-- Auto-update updated_at
DROP TRIGGER IF EXISTS trigger_update_group_messages_updated_at ON public.group_messages;
CREATE TRIGGER trigger_update_group_messages_updated_at
  BEFORE UPDATE ON public.group_messages
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Enable RLS on group_messages
ALTER TABLE public.group_messages ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Members can view group messages" ON public.group_messages;
CREATE POLICY "Members can view group messages"
  ON public.group_messages
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.group_members
      WHERE group_members.group_id = group_messages.group_id
        AND group_members.user_id = auth.uid()
        AND group_members.status = 'active'
    )
  );

DROP POLICY IF EXISTS "Members can post to groups" ON public.group_messages;
CREATE POLICY "Members can post to groups"
  ON public.group_messages
  FOR INSERT
  TO authenticated
  WITH CHECK (
    user_id = auth.uid()
    AND EXISTS (
      SELECT 1 FROM public.group_members
      WHERE group_members.group_id = group_messages.group_id
        AND group_members.user_id = auth.uid()
        AND group_members.status = 'active'
    )
  );

DROP POLICY IF EXISTS "Users can update own messages" ON public.group_messages;
CREATE POLICY "Users can update own messages"
  ON public.group_messages
  FOR UPDATE
  TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

DROP POLICY IF EXISTS "Users can delete own messages" ON public.group_messages;
CREATE POLICY "Users can delete own messages"
  ON public.group_messages
  FOR DELETE
  TO authenticated
  USING (user_id = auth.uid());

-- ============================================================================
-- FIX GROUPS TABLE RLS FOR EDIT/DELETE
-- Allow group creators to edit and delete their groups
-- ============================================================================

-- Update policy already exists but ensure it's correct
DROP POLICY IF EXISTS "Creators update own groups" ON public.groups;
CREATE POLICY "Creators update own groups"
  ON public.groups
  FOR UPDATE
  TO authenticated
  USING (creator_id = auth.uid())
  WITH CHECK (creator_id = auth.uid());

DROP POLICY IF EXISTS "Creators delete own groups" ON public.groups;
CREATE POLICY "Creators delete own groups"
  ON public.groups
  FOR DELETE
  TO authenticated
  USING (creator_id = auth.uid());

-- ============================================================================
-- GROUP MEMBER ROLES - Allow admins to manage members
-- ============================================================================

-- Update member role (admin can promote/demote)
DROP POLICY IF EXISTS "Admins can manage member roles" ON public.group_members;
CREATE POLICY "Admins can manage member roles"
  ON public.group_members
  FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.group_members admin_member
      WHERE admin_member.group_id = group_members.group_id
        AND admin_member.user_id = auth.uid()
        AND admin_member.role = 'admin'
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.group_members admin_member
      WHERE admin_member.group_id = group_members.group_id
        AND admin_member.user_id = auth.uid()
        AND admin_member.role = 'admin'
    )
  );

-- Admins can remove members
DROP POLICY IF EXISTS "Admins can remove members" ON public.group_members;
CREATE POLICY "Admins can remove members"
  ON public.group_members
  FOR DELETE
  TO authenticated
  USING (
    user_id = auth.uid()
    OR EXISTS (
      SELECT 1 FROM public.group_members admin_member
      WHERE admin_member.group_id = group_members.group_id
        AND admin_member.user_id = auth.uid()
        AND admin_member.role = 'admin'
    )
  );

-- ============================================================================
-- FUNCTION TO PROMOTE FIRST MEMBER TO ADMIN
-- When a user creates a group, they automatically become admin
-- ============================================================================

DROP FUNCTION IF EXISTS public.create_group_with_admin(uuid, text, text, text, text, text, int) CASCADE;
CREATE FUNCTION public.create_group_with_admin(
  p_creator_id UUID,
  p_name TEXT,
  p_description TEXT,
  p_category TEXT,
  p_visibility TEXT,
  p_rules TEXT,
  p_max_members INT
)
RETURNS UUID AS $$
DECLARE
  v_group_id UUID;
BEGIN
  -- Insert group
  INSERT INTO public.groups (
    creator_id, name, description, category, visibility, rules, max_members, member_count
  ) VALUES (
    p_creator_id, p_name, p_description, p_category, p_visibility, p_rules, p_max_members, 1
  ) RETURNING id INTO v_group_id;

  -- Add creator as admin member
  INSERT INTO public.group_members (group_id, user_id, role, status)
  VALUES (v_group_id, p_creator_id, 'admin', 'active');

  RETURN v_group_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================================
-- AUTO-ADD CREATOR AS ADMIN WHEN JOINING AFTER CREATING
-- Update member_count when members change
-- ============================================================================

DROP FUNCTION IF EXISTS public.update_group_member_count() CASCADE;
CREATE FUNCTION public.update_group_member_count()
  RETURNS TRIGGER
  LANGUAGE plpgsql SECURITY DEFINER AS $$
  BEGIN
    IF TG_OP = 'INSERT' AND NEW.status = 'active' THEN
      UPDATE public.groups SET member_count = member_count + 1 WHERE id = NEW.group_id;
      RETURN NEW;
    ELSIF TG_OP = 'DELETE' AND OLD.status = 'active' THEN
      UPDATE public.groups SET member_count = GREATEST(member_count - 1, 0) WHERE id = OLD.group_id;
      RETURN OLD;
    ELSIF TG_OP = 'UPDATE' AND NEW.status = 'active' AND OLD.status != 'active' THEN
      UPDATE public.groups SET member_count = member_count + 1 WHERE id = NEW.group_id;
      RETURN NEW;
    ELSIF TG_OP = 'UPDATE' AND NEW.status != 'active' AND OLD.status = 'active' THEN
      UPDATE public.groups SET member_count = GREATEST(member_count - 1, 0) WHERE id = NEW.group_id;
      RETURN OLD;
    END IF;
    RETURN NULL;
  END;
$$;

DROP TRIGGER IF EXISTS trigger_update_group_member_count ON public.group_members;
CREATE TRIGGER trigger_update_group_member_count
  AFTER INSERT OR DELETE OR UPDATE ON public.group_members
  FOR EACH ROW
  EXECUTE FUNCTION public.update_group_member_count();

-- ============================================================================
-- VERIFY ALL CHANGES
-- ============================================================================

-- Check tables exist
SELECT table_name FROM information_schema.tables 
WHERE table_schema = 'public' 
AND table_name IN ('groups', 'group_members', 'group_messages', 'group_invites')
ORDER BY table_name;
