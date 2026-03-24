# Invite-Only Groups Implementation Guide

## Overview

This guide explains the complete implementation of invite-only groups with a full invitation workflow in the Connect page.

## ✅ What Was Fixed

### 1. **RLS Policy Bug** 
**Issue:** Private groups were only visible to their creators, not to all authenticated users

**Fix:** Updated RLS policies in `fix-group-visibility-rls.sql`:
- PUBLIC groups: Visible to everyone
- PRIVATE groups: Visible to all authenticated users (can only join if authenticated)
- INVITE_ONLY groups: Only visible to creators and members

**Impact:** Private groups now appear in "Discover Groups" for all authenticated users

---

## 🎯 Complete Invitation Workflow

### User Flow: Create Invite-Only Group

```
1. User creates group with visibility = "invite_only"
   ↓
2. Group stored in database
   ↓
3. Creator automatically added as admin to group_members
   ↓
4. Group appears in "🔒 My Private Groups" section
   ↓
5. Creator clicks "Invite Members" button
   ↓
6. Search dialog opens with all members
   ↓
7. Creator selects members to invite and sends invites
```

### Recipient Flow: Accept/Reject Invitation

```
1. Invitee receives group invitation
   ↓
2. Invitation appears in "Pending Group Invitations" section
   ↓
3. Invitee can Accept or Reject
   ↓
4. If Accept:
   - Invite marked as "accepted"
   - User added to group_members as "member"
   - User now sees group in "My Private Groups"
   ↓
5. If Reject:
   - Invite marked as "rejected"
   - User not added to group
```

---

## 📊 Database Schema

### Tables Used

```
groups
├── id (UUID)
├── name
├── visibility: 'public' | 'private' | 'invite_only'
├── creator_id
└── ...

group_members
├── id (UUID)
├── group_id → groups.id
├── user_id → auth.users.id
├── role: 'admin' | 'member' | 'moderator'
├── status: 'active' | 'blocked' | 'suspended'
└── created_at

group_invites ⭐ NEW
├── id (UUID)
├── group_id → groups.id
├── invited_user_id → auth.users.id
├── invited_by_user_id → auth.users.id
├── status: 'pending' | 'accepted' | 'rejected' | 'cancelled'
├── message (optional invite message)
├── expires_at (30 days default)
└── created_at
```

---

## 🔐 RLS Policies

### Groups Table Policies

| Policy Name | Operation | Condition | Users |
|-----------|-----------|-----------|-------|
| View public groups | SELECT | visibility = 'public' | Everyone |
| View private groups | SELECT | visibility = 'private' | Authenticated |
| View own invite-only | SELECT | visibility = 'invite_only' AND creator_id = auth.uid() | Authenticated |
| View member invite-only | SELECT | visibility = 'invite_only' AND user in group_members | Authenticated |
| Create groups | INSERT | creator_id = auth.uid() | Authenticated |
| Update own groups | UPDATE | creator_id = auth.uid() | Authenticated |
| Delete own groups | DELETE | creator_id = auth.uid() | Authenticated |

### Group Members Table Policies

- View: All authenticated users can view
- Insert: Users can add themselves (with checks for invite_only)
- Update: Users can update their own membership
- Delete: Users can remove themselves

### Group Invites Table Policies

- View: Sender, Recipient, and Admins can view
- Insert: Group creators/admins can insert
- Update: Recipient can respond to invites
- Delete: Sender can delete pending invites

---

## 💻 Frontend Implementation

### New State Variables (Connect.tsx)

```typescript
// Pending invites received by user
const [pendingInvites, setPendingInvites] = useState<GroupInvite[]>([]);

// Invite modal states
const [showInviteModal, setShowInviteModal] = useState(false);
const [selectedGroupForInvite, setSelectedGroupForInvite] = useState<Group | null>(null);
const [inviteSearchQuery, setInviteSearchQuery] = useState('');
const [usersToInvite, setUsersToInvite] = useState<Member[]>([]);
const [selectedUsersForInvite, setSelectedUsersForInvite] = useState<string[]>([]);
const [sendingInvites, setSendingInvites] = useState(false);
```

### New Functions

#### 1. **loadPendingGroupInvites()**
- Fetches invites where `invited_user_id = current_user` and `status = 'pending'`
- Includes group name, creator info, and expiration date
- Called on page load and after accepting/rejecting

#### 2. **handleSendGroupInvites()**
- Creates `group_invites` records for selected users
- Sets expiration to 30 days from now
- Updates state and shows success toast

#### 3. **handleAcceptGroupInvite(inviteId, groupId)**
- Marks invite as "accepted"
- Adds user to `group_members` with role: 'member'
- Reloads pending invites and user groups

#### 4. **handleRejectGroupInvite(inviteId)**
- Marks invite as "rejected"
- Does NOT add user to group
- Reloads pending invites

### New UI Components

#### 1. **Pending Invitations Section** (Lines 2642-2689)
- Shows all pending group invites with:
  - Group avatar and name
  - Inviter name
  - Invite message (if provided)
  - Accept/Reject buttons
- Only shows if user has pending invites

#### 2. **Invite Modal** (Lines 3577-3685)
- Opens when creator clicks "Invite Members" on a group card
- Search bar to filter members
- Checkbox selection for multiple members
- Shows tier and follower count
- Send button with count of selected users

#### 3. **Invite Button on Group Cards** (Lines 2837-2845)
- Only shows for creators of invite-only groups
- Opens invite modal when clicked
- Button text: "Invite Members"

---

## 🚀 How to Deploy

### Step 1: Update Database
Run the SQL migration in Supabase:
```sql
-- From: supabase-migrations/fix-group-visibility-rls.sql
```

This will:
- Drop incorrect RLS policies
- Create corrected policies
- Ensure private groups are visible to all authenticated users

### Step 2: Deploy Frontend Changes
The React changes in `src/pages/Connect.tsx` include:
- New state variables and interfaces
- New functions for invitation workflow
- New UI components for invitations
- Updated group card buttons

### Step 3: Verify
1. Create an invite-only group
2. Go to group and click "Invite Members"
3. Select a member and send invite
4. Log in as that member
5. See pending invitation appear
6. Accept invitation
7. Verify you can now see the group in "My Private Groups"

---

## 🎨 Visual Hierarchy

```
Groups Tab
├── Pending Group Invitations Section (if any)
│   ├── Group avatar + name
│   ├── Inviter name
│   ├── Accept button
│   └── Reject button
├── Discover Groups Section
│   └── Public & Private groups
│       ├── Join button (if not member)
│       └── Leave button (if member)
└── My Private Groups Section
    └── Invite-only groups (creator or member)
        ├── Avatar + name
        ├── Creator/member indicator
        ├── Member count
        └── Invite Members button (if creator)
```

---

## ✨ Key Features

### For Group Creators
- ✅ Create invite-only groups (hidden from discovery)
- ✅ Invite specific members by searching
- ✅ Invite multiple members at once
- ✅ See all pending invites management
- ✅ Auto-add to group as admin

### For Group Members
- ✅ See pending invitations with details
- ✅ Accept or reject invitations
- ✅ See invited groups in "My Private Groups" after accepting
- ✅ Leave groups anytime
- ✅ See inviter's name and optional message

### For All Users
- ✅ See private groups in discover (can't join directly)
- ✅ See public groups in discover (can join)
- ✅ See invite-only groups only if member/creator

---

## 🐛 Troubleshooting

### Issue: Private groups not showing up
**Solution:** Run the RLS migration to fix the policies

### Issue: Can't send invites
**Verify:**
1. User is creator of the group
2. Group visibility is "invite_only"
3. Group members table has creator as "admin"

### Issue: Invites not appearing for recipient
**Check:**
1. Invite status is "pending"
2. User is correct `invited_user_id`
3. Page was reloaded after sending
4. Check browser console for errors

### Issue: User can't join after accepting invite
**Verify:**
1. Group members insert has correct permissions
2. User role is set to "member"
3. Status is set to "active"

---

## 📝 SQL Commands for Testing

### Create test invite-only group
```sql
INSERT INTO public.groups (
  name, description, creator_id, visibility, category
) VALUES (
  'Test Private Group',
  'Testing invite-only functionality',
  'user-id-here',
  'invite_only',
  'professional'
);
```

### Send test invite
```sql
INSERT INTO public.group_invites (
  group_id, invited_user_id, invited_by_user_id
) VALUES (
  'group-id-here',
  'recipient-user-id',
  'creator-user-id'
);
```

### Check pending invites
```sql
SELECT * FROM public.group_invites 
WHERE status = 'pending' 
AND invited_user_id = 'user-id-here';
```

---

## 🔄 Future Enhancements

### Potential additions:
1. Invite expiration notifications
2. Bulk invite from CSV
3. Invite templates with custom messages
4. Invite analytics (accept rate, etc)
5. Request to join (users can request membership)
6. Auto-expiring invites (soft delete after 30 days)
7. Invite history/audit log
8. Email notifications for invites

---

## 📞 Support

For questions or issues, refer to:
1. Database schema documentation
2. RLS policy definitions
3. TypeScript interfaces in Connect.tsx
4. Console logs (prefixed with ✅ or 🔴)
