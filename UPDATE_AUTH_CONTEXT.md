# Update AuthContext for Phone Number Support

Since the new `MembershipPaymentModalV2` component uses a `phoneNumber` prop, you may need to update your `AuthContext` to include this field if it's not already there.

## Changes Required

### 1. Update User Type in AuthContext

In `src/context/AuthContext.tsx`, update the user interface:

```typescript
// Before:
export interface User {
  id: string;
  email: string;
  name: string;
  role: 'creator' | 'member';
  tier: 'free' | 'premium' | 'professional' | 'elite';
  loyaltyPoints: number;
  joined_date: string;
  profileImage?: string;
}

// After:
export interface User {
  id: string;
  email: string;
  name: string;
  phoneNumber?: string;  // Add this line
  role: 'creator' | 'member';
  tier: 'free' | 'premium' | 'professional' | 'elite';
  loyaltyPoints: number;
  joined_date: string;
  profileImage?: string;
}
```

### 2. Update useAuth Hook to Fetch Phone Number

When fetching user profile from Supabase, include the phone_number field:

```typescript
// In your useAuth hook, when fetching profile:
const { data: profileData } = await supabase
  .from('profiles')
  .select(`
    id,
    email,
    name,
    phone_number,  // Add this
    account_type,
    tier,
    loyalty_points,
    avatar_url,
    joined_date
  `)
  .eq('id', user.id)
  .single();

// Then map it:
const userData: User = {
  id: profileData.id,
  email: profileData.email,
  name: profileData.name,
  phoneNumber: profileData.phone_number,  // Add this
  role: profileData.account_type as 'creator' | 'member',
  tier: profileData.tier as 'free' | 'premium' | 'professional' | 'elite',
  loyaltyPoints: profileData.loyalty_points || 0,
  joined_date: profileData.joined_date,
  profileImage: profileData.avatar_url,
};
```

### 3. Ensure Phone Number is Stored in Database

Your Supabase `profiles` table should have a `phone_number` column:

```sql
-- If it doesn't exist, add it:
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS phone_number VARCHAR(20);

-- You might also want to add it to the registration flow
```

### 4. Update Sign-Up to Collect Phone Number

If you want users to provide their phone number during registration, update `SignUp.tsx`:

```typescript
// Add phone field to sign-up form
const [formData, setFormData] = useState({
  email: '',
  password: '',
  name: '',
  phoneNumber: '',  // Add this
  accountType: 'creator' as const,
});

// Then save it when creating the profile:
const { error: profileError } = await supabase
  .from('profiles')
  .insert({
    id: user.user.id,
    email: formData.email,
    name: formData.name,
    phone_number: formData.phoneNumber,  // Add this
    account_type: formData.accountType,
    tier: 'free',
    // ... other fields
  });
```

## Simpler Alternative

If you don't want to store phone numbers in the database, you can pass the phone number from the sign-in form directly to `MembershipPaymentModalV2`:

```typescript
// In Membership.tsx
<MembershipPaymentModalV2
  // ... other props
  phoneNumber={
    // Get from user session metadata if available
    user?.user_metadata?.phone_number || ''
  }
/>
```

## Current Implementation in Membership.tsx

The current code already handles this gracefully:

```typescript
<MembershipPaymentModalV2
  // ... other props
  phoneNumber={currentUser.phoneNumber || ''}
/>
```

So if `phoneNumber` is undefined, it defaults to empty string. This won't break anything, but users will need to enter their phone number in the payment form if they want to use mobile money payments.

## Phone Number Format

For mobile money payments, phone numbers should be in E.164 format:
- Uganda: +256XXXXXXXXX
- Kenya: +254XXXXXXXXX
- Tanzania: +255XXXXXXXXX
- Ghana: +233XXXXXXXXX

The `MobileMoneyPaymentForm` component already validates and formats this correctly.

## Testing Phone Number Flow

1. Sign up with phone number
2. Go to Membership page
3. Start upgrade process
4. Select Mobile Money payment method
5. Verify phone number pre-fills (or user can enter it)
6. Complete payment

That's it! The phone number is used for:
- Mobile money payments (required)
- Wallet verification
- Account recovery
