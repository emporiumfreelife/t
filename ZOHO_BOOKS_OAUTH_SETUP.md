# Zoho Books OAuth 2.0 Setup Guide

This guide explains step-by-step how to register your application with Zoho Books and obtain the necessary OAuth 2.0 credentials (Client ID and Client Secret).

## What You Need

After completing this setup, you'll have:
1. **Client ID** - Public identifier for your application
2. **Client Secret** - Secret key for secure token exchange (keep this confidential)
3. **Redirect URI** - The URL where users return after authorizing (configured as part of your app)

## Step 1: Access Zoho Developer Console

1. Go to: **https://accounts.zoho.com/developerconsole**
2. Log in with your Zoho Books account credentials (if not already logged in)
3. If prompted that you don't have credentials, click **"Add Client ID"** button

## Step 2: Create a New Client

### For Web/Server-Based Applications (Recommended)

1. Click **"GET STARTED"** or **"ADD CLIENT"** (top-right corner)
2. Choose client type: **"Server-based Applications"** (this is what we're using)
3. Click **"CREATE NOW"**

### Fill in the Following Details:

**Client Name:**
```
Your App Name - Zoho Books Integration
```
(Example: `MyApp Zoho Books Integration`)

**Homepage URL:**
```
https://yourapp.com
```
(Use your application's main URL)

**Authorized Redirect URI (Very Important):**
```
https://yourapp.com/books/callback
```
(This is where Zoho Books will send users after they approve access. The `/books/callback` path is already configured in your application)

4. Click **"CREATE"**
5. Accept the confirmation popup

## Step 3: Copy Your Credentials

After creation, you'll see a screen with your credentials:

- **Client ID**: A long string starting with `1000.` (example: `1000.0SRSxxxxxxxxxxxxxxxxxxxx239V`)
- **Client Secret**: Another long string (example: `fb01xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx8abf`)

**Important**: Keep your Client Secret confidential. Never share it or commit it to version control.

## Step 4: Configure Environment Variables

Add these to your `.env.local` file (or through the DevServerControl settings):

```env
VITE_ZOHO_CLIENT_ID=1000.YOUR_CLIENT_ID_HERE
VITE_ZOHO_CLIENT_SECRET=YOUR_CLIENT_SECRET_HERE
```

Replace the values with your actual Client ID and Client Secret from Step 3.

## Step 5: Understanding Scopes

The OAuth scopes define what permissions your app requests. The current integration uses:

```
ZohoBooks.fullaccess.ALL
```

This grants full access to all Zoho Books features. If you want more granular control, you can use specific scopes:

### Available Scopes:
- `ZohoBooks.invoices.READ` - Read invoices
- `ZohoBooks.invoices.CREATE` - Create invoices
- `ZohoBooks.invoices.UPDATE` - Modify invoices
- `ZohoBooks.invoices.DELETE` - Delete invoices
- `ZohoBooks.contacts.READ` - Read contacts (customers/vendors)
- `ZohoBooks.contacts.CREATE` - Create contacts
- `ZohoBooks.contacts.UPDATE` - Modify contacts
- `ZohoBooks.contacts.DELETE` - Delete contacts
- `ZohoBooks.expenses.READ` - Read expenses
- `ZohoBooks.expenses.CREATE` - Create expenses
- `ZohoBooks.expenses.UPDATE` - Modify expenses
- `ZohoBooks.expenses.DELETE` - Delete expenses
- `ZohoBooks.reports.READ` - Read financial reports
- `ZohoBooks.settings.READ` - Read organization settings

Separate multiple scopes with commas in the authorization URL.

## Step 6: Get Your Organization ID

After your first login, the system will automatically fetch your Organization ID from Zoho Books. However, if you need it manually:

1. Log in to https://books.zoho.com/app
2. Click the dropdown with your organization's name (top-left or top-right)
3. Click **"Manage Organizations"**
4. Copy your Organization ID from the list

Or use the API to get it:
```bash
curl -X GET 'https://www.zohoapis.com/books/v3/organizations' \
  -H 'Authorization: Zoho-oauthtoken YOUR_ACCESS_TOKEN'
```

## OAuth 2.0 Flow Overview

Here's how the authentication works:

### 1. Authorization Request (User clicks "Connect Zoho Books")
- User is redirected to: `https://accounts.zoho.com/oauth/v2/auth?...`
- They see Zoho's consent screen
- They grant permission

### 2. Authorization Code Returned
- Zoho redirects back to: `https://yourapp.com/books/callback?code=...&state=...`
- Your app captures the authorization code

### 3. Token Exchange (Behind the scenes)
- Your app sends: Client ID + Client Secret + Authorization Code to Zoho
- Zoho returns: Access Token + Refresh Token

### 4. Store Tokens Securely
- Access Token: Stored in Supabase (encrypted)
- Refresh Token: Stored in Supabase (encrypted)
- Both are user-specific and isolated

### 5. Make API Calls
- Every API request includes: `Authorization: Zoho-oauthtoken ACCESS_TOKEN`
- If token expires (1 hour), use Refresh Token to get a new one

## Token Expiration & Refresh

- **Access Token**: Valid for **1 hour**
- **Refresh Token**: Valid for **multiple refreshes** (stored securely)
- The app automatically refreshes tokens before they expire
- No user re-authentication needed until refresh token expires (can be months)

## API Endpoints

All API calls go to:
```
https://www.zohoapis.com/books/v3/
```

Key endpoints:
- `GET /organizations` - List organizations
- `GET /invoices?organization_id=...` - List invoices
- `POST /invoices?organization_id=...` - Create invoice
- `GET /contacts?organization_id=...` - List contacts
- `POST /contacts?organization_id=...` - Create contact
- `GET /expenses?organization_id=...` - List expenses
- `POST /expenses?organization_id=...` - Create expense

All endpoints require the `organization_id` query parameter.

## Common Issues & Troubleshooting

### "Invalid Client ID" Error
- Verify your `VITE_ZOHO_CLIENT_ID` is correct in environment variables
- Check it matches exactly what you copied from Zoho Developer Console

### "Redirect URI mismatch" Error
- The redirect URI in your OAuth request doesn't match what you registered
- Registered: `https://yourapp.com/books/callback`
- Ensure it matches exactly (including protocol, domain, path)

### "Access Token Expired" Error
- The app should automatically refresh it
- If not, click "Disconnect" then "Connect to Zoho Books" again

### "Organization ID not found" Error
- Make sure you've logged into Zoho Books at least once
- The organization ID should be auto-fetched on first API call
- If still missing, get it manually from Manage Organizations page

### Rate Limiting
- **100 requests per minute** (for free tier)
- **429 error** if exceeded
- The app implements backoff retry logic

## Security Best Practices

1. **Never expose Client Secret** in client-side code (it's in environment variables only)
2. **Store tokens encrypted** in Supabase with RLS policies
3. **Use HTTPS** for all OAuth redirects (required by Zoho)
4. **Refresh tokens** before they expire automatically
5. **Revoke tokens** when users disconnect (available through API)
6. **Don't log sensitive data** like tokens or secrets

## Testing the Integration

1. Set your environment variables with Client ID and Secret
2. Navigate to the Books page in your app
3. Click "Connect to Zoho Books"
4. You'll be redirected to Zoho's consent screen
5. Grant permission
6. You'll be redirected back to the Books page
7. The app should now fetch your invoices, contacts, and expenses

## Support & Resources

- **Zoho Books API Docs**: https://www.zoho.com/books/api/v3/introduction/
- **OAuth Documentation**: https://www.zoho.com/books/api/v3/oauth/
- **API Collection (Postman)**: Available in the official API docs

## Next Steps

1. Register your application (Steps 1-3 above)
2. Copy your credentials
3. Add them to your environment variables
4. Test the OAuth flow by clicking "Connect to Zoho Books"
5. Start using the Zoho Books features in your app!
