# Zoho Books Setup - Quick Start Guide

Everything is ready! Follow these 5 simple steps to get Zoho Books fully integrated.

## Step 1: Create a Zoho Books Account (Free Tier)

1. Go to: https://books.zoho.com
2. Sign up for a free account
3. You'll be directed to https://books.zoho.com/app

That's it! You now have a Zoho Books account with organizations and data.

## Step 2: Register Your App in Zoho Developer Console

1. Visit: **https://accounts.zoho.com/developerconsole**
2. Log in with your Zoho account
3. Click **"GET STARTED"** or **"ADD CLIENT"** button
4. Select: **"Server-based Applications"**
5. Click **"CREATE NOW"**

Fill in these details:
- **Client Name:** `Your App Name - Zoho Books`
- **Homepage URL:** `https://yourapp.com` (your app's URL)
- **Authorized Redirect URI:** `https://yourapp.com/books/callback`

Then click **"CREATE"**

## Step 3: Copy Your Credentials

After creation, you'll see a screen showing:
- **Client ID** (starts with `1000.`)
- **Client Secret** (long string)

Keep these safe! You'll need them in the next step.

## Step 4: Add Environment Variables

In your project's `.env.local` file, add:

```env
VITE_ZOHO_CLIENT_ID=1000.YOUR_CLIENT_ID_HERE
VITE_ZOHO_CLIENT_SECRET=YOUR_CLIENT_SECRET_HERE
```

Replace with your actual credentials from Step 3.

**Important:** If using DevServerControl or cloud env setup, add variables there instead of `.env.local`.

Then **restart your dev server** for changes to take effect.

## Step 5: Test the Integration

1. Navigate to the **Books** page in your app
2. Click **"Connect to Zoho Books"** button
3. You'll be redirected to Zoho's authorization screen
4. Click **"Authorize"** or **"Agree"**
5. You'll be redirected back to the Books page
6. Dashboard should now show:
   - Total invoices count
   - Total customers count
   - Total expenses count
   - Recent activity

If you see data, congratulations! Your integration is working.

## What Gets Stored

When you authorize, your app stores (securely in Supabase):
- ✅ Access tokens (encrypted, expires in 1 hour)
- ✅ Refresh tokens (encrypted, lasts months)
- ✅ Organization ID (from Zoho Books)
- ✅ Connection timestamp

**What doesn't get stored:**
- ❌ Your Zoho password (OAuth doesn't require it)
- ❌ Client Secret (only used server-side)
- ❌ Personal financial data initially (fetched on-demand)

## Features You Can Now Use

After connecting, you can:

### 📊 Dashboard
- View key metrics (invoice count, customer count, expense count)
- See recent activity

### 📄 Invoices
- View all invoices with status
- Create new invoices
- Edit existing invoices
- Delete invoices
- Filter by status (draft, sent, paid, overdue, etc.)

### 👥 Customers
- View all customers/contacts
- Create new customers
- Edit customer details
- View contact information

### 💸 Expenses
- View all expenses
- Create new expenses
- Track expense status
- View expense details

### 📈 Reports
- Profit & Loss statement
- Balance Sheet
- Cash Flow report
- Expense reports

## Troubleshooting

### "Connect" button not working?
1. Check that environment variables are set in `.env.local`
2. Restart your dev server
3. Open DevTools Console (F12) to see error messages

### "No data showing after connecting?"
1. Make sure your Zoho Books account has actual invoices/customers
2. Try logging in to https://books.zoho.com directly to verify data exists
3. Try disconnecting and reconnecting

### "Invalid Client ID/Secret error?"
1. Verify your credentials in Zoho Developer Console match your `.env.local`
2. Check you didn't add extra spaces or quotes
3. Copy credentials again and update `.env.local`

### "Redirect URI mismatch error?"
1. Make sure your app's URL matches what you registered in Zoho
2. For localhost: Register as `http://localhost:PORT/books/callback`
3. For production: Register as `https://yourdomain.com/books/callback`

## API Limits (Free Tier)

- 100 API calls per minute
- 1000 API calls per day
- ~10 concurrent requests

This is plenty for normal usage. Heavy automation might need a paid plan.

## Security Notes

✅ **What's Secure:**
- Tokens are encrypted in Supabase database
- OAuth tokens expire automatically
- User data is isolated (RLS policies)
- Redirect URI matches registered domain

❌ **Don't Do:**
- Don't share your Client Secret
- Don't commit `.env.local` to git
- Don't expose access tokens in frontend code

## Complete Documentation

For detailed information, see:
- `ZOHO_BOOKS_OAUTH_SETUP.md` - Full OAuth setup guide
- `ZOHO_BOOKS_API_VERIFICATION.md` - API specifications & testing
- `ZOHO_BOOKS_SETUP.md` - Original integration documentation

## Next Steps

1. Complete Steps 1-4 above
2. Test connection (Step 5)
3. Try creating/editing invoices, customers, expenses
4. Disconnect and reconnect to test OAuth flow
5. Check browser console (F12) if anything seems wrong

You're all set! Your Zoho Books integration is ready to use.
