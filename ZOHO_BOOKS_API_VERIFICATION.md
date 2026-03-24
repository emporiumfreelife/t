# Zoho Books Integration Verification & Testing

This document verifies the integration against the official Zoho Books API v3 specifications and provides testing instructions.

## API Endpoint Verification

### ✅ Verified & Updated

**API Base URL:**
```
https://www.zohoapis.com/books/v3
```

This is the correct official endpoint for Zoho Books API v3. All API calls are made to this base URL with endpoints appended.

### Authentication Flow

**OAuth 2.0 - Authorization Code Grant:**
```
Step 1: Redirect to Authorization URL
https://accounts.zoho.com/oauth/v2/auth?
  client_id=YOUR_CLIENT_ID
  &response_type=code
  &redirect_uri=https://yourapp.com/books/callback
  &access_type=offline
  &scope=ZohoBooks.fullaccess.ALL
  &state=random_state_string

Step 2: User grants permission (at Zoho)

Step 3: Zoho redirects to your callback with authorization code
https://yourapp.com/books/callback?code=...&state=...

Step 4: Exchange code for tokens (server-side)
POST https://accounts.zoho.com/oauth/v2/token
  grant_type: authorization_code
  client_id: YOUR_CLIENT_ID
  client_secret: YOUR_CLIENT_SECRET
  redirect_uri: https://yourapp.com/books/callback
  code: AUTHORIZATION_CODE

Step 5: Receive tokens
{
  "access_token": "1000.41d9...",
  "refresh_token": "1000.8ecd...",
  "api_domain": "https://www.zohoapis.com",
  "token_type": "Bearer",
  "expires_in": 3600
}
```

**Token Refresh:**
```
POST https://accounts.zoho.com/oauth/v2/token
  grant_type: refresh_token
  client_id: YOUR_CLIENT_ID
  client_secret: YOUR_CLIENT_SECRET
  refresh_token: YOUR_REFRESH_TOKEN

Returns: New access_token (valid for 1 hour)
```

**API Request Headers:**
```
Authorization: Zoho-oauthtoken YOUR_ACCESS_TOKEN
Content-Type: application/json
```

All API requests also require: `?organization_id=YOUR_ORG_ID` query parameter

## Verified API Endpoints

### Organizations
```
GET /organizations
Returns: List of organizations the user has access to
Required params: Authorization header only (no organization_id)
Response: { organizations: [...], ... }
```

### Invoices
```
GET /invoices?organization_id=...&status=draft&limit=50
POST /invoices?organization_id=...
GET /invoices/{invoice_id}?organization_id=...
PUT /invoices/{invoice_id}?organization_id=...
DELETE /invoices/{invoice_id}?organization_id=...

Supported Statuses: draft, sent, viewed, partially_paid, paid, overdue, void, unpaid
Supported query params: status, limit, offset, sort_by, sort_order
```

### Contacts (Customers/Vendors)
```
GET /contacts?organization_id=...&limit=50
POST /contacts?organization_id=...
GET /contacts/{contact_id}?organization_id=...
PUT /contacts/{contact_id}?organization_id=...
DELETE /contacts/{contact_id}?organization_id=...

Supported query params: limit, offset, status (active/inactive)
```

### Expenses
```
GET /expenses?organization_id=...&status=draft&limit=50
POST /expenses?organization_id=...

Supported Statuses: draft, submitted, approved, paid, reimbursed
Supported query params: status, limit, offset
```

### Reports
```
GET /reports/profitandloss?organization_id=...
GET /reports/balancesheet?organization_id=...
GET /reports/cashflow?organization_id=...
GET /reports/expenses?organization_id=...
```

## Environment Variables Required

Add these to your `.env.local` file:

```env
# Zoho Books OAuth Credentials
VITE_ZOHO_CLIENT_ID=1000.YOUR_CLIENT_ID_HERE
VITE_ZOHO_CLIENT_SECRET=YOUR_CLIENT_SECRET_HERE
```

The redirect URI is automatically set to: `{current_domain}/books/callback`

Example: If your app is at `https://myapp.com`, the redirect URI is `https://myapp.com/books/callback`

## Testing Checklist

### Pre-Testing Setup
- [ ] Create Zoho Books account (free tier: https://books.zoho.com)
- [ ] Register OAuth app in https://accounts.zoho.com/developerconsole
- [ ] Copy Client ID and Client Secret
- [ ] Add environment variables to `.env.local`
- [ ] Restart dev server (environment variables change)

### Connection Flow Test
- [ ] Navigate to Books page in your app (should show "Connect" button)
- [ ] Click "Connect to Zoho Books"
- [ ] Redirected to Zoho login (if not logged in)
- [ ] See consent screen with scopes
- [ ] Click "Authorize" / "Agree"
- [ ] Redirected back to Books page
- [ ] Page now shows "Connected" status and loaded data

### Data Retrieval Tests
After successful connection:
- [ ] Dashboard shows invoice count, customer count, expense count
- [ ] Invoices tab loads list of invoices with status badges
- [ ] Customers tab loads list of customers
- [ ] Expenses tab loads list of expenses
- [ ] Reports tab shows P&L, Balance Sheet, Cash Flow
- [ ] All numbers are reasonable (not all zeros)

### Action Tests
- [ ] Create new invoice form works (can input data)
- [ ] Create new customer form works
- [ ] Create new expense form works
- [ ] Edit buttons open edit forms (if implemented)
- [ ] Delete buttons work (with confirmation)
- [ ] Disconnect button removes integration

### Error Handling Tests
- [ ] Clear browser cache/cookies, try accessing data → should handle gracefully
- [ ] Disconnect and reconnect → should work
- [ ] With invalid Client Secret in env → should show clear error
- [ ] Rate limiting: If you make many requests quickly → should handle 429 errors

## Common Error Messages & Solutions

### "Invalid Client ID"
**Cause:** Environment variable not set or incorrect
**Solution:** 
1. Check `VITE_ZOHO_CLIENT_ID` in `.env.local`
2. Verify it matches Zoho Developer Console exactly
3. Restart dev server after updating `.env` file

### "Redirect URI Mismatch"
**Cause:** Registered redirect URI doesn't match current URL
**Solution:**
1. If testing locally: Make sure redirect URI in Zoho console is `http://localhost:PORT/books/callback`
2. If production: Update redirect URI in Zoho console to match your domain

### "No Organization Found"
**Cause:** Zoho Books account has no organizations, or API token doesn't have permission
**Solution:**
1. Log in to Zoho Books directly: https://books.zoho.com
2. Check if you see an organization/workspace
3. Try reconnecting (disconnect and reconnect)

### "Access Token Expired"
**Cause:** Token is older than 1 hour and refresh failed
**Solution:**
1. App should auto-refresh tokens
2. If persists: Disconnect and reconnect
3. Check browser console for more details

### "Rate Limit Exceeded (HTTP 429)"
**Cause:** Made >100 requests per minute to Zoho Books
**Solution:**
1. App implements backoff retry logic
2. Wait a few minutes before retrying
3. Optimize code to reduce API calls

## Rate Limits

**Zoho Books Free Tier:**
- 100 requests per minute per organization
- 1000 requests per day total
- Concurrent limit: ~10 simultaneous requests

**What this means:**
- Dashboard loading ~5-10 API calls is fine
- Bulk operations might need pagination
- Heavy usage requires paid plan

## Data Persistence

The integration stores the following in Supabase:
- Access tokens (encrypted)
- Refresh tokens (encrypted)
- Organization ID
- Connection timestamps
- Invoice cache
- Customer cache
- Expense cache

All data is:
- Encrypted at rest in Supabase
- Protected by RLS (Row Level Security) policies
- User-specific and isolated
- Automatically cleared on disconnect

## Troubleshooting Workflow

1. **Check Environment Variables**
   ```
   - Verify .env.local has VITE_ZOHO_CLIENT_ID and VITE_ZOHO_CLIENT_SECRET
   - Restart dev server
   ```

2. **Check Browser Console**
   ```
   - Open DevTools (F12)
   - Go to Console tab
   - Look for errors starting with "🔴"
   - Screenshot error message
   ```

3. **Check Network Tab**
   ```
   - Open DevTools (F12)
   - Go to Network tab
   - Perform action that fails
   - Look for failed requests to zohoapis.com
   - Check the response (click on failed request)
   ```

4. **Test OAuth Flow**
   ```
   - Open /books/callback in browser directly
   - Should show "Processing..." or error
   - If error: Check console for details
   ```

5. **Verify Zoho Books Account**
   ```
   - Log in to https://books.zoho.com directly
   - Check if you can see invoices/contacts/expenses
   - Try creating a test invoice
   - If can't in Zoho: Integration won't work either
   ```

## Next Steps

1. Follow the setup in `ZOHO_BOOKS_OAUTH_SETUP.md`
2. Run through testing checklist above
3. Try creating/editing/deleting items in Books section
4. For issues: Check troubleshooting section

## Reference Links

- **Official API Docs:** https://www.zoho.com/books/api/v3/introduction/
- **OAuth Documentation:** https://www.zoho.com/books/api/v3/oauth/
- **Invoices API:** https://www.zoho.com/books/api/v3/invoices/
- **Contacts API:** https://www.zoho.com/books/api/v3/contacts/
- **Expenses API:** https://www.zoho.com/books/api/v3/expenses/
- **Reports API:** https://www.zoho.com/books/api/v3/reports/
