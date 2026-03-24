-- ============================================================================
-- CONNECT PAGE SCHEMA - Complete networking and messaging infrastructure
-- ============================================================================

-- Enable required extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================================================
-- 1. MEMBER CONNECTIONS TABLE
-- ============================================================================
-- Tracks connections between members and creators (follows/connections)
CREATE TABLE IF NOT EXISTS public.member_connections (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    member_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    connected_user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    connection_type TEXT NOT NULL DEFAULT 'follow' CHECK (connection_type IN ('follow', 'colleague', 'mentor', 'mentee')),
    status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'blocked', 'pending')),
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    UNIQUE(member_id, connected_user_id),
    CHECK(member_id != connected_user_id)
);

-- ============================================================================
-- 2. MESSAGES TABLE
-- ============================================================================
-- Stores direct messages between users
CREATE TABLE IF NOT EXISTS public.messages (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    sender_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    recipient_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    content TEXT NOT NULL,
    attachment_url TEXT,
    attachment_type TEXT CHECK (attachment_type IN ('image', 'video', 'document', 'audio')),
    read BOOLEAN NOT NULL DEFAULT FALSE,
    read_at TIMESTAMP WITH TIME ZONE,
    timestamp TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    deleted_at TIMESTAMP WITH TIME ZONE
);

-- ============================================================================
-- 3. MESSAGE THREADS TABLE
-- ============================================================================
-- Organizes messages into conversation threads
CREATE TABLE IF NOT EXISTS public.message_threads (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id_1 UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    user_id_2 UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    last_message_id UUID REFERENCES public.messages(id) ON DELETE SET NULL,
    last_message_at TIMESTAMP WITH TIME ZONE,
    unread_count_user1 INT NOT NULL DEFAULT 0,
    unread_count_user2 INT NOT NULL DEFAULT 0,
    archived_by_user1 BOOLEAN DEFAULT FALSE,
    archived_by_user2 BOOLEAN DEFAULT FALSE,
    muted_by_user1 BOOLEAN DEFAULT FALSE,
    muted_by_user2 BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    UNIQUE(user_id_1, user_id_2),
    CHECK(user_id_1 != user_id_2)
);

-- ============================================================================
-- 4. GROUPS TABLE
-- ============================================================================
-- Allows members to create and join groups
CREATE TABLE IF NOT EXISTS public.groups (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name TEXT NOT NULL,
    description TEXT,
    avatar_url TEXT,
    banner_url TEXT,
    creator_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    category TEXT NOT NULL CHECK (category IN ('creative', 'professional', 'hobby', 'learning', 'business', 'community')),
    visibility TEXT NOT NULL DEFAULT 'public' CHECK (visibility IN ('public', 'private', 'invite_only')),
    member_count INT NOT NULL DEFAULT 1,
    max_members INT,
    rules TEXT,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

-- ============================================================================
-- 5. GROUP MEMBERS TABLE
-- ============================================================================
-- Tracks membership in groups
CREATE TABLE IF NOT EXISTS public.group_members (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    group_id UUID NOT NULL REFERENCES public.groups(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    role TEXT NOT NULL DEFAULT 'member' CHECK (role IN ('admin', 'moderator', 'member')),
    joined_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'blocked', 'suspended')),
    UNIQUE(group_id, user_id)
);

-- ============================================================================
-- 6. TEAMS TABLE
-- ============================================================================
-- Allows creation of professional teams
CREATE TABLE IF NOT EXISTS public.teams (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name TEXT NOT NULL,
    description TEXT,
    avatar_url TEXT,
    banner_url TEXT,
    creator_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    industry TEXT,
    website TEXT,
    visibility TEXT NOT NULL DEFAULT 'public' CHECK (visibility IN ('public', 'private', 'invite_only')),
    member_count INT NOT NULL DEFAULT 1,
    max_members INT,
    verified BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

-- ============================================================================
-- 7. TEAM MEMBERS TABLE
-- ============================================================================
-- Tracks team membership and roles
CREATE TABLE IF NOT EXISTS public.team_members (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    team_id UUID NOT NULL REFERENCES public.teams(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    role TEXT NOT NULL DEFAULT 'member' CHECK (role IN ('lead', 'admin', 'member')),
    title TEXT,
    joined_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'inactive', 'suspended')),
    UNIQUE(team_id, user_id)
);

-- ============================================================================
-- 8. CONNECTION REQUESTS TABLE
-- ============================================================================
-- Tracks pending connection requests
CREATE TABLE IF NOT EXISTS public.connection_requests (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    sender_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    recipient_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    message TEXT,
    status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'rejected', 'cancelled')),
    responded_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    UNIQUE(sender_id, recipient_id),
    CHECK(sender_id != recipient_id)
);

-- ============================================================================
-- 9. CONNECTION STATISTICS TABLE
-- ============================================================================
-- Caches connection stats for performance
CREATE TABLE IF NOT EXISTS public.connection_stats (
    user_id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    followers_count INT NOT NULL DEFAULT 0,
    following_count INT NOT NULL DEFAULT 0,
    groups_count INT NOT NULL DEFAULT 0,
    teams_count INT NOT NULL DEFAULT 0,
    total_connections INT NOT NULL DEFAULT 0,
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

-- ============================================================================
-- 10. USER INTERESTS TABLE
-- ============================================================================
-- Stores user interests for better recommendations
CREATE TABLE IF NOT EXISTS public.user_interests (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    interest TEXT NOT NULL,
    added_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    UNIQUE(user_id, interest)
);

-- ============================================================================
-- 11. CONNECTION RECOMMENDATIONS TABLE
-- ============================================================================
-- Stores recommended connections for users
CREATE TABLE IF NOT EXISTS public.connection_recommendations (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    recommended_user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    reason TEXT NOT NULL,
    score DECIMAL(3,2) NOT NULL DEFAULT 0.5,
    dismissed BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    UNIQUE(user_id, recommended_user_id),
    CHECK(user_id != recommended_user_id)
);

-- ============================================================================
-- INDEXES FOR PERFORMANCE
-- ============================================================================

-- Member Connections Indexes
CREATE INDEX IF NOT EXISTS idx_member_connections_member_id ON public.member_connections(member_id);
CREATE INDEX IF NOT EXISTS idx_member_connections_connected_user_id ON public.member_connections(connected_user_id);
CREATE INDEX IF NOT EXISTS idx_member_connections_status ON public.member_connections(status);
CREATE INDEX IF NOT EXISTS idx_member_connections_type ON public.member_connections(connection_type);

-- Messages Indexes
CREATE INDEX IF NOT EXISTS idx_messages_sender_id ON public.messages(sender_id);
CREATE INDEX IF NOT EXISTS idx_messages_recipient_id ON public.messages(recipient_id);
CREATE INDEX IF NOT EXISTS idx_messages_timestamp ON public.messages(timestamp DESC);
CREATE INDEX IF NOT EXISTS idx_messages_read ON public.messages(read);
CREATE INDEX IF NOT EXISTS idx_messages_sender_recipient ON public.messages(sender_id, recipient_id, timestamp DESC);

-- Message Threads Indexes
CREATE INDEX IF NOT EXISTS idx_message_threads_user_id_1 ON public.message_threads(user_id_1);
CREATE INDEX IF NOT EXISTS idx_message_threads_user_id_2 ON public.message_threads(user_id_2);
CREATE INDEX IF NOT EXISTS idx_message_threads_last_message_at ON public.message_threads(last_message_at DESC);

-- Groups Indexes
CREATE INDEX IF NOT EXISTS idx_groups_creator_id ON public.groups(creator_id);
CREATE INDEX IF NOT EXISTS idx_groups_category ON public.groups(category);
CREATE INDEX IF NOT EXISTS idx_groups_visibility ON public.groups(visibility);
CREATE INDEX IF NOT EXISTS idx_groups_created_at ON public.groups(created_at DESC);

-- Group Members Indexes
CREATE INDEX IF NOT EXISTS idx_group_members_group_id ON public.group_members(group_id);
CREATE INDEX IF NOT EXISTS idx_group_members_user_id ON public.group_members(user_id);
CREATE INDEX IF NOT EXISTS idx_group_members_role ON public.group_members(role);

-- Teams Indexes
CREATE INDEX IF NOT EXISTS idx_teams_creator_id ON public.teams(creator_id);
CREATE INDEX IF NOT EXISTS idx_teams_visibility ON public.teams(visibility);
CREATE INDEX IF NOT EXISTS idx_teams_verified ON public.teams(verified);

-- Team Members Indexes
CREATE INDEX IF NOT EXISTS idx_team_members_team_id ON public.team_members(team_id);
CREATE INDEX IF NOT EXISTS idx_team_members_user_id ON public.team_members(user_id);
CREATE INDEX IF NOT EXISTS idx_team_members_role ON public.team_members(role);

-- Connection Requests Indexes
CREATE INDEX IF NOT EXISTS idx_connection_requests_sender_id ON public.connection_requests(sender_id);
CREATE INDEX IF NOT EXISTS idx_connection_requests_recipient_id ON public.connection_requests(recipient_id);
CREATE INDEX IF NOT EXISTS idx_connection_requests_status ON public.connection_requests(status);

-- User Interests Indexes
CREATE INDEX IF NOT EXISTS idx_user_interests_user_id ON public.user_interests(user_id);
CREATE INDEX IF NOT EXISTS idx_user_interests_interest ON public.user_interests(interest);

-- Connection Stats Indexes
CREATE INDEX IF NOT EXISTS idx_connection_stats_followers_count ON public.connection_stats(followers_count DESC);

-- Connection Recommendations Indexes
CREATE INDEX IF NOT EXISTS idx_connection_recommendations_user_id ON public.connection_recommendations(user_id);
CREATE INDEX IF NOT EXISTS idx_connection_recommendations_score ON public.connection_recommendations(score DESC);

-- ============================================================================
-- FOREIGN KEYS AND CONSTRAINTS
-- ============================================================================

-- Add constraint to profiles for followers_count if not exists
ALTER TABLE public.profiles
ADD COLUMN IF NOT EXISTS followers_count INT DEFAULT 0,
ADD COLUMN IF NOT EXISTS following_count INT DEFAULT 0;

-- ============================================================================
-- COMMENTS FOR DOCUMENTATION
-- ============================================================================

COMMENT ON TABLE public.member_connections IS 'Stores connections between members and creators. Tracks follows and colleague relationships.';
COMMENT ON TABLE public.messages IS 'Direct messages between users. Supports text and attachments.';
COMMENT ON TABLE public.message_threads IS 'Conversation threads between two users. Tracks read status and archive state.';
COMMENT ON TABLE public.groups IS 'User groups for community building. Can be public, private, or invite-only.';
COMMENT ON TABLE public.group_members IS 'Membership records for groups with role-based access.';
COMMENT ON TABLE public.teams IS 'Professional teams for collaboration. Supports verification and visibility controls.';
COMMENT ON TABLE public.team_members IS 'Professional team membership with role assignment.';
COMMENT ON TABLE public.connection_requests IS 'Pending connection requests between users.';
COMMENT ON TABLE public.connection_stats IS 'Cached statistics for user connections for performance optimization.';
COMMENT ON TABLE public.user_interests IS 'User interests for recommendation algorithms.';
COMMENT ON TABLE public.connection_recommendations IS 'Recommended connections based on shared interests and mutual connections.';
