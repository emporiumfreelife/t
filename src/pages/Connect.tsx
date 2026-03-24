import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Users,
  MessageSquare,
  Heart,
  UserPlus,
  UserCheck,
  UserMinus,
  Search,
  Star,
  Send,
  ArrowRight,
  Eye,
  AlertCircle,
  CheckCircle,
  Filter,
  Zap,
  FolderPlus,
  Share2,
  Briefcase,
  TrendingUp,
  Clock,
  ChevronRight,
  X,
  Trash2,
  MoreHorizontal,
  Edit2,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { supabase } from '../lib/supabase';

interface Creator {
  id: string;
  name: string;
  avatar_url: string;
  tier: string;
  followers: number;
  bio: string;
  followed: boolean;
  created_at: string;
  category?: string;
}

interface Member {
  id: string;
  name: string;
  avatar_url: string;
  tier: string;
  bio: string;
  followers: number;
  category?: string;
  connected: boolean;
  requestStatus?: 'sent' | 'received' | 'none'; // 'sent' = you sent request, 'received' = you received request, 'none' = no request
}

interface Connection {
  id: string;
  name: string;
  avatar_url: string;
  role: string;
  bio: string;
  followers?: number;
  isFollowing: boolean;
}

interface Message {
  id: string;
  sender_id: string;
  sender_name: string;
  sender_avatar: string;
  content: string;
  timestamp: string;
  read: boolean;
  recipient_id: string;
  attachment_url?: string;
  attachment_type?: 'image' | 'video' | 'document' | 'audio';
  read_at?: string;
  updated_at?: string;
  deleted_at?: string;
}

interface Group {
  id: string;
  name: string;
  description: string;
  avatar_url: string;
  category: string;
  member_count: number;
  visibility: string;
}

interface Team {
  id: string;
  name: string;
  description: string;
  avatar_url: string;
  member_count: number;
  verified: boolean;
  industry: string;
}

interface GroupInvite {
  id: string;
  group_id: string;
  group_name: string;
  group_avatar: string;
  invited_user_id: string;
  invited_by_user_id: string;
  invited_by_name: string;
  status: 'pending' | 'accepted' | 'rejected' | 'cancelled';
  message?: string;
  expires_at?: string;
  responded_at?: string;
  created_at: string;
}

interface Recommendation {
  id: string;
  user_id: string;
  name: string;
  avatar_url: string;
  bio: string;
  reason: string;
  score: number;
}

interface Toast {
  id: string;
  type: 'success' | 'error';
  message: string;
}

// Professional categories from Projects page
const PROFESSIONAL_CATEGORIES = [
  'all',
  'digital-marketing',
  'brand-ambassador',
  'media-communications',
  'media-production',
  'art-&-design',
  'modelling',
  'dance-&-choreography',
  'acting',
  'film-video-production',
  'audio-production',
  'music',
  'event-management',
  'photography',
  'design'
];

const SORT_OPTIONS = ['all', 'trending', 'new', 'popular'];

// Cache management functions
const getCachedCreators = () => {
  try {
    const cached = localStorage.getItem('connect_creators_cache');
    return cached ? JSON.parse(cached) : null;
  } catch {
    return null;
  }
};

const setCachedCreators = (data: Creator[]) => {
  try {
    localStorage.setItem('connect_creators_cache', JSON.stringify(data));
  } catch {
    // Silently fail if localStorage is unavailable
  }
};

const getCachedMembers = () => {
  try {
    const cached = localStorage.getItem('connect_members_cache');
    return cached ? JSON.parse(cached) : null;
  } catch {
    return null;
  }
};

const setCachedMembers = (data: Member[]) => {
  try {
    localStorage.setItem('connect_members_cache', JSON.stringify(data));
  } catch {
    // Silently fail if localStorage is unavailable
  }
};

export default function Connect() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState<'discover' | 'network' | 'groups' | 'teams' | 'messages'>('discover');
  const [discoverSubTab, setDiscoverSubTab] = useState<'creators' | 'members' | 'recommendations'>('creators');
  
  // Data states
  const [creators, setCreators] = useState<Creator[]>(() => getCachedCreators() || []);
  // NOTE: Do NOT use cached members for initial state because cached data doesn't include
  // accurate connection counts. Always fetch fresh member data with correct counts.
  const [members, setMembers] = useState<Member[]>([]);
  const [connections, setConnections] = useState<Connection[]>([]);
  const [messages, setMessages] = useState<Message[]>([]);
  const [groups, setGroups] = useState<Group[]>([]); // Public & Private groups (discovery)
  const [myInviteOnlyGroups, setMyInviteOnlyGroups] = useState<Group[]>([]); // Invite-only groups user created or joined
  const [pendingInvites, setPendingInvites] = useState<GroupInvite[]>([]); // Invites received by user
  const [teams, setTeams] = useState<Team[]>([]);
  const [recommendations, setRecommendations] = useState<Recommendation[]>([]);

  // Filter & Sort states
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [selectedSort, setSelectedSort] = useState<string>('trending');
  const [creatorsLoaded, setCreatorsLoaded] = useState(() => getCachedCreators() !== null);
  // Always start with membersLoaded=false because we don't cache members anymore
  // This ensures we always fetch fresh data with correct connection counts
  const [membersLoaded, setMembersLoaded] = useState(false);
  
  // UI states
  const [selectedConnection, setSelectedConnection] = useState<Connection | null>(null);
  const [messageInput, setMessageInput] = useState('');
  const [toasts, setToasts] = useState<Toast[]>([]);
  const [pendingRequests, setPendingRequests] = useState<{ [key: string]: boolean }>({});
  const [portfolioModalOpen, setPortfolioModalOpen] = useState(false);
  const [portfolioCreatorId, setPortfolioCreatorId] = useState<string | null>(null);
  const [portfolioData, setPortfolioData] = useState<any>(null);
  const [portfolioLoading, setPortfolioLoading] = useState(false);
  const [selectedAttachment, setSelectedAttachment] = useState<File | null>(null);
  const [uploadingAttachment, setUploadingAttachment] = useState(false);
  const [openMenuMessageId, setOpenMenuMessageId] = useState<string | null>(null);
  const [editingMessageId, setEditingMessageId] = useState<string | null>(null);
  const [editingMessageContent, setEditingMessageContent] = useState('');
  const [previewingFileUrl, setPreviewingFileUrl] = useState<string | null>(null);
  const [previewingFileType, setPreviewingFileType] = useState<'image' | 'video' | 'document' | null>(null);
  const [conversationScrollPositions, setConversationScrollPositions] = useState<{ [key: string]: string }>({});

  // Group creation modal states
  const [showCreateGroupModal, setShowCreateGroupModal] = useState(false);
  const [groupFormData, setGroupFormData] = useState({
    name: '',
    description: '',
    rules: '',
    category: 'professional',
    visibility: 'public',
    max_members: null as number | null
  });
  const [groupAvatar, setGroupAvatar] = useState<File | null>(null);
  const [groupBanner, setGroupBanner] = useState<File | null>(null);
  const [groupAvatarPreview, setGroupAvatarPreview] = useState<string | null>(null);
  const [groupBannerPreview, setGroupBannerPreview] = useState<string | null>(null);
  const [creatingGroup, setCreatingGroup] = useState(false);
  const [userGroups, setUserGroups] = useState<string[]>([]); // Track which groups the user has joined

  // Group invitation states
  const [showInviteModal, setShowInviteModal] = useState(false);
  const [selectedGroupForInvite, setSelectedGroupForInvite] = useState<Group | null>(null);
  const [inviteSearchQuery, setInviteSearchQuery] = useState('');
  const [usersToInvite, setUsersToInvite] = useState<Member[]>([]);
  const [selectedUsersForInvite, setSelectedUsersForInvite] = useState<string[]>([]);
  const [sendingInvites, setSendingInvites] = useState(false);

  // Group detail view states
  const [showGroupDetail, setShowGroupDetail] = useState(false);
  const [selectedGroup, setSelectedGroup] = useState<Group | null>(null);
  const [groupMessages, setGroupMessages] = useState<any[]>([]);
  const [groupMembers, setGroupMembers] = useState<any[]>([]);
  const [groupMessageInput, setGroupMessageInput] = useState('');
  const [sendingGroupMessage, setSendingGroupMessage] = useState(false);
  const [userGroupRole, setUserGroupRole] = useState<'admin' | 'moderator' | 'member'>('member');

  // Group edit states
  const [showEditGroupModal, setShowEditGroupModal] = useState(false);
  const [editingGroup, setEditingGroup] = useState<Group | null>(null);
  const [editGroupData, setEditGroupData] = useState({
    name: '',
    description: '',
    rules: '',
    category: 'professional',
    visibility: 'public',
    max_members: null as number | null
  });
  const [editingGroupSubmitting, setEditingGroupSubmitting] = useState(false);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const messagesContainerRef = useRef<HTMLDivElement>(null);

  // Dynamic header based on filters
  const getCreatorHeader = () => {
    const sortLabel = selectedSort.charAt(0).toUpperCase() + selectedSort.slice(1);
    const categoryLabel = selectedCategory === 'all' 
      ? 'Creators' 
      : selectedCategory.split('-').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ');
    
    return `${sortLabel === 'All' ? '' : sortLabel + ' '}${categoryLabel}`;
  };

  useEffect(() => {
    if (user?.role === 'member') {
      loadCreators();
      // Always load members fresh to get accurate connection counts
      // Don't rely on cache for connection data
      loadMembers();
      loadConnections();
      loadMessages();
      loadGroups();
      loadMyInviteOnlyGroups(); // Load invite-only groups user created or is member of
      loadUserGroups();
      loadPendingGroupInvites(); // Load invites sent to user
      loadTeams();
      loadRecommendations();
    }
  }, [user]);

  // Real-time subscriptions for follow status changes from other pages and follower count updates
  useEffect(() => {
    if (!user?.id) return;

    // Subscribe to member_connections changes (follow from Connect page)
    const memberConnectionsSubscription = supabase
      .channel(`member_connections_${user.id}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'member_connections',
          filter: `member_id=eq.${user.id}`,
        },
        () => {
          // Reload creators when follow status changes
          loadCreators();
        }
      )
      .subscribe();

    // Subscribe to media_page_follows changes (follow from Media page)
    const mediaFollowsSubscription = supabase
      .channel(`media_page_follows_${user.id}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'media_page_follows',
          filter: `follower_id=eq.${user.id}`,
        },
        () => {
          // Reload creators when follow status changes from Media page
          loadCreators();
        }
      )
      .subscribe();

    // Subscribe to profiles table changes (creator and member follower count updates from other users)
    const profilesSubscription = supabase
      .channel('profiles_changes')
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'profiles',
        },
        (payload: any) => {
          // Update both creators and members when their follower count changes
          const updatedProfile = payload.new;

          // Update creators
          setCreators((prevCreators) => {
            const updated = prevCreators.map((creator) =>
              creator.id === updatedProfile.id
                ? { ...creator, followers: updatedProfile.followers }
                : creator
            );
            setCachedCreators(updated);
            return updated;
          });

          // Update members
          setMembers((prevMembers) => {
            const updated = prevMembers.map((member) =>
              member.id === updatedProfile.id
                ? { ...member, followers: updatedProfile.followers }
                : member
            );
            setCachedMembers(updated);
            return updated;
          });
        }
      )
      .subscribe();

    // Subscribe to ALL member_connections changes (not just current user's) to update connection counts in real-time
    // This ensures that when anyone connects/disconnects, the connection counts for ALL members are recalculated
    const memberConnectionsStatusSubscription = supabase
      .channel('member_connections_changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'member_connections',
        },
        (payload: any) => {
          // When ANY member connection changes, update connection status and connection counts
          // Clear cache since connection counts are dynamic and change with any member connection
          try {
            localStorage.removeItem('connect_members_cache');
          } catch (e) {
            // Silently fail if localStorage not available
          }

          // Update members state with fresh data from database (recalculates connection counts for all members)
          loadMembers();

          // Always update the current user's connections list to reflect the latest connection counts
          // This ensures that connection counts in the "Connected Members" section are always current
          loadConnections();
        }
      )
      .subscribe();

    // Subscribe to connection_requests changes (accept/decline/pending requests)
    const connectionRequestsSubscription = supabase
      .channel('connection_requests_changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'connection_requests',
        },
        (payload: any) => {
          // Clear cache and reload members when connection requests change
          try {
            localStorage.removeItem('connect_members_cache');
          } catch (e) {
            // Silently fail if localStorage not available
          }

          // Reload members to update request status and connection status
          loadMembers();

          // If current user received a request, notify them
          const recipientId = payload.new?.recipient_id || payload.old?.recipient_id;

          if (recipientId === user?.id && payload.new?.status === 'pending') {
            // Only show toast for new pending requests
            addToast('You have a new connection request', 'success');
          }
        }
      )
      .subscribe();

    // Subscribe to messages changes (real-time messaging)
    const messagesSubscription = supabase
      .channel('messages_changes')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'messages',
        },
        (payload: any) => {
          const newMessage = payload.new;
          // Add new message if it's sent or received by current user
          if (newMessage.sender_id === user?.id || newMessage.recipient_id === user?.id) {
            loadMessages();
          }
        }
      )
      .subscribe();

    return () => {
      memberConnectionsSubscription.unsubscribe();
      mediaFollowsSubscription.unsubscribe();
      profilesSubscription.unsubscribe();
      memberConnectionsStatusSubscription.unsubscribe();
      connectionRequestsSubscription.unsubscribe();
      messagesSubscription.unsubscribe();
    };
  }, [user?.id]);

  // Load messages when a connection is selected or when activeTab changes to messages
  useEffect(() => {
    if (activeTab === 'messages') {
      loadMessages();
    }
  }, [activeTab, selectedConnection]);

  // Restore scroll position when connection is selected or when returning to messages tab
  useEffect(() => {
    if (activeTab === 'messages' && messagesContainerRef.current && selectedConnection) {
      const conversationKey = selectedConnection.id;
      const savedMessageId = conversationScrollPositions[conversationKey];

      setTimeout(() => {
        if (savedMessageId) {
          // Scroll to the previously viewed message
          const messageElement = document.getElementById(`message-${savedMessageId}`);
          if (messageElement) {
            messageElement.scrollIntoView({ behavior: 'auto', block: 'center' });
          }
        } else {
          // First time viewing this conversation, scroll to bottom
          if (messagesEndRef.current) {
            messagesEndRef.current.scrollIntoView({ behavior: 'auto' });
          }
        }
      }, 100);
    }
  }, [selectedConnection, activeTab]);

  // Pause and mute inline media when preview modal is open
  useEffect(() => {
    if (messagesContainerRef.current) {
      const mediaElements = messagesContainerRef.current.querySelectorAll('video, audio');

      mediaElements.forEach((media) => {
        const htmlMedia = media as HTMLMediaElement;
        if (previewingFileUrl) {
          // Pause all inline media when preview is open
          htmlMedia.pause();
          htmlMedia.muted = true;
          // Prevent attempts to play
          const handler = () => {
            htmlMedia.pause();
          };
          htmlMedia.addEventListener('play', handler);
          // Store handler on element for cleanup
          (htmlMedia as any)._playHandler = handler;
        } else {
          // Re-enable when preview is closed
          htmlMedia.muted = false;
          // Remove the play prevention handler
          if ((htmlMedia as any)._playHandler) {
            htmlMedia.removeEventListener('play', (htmlMedia as any)._playHandler);
            delete (htmlMedia as any)._playHandler;
          }
        }
      });
    }
  }, [previewingFileUrl]);

  // Handle scroll event to track user's position
  const handleMessagesScroll = (e: React.UIEvent<HTMLDivElement>) => {
    if (selectedConnection) {
      const container = e.currentTarget;
      const messageElements = container.querySelectorAll('[data-message-id]');

      // Find the last message that's visible in the viewport
      let lastVisibleMessage = null;
      messageElements.forEach((element) => {
        const rect = element.getBoundingClientRect();
        const containerRect = container.getBoundingClientRect();
        // Check if element is at least partially visible
        if (rect.top < containerRect.bottom && rect.bottom > containerRect.top) {
          lastVisibleMessage = element.getAttribute('data-message-id');
        }
      });

      if (lastVisibleMessage) {
        setConversationScrollPositions((prev) => ({
          ...prev,
          [selectedConnection.id]: lastVisibleMessage,
        }));
      }
    }
  };


  const loadCreators = async () => {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('id, name, avatar_url, tier, followers, bio, created_at')
        .eq('account_type', 'creator')
        .limit(100);

      if (!error && data) {
        // Check which creators the user is following from member_connections table
        const { data: memberConnectionsData } = await supabase
          .from('member_connections')
          .select('connected_user_id')
          .eq('member_id', user?.id)
          .eq('connection_type', 'follow');

        const followedViaConnectionIds = new Set(memberConnectionsData?.map(f => f.connected_user_id) || []);

        // Check which creators the user is following from media_page_follows table
        const { data: mediaFollowsData } = await supabase
          .from('media_page_follows')
          .select('creator_name')
          .eq('follower_id', user?.id);

        const followedViaMediaNames = new Set(mediaFollowsData?.map(f => f.creator_name) || []);

        // A creator is followed if they're followed via either table
        const creatorsWithFollowStatus = data.map((creator: any) => ({
          ...creator,
          followed: followedViaConnectionIds.has(creator.id) || followedViaMediaNames.has(creator.name),
        }));
        setCreators(creatorsWithFollowStatus);
        setCachedCreators(creatorsWithFollowStatus);
        setCreatorsLoaded(true);
      }
    } catch (error) {
      console.error('Error loading creators:', error);
      addToast('Failed to load creators', 'error');
    }
  };

  const loadMembers = async () => {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('id, name, avatar_url, tier, bio, connections_count')
        .eq('account_type', 'member')
        .neq('id', user?.id) // Exclude current user directly in query to avoid showing them
        .limit(50);

      if (!error && data) {
        // Check bidirectional connections (current user's connections)
        const { data: outgoingConnections } = await supabase
          .from('member_connections')
          .select('connected_user_id')
          .eq('member_id', user?.id)
          .eq('connection_type', 'colleague')
          .eq('status', 'active');

        const { data: incomingConnections } = await supabase
          .from('member_connections')
          .select('member_id')
          .eq('connected_user_id', user?.id)
          .eq('connection_type', 'colleague')
          .eq('status', 'active');

        const connectedWithIds = new Set([
          ...(outgoingConnections?.map(c => c.connected_user_id) || []),
          ...(incomingConnections?.map(c => c.member_id) || []),
        ]);

        // Get pending connection requests
        const { data: sentRequests } = await supabase
          .from('connection_requests')
          .select('recipient_id')
          .eq('sender_id', user?.id)
          .eq('status', 'pending');

        const sentRequestsMap: { [key: string]: boolean } = {};
        sentRequests?.forEach((req: any) => {
          sentRequestsMap[req.recipient_id] = true;
        });
        setPendingRequests(sentRequestsMap);

        const { data: receivedRequests } = await supabase
          .from('connection_requests')
          .select('sender_id')
          .eq('recipient_id', user?.id)
          .eq('status', 'pending');

        const receivedRequestsMap: { [key: string]: boolean } = {};
        receivedRequests?.forEach((req: any) => {
          receivedRequestsMap[req.sender_id] = true;
        });

        // Build members list - followers field maintained by database triggers
        const membersWithConnectionStatus = data.map((member: any) => {
          let requestStatus: 'sent' | 'received' | 'none' = 'none';
          if (receivedRequestsMap[member.id]) {
            requestStatus = 'received';
          } else if (sentRequestsMap[member.id]) {
            requestStatus = 'sent';
          }

          return {
            ...member,
            followers: member.connections_count || 0,
            connected: connectedWithIds.has(member.id),
            requestStatus,
          };
        });

        setMembers(membersWithConnectionStatus);
        setCachedMembers(null);
        setMembersLoaded(true);
      }
    } catch (error) {
      console.error('Error loading members:', error);
    }
  };


  const loadConnections = async () => {
    try {
      if (!user?.id) {
        console.error('User ID not available for loadConnections');
        return;
      }

      console.log('Loading connections for user:', user.id);

      // Step 1: Get IDs of all members the current user is connected to (in either direction)
      // Method 1: Members where current user is the member_id (current user created the connection)
      const { data: outgoingConnections, error: outgoingError } = await supabase
        .from('member_connections')
        .select('connected_user_id')
        .eq('member_id', user.id)
        .eq('connection_type', 'colleague')
        .eq('status', 'active');

      if (outgoingError) {
        console.error('Error loading outgoing connections:', outgoingError);
      }

      // Method 2: Members where current user is the connected_user_id (they created the connection)
      const { data: incomingConnections, error: incomingError } = await supabase
        .from('member_connections')
        .select('member_id')
        .eq('connected_user_id', user.id)
        .eq('connection_type', 'colleague')
        .eq('status', 'active');

      if (incomingError) {
        console.error('Error loading incoming connections:', incomingError);
      }

      // Collect all connected user IDs
      const connectedUserIds = new Set<string>([
        ...(outgoingConnections?.map(c => c.connected_user_id) || []),
        ...(incomingConnections?.map(c => c.member_id) || []),
      ]);

      console.log('Connected user IDs:', Array.from(connectedUserIds));

      // Step 2: Fetch profile data for all connected users
      const connectionsList: Connection[] = [];

      if (connectedUserIds.size > 0) {
        const { data: profiles, error: profilesError } = await supabase
          .from('profiles')
          .select('id, name, avatar_url, account_type, bio, connections_count')
          .in('id', Array.from(connectedUserIds));

        if (profilesError) {
          console.error('Error loading profiles:', profilesError);
        }

        profiles?.forEach((profile: any) => {
          connectionsList.push({
            id: profile.id,
            name: profile.name || 'Unknown',
            avatar_url: profile.avatar_url || '',
            role: profile.account_type || 'member',
            bio: profile.bio || '',
            followers: profile.connections_count || 0,
            isFollowing: true,
          });
        });
      }

      console.log('Final connected members list:', connectionsList);
      setConnections(connectionsList);
    } catch (error) {
      console.error('Error loading connections:', error);
    }
  };

  const loadMessages = async () => {
    try {
      // Load both sent and received messages (including deleted ones - they'll be displayed as "deleted")
      const { data, error } = await supabase
        .from('messages')
        .select('id, sender_id, recipient_id, content, timestamp, read, read_at, updated_at, deleted_at, attachment_url, attachment_type')
        .or(`sender_id.eq.${user?.id},recipient_id.eq.${user?.id}`)
        .order('timestamp', { ascending: true })
        .limit(200);

      if (error || !data) {
        console.error('Error loading messages:', error);
        return;
      }

      // Get unique user IDs from messages
      const userIds = new Set<string>();
      data.forEach((msg: any) => {
        userIds.add(msg.sender_id);
        userIds.add(msg.recipient_id);
      });

      // Load profiles for all users in messages
      const { data: profiles, error: profilesError } = await supabase
        .from('profiles')
        .select('id, name, avatar_url')
        .in('id', Array.from(userIds));

      if (profilesError) {
        console.error('Error loading profiles:', profilesError);
        return;
      }

      // Create a map of user ID to profile for quick lookup
      const profileMap = new Map<string, any>();
      profiles?.forEach((profile: any) => {
        profileMap.set(profile.id, profile);
      });

      // Enrich messages with sender/recipient info
      const messagesList = data.map((msg: any) => {
        const senderProfile = profileMap.get(msg.sender_id);
        const recipientProfile = profileMap.get(msg.recipient_id);
        return {
          ...msg,
          sender_name: senderProfile?.name || 'Unknown',
          sender_avatar: senderProfile?.avatar_url || '',
          recipient_name: recipientProfile?.name || 'Unknown',
          recipient_avatar: recipientProfile?.avatar_url || '',
        };
      });

      console.log('Loaded messages:', messagesList.length, messagesList);
      setMessages(messagesList);
    } catch (error) {
      console.error('Error loading messages:', error);
    }
  };

  const loadGroups = async () => {
    try {
      const { data, error } = await supabase
        .from('groups')
        .select('id, name, description, avatar_url, banner_url, category, member_count, visibility, creator_id, max_members, rules')
        .in('visibility', ['public', 'private'])
        .order('created_at', { ascending: false })
        .limit(12);

      if (error) {
        console.error('🔴 Error loading groups:', error);
      } else {
        console.log('✅ Loaded groups:', { count: data?.length, groups: data });
        setGroups(data || []);
      }
    } catch (error) {
      console.error('🔴 Error loading groups:', error);
    }
  };

  // Load invite-only groups where user is creator or member
  const loadMyInviteOnlyGroups = async () => {
    if (!user?.id) return;
    try {
      // Get invite-only groups where user is creator
      const { data: createdGroups, error: error1 } = await supabase
        .from('groups')
        .select('id, name, description, avatar_url, banner_url, category, member_count, visibility, creator_id, max_members, rules')
        .eq('visibility', 'invite_only')
        .eq('creator_id', user.id)
        .order('created_at', { ascending: false });

      // Get invite-only groups where user is a member
      const { data: memberGroupIds, error: error2 } = await supabase
        .from('group_members')
        .select('group_id')
        .eq('user_id', user.id)
        .eq('status', 'active');

      if (error1) {
        console.error('🔴 Error loading created invite-only groups:', error1);
      } else if (error2) {
        console.error('🔴 Error loading member invite-only groups:', error2);
      } else {
        // Get full data for groups user is member of
        const memberGroupIdList = memberGroupIds?.map(m => m.group_id) || [];
        const { data: memberGroups } = await supabase
          .from('groups')
          .select('id, name, description, avatar_url, banner_url, category, member_count, visibility, creator_id, max_members, rules')
          .eq('visibility', 'invite_only')
          .in('id', memberGroupIdList.length > 0 ? memberGroupIdList : [''])
          .order('created_at', { ascending: false });

        // Combine and deduplicate (created groups + member groups)
        const allGroupIds = new Set<string>();
        const combinedGroups: Group[] = [];

        [...(createdGroups || []), ...(memberGroups || [])].forEach(group => {
          if (!allGroupIds.has(group.id)) {
            allGroupIds.add(group.id);
            combinedGroups.push(group);
          }
        });

        console.log('✅ Loaded my invite-only groups:', { count: combinedGroups.length, groups: combinedGroups });
        setMyInviteOnlyGroups(combinedGroups);
      }
    } catch (error) {
      console.error('🔴 Error loading my invite-only groups:', error);
    }
  };

  // Load pending group invites sent to the user
  const loadPendingGroupInvites = async () => {
    if (!user?.id) return;
    try {
      // Get invites without JOIN to avoid RLS blocking
      const { data: invitesData, error: invitesError } = await supabase
        .from('group_invites')
        .select('*')
        .eq('invited_user_id', user.id)
        .eq('status', 'pending')
        .order('created_at', { ascending: false });

      if (invitesError) {
        console.error('🔴 Error loading pending invites:', invitesError);
        return;
      }

      if (!invitesData || invitesData.length === 0) {
        setPendingInvites([]);
        console.log('✅ No pending group invites');
        return;
      }

      // Get group IDs from invites
      const groupIds = invitesData.map(inv => inv.group_id);

      // Fetch group data
      const { data: groupsData } = await supabase
        .from('groups')
        .select('id, name, avatar_url')
        .in('id', groupIds);

      // Fetch inviter profiles
      const inviterIds = invitesData.map(inv => inv.invited_by_user_id);
      const { data: inviterProfiles } = await supabase
        .from('profiles')
        .select('id, name')
        .in('id', inviterIds);

      // Merge data
      const groupsMap = new Map(groupsData?.map((g: any) => [g.id, g]) || []);
      const profilesMap = new Map(inviterProfiles?.map((p: any) => [p.id, p]) || []);

      const invites: GroupInvite[] = invitesData.map((invite: any) => {
        const group = groupsMap.get(invite.group_id);
        const profile = profilesMap.get(invite.invited_by_user_id);
        return {
          id: invite.id,
          group_id: invite.group_id,
          group_name: group?.name || 'Unknown Group',
          group_avatar: group?.avatar_url || '',
          invited_user_id: user.id,
          invited_by_user_id: invite.invited_by_user_id,
          invited_by_name: profile?.name || 'Unknown User',
          status: invite.status,
          message: invite.message,
          expires_at: invite.expires_at,
          responded_at: invite.responded_at,
          created_at: invite.created_at,
        };
      });

      setPendingInvites(invites);
      console.log('✅ Loaded pending group invites:', { count: invites.length });
    } catch (error) {
      console.error('🔴 Error loading pending group invites:', error);
    }
  };

  // Send invites to multiple users for a group
  const handleSendGroupInvites = async () => {
    if (!user?.id || !selectedGroupForInvite || selectedUsersForInvite.length === 0) {
      addToast('Please select users to invite', 'error');
      return;
    }

    setSendingInvites(true);
    try {
      // Check which users already have invites for this group
      const { data: existingInvites } = await supabase
        .from('group_invites')
        .select('invited_user_id')
        .eq('group_id', selectedGroupForInvite.id)
        .in('status', ['pending', 'accepted']);

      const existingUserIds = new Set((existingInvites || []).map(inv => inv.invited_user_id));
      const newUserIds = selectedUsersForInvite.filter(id => !existingUserIds.has(id));

      if (newUserIds.length === 0) {
        addToast('All selected users already have invites for this group', 'warning');
        setSendingInvites(false);
        return;
      }

      const invites = newUserIds.map(userId => ({
        group_id: selectedGroupForInvite.id,
        invited_user_id: userId,
        invited_by_user_id: user.id,
        status: 'pending',
        message: '',
        expires_at: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
      }));

      const { error } = await supabase
        .from('group_invites')
        .insert(invites);

      if (error) {
        console.error('🔴 Error sending invites:', error);
        addToast(`Failed to send invites: ${error.message}`, 'error');
      } else {
        const skipped = selectedUsersForInvite.length - newUserIds.length;
        const msg = skipped > 0
          ? `Invites sent to ${newUserIds.length} user(s). ${skipped} already invited.`
          : `Invites sent to ${newUserIds.length} user(s)!`;
        addToast(msg, 'success');
        setShowInviteModal(false);
        setSelectedGroupForInvite(null);
        setSelectedUsersForInvite([]);
        setInviteSearchQuery('');
      }
    } catch (error) {
      console.error('🔴 Unexpected error sending invites:', error);
      addToast('Error sending invites', 'error');
    } finally {
      setSendingInvites(false);
    }
  };

  // Accept a group invite
  const handleAcceptGroupInvite = async (inviteId: string, groupId: string) => {
    if (!user?.id) return;

    try {
      // Update invite status to accepted
      const { error: updateError } = await supabase
        .from('group_invites')
        .update({ status: 'accepted', responded_at: new Date().toISOString() })
        .eq('id', inviteId);

      if (updateError) {
        console.error('🔴 Error accepting invite:', updateError);
        addToast('Failed to accept invite', 'error');
        return;
      }

      // Add user to group_members
      const { error: memberError } = await supabase
        .from('group_members')
        .insert([{
          group_id: groupId,
          user_id: user.id,
          role: 'member',
          status: 'active',
        }]);

      if (memberError) {
        console.error('🔴 Error adding user to group:', memberError);
        addToast('Invite accepted but failed to add to group', 'warning');
      } else {
        addToast('Invite accepted! You are now a member of the group.', 'success');
        // Reload both pending invites and user groups
        loadPendingGroupInvites();
        loadUserGroups();
        loadMyInviteOnlyGroups();
      }
    } catch (error) {
      console.error('🔴 Unexpected error accepting invite:', error);
      addToast('Error accepting invite', 'error');
    }
  };

  // Reject a group invite
  const handleRejectGroupInvite = async (inviteId: string) => {
    if (!user?.id) return;

    try {
      const { error } = await supabase
        .from('group_invites')
        .update({ status: 'rejected', responded_at: new Date().toISOString() })
        .eq('id', inviteId);

      if (error) {
        console.error('🔴 Error rejecting invite:', error);
        addToast('Failed to reject invite', 'error');
      } else {
        addToast('Invite rejected', 'success');
        loadPendingGroupInvites();
      }
    } catch (error) {
      console.error('🔴 Unexpected error rejecting invite:', error);
      addToast('Error rejecting invite', 'error');
    }
  };

  // Load group detail (messages, members, user role)
  const loadGroupDetail = async (groupId: string) => {
    if (!user?.id) return;
    try {
      // Load group data
      const { data: groupData } = await supabase
        .from('groups')
        .select('*')
        .eq('id', groupId)
        .single();

      if (groupData) {
        setSelectedGroup(groupData);
        setEditGroupData({
          name: groupData.name,
          description: groupData.description,
          rules: groupData.rules,
          category: groupData.category,
          visibility: groupData.visibility,
          max_members: groupData.max_members
        });
      }

      // Load messages without JOIN to avoid RLS blocking
      const { data: rawMessagesData, error: messagesError } = await supabase
        .from('group_messages')
        .select('*')
        .eq('group_id', groupId)
        .order('created_at', { ascending: true })
        .limit(50);

      if (messagesError) {
        console.error('🔴 Error loading messages:', messagesError);
      } else {
        // Extract unique user IDs from messages
        const userIds = rawMessagesData ? [...new Set(rawMessagesData.map(m => m.user_id))] : [];

        // Fetch profiles for those users
        let profilesMap = new Map();
        if (userIds.length > 0) {
          const { data: profilesData, error: profilesError } = await supabase
            .from('profiles')
            .select('id, name, avatar_url')
            .in('id', userIds);

          if (profilesError) {
            console.error('🔴 Error loading message user profiles:', profilesError);
          } else {
            profilesMap = new Map((profilesData || []).map((p: any) => [p.id, p]));
          }
        }

        // Merge messages with profiles
        const mergedMessages = (rawMessagesData || []).map((msg: any) => ({
          ...msg,
          profiles: profilesMap.get(msg.user_id) || { name: 'Unknown', avatar_url: null }
        }));

        setGroupMessages(mergedMessages);
      }

      // Load members without JOIN to avoid RLS blocking
      const { data: rawMembersData, error: membersError } = await supabase
        .from('group_members')
        .select('*')
        .eq('group_id', groupId)
        .eq('status', 'active');

      if (membersError) {
        console.error('🔴 Error loading members:', membersError);
      } else {
        // Extract unique user IDs from members
        const memberUserIds = rawMembersData ? [...new Set(rawMembersData.map(m => m.user_id))] : [];

        // Fetch profiles for those users
        let memberProfilesMap = new Map();
        if (memberUserIds.length > 0) {
          const { data: memberProfilesData, error: memberProfilesError } = await supabase
            .from('profiles')
            .select('id, name, avatar_url, tier')
            .in('id', memberUserIds);

          if (memberProfilesError) {
            console.error('🔴 Error loading member profiles:', memberProfilesError);
          } else {
            memberProfilesMap = new Map((memberProfilesData || []).map((p: any) => [p.id, p]));
          }
        }

        // Merge members with profiles
        const mergedMembers = (rawMembersData || []).map((member: any) => ({
          ...member,
          profiles: memberProfilesMap.get(member.user_id) || { id: member.user_id, name: 'Unknown', avatar_url: null, tier: null }
        }));

        setGroupMembers(mergedMembers);
      }

      // Get user's role
      const { data: userMemberData } = await supabase
        .from('group_members')
        .select('role')
        .eq('group_id', groupId)
        .eq('user_id', user.id)
        .single();

      setUserGroupRole(userMemberData?.role || 'member');
      setShowGroupDetail(true);
    } catch (error) {
      console.error('🔴 Error loading group detail:', error);
      addToast('Error loading group', 'error');
    }
  };

  // Send message to group
  const handleSendGroupMessage = async () => {
    if (!user?.id || !selectedGroup || !groupMessageInput.trim()) return;

    setSendingGroupMessage(true);
    try {
      const { error } = await supabase
        .from('group_messages')
        .insert([{
          group_id: selectedGroup.id,
          user_id: user.id,
          content: groupMessageInput.trim()
        }]);

      if (error) {
        console.error('🔴 Error sending message:', error);
        addToast('Failed to send message', 'error');
      } else {
        setGroupMessageInput('');
        loadGroupDetail(selectedGroup.id);
      }
    } catch (error) {
      console.error('🔴 Unexpected error sending message:', error);
      addToast('Error sending message', 'error');
    } finally {
      setSendingGroupMessage(false);
    }
  };

  // Leave group
  const handleLeaveGroup = async () => {
    if (!user?.id || !selectedGroup) return;

    if (!window.confirm('Leave this group?')) return;

    try {
      const { error } = await supabase
        .from('group_members')
        .delete()
        .eq('group_id', selectedGroup.id)
        .eq('user_id', user.id);

      if (error) {
        console.error('🔴 Error leaving group:', error);
        addToast('Failed to leave group', 'error');
      } else {
        addToast('Left group', 'success');
        setShowGroupDetail(false);
        setSelectedGroup(null);
        loadMyInviteOnlyGroups();
        loadUserGroups();
      }
    } catch (error) {
      console.error('🔴 Unexpected error leaving group:', error);
      addToast('Error leaving group', 'error');
    }
  };

  // Edit group
  const handleEditGroup = async () => {
    if (!user?.id || !selectedGroup) return;

    setEditingGroupSubmitting(true);
    try {
      const { error } = await supabase
        .from('groups')
        .update({
          name: editGroupData.name,
          description: editGroupData.description,
          rules: editGroupData.rules,
          category: editGroupData.category,
          visibility: editGroupData.visibility,
          max_members: editGroupData.max_members
        })
        .eq('id', selectedGroup.id)
        .eq('creator_id', user.id);

      if (error) {
        console.error('🔴 Error updating group:', error);
        addToast('Failed to update group', 'error');
      } else {
        addToast('Group updated', 'success');
        setShowEditGroupModal(false);
        loadGroupDetail(selectedGroup.id);
        loadMyInviteOnlyGroups();
      }
    } catch (error) {
      console.error('🔴 Unexpected error updating group:', error);
      addToast('Error updating group', 'error');
    } finally {
      setEditingGroupSubmitting(false);
    }
  };

  // Delete group
  const handleDeleteGroup = async () => {
    if (!user?.id || !selectedGroup) return;

    if (!window.confirm('Delete this group? This cannot be undone.')) return;

    try {
      const { error } = await supabase
        .from('groups')
        .delete()
        .eq('id', selectedGroup.id)
        .eq('creator_id', user.id);

      if (error) {
        console.error('🔴 Error deleting group:', error);
        addToast('Failed to delete group', 'error');
      } else {
        addToast('Group deleted', 'success');
        setShowGroupDetail(false);
        setSelectedGroup(null);
        loadMyInviteOnlyGroups();
      }
    } catch (error) {
      console.error('🔴 Unexpected error deleting group:', error);
      addToast('Error deleting group', 'error');
    }
  };

  const loadTeams = async () => {
    try {
      const { data, error } = await supabase
        .from('teams')
        .select('id, name, description, avatar_url, member_count, verified, industry')
        .eq('visibility', 'public')
        .limit(12);

      if (!error && data) {
        setTeams(data || []);
      }
    } catch (error) {
      console.error('Error loading teams:', error);
    }
  };

  const loadRecommendations = async () => {
    try {
      const { data, error } = await supabase
        .from('connection_recommendations')
        .select('id, recommended_user_id, reason, score, profiles:recommended_user_id (id, name, avatar_url, bio)')
        .eq('user_id', user?.id)
        .eq('dismissed', false)
        .order('score', { ascending: false })
        .limit(10);

      if (!error && data) {
        const recList = data.map((rec: any) => ({
          id: rec.id,
          user_id: rec.recommended_user_id,
          name: rec.profiles?.name || 'Unknown',
          avatar_url: rec.profiles?.avatar_url || '',
          bio: rec.profiles?.bio || '',
          reason: rec.reason,
          score: rec.score,
        }));
        setRecommendations(recList);
      }
    } catch (error) {
      console.error('Error loading recommendations:', error);
    }
  };

  // Load groups the user has joined
  const loadUserGroups = async () => {
    if (!user?.id) return;
    try {
      const { data, error } = await supabase
        .from('group_members')
        .select('group_id')
        .eq('user_id', user.id);

      if (error) {
        console.error('🔴 Error loading user groups:', error);
      } else {
        const groupIds = data?.map(item => item.group_id) || [];
        console.log('✅ User is a member of groups:', { count: groupIds.length, groupIds });
        setUserGroups(groupIds);
      }
    } catch (error) {
      console.error('🔴 Error loading user groups:', error);
    }
  };

  // Upload group avatar to B2
  const uploadGroupAvatarToB2 = async (file: File): Promise<string | null> => {
    try {
      console.log('📤 Uploading file to B2:', { fileName: file.name, fileSize: file.size });

      // Generate a filename like messages upload does
      const timestamp = Date.now();
      const randomId = Math.random().toString(36).substring(2, 8);
      const extension = file.name.split('.').pop() || 'bin';
      const filename = `groups/${user?.id}/${timestamp}-${randomId}.${extension}`;

      const formData = new FormData();
      formData.append('file', file);
      formData.append('filename', filename);
      formData.append('contentType', file.type || 'application/octet-stream');

      // Use the same Supabase Edge Function that messages use (proven to work!)
      const session = await supabase.auth.getSession();
      const token = session.data.session?.access_token;

      const response = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/upload-to-b2`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
        },
        body: formData,
      });

      if (response.ok) {
        const data = await response.json();
        const publicUrl = data.publicUrl; // Edge function returns 'publicUrl', not 'file_url'
        console.log('✅ File uploaded successfully:', publicUrl);
        return publicUrl;
      } else {
        console.warn('⚠️ Upload failed with status:', response.status, response.statusText);
        const errorData = await response.json().catch(() => ({}));
        console.warn('Upload error details:', errorData);
        return null;
      }
    } catch (error) {
      console.error('🔴 Error uploading avatar to B2:', error);
      return null;
    }
  };

  // Create a new group
  const handleCreateGroup = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user?.id) return;

    if (!groupFormData.name.trim()) {
      addToast('Group name is required', 'error');
      return;
    }

    setCreatingGroup(true);
    try {
      let avatarUrl = null;
      let bannerUrl = null;

      // Upload avatar if provided (non-blocking - continues even if upload fails)
      if (groupAvatar) {
        console.log('⏳ Attempting to upload avatar...');
        const uploadedUrl = await uploadGroupAvatarToB2(groupAvatar);
        if (uploadedUrl) {
          avatarUrl = uploadedUrl;
          console.log('✅ Avatar uploaded successfully');
        } else {
          console.warn('⚠️ Avatar upload failed, continuing without avatar');
        }
      }

      // Upload banner if provided (non-blocking - continues even if upload fails)
      if (groupBanner) {
        console.log('⏳ Attempting to upload banner...');
        const uploadedUrl = await uploadGroupAvatarToB2(groupBanner);
        if (uploadedUrl) {
          bannerUrl = uploadedUrl;
          console.log('✅ Banner uploaded successfully');
        } else {
          console.warn('⚠️ Banner upload failed, continuing without banner');
        }
      }

      // Create the group with UUID (Supabase will generate the ID)
      // Files are optional, so even if upload fails, we continue

      // DEBUG: Log exact values being sent
      const groupPayload = {
        name: groupFormData.name.trim(),
        description: groupFormData.description.trim() || null,
        rules: (groupFormData.rules?.trim()) || null,
        category: groupFormData.category,
        visibility: groupFormData.visibility,
        avatar_url: avatarUrl || null,
        banner_url: bannerUrl || null,
        creator_id: user.id,
        member_count: 1,
        max_members: groupFormData.max_members || null,
      };

      console.log('📝 EXACT GROUP PAYLOAD BEING SENT:', {
        payload: groupPayload,
        category_value: groupPayload.category,
        category_type: typeof groupPayload.category,
        category_length: groupPayload.category?.length,
        visibility_value: groupPayload.visibility,
        formData_original: groupFormData,
      });

      const { data: newGroup, error: createError } = await supabase
        .from('groups')
        .insert([groupPayload])
        .select()
        .single();

      if (createError || !newGroup) {
        console.error('🔴 GROUP INSERT FAILED:', {
          error: createError,
          errorMessage: createError?.message,
          errorCode: createError?.code,
          errorDetails: createError?.details,
          errorHint: createError?.hint,
          status: createError?.status,
          statusText: createError?.statusText,
          payloadSent: groupPayload,
          formData: {
            name: groupFormData.name,
            category: groupFormData.category,
            visibility: groupFormData.visibility,
            creator_id: user.id,
          }
        });
        addToast(`Failed to create group: ${createError?.message || 'Unknown error'}`, 'error');
        return;
      }

      console.log('✅ GROUP CREATED:', newGroup);

      // Add creator as admin member
      const { error: memberError } = await supabase
        .from('group_members')
        .insert([{
          group_id: newGroup.id,
          user_id: user.id,
          role: 'admin',
          status: 'active',
        }]);

      if (memberError) {
        console.error('🔴 MEMBER INSERT FAILED:', {
          error: memberError,
          errorMessage: memberError?.message,
          errorDetails: memberError?.details,
          groupId: newGroup.id,
          userId: user.id
        });
        addToast(`Group created but failed to add creator as member: ${memberError?.message}`, 'warning');
      } else {
        console.log('✅ CREATOR ADDED AS MEMBER');
        addToast('Group created successfully!', 'success');
      }

      // Reset form and close modal
      setShowCreateGroupModal(false);
      setGroupFormData({ name: '', description: '', rules: '', category: 'professional', visibility: 'public', max_members: null });
      setGroupAvatar(null);
      setGroupBanner(null);
      setGroupAvatarPreview(null);
      setGroupBannerPreview(null);

      // Reload groups
      loadGroups();
      loadMyInviteOnlyGroups();
      loadUserGroups();
    } catch (error) {
      console.error('🔴 UNEXPECTED ERROR CREATING GROUP:', error);
      addToast(`Error creating group: ${error instanceof Error ? error.message : String(error)}`, 'error');
    } finally {
      setCreatingGroup(false);
    }
  };

  // Join a group
  const handleJoinGroup = async (groupId: string) => {
    if (!user?.id) return;

    try {
      // Check if already a member
      const { data: existingMember } = await supabase
        .from('group_members')
        .select('id')
        .eq('group_id', groupId)
        .eq('user_id', user.id)
        .single();

      if (existingMember) {
        addToast('You are already a member of this group', 'info');
        return;
      }

      // Add user to group
      const { error: joinError } = await supabase
        .from('group_members')
        .insert([{
          group_id: groupId,
          user_id: user.id,
          role: 'member',
          status: 'active',
        }]);

      if (joinError) {
        addToast('Failed to join group', 'error');
        return;
      }

      // Update group member count
      const { data: currentGroup } = await supabase
        .from('groups')
        .select('member_count')
        .eq('id', groupId)
        .single();

      if (currentGroup) {
        await supabase
          .from('groups')
          .update({ member_count: currentGroup.member_count + 1 })
          .eq('id', groupId);
      }

      addToast('Joined group successfully!', 'success');
      loadUserGroups();
      loadGroups();
    } catch (error) {
      console.error('Error joining group:', error);
      addToast('Error joining group', 'error');
    }
  };

  const handleFollowCreator = async (creator: Creator) => {
    try {
      // Insert into member_connections (for Connect page)
      const { error: connectionError } = await supabase.from('member_connections').insert({
        member_id: user?.id,
        connected_user_id: creator.id,
        connection_type: 'follow',
        status: 'active',
      });

      // Insert into media_page_follows (for Media page sync and consistency)
      const { error: mediaError } = await supabase.from('media_page_follows').insert({
        follower_id: user?.id,
        creator_name: creator.name,
      }).select();

      if (!connectionError && !mediaError) {
        // Update local state
        setCreators(
          creators.map((c) =>
            c.id === creator.id ? { ...c, followed: true } : c
          )
        );

        addToast(`Now following ${creator.name}`, 'success');

        // Reload creators to get updated follower count from database triggers
        setTimeout(() => loadCreators(), 1000);
      } else {
        addToast('Failed to follow creator', 'error');
      }
    } catch (error) {
      console.error('Error following creator:', error);
      addToast('Failed to follow creator', 'error');
    }
  };

  const handleUnfollowCreator = async (creatorId: string) => {
    try {
      // Find the creator name for media_page_follows deletion
      const creatorToUnfollow = creators.find(c => c.id === creatorId);
      if (!creatorToUnfollow) {
        addToast('Creator not found', 'error');
        return;
      }

      // Delete from member_connections (for Connect page)
      const { error: connectionError } = await supabase
        .from('member_connections')
        .delete()
        .eq('member_id', user?.id)
        .eq('connected_user_id', creatorId);

      // Delete from media_page_follows (for Media page sync)
      const { error: mediaError } = await supabase
        .from('media_page_follows')
        .delete()
        .eq('follower_id', user?.id)
        .eq('creator_name', creatorToUnfollow.name);

      if (!connectionError && !mediaError) {
        // Update local state
        setCreators(
          creators.map((c) =>
            c.id === creatorId ? { ...c, followed: false } : c
          )
        );

        addToast('Unfollowed creator', 'success');

        // Reload creators to get updated follower count from database triggers
        setTimeout(() => loadCreators(), 1000);
      } else {
        addToast('Failed to unfollow creator', 'error');
      }
    } catch (error) {
      console.error('Error unfollowing creator:', error);
      addToast('Failed to unfollow creator', 'error');
    }
  };

  const handleViewCreatorPortfolio = async (creatorId: string) => {
    try {
      setPortfolioLoading(true);

      // Check if creator's portfolio is public
      const { data: profile, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', creatorId)
        .single();

      if (error) {
        console.error('Error loading creator profile:', error);
        addToast('Creator profile not found', 'error');
        setPortfolioLoading(false);
        return;
      }

      // Check if portfolio is public (if column doesn't exist, default to allowing view)
      // portfolio_visibility will be null if the column hasn't been added to the database yet
      const isPublic = profile.portfolio_visibility === 'public' || profile.portfolio_visibility === null;
      if (profile.portfolio_visibility === 'private') {
        addToast('This creator has not made their portfolio public', 'error');
        setPortfolioLoading(false);
        return;
      }

      // Load portfolio projects
      const { data: projects, error: projectsError } = await supabase
        .from('portfolio_projects')
        .select('*')
        .eq('profile_id', creatorId)
        .order('created_at', { ascending: false });

      if (projectsError) {
        console.error('Error loading projects:', projectsError);
      }

      // Load portfolio skills
      const { data: skills, error: skillsError } = await supabase
        .from('portfolio_skills')
        .select('*')
        .eq('profile_id', creatorId);

      if (skillsError) {
        console.error('Error loading skills:', skillsError);
      }

      // Store portfolio data and open modal
      const portfolioInfo = {
        profile,
        projects: projects || [],
        skills: skills || []
      };
      console.log('Portfolio data loaded:', portfolioInfo);
      setPortfolioData(portfolioInfo);
      setPortfolioCreatorId(creatorId);
      setPortfolioModalOpen(true);
      setPortfolioLoading(false);
    } catch (error) {
      console.error('Error viewing creator portfolio:', error);
      addToast('Failed to load portfolio', 'error');
      setPortfolioLoading(false);
    }
  };

  const handleConnectMember = async (member: Member) => {
    try {
      // Check if user is authenticated
      if (!user?.id) {
        console.error('User not authenticated');
        addToast('You must be logged in to send connection requests', 'error');
        return;
      }

      // Check if ANY request exists (pending, accepted, rejected, cancelled) from this user to this member
      // This is important because of the UNIQUE constraint on (sender_id, recipient_id)
      const { data: existingRequest, error: checkError } = await supabase
        .from('connection_requests')
        .select('id, status')
        .eq('sender_id', user.id)
        .eq('recipient_id', member.id)
        .single();

      // If a request exists and is PENDING, block it
      if (existingRequest && existingRequest.status === 'pending') {
        console.log('Pending request already exists:', existingRequest);
        addToast('You already sent a pending request to this member', 'error');
        setTimeout(() => loadMembers(), 300);
        return;
      }

      // If a request exists with any other status, delete it first (cleanup from previous operations)
      if (existingRequest) {
        console.log('Cleaning up old request with status:', existingRequest.status);
        const { error: deleteError } = await supabase
          .from('connection_requests')
          .delete()
          .eq('id', existingRequest.id);

        if (deleteError) {
          console.error('Error cleaning up old request:', deleteError);
          addToast('Failed to clean up previous request. Please try again.', 'error');
          return;
        }

        // Small delay to ensure deletion is complete before creating new one
        await new Promise(resolve => setTimeout(resolve, 200));
      }

      console.log('Sending connection request:', { sender_id: user.id, recipient_id: member.id });

      // Create a new connection request
      const { error } = await supabase.from('connection_requests').insert({
        sender_id: user.id,
        recipient_id: member.id,
        message: null,
        status: 'pending',
      });

      if (error) {
        console.error('Database error:', error.code, error.message, error.details);
        // If we still get a unique constraint error, it likely means there's stale data
        if (error.code === '23505') {
          addToast('A request already exists. Please disconnect and try again.', 'error');
          // Force reload to sync state with database
          setTimeout(() => loadMembers(), 500);
        } else {
          addToast(`Failed to send connection request: ${error.message}`, 'error');
        }
        return;
      }

      // Success: Update local state immediately
      setMembers(
        members.map((m) =>
          m.id === member.id ? { ...m, requestStatus: 'sent' } : m
        )
      );

      addToast(`Connection request sent to ${member.name}`, 'success');

      // Reload members to get fresh request status from database
      setTimeout(() => {
        loadMembers();
        loadConnections();
      }, 500);
    } catch (error) {
      console.error('Error sending connection request:', error);
      addToast('Failed to send connection request', 'error');
    }
  };

  const handleCancelConnectionRequest = async (memberId: string) => {
    try {
      if (!user?.id) {
        addToast('You must be logged in', 'error');
        return;
      }

      // Delete the connection request sent BY current user
      const { error } = await supabase
        .from('connection_requests')
        .delete()
        .eq('sender_id', user.id)
        .eq('recipient_id', memberId);

      if (error) {
        console.error('Error canceling request:', error);
        addToast('Failed to cancel request', 'error');
        return;
      }

      // Update local state
      setMembers(
        members.map((m) =>
          m.id === memberId ? { ...m, requestStatus: 'none' } : m
        )
      );

      addToast('Connection request cancelled', 'success');
      setTimeout(() => loadMembers(), 300);
    } catch (error) {
      console.error('Error canceling connection request:', error);
      addToast('Failed to cancel request', 'error');
    }
  };

  const handleAcceptConnectionRequest = async (memberId: string) => {
    try {
      // Find the connection request from this member to current user
      const { data: requests } = await supabase
        .from('connection_requests')
        .select('id')
        .eq('sender_id', memberId)
        .eq('recipient_id', user?.id)
        .eq('status', 'pending');

      if (requests && requests.length > 0) {
        // Update the request status to accepted
        const { error: updateError } = await supabase
          .from('connection_requests')
          .update({ status: 'accepted' })
          .eq('id', requests[0].id);

        if (!updateError) {
          // Create the actual connection in member_connections
          // CRITICAL: member_id MUST be auth.uid() (current user) to pass RLS policy
          const { error: connectionError } = await supabase
            .from('member_connections')
            .insert({
              member_id: user?.id,  // Current user (acceptor)
              connected_user_id: memberId,  // The requester
              connection_type: 'colleague',
              status: 'active',
            });

          if (connectionError) {
            console.error('Error creating connection:', connectionError.code, connectionError.message);
            addToast('Connection accepted but failed to create connection', 'error');
            setTimeout(() => loadMembers(), 500);
            return;
          }

          // Clear cache
          try {
            localStorage.removeItem('connect_members_cache');
          } catch (e) {
            // Silently fail if localStorage not available
          }

          // Update UI immediately - add to connections and update members
          const memberToConnect = members.find(m => m.id === memberId);
          if (memberToConnect) {
            setConnections([
              ...connections,
              {
                id: memberToConnect.id,
                name: memberToConnect.name,
                avatar_url: memberToConnect.avatar_url,
                role: memberToConnect.role || 'member',
                bio: memberToConnect.bio,
                followers: memberToConnect.followers,
                isFollowing: true,
              }
            ]);
          }

          setMembers(
            members.map((m) =>
              m.id === memberId ? { ...m, connected: true, requestStatus: 'none' } : m
            )
          );

          addToast('Connection accepted', 'success');

          // Reload to sync with database
          setTimeout(() => {
            loadMembers();
            loadConnections();
          }, 500);
        }
      }
    } catch (error) {
      console.error('Error accepting connection request:', error);
      addToast('Failed to accept connection request', 'error');
    }
  };

  const handleDeclineConnectionRequest = async (memberId: string) => {
    try {
      // Find the connection request from this member to current user
      const { data: requests } = await supabase
        .from('connection_requests')
        .select('id')
        .eq('sender_id', memberId)
        .eq('recipient_id', user?.id)
        .eq('status', 'pending');

      if (requests && requests.length > 0) {
        // Update the request status to rejected
        const { error: updateError } = await supabase
          .from('connection_requests')
          .update({ status: 'rejected' })
          .eq('id', requests[0].id);

        if (!updateError) {
          addToast('Connection request declined', 'success');
          setTimeout(() => loadMembers(), 500);
        }
      }
    } catch (error) {
      console.error('Error declining connection request:', error);
      addToast('Failed to decline connection request', 'error');
    }
  };

  const handleDisconnectMember = async (memberId: string) => {
    try {
      if (!user?.id) {
        addToast('You must be logged in', 'error');
        return;
      }

      // Delete connections in both directions to fully disconnect
      // CRITICAL: Filter by status='active' to match the connection creation logic
      const { error: error1 } = await supabase
        .from('member_connections')
        .delete()
        .eq('member_id', user.id)
        .eq('connected_user_id', memberId)
        .eq('connection_type', 'colleague')
        .eq('status', 'active');

      const { error: error2 } = await supabase
        .from('member_connections')
        .delete()
        .eq('member_id', memberId)
        .eq('connected_user_id', user.id)
        .eq('connection_type', 'colleague')
        .eq('status', 'active');

      // Delete ALL connection request records in both directions to allow fresh reconnection
      // This is critical because of the UNIQUE constraint on (sender_id, recipient_id)
      // We must delete regardless of status to ensure a clean slate
      const { error: error3 } = await supabase
        .from('connection_requests')
        .delete()
        .eq('sender_id', user.id)
        .eq('recipient_id', memberId);

      const { error: error4 } = await supabase
        .from('connection_requests')
        .delete()
        .eq('sender_id', memberId)
        .eq('recipient_id', user.id);

      // Log all errors for debugging
      if (error1) console.error('Error disconnecting (direction 1):', error1);
      if (error2) console.error('Error disconnecting (direction 2):', error2);
      if (error3) console.warn('Warning deleting request (direction 1):', error3);
      if (error4) console.warn('Warning deleting request (direction 2):', error4);

      // Success if at least one connection delete worked (request deletes are important but not critical)
      // The important part is that the connections were deleted
      if (!error1 || !error2) {
        // Clear cache
        try {
          localStorage.removeItem('connect_members_cache');
        } catch (e) {
          // Silently fail
        }

        // Update UI immediately - remove from connections and update members
        setConnections(
          connections.filter((c) => c.id !== memberId)
        );

        setMembers(
          members.map((m) =>
            m.id === memberId ? { ...m, connected: false, requestStatus: 'none' } : m
          )
        );

        // Clear pending request state for this member
        setPendingRequests((prev) => {
          const updated = { ...prev };
          delete updated[memberId];
          return updated;
        });

        addToast('Disconnected', 'success');

        // Reload to sync with database and ensure all requests are cleaned up
        // Use longer delay to ensure deletes are fully persisted
        setTimeout(() => {
          loadMembers();
          loadConnections();
        }, 800);
      } else {
        addToast('Failed to disconnect', 'error');
      }
    } catch (error) {
      console.error('Error disconnecting:', error);
      addToast('Failed to disconnect', 'error');
    }
  };

  const getAttachmentType = (mimeType: string): 'image' | 'video' | 'document' | 'audio' => {
    if (mimeType.startsWith('image/')) return 'image';
    if (mimeType.startsWith('video/')) return 'video';
    if (mimeType.startsWith('audio/')) return 'audio';
    return 'document';
  };

  const uploadAttachmentToB2 = async (file: File): Promise<{ url: string; type: 'image' | 'video' | 'document' | 'audio' } | null> => {
    if (!file) return null;

    try {
      setUploadingAttachment(true);

      // Generate unique filename
      const timestamp = Date.now();
      const randomId = Math.random().toString(36).substr(2, 9);
      const extension = file.name.split('.').pop() || '';
      const filename = `messages/${user?.id}/${timestamp}-${randomId}.${extension}`;

      // Create FormData for upload
      const formData = new FormData();
      formData.append('file', file);
      formData.append('filename', filename);
      formData.append('contentType', file.type || 'application/octet-stream');

      // Upload to B2 via edge function
      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/upload-to-b2`,
        {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${(await supabase.auth.getSession()).data.session?.access_token}`,
          },
          body: formData,
        }
      );

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Upload failed');
      }

      const data = await response.json();
      setUploadingAttachment(false);

      return {
        url: data.publicUrl,
        type: getAttachmentType(file.type || 'application/octet-stream'),
      };
    } catch (error) {
      console.error('Error uploading attachment:', error);
      addToast('Failed to upload attachment', 'error');
      setUploadingAttachment(false);
      return null;
    }
  };

  const getFileExtension = (filename: string): string => {
    return filename.split('.').pop()?.toLowerCase() || '';
  };

  const isPreviewableFile = (attachmentType?: string): boolean => {
    return attachmentType === 'image' || attachmentType === 'video' || attachmentType === 'document';
  };

  const getFileIcon = (attachmentType?: string): string => {
    switch (attachmentType) {
      case 'image':
        return '🖼️';
      case 'video':
        return '🎥';
      case 'audio':
        return '🎵';
      case 'document':
        return '📄';
      default:
        return '📎';
    }
  };

  const getAttachmentMessage = (attachmentType?: string): string => {
    switch (attachmentType) {
      case 'image':
        return '🖼️ Sent an image';
      case 'video':
        return '🎥 Sent a video';
      case 'audio':
        return '🎵 Sent an audio file';
      case 'document':
        return '📄 Sent a document';
      default:
        return '📎 Sent an attachment';
    }
  };

  const handleDeleteMessage = async (messageId: string) => {
    try {
      const { error } = await supabase
        .from('messages')
        .update({ deleted_at: new Date().toISOString() })
        .eq('id', messageId);

      if (error) {
        console.error('Error deleting message:', error);
        addToast('Failed to delete message', 'error');
        return;
      }

      // Reload messages to reflect deletion
      await loadMessages();
      addToast('Message deleted', 'success');
      setOpenMenuMessageId(null);
    } catch (error) {
      console.error('Error deleting message:', error);
      addToast('Failed to delete message', 'error');
    }
  };

  const handleEditMessage = async (messageId: string) => {
    if (!editingMessageContent.trim()) {
      addToast('Message cannot be empty', 'error');
      return;
    }

    try {
      const { error } = await supabase
        .from('messages')
        .update({
          content: editingMessageContent,
          updated_at: new Date().toISOString()
        })
        .eq('id', messageId);

      if (error) {
        console.error('Error editing message:', error);
        addToast('Failed to edit message', 'error');
        return;
      }

      // Reload messages to reflect edit
      await loadMessages();
      addToast('Message updated', 'success');
      setEditingMessageId(null);
      setEditingMessageContent('');
      setOpenMenuMessageId(null);
    } catch (error) {
      console.error('Error editing message:', error);
      addToast('Failed to edit message', 'error');
    }
  };

  const handleSendMessage = async () => {
    if (!selectedConnection) return;
    if (!messageInput.trim() && !selectedAttachment) return;

    try {
      let attachment_url: string | null = null;
      let attachment_type: 'image' | 'video' | 'document' | 'audio' | null = null;

      // Upload attachment if selected
      if (selectedAttachment) {
        const uploadResult = await uploadAttachmentToB2(selectedAttachment);
        if (uploadResult) {
          attachment_url = uploadResult.url;
          attachment_type = uploadResult.type;
        } else {
          addToast('Message not sent - attachment upload failed', 'error');
          return;
        }
      }

      // Insert message
      const messageData: any = {
        sender_id: user?.id,
        recipient_id: selectedConnection.id,
        content: messageInput || (attachment_url ? getAttachmentMessage(attachment_type) : ''),
        read: false,
      };

      if (attachment_url) {
        messageData.attachment_url = attachment_url;
        messageData.attachment_type = attachment_type;
      }

      console.log('Sending message:', messageData);
      const { error } = await supabase.from('messages').insert(messageData);

      if (error) {
        console.error('Database error:', error);
        addToast('Failed to send message', 'error');
        return;
      }

      console.log('Message inserted successfully, now loading messages...');

      // Clear inputs and state
      setMessageInput('');
      setSelectedAttachment(null);

      // Reload messages immediately - don't wait for real-time subscription
      console.log('Calling loadMessages...');
      await loadMessages();
      console.log('Messages loaded after send');
    } catch (error) {
      console.error('Error sending message:', error);
      addToast('Failed to send message', 'error');
    }
  };

  const addToast = (message: string, type: 'success' | 'error') => {
    const id = Math.random().toString(36).substr(2, 9);
    const toast: Toast = { id, type, message };
    setToasts((prev) => [...prev, toast]);

    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 4000);
  };

  // Filter and sort creators (exclude followed ones from Discover)
  const filteredAndSortedCreators = creators
    .filter((creator) => {
      const matchesSearch =
        creator.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        creator.bio?.toLowerCase().includes(searchQuery.toLowerCase());
      const isNotFollowed = !creator.followed; // Exclude followed creators
      return matchesSearch && isNotFollowed;
    })
    .sort((a, b) => {
      if (selectedSort === 'trending') {
        return (b.followers || 0) - (a.followers || 0);
      } else if (selectedSort === 'new') {
        return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
      } else if (selectedSort === 'popular') {
        return (b.followers || 0) - (a.followers || 0);
      }
      return 0;
    });

  // Filter members (exclude connected ones from Discover)
  const filteredMembers = members.filter((member) => {
    const matchesSearch =
      member.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      member.bio?.toLowerCase().includes(searchQuery.toLowerCase());
    const isNotConnected = !member.connected; // Exclude connected members
    return matchesSearch && isNotConnected;
  });

  if (user?.role !== 'member') {
    return (
      <div className="min-h-screen pt-20 pb-12 px-4 bg-gradient-to-b from-slate-950 via-slate-900 to-slate-950">
        <div className="max-w-7xl mx-auto text-center py-20">
          <AlertCircle className="w-12 h-12 text-rose-400 mx-auto mb-4" />
          <p className="text-gray-300 text-lg">This feature is available for community members only.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen pt-20 pb-12 px-4 bg-gradient-to-b from-slate-950 via-slate-900 to-slate-950">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-10">
          <div className="mb-4">
            <h1 className="text-4xl font-playfair font-bold text-white">Connect</h1>
          </div>
          <p className="text-gray-300 text-lg">
            Grow your network — connect with members, creators, groups, and teams
          </p>
        </div>

        {/* Main Tab Navigation */}
        <div className="flex gap-2 mb-8 border-b border-white/10 overflow-x-auto pb-0">
          {[
            { id: 'discover', label: 'Discover', icon: Eye },
            { id: 'network', label: 'My Network', icon: Users },
            { id: 'groups', label: 'Groups', icon: FolderPlus },
            { id: 'teams', label: 'Teams', icon: Briefcase },
            { id: 'messages', label: 'Messages', icon: MessageSquare },
          ].map(({ id, label, icon: Icon }) => (
            <button
              key={id}
              onClick={() => setActiveTab(id as any)}
              className={`px-6 py-3 font-semibold transition-all capitalize whitespace-nowrap flex items-center gap-2 ${
                activeTab === id
                  ? 'text-rose-400 border-b-2 border-rose-400'
                  : 'text-gray-400 hover:text-white'
              }`}
            >
              <Icon className="w-4 h-4" />
              {label}
            </button>
          ))}
        </div>

        {/* Discover Tab */}
        {activeTab === 'discover' && (
          <div className="space-y-8">
            {/* Sub-tabs for Discover */}
            <div className="flex gap-4 border-b border-white/10 pb-4">
              {['creators', 'members', 'recommendations'].map((tab) => (
                <button
                  key={tab}
                  onClick={() => setDiscoverSubTab(tab as any)}
                  className={`px-4 py-2 font-semibold transition-all capitalize ${
                    discoverSubTab === tab
                      ? 'text-rose-400 border-b-2 border-rose-400'
                      : 'text-gray-400 hover:text-white'
                  }`}
                >
                  {tab === 'creators' && '✨ Creators'}
                  {tab === 'members' && '👥 Members'}
                  {tab === 'recommendations' && '⚡ Recommended'}
                </button>
              ))}
            </div>

            {/* Search and Filters - Responsive layout */}
            {/* Mobile layout: stacked */}
            <div className="md:hidden space-y-3">
              {/* Search Bar - Full width on mobile */}
              <div className="relative w-full">
                <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
                <input
                  type="text"
                  placeholder={`Search ${discoverSubTab}...`}
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-12 pr-4 py-3 bg-white/5 border border-white/10 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:border-rose-400 focus:bg-white/10"
                />
              </div>

              {/* Creators: Filter Icon & Category Controls - Stacked on mobile */}
              {discoverSubTab === 'creators' && (
                <div className="flex gap-3 items-center flex-wrap">
                  {/* Filter Icon (just icon) */}
                  <button className="p-3 bg-white/10 hover:bg-white/20 rounded-lg transition-colors border border-white/10 hover:border-rose-400/50 text-gray-300 hover:text-white flex-shrink-0">
                    <Filter className="w-5 h-5" />
                  </button>

                  {/* Sort Dropdown */}
                  <select
                    value={selectedSort}
                    onChange={(e) => setSelectedSort(e.target.value)}
                    className="px-4 py-3 bg-white/5 border border-white/10 rounded-lg text-white font-semibold focus:outline-none focus:border-rose-400 focus:bg-white/10 hover:border-white/20 transition-colors appearance-none cursor-pointer flex-shrink-0 text-sm"
                  >
                    <option value="all" className="bg-slate-900 text-white">Sort: All</option>
                    <option value="trending" className="bg-slate-900 text-white">Sort: Trending 🔥</option>
                    <option value="new" className="bg-slate-900 text-white">Sort: New ✨</option>
                    <option value="popular" className="bg-slate-900 text-white">Sort: Popular ⭐</option>
                  </select>

                  {/* Category Dropdown */}
                  <select
                    value={selectedCategory}
                    onChange={(e) => setSelectedCategory(e.target.value)}
                    className="px-4 py-3 bg-white/5 border border-white/10 rounded-lg text-white font-semibold focus:outline-none focus:border-rose-400 focus:bg-white/10 hover:border-white/20 transition-colors appearance-none cursor-pointer flex-shrink-0 text-sm flex-1"
                  >
                    {PROFESSIONAL_CATEGORIES.map((cat) => (
                      <option key={cat} value={cat} className="bg-slate-900 text-white">
                        {cat === 'all' ? 'All Categories' : cat.split('-').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ')}
                      </option>
                    ))}
                  </select>
                </div>
              )}
            </div>

            {/* Desktop layout: all on one line */}
            <div className="hidden md:flex gap-3 items-center">
              {/* Search Bar */}
              <div className="relative flex-1">
                <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
                <input
                  type="text"
                  placeholder={`Search ${discoverSubTab}...`}
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-12 pr-4 py-3 bg-white/5 border border-white/10 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:border-rose-400 focus:bg-white/10"
                />
              </div>

              {/* Creators: Filter Icon & Category Controls */}
              {discoverSubTab === 'creators' && (
                <>
                  {/* Filter Icon (just icon) */}
                  <button className="p-3 bg-white/10 hover:bg-white/20 rounded-lg transition-colors border border-white/10 hover:border-rose-400/50 text-gray-300 hover:text-white flex-shrink-0">
                    <Filter className="w-5 h-5" />
                  </button>

                  {/* Sort Dropdown */}
                  <select
                    value={selectedSort}
                    onChange={(e) => setSelectedSort(e.target.value)}
                    className="px-4 py-3 bg-white/5 border border-white/10 rounded-lg text-white font-semibold focus:outline-none focus:border-rose-400 focus:bg-white/10 hover:border-white/20 transition-colors appearance-none cursor-pointer flex-shrink-0"
                  >
                    <option value="all" className="bg-slate-900 text-white">Sort: All</option>
                    <option value="trending" className="bg-slate-900 text-white">Sort: Trending 🔥</option>
                    <option value="new" className="bg-slate-900 text-white">Sort: New ✨</option>
                    <option value="popular" className="bg-slate-900 text-white">Sort: Popular ⭐</option>
                  </select>

                  {/* Category Dropdown */}
                  <select
                    value={selectedCategory}
                    onChange={(e) => setSelectedCategory(e.target.value)}
                    className="px-4 py-3 bg-white/5 border border-white/10 rounded-lg text-white font-semibold focus:outline-none focus:border-rose-400 focus:bg-white/10 hover:border-white/20 transition-colors appearance-none cursor-pointer flex-shrink-0"
                  >
                    {PROFESSIONAL_CATEGORIES.map((cat) => (
                      <option key={cat} value={cat} className="bg-slate-900 text-white">
                        {cat === 'all' ? 'All Categories' : cat.split('-').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ')}
                      </option>
                    ))}
                  </select>
                </>
              )}
            </div>

            {/* Creators Grid */}
            {discoverSubTab === 'creators' && (
              <div>
                <h2 className="text-2xl font-bold text-white mb-6">{getCreatorHeader()}</h2>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {filteredAndSortedCreators.length > 0 ? (
                    filteredAndSortedCreators.map((creator) => (
                        <div
                          key={creator.id}
                          className="glass-effect rounded-2xl p-6 border border-white/10 hover:border-rose-400/50 transition-all group"
                        >
                          <div className="flex items-start justify-between mb-4">
                            <div className="flex items-center gap-3">
                              <img
                                src={creator.avatar_url || 'https://via.placeholder.com/48'}
                                alt={creator.name}
                                className="w-12 h-12 rounded-full object-cover"
                              />
                              <div>
                                <h3 className="text-lg font-bold text-white">{creator.name}</h3>
                                <div className="flex items-center gap-1 text-xs text-yellow-400">
                                  <Star className="w-3 h-3" />
                                  {creator.tier?.charAt(0).toUpperCase() + creator.tier?.slice(1)}
                                </div>
                              </div>
                            </div>
                          </div>

                          <p className="text-sm text-gray-300 mb-4 line-clamp-2">
                            {creator.bio || 'Talented creator on FlourishTalents'}
                          </p>

                          <div className="flex items-center gap-4 mb-6 text-sm text-gray-400">
                            <div className="flex items-center gap-1">
                              <Users className="w-4 h-4" />
                              <span>{creator.followers || 0} followers</span>
                            </div>
                          </div>

                          <div className="flex gap-2">
                            <button
                              onClick={() => handleViewCreatorPortfolio(creator.id)}
                              className="flex-1 py-2 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-lg transition-colors flex items-center justify-center gap-2"
                              title="View portfolio"
                            >
                              <Eye className="w-4 h-4" />
                            </button>
                            {creator.followed ? (
                              <button
                                onClick={() => handleUnfollowCreator(creator.id)}
                                className="flex-1 py-2 bg-white/10 text-white font-semibold rounded-lg hover:bg-white/20 transition-colors flex items-center justify-center gap-2"
                              >
                                <UserCheck className="w-4 h-4" />
                                Following
                              </button>
                            ) : (
                              <button
                                onClick={() => handleFollowCreator(creator)}
                                className="flex-1 py-2 bg-gradient-to-r from-rose-500 to-purple-600 text-white font-semibold rounded-lg hover:shadow-lg transition-all flex items-center justify-center gap-2 group-hover:shadow-rose-500/50"
                              >
                                <UserPlus className="w-4 h-4" />
                                Follow
                              </button>
                            )}
                          </div>
                        </div>
                    ))
                  ) : creatorsLoaded ? (
                    <div className="col-span-full text-center py-12">
                      <p className="text-gray-400">No creators found matching your search.</p>
                    </div>
                  ) : null}
                </div>
              </div>
            )}

            {/* Members Grid */}
            {discoverSubTab === 'members' && (
              <div>
                <h2 className="text-2xl font-bold text-white mb-6">Members</h2>
                {filteredMembers.length > 0 ? (
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {filteredMembers.map((member) => (
                      <div
                        key={member.id}
                        className="glass-effect rounded-2xl p-6 border border-white/10 hover:border-rose-400/50 transition-all group"
                      >
                        <div className="flex items-start justify-between mb-4">
                          <div className="flex items-center gap-3">
                            <img
                              src={member.avatar_url || 'https://via.placeholder.com/48'}
                              alt={member.name}
                              className="w-12 h-12 rounded-full object-cover"
                            />
                            <div>
                              <h3 className="text-lg font-bold text-white">{member.name}</h3>
                              <div className="flex items-center gap-1 text-xs text-blue-400">
                                <Users className="w-3 h-3" />
                                {member.tier?.charAt(0).toUpperCase() + member.tier?.slice(1)}
                              </div>
                            </div>
                          </div>
                        </div>

                        <p className="text-sm text-gray-300 mb-4 line-clamp-2">
                          {member.bio || 'Member of FlourishTalents'}
                        </p>

                        <div className="flex items-center gap-4 mb-6 text-sm text-gray-400">
                          <div className="flex items-center gap-1">
                            <Users className="w-4 h-4" />
                            <span>{member.followers || 0} connections</span>
                          </div>
                        </div>

                        <div className="space-y-3">
                          {/* Show notification badge only if YOU sent a request (waiting for response) */}
                          {member.requestStatus === 'sent' && (
                            <div className="inline-flex items-center gap-1 px-3 py-1 bg-yellow-500/20 rounded-full text-xs text-yellow-300 font-medium">
                              <Clock className="w-3 h-3" />
                              Request Pending
                            </div>
                          )}

                          {/* Show notification badge if you RECEIVED a request */}
                          {member.requestStatus === 'received' && (
                            <div className="inline-flex items-center gap-1 px-3 py-1 bg-blue-500/20 rounded-full text-xs text-blue-300 font-medium">
                              <AlertCircle className="w-3 h-3" />
                              Connection Request
                            </div>
                          )}

                          <div className="flex gap-2">
                            {member.connected ? (
                              <>
                                <button
                                  onClick={() => {
                                    const conn = connections.find(c => c.id === member.id);
                                    if (conn) setSelectedConnection(conn);
                                    setActiveTab('messages');
                                  }}
                                  className="flex-1 py-2 bg-gradient-to-r from-rose-500 to-purple-600 text-white font-semibold rounded-lg hover:shadow-lg transition-all flex items-center justify-center gap-2"
                                >
                                  <MessageSquare className="w-4 h-4" />
                                  Message
                                </button>
                                <button
                                  onClick={() => handleDisconnectMember(member.id)}
                                  className="flex-1 py-2 bg-red-600 hover:bg-red-700 text-white font-semibold rounded-lg transition-colors flex items-center justify-center gap-2"
                                >
                                  <UserMinus className="w-4 h-4" />
                                  Disconnect
                                </button>
                              </>
                            ) : member.requestStatus === 'received' ? (
                              <>
                                <button
                                  onClick={() => handleAcceptConnectionRequest(member.id)}
                                  className="flex-1 py-2 bg-gradient-to-r from-green-500 to-emerald-600 text-white font-semibold rounded-lg hover:shadow-lg transition-all flex items-center justify-center gap-2"
                                >
                                  <UserCheck className="w-4 h-4" />
                                  Accept
                                </button>
                                <button
                                  onClick={() => handleDeclineConnectionRequest(member.id)}
                                  className="flex-1 py-2 bg-white/10 text-white font-semibold rounded-lg hover:bg-white/20 transition-colors"
                                >
                                  Decline
                                </button>
                              </>
                            ) : member.requestStatus === 'sent' ? (
                              <button
                                onClick={() => handleCancelConnectionRequest(member.id)}
                                className="w-full py-2 bg-yellow-600 hover:bg-yellow-700 text-white font-semibold rounded-lg transition-colors flex items-center justify-center gap-2"
                              >
                                <Clock className="w-4 h-4" />
                                Cancel Request
                              </button>
                            ) : (
                              <button
                                onClick={() => handleConnectMember(member)}
                                className="w-full py-2 bg-gradient-to-r from-rose-500 to-purple-600 text-white font-semibold rounded-lg hover:shadow-lg transition-all flex items-center justify-center gap-2 group-hover:shadow-rose-500/50"
                              >
                                <UserPlus className="w-4 h-4" />
                                Connect
                              </button>
                            )}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : membersLoaded ? (
                  <div className="col-span-full text-center py-12">
                    <p className="text-gray-400">No members found matching your search.</p>
                  </div>
                ) : null}
              </div>
            )}

            {/* Recommendations Grid */}
            {discoverSubTab === 'recommendations' && (
              <div>
                <h2 className="text-2xl font-bold text-white mb-6 flex items-center gap-2">
                  <Zap className="w-6 h-6 text-yellow-400" />
                  Recommended For You
                </h2>
                {recommendations.length > 0 ? (
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {recommendations.map((rec) => (
                      <div
                        key={rec.id}
                        className="glass-effect rounded-2xl p-6 border border-white/10 hover:border-rose-400/50 transition-all"
                      >
                        <div className="flex items-start gap-3 mb-4">
                          <img
                            src={rec.avatar_url || 'https://via.placeholder.com/48'}
                            alt={rec.name}
                            className="w-12 h-12 rounded-full object-cover"
                          />
                          <div className="flex-1">
                            <h3 className="text-lg font-bold text-white">{rec.name}</h3>
                            <div className="flex items-center gap-1 text-xs text-yellow-400">
                              <Star className="w-3 h-3" />
                              {Math.round(rec.score * 100)}% Match
                            </div>
                          </div>
                        </div>

                        <p className="text-xs text-rose-300 bg-rose-500/10 px-3 py-1 rounded-full inline-block mb-3">
                          {rec.reason}
                        </p>

                        <p className="text-sm text-gray-300 mb-4">{rec.bio}</p>

                        <button className="w-full py-2 bg-gradient-to-r from-rose-500 to-purple-600 text-white font-semibold rounded-lg hover:shadow-lg transition-all flex items-center justify-center gap-2">
                          <UserPlus className="w-4 h-4" />
                          Connect
                        </button>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="col-span-full text-center py-12 glass-effect rounded-2xl border border-white/10">
                    <Zap className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                    <p className="text-gray-400">No recommendations at the moment. Keep building your network!</p>
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {/* Network Tab */}
        {activeTab === 'network' && (
          <div className="space-y-8">
            {/* Following Creators */}
            <div>
              <h2 className="text-2xl font-bold text-white mb-6 flex items-center gap-2">
                <Star className="w-6 h-6 text-yellow-400" />
                Following ({creators.filter(c => c.followed).length})
              </h2>

              {creators.filter(c => c.followed).length > 0 ? (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {creators.filter(c => c.followed).map((creator) => (
                    <div key={creator.id} className="glass-effect rounded-2xl p-6 border border-white/10 hover:border-rose-400/50 transition-all">
                      <div className="flex items-start justify-between mb-4">
                        <div className="flex items-center gap-3">
                          <img src={creator.avatar_url || 'https://via.placeholder.com/48'} alt={creator.name} className="w-12 h-12 rounded-full object-cover" />
                          <div>
                            <h3 className="text-lg font-bold text-white">{creator.name}</h3>
                            <div className="flex items-center gap-1 text-xs text-yellow-400">
                              <Star className="w-3 h-3" />
                              {creator.tier?.charAt(0).toUpperCase() + creator.tier?.slice(1)}
                            </div>
                          </div>
                        </div>
                      </div>
                      <p className="text-sm text-gray-300 mb-4 line-clamp-2">{creator.bio || 'Talented creator'}</p>
                      <div className="flex items-center gap-4 mb-4 text-sm text-gray-400">
                        <div className="flex items-center gap-1">
                          <Users className="w-4 h-4" />
                          {creator.followers || 0} followers
                        </div>
                      </div>
                      <div className="flex gap-2">
                        <button onClick={() => handleViewCreatorPortfolio(creator.id)} className="flex-1 py-2 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-lg transition-colors flex items-center justify-center gap-2" title="View portfolio">
                          <Eye className="w-4 h-4" />
                        </button>
                        <button onClick={() => handleUnfollowCreator(creator.id)} className="flex-1 py-2 bg-white/10 text-white font-semibold rounded-lg hover:bg-white/20 transition-colors flex items-center justify-center gap-2">
                          <UserCheck className="w-4 h-4" />
                          Unfollow
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8 glass-effect rounded-2xl border border-white/10">
                  <p className="text-gray-400">You're not following any creators yet.</p>
                </div>
              )}
            </div>

            {/* Connected Members */}
            <div>
              <h2 className="text-2xl font-bold text-white mb-6 flex items-center gap-2">
                <Users className="w-6 h-6 text-rose-400" />
                Connected Members ({connections.length})
              </h2>

              {connections.length > 0 ? (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {connections.map((connection) => (
                    <div
                      key={connection.id}
                      className="glass-effect rounded-2xl p-6 border border-white/10 hover:border-rose-400/50 transition-all"
                    >
                      <div className="flex items-start gap-4 mb-4">
                        <img
                          src={connection.avatar_url || 'https://via.placeholder.com/48'}
                          alt={connection.name}
                          className="w-16 h-16 rounded-full object-cover"
                        />
                        <div className="flex-1">
                          <h3 className="text-lg font-bold text-white">{connection.name}</h3>
                          <p className="text-xs text-gray-400 capitalize">{connection.role}</p>
                          <div className="mt-2 inline-flex items-center gap-1 px-2 py-1 bg-rose-500/20 rounded text-xs text-rose-300 font-medium">
                            Connected
                          </div>
                        </div>
                      </div>

                      <p className="text-sm text-gray-300 mb-4">
                        {connection.bio || 'Member on FlourishTalents'}
                      </p>

                      <div className="flex items-center gap-4 mb-4 text-sm text-gray-400">
                        <div className="flex items-center gap-1">
                          <Users className="w-4 h-4" />
                          <span>{connection.followers || 0} connections</span>
                        </div>
                      </div>

                      <div className="flex gap-2">
                        <button
                          onClick={() => {
                            setSelectedConnection(connection);
                            setActiveTab('messages');
                          }}
                          className="flex-1 py-2 bg-white/10 text-white font-semibold rounded-lg hover:bg-white/20 transition-colors flex items-center justify-center gap-2"
                        >
                          <MessageSquare className="w-4 h-4" />
                          Message
                        </button>
                        <button
                          onClick={() => handleDisconnectMember(connection.id)}
                          className="flex-1 py-2 bg-red-600 hover:bg-red-700 text-white font-semibold rounded-lg transition-colors flex items-center justify-center gap-2"
                        >
                          <UserMinus className="w-4 h-4" />
                          Disconnect
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8 glass-effect rounded-2xl border border-white/10">
                  <Users className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                  <p className="text-gray-400">You haven't connected with any members yet.</p>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Groups Tab */}
        {activeTab === 'groups' && (
          <div className="space-y-8">
            {/* Pending Group Invitations Section */}
            {pendingInvites.length > 0 && (
              <div className="glass-effect rounded-2xl border border-amber-400/30 p-6">
                <h3 className="text-xl font-bold text-white mb-4 flex items-center gap-2">
                  <UserPlus className="w-5 h-5 text-amber-400" />
                  Pending Group Invitations ({pendingInvites.length})
                </h3>
                <div className="space-y-3">
                  {pendingInvites.map((invite) => (
                    <div key={invite.id} className="bg-white/5 rounded-lg p-4 border border-white/10 flex items-center justify-between">
                      <div className="flex items-center gap-3 flex-1">
                        {invite.group_avatar && (
                          <img
                            src={invite.group_avatar}
                            alt={invite.group_name}
                            className="w-12 h-12 rounded-lg object-cover"
                          />
                        )}
                        <div className="flex-1">
                          <p className="font-semibold text-white">{invite.group_name}</p>
                          <p className="text-sm text-gray-400">Invited by {invite.invited_by_name}</p>
                          {invite.message && (
                            <p className="text-sm text-gray-300 mt-1">"{invite.message}"</p>
                          )}
                        </div>
                      </div>
                      <div className="flex gap-2">
                        <button
                          onClick={() => handleAcceptGroupInvite(invite.id, invite.group_id)}
                          className="px-4 py-2 bg-green-500/30 text-green-300 hover:bg-green-500/50 rounded-lg transition-colors font-semibold text-sm"
                        >
                          Accept
                        </button>
                        <button
                          onClick={() => handleRejectGroupInvite(invite.id)}
                          className="px-4 py-2 bg-red-500/30 text-red-300 hover:bg-red-500/50 rounded-lg transition-colors font-semibold text-sm"
                        >
                          Reject
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <div className="flex justify-between items-center">
              <h2 className="text-2xl font-bold text-white flex items-center gap-2">
                <FolderPlus className="w-6 h-6 text-rose-400" />
                Discover Groups
              </h2>
              <button onClick={() => setShowCreateGroupModal(true)} className="px-4 py-2 bg-gradient-to-r from-rose-500 to-purple-600 text-white font-semibold rounded-lg hover:shadow-lg transition-all">
                Create Group
              </button>
            </div>

            {groups.length > 0 ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {groups.map((group) => (
                  <div
                    key={group.id}
                    className="glass-effect rounded-2xl overflow-hidden border border-white/10 hover:border-rose-400/50 transition-all group cursor-pointer flex flex-col"
                  >
                    {/* Banner */}
                    <div className="h-28 bg-gradient-to-r from-rose-500/20 to-purple-600/20 relative">
                      {group.banner_url ? (
                        <img
                          src={group.banner_url}
                          alt={group.name}
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <div className="w-full h-full bg-gradient-to-r from-rose-500/10 to-purple-600/10" />
                      )}
                    </div>

                    {/* Avatar and Info */}
                    <div className="p-6 flex-1 flex flex-col">
                      <div className="flex items-start gap-3 mb-4">
                        {group.avatar_url && (
                          <img
                            src={group.avatar_url}
                            alt={group.name}
                            className="w-12 h-12 rounded-lg object-cover"
                          />
                        )}
                        <div className="flex-1">
                          <h3 className="text-lg font-bold text-white">{group.name}</h3>
                          <p className="text-xs text-gray-400 capitalize">
                            {group.visibility === 'invite_only' ? '🔒 Invite Only' : group.visibility === 'private' ? '🔐 Private' : '🌐 Public'}
                          </p>
                        </div>
                      </div>

                      <p className="text-sm text-gray-300 mb-4 line-clamp-2 flex-1">{group.description}</p>

                      <div className="flex items-center justify-between mb-4 text-sm text-gray-400">
                        <div className="flex items-center gap-1">
                          <Users className="w-4 h-4" />
                          {group.member_count} {group.max_members ? `/ ${group.max_members}` : ''} members
                        </div>
                        <span className="text-xs px-2 py-1 bg-rose-500/20 text-rose-300 rounded-full capitalize">
                          {group.category}
                        </span>
                      </div>

                      {userGroups.includes(group.id) ? (
                        <button
                          onClick={() => loadGroupDetail(group.id)}
                          className="w-full py-2 bg-blue-500/30 text-blue-300 font-semibold rounded-lg hover:bg-blue-500/50 transition-colors mb-2"
                        >
                          View Group
                        </button>
                      ) : (
                        <button
                          onClick={() => handleJoinGroup(group.id)}
                          className="w-full py-2 bg-rose-500 text-white font-semibold rounded-lg hover:bg-rose-600 transition-colors"
                        >
                          Join Group
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-12 glass-effect rounded-2xl border border-white/10">
                <FolderPlus className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                <p className="text-gray-400">No groups available at the moment.</p>
              </div>
            )}

            {/* My Invite-Only Groups Section */}
            {myInviteOnlyGroups.length > 0 && (
              <div>
                <div className="flex items-center gap-2 mb-6">
                  <h2 className="text-2xl font-bold text-white flex items-center gap-2">
                    <FolderPlus className="w-6 h-6 text-purple-400" />
                    🔒 My Private Groups
                  </h2>
                  <span className="px-3 py-1 bg-purple-500/20 text-purple-300 rounded-full text-sm font-semibold">
                    {myInviteOnlyGroups.length}
                  </span>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {myInviteOnlyGroups.map((group) => (
                    <div
                      key={group.id}
                      className="glass-effect rounded-2xl overflow-hidden border border-purple-400/30 hover:border-purple-400/60 transition-all group cursor-pointer flex flex-col"
                    >
                      {/* Banner */}
                      <div className="h-28 bg-gradient-to-r from-purple-500/20 to-indigo-600/20 relative">
                        {group.banner_url ? (
                          <img
                            src={group.banner_url}
                            alt={group.name}
                            className="w-full h-full object-cover"
                          />
                        ) : (
                          <div className="w-full h-full bg-gradient-to-r from-purple-500/10 to-indigo-600/10" />
                        )}
                        <div className="absolute top-2 right-2 px-2 py-1 bg-purple-600 rounded-lg text-white text-xs font-semibold flex items-center gap-1">
                          🔒 Invite Only
                        </div>
                      </div>

                      {/* Avatar and Info */}
                      <div className="p-6 flex-1 flex flex-col">
                        <div className="flex items-start gap-3 mb-4">
                          {group.avatar_url && (
                            <img
                              src={group.avatar_url}
                              alt={group.name}
                              className="w-12 h-12 rounded-lg object-cover"
                            />
                          )}
                          <div className="flex-1">
                            <h3 className="text-lg font-bold text-white">{group.name}</h3>
                            <p className="text-xs text-purple-300 font-semibold">
                              {group.creator_id === user?.id ? '👑 You created this' : '📝 You are a member'}
                            </p>
                          </div>
                        </div>

                        <p className="text-sm text-gray-300 mb-4 line-clamp-2 flex-1">{group.description}</p>

                        <div className="flex items-center justify-between mb-4 text-sm text-gray-400">
                          <div className="flex items-center gap-1">
                            <Users className="w-4 h-4" />
                            {group.member_count} {group.max_members ? `/ ${group.max_members}` : ''} members
                          </div>
                          <span className="text-xs px-2 py-1 bg-purple-500/20 text-purple-300 rounded-full capitalize">
                            {group.category}
                          </span>
                        </div>

                        <button
                          onClick={() => loadGroupDetail(group.id)}
                          className="w-full py-2 bg-blue-600 text-white font-semibold rounded-lg hover:bg-blue-700 transition-colors flex items-center justify-center gap-2 mb-2"
                        >
                          💬 View Group
                        </button>

                        {group.creator_id === user?.id && (
                          <button
                            onClick={() => {
                              setSelectedGroupForInvite(group);
                              setShowInviteModal(true);
                            }}
                            className="w-full py-2 bg-purple-600 text-white font-semibold rounded-lg hover:bg-purple-700 transition-colors flex items-center justify-center gap-2"
                          >
                            <UserPlus className="w-4 h-4" />
                            Invite Members
                          </button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* Teams Tab */}
        {activeTab === 'teams' && (
          <div className="space-y-8">
            <div className="flex justify-between items-center">
              <h2 className="text-2xl font-bold text-white flex items-center gap-2">
                <Briefcase className="w-6 h-6 text-rose-400" />
                Professional Teams
              </h2>
              <button className="px-4 py-2 bg-gradient-to-r from-rose-500 to-purple-600 text-white font-semibold rounded-lg hover:shadow-lg transition-all">
                Create Team
              </button>
            </div>

            {teams.length > 0 ? (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {teams.map((team) => (
                  <div
                    key={team.id}
                    className="glass-effect rounded-2xl p-6 border border-white/10 hover:border-rose-400/50 transition-all"
                  >
                    <div className="flex items-start gap-4 mb-4">
                      <div className="w-16 h-16 rounded-xl bg-gradient-to-br from-rose-500 to-purple-600 flex items-center justify-center flex-shrink-0">
                        <Briefcase className="w-8 h-8 text-white" />
                      </div>
                      <div className="flex-1">
                        <div className="flex items-center gap-2">
                          <h3 className="text-lg font-bold text-white">{team.name}</h3>
                          {team.verified && (
                            <CheckCircle className="w-5 h-5 text-blue-400" />
                          )}
                        </div>
                        {team.industry && (
                          <p className="text-xs text-gray-400">{team.industry}</p>
                        )}
                      </div>
                    </div>

                    <p className="text-sm text-gray-300 mb-4">{team.description}</p>

                    <div className="flex items-center gap-4 mb-4 text-sm text-gray-400">
                      <div className="flex items-center gap-1">
                        <Users className="w-4 h-4" />
                        {team.member_count} members
                      </div>
                    </div>

                    <button className="w-full py-2 bg-gradient-to-r from-rose-500 to-purple-600 text-white font-semibold rounded-lg hover:shadow-lg transition-all">
                      View Team
                    </button>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-12 glass-effect rounded-2xl border border-white/10">
                <Briefcase className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                <p className="text-gray-400">No teams available at the moment.</p>
              </div>
            )}
          </div>
        )}

        {/* Messages Tab */}
        {activeTab === 'messages' && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-1">
              <h3 className="text-lg font-bold text-white mb-4">Conversations</h3>
              <div className="space-y-2 max-h-96 overflow-y-auto">
                {messages.length > 0 ? (
                  // Get unique conversations (both sent and received)
                  Array.from(new Map(
                    messages.map((msg) => {
                      const conversationId = msg.sender_id === user?.id ? msg.recipient_id : msg.sender_id;
                      return [conversationId, msg];
                    })
                  ).values())
                    .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
                    .slice(0, 10)
                    .map((msg) => {
                      const otherUserId = msg.sender_id === user?.id ? msg.recipient_id : msg.sender_id;
                      const connection = connections.find((c) => c.id === otherUserId);
                      const isSelected = selectedConnection?.id === otherUserId;

                      return (
                        <button
                          key={`${otherUserId}-${msg.id}`}
                          onClick={() => {
                            if (connection) setSelectedConnection(connection);
                          }}
                          className={`w-full text-left p-3 rounded-lg transition-all ${
                            isSelected
                              ? 'bg-rose-500/20 border border-rose-400/50'
                              : 'bg-white/5 hover:bg-white/10 border border-white/10'
                          }`}
                        >
                          <div className="flex items-center gap-3">
                            <img
                              src={msg.sender_id === user?.id ? connection?.avatar_url : msg.sender_avatar || 'https://via.placeholder.com/32'}
                              alt={msg.sender_id === user?.id ? connection?.name : msg.sender_name}
                              className="w-8 h-8 rounded-full object-cover"
                            />
                            <div className="flex-1 min-w-0">
                              <p className="text-sm font-semibold text-white truncate">
                                {msg.sender_id === user?.id ? connection?.name : msg.sender_name}
                              </p>
                              <p className="text-xs text-gray-400 truncate">
                                {msg.sender_id === user?.id ? 'You: ' : ''}
                                {msg.deleted_at ? 'message was deleted' : (msg.content || (msg.attachment_url ? (
                                  msg.attachment_type === 'image' ? '🖼️ Image' :
                                  msg.attachment_type === 'video' ? '🎥 Video' :
                                  msg.attachment_type === 'audio' ? '🎵 Audio file' :
                                  msg.attachment_type === 'document' ? '📄 Document' :
                                  '📎 Attachment'
                                ) : ''))}
                              </p>
                            </div>
                            {!msg.read && msg.sender_id !== user?.id && (
                              <div className="w-2 h-2 rounded-full bg-rose-400 flex-shrink-0" />
                            )}
                          </div>
                        </button>
                      );
                    })
                ) : (
                  <div className="text-center py-8 text-gray-400">
                    <MessageSquare className="w-8 h-8 mx-auto mb-2 opacity-50" />
                    <p className="text-sm">No conversations yet</p>
                  </div>
                )}
              </div>
            </div>

            <div className="lg:col-span-2">
              {selectedConnection ? (
                <div className="glass-effect rounded-2xl border border-white/10 p-6 h-96 flex flex-col">
                  <div className="flex items-center gap-3 pb-4 border-b border-white/10 mb-4">
                    <img
                      src={selectedConnection.avatar_url || 'https://via.placeholder.com/40'}
                      alt={selectedConnection.name}
                      className="w-10 h-10 rounded-full object-cover"
                    />
                    <div className="flex-1">
                      <h4 className="font-bold text-white">{selectedConnection.name}</h4>
                      <p className="text-xs text-gray-400">Online</p>
                    </div>
                  </div>

                  <div ref={messagesContainerRef} onScroll={handleMessagesScroll} className="flex-1 overflow-y-auto mb-4 space-y-3 pr-2">
                    {messages
                      .filter((m) =>
                        (m.sender_id === selectedConnection.id && m.recipient_id === user?.id) ||
                        (m.sender_id === user?.id && m.recipient_id === selectedConnection.id)
                      )
                      .map((msg) => {
                        const isSentByCurrentUser = msg.sender_id === user?.id;
                        const isDeleted = msg.deleted_at !== null && msg.deleted_at !== undefined;

                        return (
                          <div key={msg.id} id={`message-${msg.id}`} data-message-id={msg.id} className={`flex gap-2 ${isSentByCurrentUser ? 'flex-row-reverse' : ''}`}>
                            <img
                              src={isSentByCurrentUser ? selectedConnection.avatar_url : msg.sender_avatar}
                              alt={isSentByCurrentUser ? selectedConnection.name : msg.sender_name}
                              className="w-8 h-8 rounded-full object-cover flex-shrink-0"
                            />
                            <div className={`rounded-lg p-3 max-w-xs ${
                              isSentByCurrentUser
                                ? 'bg-rose-500/30 border border-rose-400/30 ml-auto'
                                : 'bg-white/10'
                            } ${isDeleted ? 'opacity-60' : ''}`}>
                              {isDeleted ? (
                                <p className="text-sm text-gray-400 italic">This message was deleted</p>
                              ) : editingMessageId === msg.id ? (
                                <div className="space-y-2">
                                  <input
                                    type="text"
                                    value={editingMessageContent}
                                    onChange={(e) => setEditingMessageContent(e.target.value)}
                                    className="w-full px-3 py-2 bg-white/10 border border-white/20 rounded text-white text-sm placeholder-gray-500 focus:outline-none focus:border-rose-400"
                                    placeholder="Edit your message..."
                                    autoFocus
                                  />
                                  <div className="flex gap-2">
                                    <button
                                      onClick={() => handleEditMessage(msg.id)}
                                      className="flex-1 px-3 py-1 bg-rose-500/30 border border-rose-400/30 rounded text-white text-xs hover:bg-rose-500/50 transition-colors"
                                    >
                                      Save
                                    </button>
                                    <button
                                      onClick={() => {
                                        setEditingMessageId(null);
                                        setEditingMessageContent('');
                                      }}
                                      className="flex-1 px-3 py-1 bg-white/10 border border-white/20 rounded text-white text-xs hover:bg-white/20 transition-colors"
                                    >
                                      Cancel
                                    </button>
                                  </div>
                                </div>
                              ) : (
                                <>
                                  <p className="text-sm text-white">{msg.content}</p>
                                  {msg.attachment_url && (
                                    <div className="mt-2 cursor-pointer" onClick={() => {
                                      if (msg.attachment_type === 'image' || msg.attachment_type === 'video' || msg.attachment_type === 'document') {
                                        setPreviewingFileUrl(msg.attachment_url);
                                        setPreviewingFileType(msg.attachment_type);
                                      }
                                    }}>
                                      {msg.attachment_type === 'image' && (
                                        <img
                                          src={msg.attachment_url}
                                          alt="Attachment"
                                          className="max-w-full max-h-96 sm:max-w-sm rounded-lg hover:opacity-80 transition-opacity"
                                        />
                                      )}
                                      {msg.attachment_type === 'video' && (
                                        <video
                                          src={msg.attachment_url}
                                          controls
                                          className={`max-w-full max-h-64 sm:max-w-sm sm:max-h-96 rounded-lg bg-black ${previewingFileUrl ? 'opacity-50 cursor-not-allowed' : ''}`}
                                        />
                                      )}
                                      {msg.attachment_type === 'document' && (
                                        <div className="bg-white/10 hover:bg-white/20 border border-white/20 rounded-lg p-3 sm:p-4 transition-colors max-w-full sm:max-w-xs">
                                          <p className="text-xs text-gray-300 mb-2">📄 Document Preview</p>
                                          <p className="text-sm text-white mb-2">Click to view full document</p>
                                          <div className="text-xs text-gray-400">
                                            <p>PDF Document</p>
                                          </div>
                                        </div>
                                      )}
                                      {msg.attachment_type === 'audio' && (
                                        <div className="mt-2">
                                          <audio
                                            src={msg.attachment_url}
                                            controls
                                            className={`w-full max-w-full sm:max-w-sm ${previewingFileUrl ? 'opacity-50' : ''}`}
                                          />
                                        </div>
                                      )}
                                    </div>
                                  )}
                                </>
                              )}
                              <div className="flex items-center justify-between gap-2 mt-1">
                                <p className="text-xs text-gray-400">
                                  {new Date(msg.timestamp).toLocaleTimeString()}
                                  {msg.updated_at && msg.updated_at !== msg.timestamp && (
                                    <span className="ml-1 text-gray-500">(edited)</span>
                                  )}
                                </p>
                                {isSentByCurrentUser && !isDeleted && (
                                  <div className="relative">
                                    <button
                                      onClick={() => setOpenMenuMessageId(openMenuMessageId === msg.id ? null : msg.id)}
                                      className="text-gray-400 hover:text-rose-300 transition-colors p-1 hover:bg-white/5 rounded"
                                      title="Message options"
                                    >
                                      <MoreHorizontal className="w-4 h-4" />
                                    </button>
                                    {openMenuMessageId === msg.id && (
                                      <div className="absolute right-0 top-6 bg-gray-800 border border-white/10 rounded-lg shadow-lg z-50 min-w-max">
                                        <button
                                          onClick={() => {
                                            setEditingMessageId(msg.id);
                                            setEditingMessageContent(msg.content);
                                            setOpenMenuMessageId(null);
                                          }}
                                          className="w-full text-left px-4 py-2 text-sm text-gray-300 hover:bg-white/10 hover:text-white transition-colors flex items-center gap-2 border-b border-white/10"
                                        >
                                          <Edit2 className="w-3 h-3" />
                                          Edit
                                        </button>
                                        <button
                                          onClick={() => handleDeleteMessage(msg.id)}
                                          className="w-full text-left px-4 py-2 text-sm text-red-400 hover:bg-red-500/20 hover:text-red-300 transition-colors flex items-center gap-2"
                                        >
                                          <Trash2 className="w-3 h-3" />
                                          Delete
                                        </button>
                                      </div>
                                    )}
                                  </div>
                                )}
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    <div ref={messagesEndRef} />
                  </div>

                  <div className="space-y-2">
                    {selectedAttachment && (
                      <div className="bg-white/5 border border-white/10 rounded-lg p-3 space-y-2">
                        {selectedAttachment.type?.startsWith('image/') && (
                          <img
                            src={URL.createObjectURL(selectedAttachment)}
                            alt="Preview"
                            className="max-w-full max-h-40 sm:max-h-56 rounded-lg object-cover"
                          />
                        )}
                        {selectedAttachment.type?.startsWith('video/') && (
                          <video
                            src={URL.createObjectURL(selectedAttachment)}
                            controls
                            className="max-w-full max-h-40 sm:max-h-56 rounded-lg"
                          />
                        )}
                        {selectedAttachment.type?.startsWith('audio/') && (
                          <audio
                            src={URL.createObjectURL(selectedAttachment)}
                            controls
                            className="w-full"
                          />
                        )}
                        <div className="flex items-center justify-between gap-2">
                          <p className="text-xs sm:text-sm text-gray-300 truncate min-w-0">
                            {selectedAttachment.type?.startsWith('image/') ? '🖼️' :
                             selectedAttachment.type?.startsWith('video/') ? '🎥' :
                             selectedAttachment.type?.startsWith('audio/') ? '🎵' : '📄'} {selectedAttachment.name}
                          </p>
                          <button
                            onClick={() => setSelectedAttachment(null)}
                            className="text-gray-400 hover:text-white flex-shrink-0 p-1"
                          >
                            <X className="w-4 h-4" />
                          </button>
                        </div>
                      </div>
                    )}
                    <div className="flex gap-2">
                      <input
                        type="text"
                        placeholder="Type a message..."
                        value={messageInput}
                        onChange={(e) => setMessageInput(e.target.value)}
                        onKeyPress={(e) => e.key === 'Enter' && handleSendMessage()}
                        className="flex-1 px-4 py-2 bg-white/5 border border-white/10 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:border-rose-400"
                      />
                      <label className="p-2 bg-white/10 hover:bg-white/20 text-white rounded-lg cursor-pointer transition-colors" title="Attach file">
                        <input
                          type="file"
                          onChange={(e) => {
                            if (e.target.files?.[0]) {
                              setSelectedAttachment(e.target.files[0]);
                            }
                          }}
                          className="hidden"
                          disabled={uploadingAttachment}
                        />
                        <FolderPlus className="w-4 h-4" />
                      </label>
                      <button
                        onClick={handleSendMessage}
                        disabled={uploadingAttachment}
                        className="p-2 bg-gradient-to-r from-rose-500 to-purple-600 text-white rounded-lg hover:shadow-lg transition-all disabled:opacity-50"
                      >
                        {uploadingAttachment ? '...' : <Send className="w-4 h-4" />}
                      </button>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="glass-effect rounded-2xl border border-white/10 p-8 h-96 flex flex-col items-center justify-center">
                  <MessageSquare className="w-12 h-12 text-gray-400 mb-4" />
                  <p className="text-gray-400 text-center">Select a connection to start messaging</p>
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Portfolio Modal */}
      {portfolioModalOpen && portfolioData && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
          <div className="bg-gray-900 rounded-2xl border border-white/10 w-full max-w-2xl max-h-96 overflow-y-auto shadow-2xl flex flex-col">
            {/* Header */}
            <div className="sticky top-0 flex items-center justify-between p-6 border-b border-white/10 bg-gray-900/95 backdrop-blur-sm">
              <div className="flex items-center gap-4 flex-1 min-w-0">
                {portfolioData.profile.avatar_url && (
                  <img
                    src={portfolioData.profile.avatar_url}
                    alt={portfolioData.profile.full_name}
                    className="w-12 h-12 rounded-full object-cover flex-shrink-0"
                  />
                )}
                <div className="min-w-0">
                  <h2 className="text-xl font-bold text-white truncate">{portfolioData.profile.full_name}</h2>
                  <p className="text-sm text-gray-400 truncate">{portfolioData.profile.bio}</p>
                </div>
              </div>
              <div className="flex items-center gap-2 flex-shrink-0 ml-4">
                <button
                  onClick={() => {
                    setPortfolioModalOpen(false);
                    navigate(`/portfolio/${portfolioCreatorId}`, {
                      state: { portfolio: portfolioData }
                    });
                    setPortfolioData(null);
                  }}
                  className="px-3 py-1.5 text-sm bg-gradient-to-r from-rose-500 to-purple-600 text-white rounded-lg hover:shadow-lg transition-all font-medium"
                >
                  View Full
                </button>
                <button
                  onClick={() => {
                    setPortfolioModalOpen(false);
                    setPortfolioData(null);
                  }}
                  className="p-2 hover:bg-white/10 rounded-lg transition-colors"
                >
                  <X className="w-5 h-5 text-gray-400" />
                </button>
              </div>
            </div>

            {/* Content */}
            <div className="p-6 space-y-8">
              {/* About */}
              {portfolioData.profile.about && (
                <div>
                  <h3 className="text-lg font-bold text-white mb-3">About</h3>
                  <p className="text-gray-300 leading-relaxed">{portfolioData.profile.about}</p>
                </div>
              )}

              {/* Projects */}
              {portfolioData.projects.length > 0 && (
                <div>
                  <h3 className="text-lg font-bold text-white mb-4">Projects</h3>
                  <div className="space-y-4">
                    {portfolioData.projects.map((project: any) => (
                      <div key={project.id} className="glass-effect rounded-lg p-4 border border-white/10">
                        <div className="flex items-start justify-between mb-2">
                          <h4 className="font-semibold text-white">{project.title}</h4>
                          {project.demo_url && (
                            <a
                              href={project.demo_url}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-rose-400 hover:text-rose-300 text-sm"
                            >
                              View →
                            </a>
                          )}
                        </div>
                        {project.description && (
                          <p className="text-sm text-gray-300 mb-3">{project.description}</p>
                        )}
                        {project.technologies && (
                          <div className="flex flex-wrap gap-2">
                            {project.technologies.split(',').map((tech: string, idx: number) => (
                              <span key={idx} className="text-xs bg-rose-500/20 text-rose-300 px-2 py-1 rounded">
                                {tech.trim()}
                              </span>
                            ))}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Skills */}
              {portfolioData.skills.length > 0 && (
                <div>
                  <h3 className="text-lg font-bold text-white mb-4">Skills</h3>
                  <div className="flex flex-wrap gap-2">
                    {portfolioData.skills.map((skill: any, idx: number) => (
                      <span
                        key={skill.id || idx}
                        className="px-3 py-1 bg-gradient-to-r from-rose-500/20 to-purple-600/20 text-gray-200 rounded-full text-sm border border-white/10"
                      >
                        {skill.skill_name}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {/* Empty State */}
              {portfolioData.projects.length === 0 && portfolioData.skills.length === 0 && !portfolioData.profile.about && (
                <div className="text-center py-8">
                  <FolderPlus className="w-12 h-12 text-gray-400 mx-auto mb-3 opacity-50" />
                  <p className="text-gray-400">This portfolio is still being built</p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Create Group Modal */}
      {showCreateGroupModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
          <div className="bg-gray-900 rounded-2xl border border-white/10 max-w-lg w-full max-h-[90vh] overflow-y-auto shadow-2xl">
            <div className="p-6 border-b border-white/10 flex items-center justify-between">
              <h2 className="text-2xl font-bold text-white">Create Group</h2>
              <button
                onClick={() => {
                  setShowCreateGroupModal(false);
                  setGroupFormData({ name: '', description: '', category: 'general', visibility: 'public' });
                  setGroupAvatar(null);
                  setGroupAvatarPreview(null);
                }}
                className="p-1 hover:bg-white/10 rounded-lg transition-colors"
              >
                <X className="w-5 h-5 text-gray-400" />
              </button>
            </div>

            <form onSubmit={handleCreateGroup} className="p-6 space-y-4">
              {/* Group Avatar Upload */}
              <div className="mb-6">
                <label className="block text-sm font-semibold text-white mb-3">Group Avatar</label>
                <div className="flex items-center gap-4">
                  <div className="w-24 h-24 rounded-lg bg-gradient-to-br from-rose-500/20 to-purple-600/20 border-2 border-dashed border-white/20 flex items-center justify-center overflow-hidden">
                    {groupAvatarPreview ? (
                      <img src={groupAvatarPreview} alt="Preview" className="w-full h-full object-cover" />
                    ) : (
                      <FolderPlus className="w-8 h-8 text-gray-400" />
                    )}
                  </div>
                  <div className="flex-1">
                    <input
                      type="file"
                      accept="image/*"
                      onChange={(e) => {
                        const file = e.target.files?.[0];
                        if (file) {
                          setGroupAvatar(file);
                          const reader = new FileReader();
                          reader.onload = (ev) => {
                            setGroupAvatarPreview(ev.target?.result as string);
                          };
                          reader.readAsDataURL(file);
                        }
                      }}
                      className="hidden"
                      id="group-avatar"
                    />
                    <label htmlFor="group-avatar" className="block px-4 py-2 bg-white/10 text-white font-semibold rounded-lg hover:bg-white/20 transition-colors cursor-pointer text-center text-sm">
                      Choose Image
                    </label>
                    {groupAvatar && (
                      <button
                        type="button"
                        onClick={() => {
                          setGroupAvatar(null);
                          setGroupAvatarPreview(null);
                        }}
                        className="mt-2 text-xs text-gray-400 hover:text-white transition-colors"
                      >
                        Remove
                      </button>
                    )}
                  </div>
                </div>
              </div>

              {/* Group Banner */}
              <div className="mb-6">
                <label className="block text-sm font-semibold text-white mb-3">Group Banner</label>
                <div className="flex flex-col">
                  <div className="w-full h-20 rounded-lg bg-gradient-to-r from-rose-500/10 to-purple-600/10 border-2 border-dashed border-white/20 flex items-center justify-center overflow-hidden mb-3">
                    {groupBannerPreview ? (
                      <img src={groupBannerPreview} alt="Banner Preview" className="w-full h-full object-cover" />
                    ) : (
                      <p className="text-xs text-gray-400">Banner preview</p>
                    )}
                  </div>
                  <input
                    type="file"
                    accept="image/*"
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (file) {
                        setGroupBanner(file);
                        const reader = new FileReader();
                        reader.onload = (ev) => {
                          setGroupBannerPreview(ev.target?.result as string);
                        };
                        reader.readAsDataURL(file);
                      }
                    }}
                    className="hidden"
                    id="group-banner"
                  />
                  <label htmlFor="group-banner" className="block px-4 py-2 bg-white/10 text-white font-semibold rounded-lg hover:bg-white/20 transition-colors cursor-pointer text-center text-sm">
                    Choose Banner
                  </label>
                  {groupBanner && (
                    <button
                      type="button"
                      onClick={() => {
                        setGroupBanner(null);
                        setGroupBannerPreview(null);
                      }}
                      className="mt-2 text-xs text-gray-400 hover:text-white transition-colors"
                    >
                      Remove
                    </button>
                  )}
                </div>
              </div>

              {/* Group Name */}
              <div>
                <label className="block text-sm font-semibold text-white mb-2">Group Name *</label>
                <input
                  type="text"
                  value={groupFormData.name}
                  onChange={(e) => setGroupFormData({ ...groupFormData, name: e.target.value })}
                  placeholder="Enter group name"
                  className="w-full px-4 py-2 bg-white/10 border border-white/20 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:border-rose-400 transition-colors"
                  required
                />
              </div>

              {/* Group Description */}
              <div>
                <label className="block text-sm font-semibold text-white mb-2">Description</label>
                <textarea
                  value={groupFormData.description}
                  onChange={(e) => setGroupFormData({ ...groupFormData, description: e.target.value })}
                  placeholder="Describe your group..."
                  rows={3}
                  className="w-full px-4 py-2 bg-white/10 border border-white/20 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:border-rose-400 transition-colors resize-none"
                />
              </div>

              {/* Group Rules */}
              <div>
                <label className="block text-sm font-semibold text-white mb-2">Group Rules</label>
                <textarea
                  value={groupFormData.rules}
                  onChange={(e) => setGroupFormData({ ...groupFormData, rules: e.target.value })}
                  placeholder="Set community guidelines and rules for your group..."
                  rows={2}
                  className="w-full px-4 py-2 bg-white/10 border border-white/20 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:border-rose-400 transition-colors resize-none"
                />
              </div>

              {/* Category */}
              <div>
                <label className="block text-sm font-semibold text-white mb-2">Category</label>
                <select
                  value={groupFormData.category}
                  onChange={(e) => setGroupFormData({ ...groupFormData, category: e.target.value })}
                  className="w-full px-4 py-2 bg-white/10 border border-white/20 rounded-lg text-white focus:outline-none focus:border-rose-400 transition-colors"
                >
                  <option value="creative" className="bg-gray-800">Creative</option>
                  <option value="professional" className="bg-gray-800">Professional</option>
                  <option value="hobby" className="bg-gray-800">Hobby</option>
                  <option value="learning" className="bg-gray-800">Learning</option>
                  <option value="business" className="bg-gray-800">Business</option>
                  <option value="community" className="bg-gray-800">Community</option>
                </select>
              </div>

              {/* Visibility */}
              <div>
                <label className="block text-sm font-semibold text-white mb-2">Visibility</label>
                <select
                  value={groupFormData.visibility}
                  onChange={(e) => setGroupFormData({ ...groupFormData, visibility: e.target.value })}
                  className="w-full px-4 py-2 bg-white/10 border border-white/20 rounded-lg text-white focus:outline-none focus:border-rose-400 transition-colors"
                >
                  <option value="public" className="bg-gray-800">Public - Anyone can join</option>
                  <option value="private" className="bg-gray-800">Private - Approval needed to join</option>
                  <option value="invite_only" className="bg-gray-800">Invite Only - By invitation only</option>
                </select>
              </div>

              {/* Max Members */}
              <div>
                <label className="block text-sm font-semibold text-white mb-2">Max Members (Optional)</label>
                <input
                  type="number"
                  value={groupFormData.max_members || ''}
                  onChange={(e) => setGroupFormData({ ...groupFormData, max_members: e.target.value ? parseInt(e.target.value) : null })}
                  placeholder="Leave empty for unlimited"
                  min="1"
                  className="w-full px-4 py-2 bg-white/10 border border-white/20 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:border-rose-400 transition-colors"
                />
              </div>

              {/* Submit Button */}
              <div className="flex gap-3 pt-4">
                <button
                  type="button"
                  onClick={() => {
                    setShowCreateGroupModal(false);
                    setGroupFormData({ name: '', description: '', rules: '', category: 'professional', visibility: 'public', max_members: null });
                    setGroupAvatar(null);
                    setGroupBanner(null);
                    setGroupAvatarPreview(null);
                    setGroupBannerPreview(null);
                  }}
                  className="flex-1 px-4 py-2 bg-white/10 text-white font-semibold rounded-lg hover:bg-white/20 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={creatingGroup}
                  className="flex-1 px-4 py-2 bg-gradient-to-r from-rose-500 to-purple-600 text-white font-semibold rounded-lg hover:shadow-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {creatingGroup ? 'Creating...' : 'Create Group'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Invite Users to Group Modal */}
      {showInviteModal && selectedGroupForInvite && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
          <div className="bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 rounded-2xl border border-white/10 shadow-2xl max-w-2xl w-full max-h-96 overflow-hidden flex flex-col">
            {/* Header */}
            <div className="p-6 border-b border-white/10 flex items-center justify-between">
              <h3 className="text-2xl font-bold text-white">Invite Members to {selectedGroupForInvite.name}</h3>
              <button
                onClick={() => {
                  setShowInviteModal(false);
                  setSelectedGroupForInvite(null);
                  setInviteSearchQuery('');
                  setSelectedUsersForInvite([]);
                }}
                className="p-2 hover:bg-white/10 rounded-lg transition-colors"
              >
                <X className="w-6 h-6 text-gray-400" />
              </button>
            </div>

            {/* Search Members */}
            <div className="p-6 border-b border-white/10">
              <input
                type="text"
                placeholder="Search members by name..."
                value={inviteSearchQuery}
                onChange={(e) => {
                  setInviteSearchQuery(e.target.value);
                  // Filter members based on search query
                  const filtered = members.filter(m =>
                    m.name.toLowerCase().includes(e.target.value.toLowerCase())
                  );
                  setUsersToInvite(filtered);
                }}
                className="w-full px-4 py-2 bg-white/10 border border-white/20 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:border-rose-400"
              />
            </div>

            {/* Members List */}
            <div className="flex-1 overflow-y-auto p-6 space-y-2">
              {inviteSearchQuery ? (
                usersToInvite.length > 0 ? (
                  usersToInvite.map((member) => (
                    <label key={member.id} className="flex items-center gap-3 p-3 hover:bg-white/5 rounded-lg cursor-pointer transition-colors">
                      <input
                        type="checkbox"
                        checked={selectedUsersForInvite.includes(member.id)}
                        onChange={(e) => {
                          if (e.target.checked) {
                            setSelectedUsersForInvite([...selectedUsersForInvite, member.id]);
                          } else {
                            setSelectedUsersForInvite(selectedUsersForInvite.filter(id => id !== member.id));
                          }
                        }}
                        className="w-4 h-4 rounded"
                      />
                      <img
                        src={member.avatar_url || 'https://via.placeholder.com/40'}
                        alt={member.name}
                        className="w-10 h-10 rounded-full object-cover"
                      />
                      <div className="flex-1">
                        <p className="font-semibold text-white">{member.name}</p>
                        <p className="text-xs text-gray-400 capitalize">{member.tier} • {member.followers || 0} followers</p>
                      </div>
                    </label>
                  ))
                ) : (
                  <p className="text-center text-gray-400 py-4">No members found</p>
                )
              ) : (
                <p className="text-center text-gray-400 py-4">Start typing to search for members...</p>
              )}
            </div>

            {/* Footer */}
            <div className="p-6 border-t border-white/10 flex gap-3 justify-end">
              <button
                onClick={() => {
                  setShowInviteModal(false);
                  setSelectedGroupForInvite(null);
                  setInviteSearchQuery('');
                  setSelectedUsersForInvite([]);
                }}
                className="px-4 py-2 bg-white/10 text-white font-semibold rounded-lg hover:bg-white/20 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleSendGroupInvites}
                disabled={selectedUsersForInvite.length === 0 || sendingInvites}
                className="px-4 py-2 bg-gradient-to-r from-purple-500 to-indigo-600 text-white font-semibold rounded-lg hover:shadow-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
              >
                <UserPlus className="w-4 h-4" />
                {sendingInvites ? 'Sending...' : `Send Invites (${selectedUsersForInvite.length})`}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* File Preview Modal */}
      {previewingFileUrl && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-2 sm:p-4">
          <div className="relative bg-gray-900 rounded-xl sm:rounded-2xl border border-white/10 w-full h-full sm:h-auto sm:max-w-4xl sm:max-h-[90vh] overflow-auto shadow-2xl flex flex-col">
            {/* Close Button */}
            <button
              onClick={() => {
                setPreviewingFileUrl(null);
                setPreviewingFileType(null);
              }}
              className="absolute top-2 sm:top-4 right-2 sm:right-4 z-10 p-2 bg-gray-800 hover:bg-gray-700 rounded-full text-white transition-colors flex-shrink-0"
              title="Close preview"
            >
              <X className="w-5 h-5 sm:w-6 sm:h-6" />
            </button>

            {/* File Preview */}
            <div className="p-3 sm:p-6 overflow-auto flex-1 flex items-center justify-center">
              {previewingFileType === 'image' && (
                <img
                  src={previewingFileUrl}
                  alt="Preview"
                  className="w-full h-auto max-h-[80vh] object-contain rounded-lg"
                />
              )}
              {previewingFileType === 'video' && (
                <video
                  src={previewingFileUrl}
                  controls
                  autoPlay
                  className="w-full h-auto max-h-[80vh] rounded-lg bg-black object-contain"
                />
              )}
              {previewingFileType === 'document' && (
                <iframe
                  src={`https://docs.google.com/gview?url=${encodeURIComponent(previewingFileUrl)}&embedded=true`}
                  className="w-full rounded-lg border border-white/10"
                  style={{ height: 'clamp(400px, 80vh, 900px)' }}
                  title="Document Preview"
                />
              )}
            </div>
          </div>
        </div>
      )}

      {/* GROUP DETAIL MODAL */}
      {showGroupDetail && selectedGroup && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
          <div className="bg-gradient-to-br from-slate-900 to-slate-800 rounded-2xl w-full max-w-2xl max-h-[90vh] flex flex-col border border-white/10">
            {/* Header */}
            <div className="flex items-center justify-between p-6 border-b border-white/10">
              <div className="flex items-center gap-3">
                {selectedGroup.avatar_url && (
                  <img src={selectedGroup.avatar_url} alt={selectedGroup.name} className="w-10 h-10 rounded-lg" />
                )}
                <h2 className="text-2xl font-bold text-white">{selectedGroup.name}</h2>
              </div>
              <button
                onClick={() => {
                  setShowGroupDetail(false);
                  setSelectedGroup(null);
                }}
                className="text-gray-400 hover:text-white"
              >
                <X className="w-6 h-6" />
              </button>
            </div>

            {/* Content */}
            <div className="flex-1 overflow-y-auto">
              {/* Group Info */}
              <div className="p-6 border-b border-white/10">
                <p className="text-gray-300 mb-4">{selectedGroup.description}</p>
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <p className="text-gray-400">Category</p>
                    <p className="text-white capitalize">{selectedGroup.category}</p>
                  </div>
                  <div>
                    <p className="text-gray-400">Visibility</p>
                    <p className="text-white capitalize">{selectedGroup.visibility}</p>
                  </div>
                  <div>
                    <p className="text-gray-400">Members</p>
                    <p className="text-white">{selectedGroup.member_count}</p>
                  </div>
                  <div>
                    <p className="text-gray-400">Created</p>
                    <p className="text-white">{new Date(selectedGroup.created_at).toLocaleDateString()}</p>
                  </div>
                </div>
              </div>

              {/* Messages */}
              <div className="p-6 border-b border-white/10">
                <h3 className="text-lg font-bold text-white mb-4">Messages</h3>
                <div className="space-y-3 mb-4 max-h-64 overflow-y-auto">
                  {groupMessages.map((msg) => (
                    <div key={msg.id} className="bg-white/5 rounded-lg p-3">
                      <div className="flex items-center gap-2 mb-1">
                        {msg.profiles?.avatar_url && (
                          <img src={msg.profiles.avatar_url} alt={msg.profiles.name} className="w-6 h-6 rounded-full" />
                        )}
                        <span className="text-sm font-semibold text-white">{msg.profiles?.name || 'Unknown'}</span>
                        <span className="text-xs text-gray-400">{new Date(msg.created_at).toLocaleTimeString()}</span>
                      </div>
                      <p className="text-sm text-gray-200">{msg.content}</p>
                    </div>
                  ))}
                </div>

                {/* Message Input */}
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={groupMessageInput}
                    onChange={(e) => setGroupMessageInput(e.target.value)}
                    onKeyPress={(e) => e.key === 'Enter' && handleSendGroupMessage()}
                    placeholder="Type a message..."
                    className="flex-1 bg-white/5 border border-white/20 rounded-lg px-3 py-2 text-white placeholder-gray-500 focus:outline-none focus:border-white/40"
                  />
                  <button
                    onClick={handleSendGroupMessage}
                    disabled={sendingGroupMessage}
                    className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 transition-colors"
                  >
                    {sendingGroupMessage ? '...' : <Send className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              {/* Members */}
              <div className="p-6">
                <h3 className="text-lg font-bold text-white mb-4">Members ({groupMembers.length})</h3>
                <div className="space-y-2 max-h-64 overflow-y-auto">
                  {groupMembers.map((member) => (
                    <div key={member.id} className="flex items-center justify-between bg-white/5 rounded-lg p-3">
                      <div className="flex items-center gap-2">
                        {member.profiles?.avatar_url && (
                          <img src={member.profiles.avatar_url} alt={member.profiles.name} className="w-8 h-8 rounded-full" />
                        )}
                        <div>
                          <p className="text-sm font-semibold text-white">{member.profiles?.name || 'Unknown'}</p>
                          <p className="text-xs text-gray-400 capitalize">{member.role}</p>
                        </div>
                      </div>
                      {member.profiles?.tier && (
                        <span className="text-xs px-2 py-1 bg-purple-500/20 text-purple-300 rounded capitalize">
                          {member.profiles.tier}
                        </span>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Footer - Actions */}
            <div className="flex gap-2 p-6 border-t border-white/10">
              {selectedGroup.creator_id === user?.id && (
                <>
                  <button
                    onClick={() => setShowEditGroupModal(true)}
                    className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-semibold transition-colors flex items-center justify-center gap-2"
                  >
                    <Edit2 className="w-4 h-4" />
                    Edit
                  </button>
                  <button
                    onClick={handleDeleteGroup}
                    className="flex-1 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 font-semibold transition-colors flex items-center justify-center gap-2"
                  >
                    <Trash2 className="w-4 h-4" />
                    Delete
                  </button>
                </>
              )}
              <button
                onClick={handleLeaveGroup}
                className="flex-1 px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 font-semibold transition-colors"
              >
                Leave Group
              </button>
            </div>
          </div>
        </div>
      )}

      {/* EDIT GROUP MODAL */}
      {showEditGroupModal && selectedGroup && selectedGroup.creator_id === user?.id && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
          <div className="bg-gradient-to-br from-slate-900 to-slate-800 rounded-2xl w-full max-w-md border border-white/10">
            <div className="p-6">
              <h2 className="text-2xl font-bold text-white mb-6">Edit Group</h2>

              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-semibold text-gray-300 mb-2">Group Name</label>
                  <input
                    type="text"
                    value={editGroupData.name}
                    onChange={(e) => setEditGroupData({ ...editGroupData, name: e.target.value })}
                    className="w-full bg-white/5 border border-white/20 rounded-lg px-4 py-2 text-white placeholder-gray-500 focus:outline-none focus:border-white/40"
                  />
                </div>

                <div>
                  <label className="block text-sm font-semibold text-gray-300 mb-2">Description</label>
                  <textarea
                    value={editGroupData.description}
                    onChange={(e) => setEditGroupData({ ...editGroupData, description: e.target.value })}
                    rows={3}
                    className="w-full bg-white/5 border border-white/20 rounded-lg px-4 py-2 text-white placeholder-gray-500 focus:outline-none focus:border-white/40"
                  />
                </div>

                <div>
                  <label className="block text-sm font-semibold text-gray-300 mb-2">Category</label>
                  <select
                    value={editGroupData.category}
                    onChange={(e) => setEditGroupData({ ...editGroupData, category: e.target.value })}
                    className="w-full bg-white/5 border border-white/20 rounded-lg px-4 py-2 text-white focus:outline-none focus:border-white/40"
                  >
                    <option value="creative">Creative</option>
                    <option value="professional">Professional</option>
                    <option value="hobby">Hobby</option>
                    <option value="learning">Learning</option>
                    <option value="business">Business</option>
                    <option value="community">Community</option>
                  </select>
                </div>

                <div className="flex gap-3">
                  <button
                    onClick={() => setShowEditGroupModal(false)}
                    className="flex-1 px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 font-semibold transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleEditGroup}
                    disabled={editingGroupSubmitting}
                    className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 font-semibold transition-colors"
                  >
                    {editingGroupSubmitting ? '...' : 'Save'}
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Toast Notifications */}
      <div className="fixed bottom-6 right-6 space-y-3 z-40">
        {toasts.map((toast) => (
          <div
            key={toast.id}
            className={`flex items-center gap-3 px-6 py-4 rounded-lg backdrop-blur-md border shadow-lg ${
              toast.type === 'success'
                ? 'bg-green-500/20 border-green-400/50 text-green-100'
                : 'bg-red-500/20 border-red-400/50 text-red-100'
            }`}
          >
            {toast.type === 'success' ? (
              <CheckCircle className="w-5 h-5 flex-shrink-0" />
            ) : (
              <AlertCircle className="w-5 h-5 flex-shrink-0" />
            )}
            <span className="font-medium text-sm">{toast.message}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
