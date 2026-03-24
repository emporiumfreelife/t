# Zoho Books Integration Setup Guide

This guide will help you set up the Zoho Books integration for the FlourishTalents platform.

## Table of Contents

1. [Prerequisites](#prerequisites)
2. [Zoho Books Account Setup](#zoho-books-account-setup)
3. [OAuth Application Registration](#oauth-application-registration)
4. [Environment Variables Configuration](#environment-variables-configuration)
5. [Database Setup](#database-setup)
6. [Feature Overview](#feature-overview)
7. [Security Considerations](#security-considerations)
8. [Troubleshooting](#troubleshooting)

## Prerequisites

- Zoho Books account (free tier available)
- Access to Zoho Developer Console
- Node.js and npm installed
- Supabase project set up
- FlourishTalents project installed

## Zoho Books Account Setup

### Step 1: Create or Sign In to Zoho Books

1. Go to [Zoho Books](https://www.zohobooks.com)
2. Click "Sign Up" or "Sign In" with your Zoho account
3. Create a new organization for testing/development if needed
4. Complete the setup wizard

### Step 2: Get Your Organization ID

1. Log in to Zoho Books
2. Go to **Settings** > **Organization Settings**
3. Copy your **Organization ID** (you'll need this later)

## OAuth Application Registration

### Step 1: Access Zoho Developer Console

1. Go to [Zoho Developer Console](https://accounts.zoho.com/developerconsole)
2. Sign in with your Zoho account
3. Click **Create New Client**

### Step 2: Create OAuth Application

1. Select **Web-based Applications** as the application type
2. Fill in the following details:

   - **Client Name**: FlourishTalents Books
   - **Company Name**: Your Company Name
   - **Homepage URL**: https://yourdomain.com
   - **Authorized Redirect URIs**: 
     ```
     http://localhost:5173/books/callback
     https://yourdomain.com/books/callback
     ```
     (Add both local and production URLs)

3. Click **Create**

### Step 3: Get Client Credentials

1. In the developer console, find your application
2. Click on the application name to view details
3. Copy the following:
   - **Client ID**
   - **Client Secret**

**⚠️ Important**: Never share your Client Secret. Keep it secure.

## Environment Variables Configuration

### Step 1: Create .env.local File

In the root of your FlourishTalents project, create or update your `.env.local` file:

```bash
# Zoho Books OAuth Credentials
VITE_ZOHO_CLIENT_ID=your_client_id_here
VITE_ZOHO_CLIENT_SECRET=your_client_secret_here
```

### Step 2: Verify Environment Variables are Loaded

The application will automatically use these variables. You can verify by checking:

```javascript
// In your browser console (after page load):
console.log(import.meta.env.VITE_ZOHO_CLIENT_ID);
```

### Step 3: Deploy to Production

For production deployment:

1. Set environment variables in your hosting platform:
   - **Vercel**: Project Settings > Environment Variables
   - **Netlify**: Site Settings > Build & Deploy > Environment
   - **Self-hosted**: Update server environment variables

2. Update your redirect URI in the Zoho Developer Console with your production domain

## Database Setup

### Step 1: Run Database Migration

1. Go to your Supabase dashboard
2. Click **SQL Editor**
3. Click **New Query**
4. Copy and paste the contents of `src/lib/zohoBooksDatabase.sql`
5. Click **Run**

This will create the following tables:
- `zoho_books_integrations` - Store OAuth tokens and connection status
- `zoho_books_invoices` - Cache invoice data
- `zoho_books_customers` - Cache customer data
- `zoho_books_expenses` - Cache expense data
- `zoho_books_items` - Cache product/item data
- `zoho_books_reports` - Cache financial reports

### Step 2: Verify Tables Created

Run this query in Supabase SQL Editor:

```sql
SELECT tablename FROM pg_tables WHERE schemaname = 'public' AND tablename LIKE 'zoho_books_%';
```

You should see all 6 tables listed.

## Feature Overview

### 1. Dashboard

The Books dashboard provides:
- Quick stats (total invoices, customers, expenses)
- Recent invoices list
- Recent expenses list
- Quick access to all features

### 2. Invoices Management

**Features:**
- View all invoices with filtering by status
- Create new invoices
- View invoice details
- Edit invoice information
- Delete invoices
- Email invoices to customers
- Track payment status

**Supported Invoice Statuses:**
- Draft - Not yet sent
- Sent - Sent to customer
- Viewed - Customer has viewed
- Partially Paid - Partially received payment
- Paid - Fully paid
- Overdue - Past due date
- Cancelled - Cancelled invoice

### 3. Customers Management

**Features:**
- View all customers
- Create new customers
- Edit customer information
- Store multiple addresses
- Track customer tier/status
- Notes and custom fields

**Customer Information:**
- Name and company
- Email and phone
- Billing and shipping addresses
- Website and fax
- Custom notes

### 4. Expenses Management

**Features:**
- Track business expenses
- Categorize by account
- Record vendor information
- Attach receipts/documents
- Track expense status
- Approve and reimburse expenses

**Expense Workflow:**
- Draft → Submit → Approve → Pay/Reimburse

### 5. Financial Reports

**Reports Available:**
- **Profit & Loss** - Income, expenses, and net profit
- **Balance Sheet** - Assets, liabilities, and equity
- **Cash Flow** - Cash movements
- **Expense Report** - Expense breakdown by category

### 6. Secure OAuth Connection

**Security Features:**
- OAuth 2.0 with secure token exchange
- Tokens stored encrypted in database
- Automatic token refresh
- Secure client credentials handling
- Session-based authentication
- User data isolation with RLS

## Security Considerations

### Token Management

1. **Token Storage**
   - Access tokens are stored in the database encrypted
   - Refresh tokens are used to obtain new access tokens
   - Tokens never stored in browser localStorage
   - Automatic refresh before expiration

2. **Token Lifecycle**
   ```
   OAuth Flow:
   1. User clicks "Connect Zoho Books"
   2. Redirected to Zoho OAuth page
   3. User authorizes FlourishTalents app
   4. Zoho redirects back with authorization code
   5. Code exchanged for access + refresh tokens
   6. Tokens stored securely in database
   7. API calls use stored token with auto-refresh
   ```

### Data Security

1. **Row Level Security (RLS)**
   - Every user can only access their own data
   - Database policies enforce user isolation
   - Impossible to access other users' Zoho data

2. **API Call Security**
   - All API calls use OAuth tokens
   - Tokens included in Authorization header
   - HTTPS only (no plain HTTP)
   - Server-side validation of all requests

3. **Credentials Security**
   - Client Secret never exposed to frontend
   - Client Secret stored in environment variables only
   - Authorization code exchanged server-side
   - No credentials logged or exposed in browser

### Best Practices

1. **Never commit secrets**
   ```bash
   # .env.local is in .gitignore
   VITE_ZOHO_CLIENT_SECRET=xxx  # Not needed in frontend
   ```

2. **Rotate Client Secret periodically**
   - Every 90-180 days recommended
   - Update in both Zoho and environment variables

3. **Monitor access**
   - Check Zoho Books activity logs
   - Review connected applications in Zoho
   - Remove unused integrations

4. **Audit logs**
   - Enable Zoho Books audit logs
   - Monitor for suspicious activity
   - Regular security reviews

## Troubleshooting

### Issue: "Invalid Client ID" Error

**Solution:**
1. Verify `VITE_ZOHO_CLIENT_ID` is set correctly
2. Check for extra spaces or quotes in the value
3. Confirm the application is active in Zoho Developer Console
4. Restart development server after changing env variables

### Issue: "Redirect URI mismatch"

**Solution:**
1. Check the redirect URI in your application settings
2. Ensure it matches exactly: `{domain}/books/callback`
3. Add both HTTP (dev) and HTTPS (prod) versions
4. Reload page after making changes

### Issue: "Token Expired" Error

**Solution:**
1. Disconnect and reconnect Zoho Books
2. Check database for valid refresh token
3. Ensure system time is correct
4. Clear browser cache and cookies

### Issue: No Data Showing

**Solution:**
1. Ensure Zoho Books account has data (invoices, customers)
2. Check database for successful token storage:
   ```sql
   SELECT * FROM zoho_books_integrations WHERE user_id = 'your-user-id';
   ```
3. Check browser console for API errors
4. Verify organization_id was populated

### Issue: 403 Forbidden Error

**Solution:**
1. Verify the OAuth token has full access:
   - In Zoho, check connected applications
   - Verify scope includes all features needed
2. Disconnect and reconnect to re-authorize
3. Check Zoho Books user permissions

### Issue: Database Errors

**Solution:**
1. Run migration script again to ensure tables created
2. Check RLS policies are enabled:
   ```sql
   SELECT tablename, rowsecurity FROM pg_tables WHERE tablename LIKE 'zoho_books_%';
   ```
3. Verify user ID in tokens matches auth.users.id
4. Check Supabase logs for policy violations

## Rate Limiting

Zoho Books API has rate limits:
- **Standard**: 600 requests per hour
- **Premium**: 3000 requests per hour

Recommendations:
- Cache data locally when possible
- Batch API calls
- Implement exponential backoff for retries
- Monitor usage in Zoho Books

## File Structure

```
src/
├── lib/
│   ├── zohoBooksService.ts      # OAuth and API integration
│   └── zohoBooksDatabase.sql    # Database schema
├── pages/
│   ├── Books.tsx                # Main Books dashboard
│   └── BooksCallback.tsx        # OAuth callback handler
└── components/
    └── Navbar.tsx               # Added Books link
```

## Support

For issues:
1. Check this documentation
2. Review Zoho Books API documentation
3. Check browser console for errors
4. Review Supabase logs
5. Check your Zoho Books account status

## Next Steps

1. Set up Zoho Books account
2. Register OAuth application
3. Add environment variables
4. Run database migration
5. Test connection by clicking Books in navigation
6. Create test invoice and customer
7. Verify data syncs correctly
8. Set up production credentials

## Additional Resources

- [Zoho Books API Documentation](https://www.zoho.com/books/api/v3/)
- [Zoho OAuth Documentation](https://www.zoho.com/accounts/protocol/oauth.html)
- [Zoho Books Free Features](https://www.zoho.com/books/pricing/)
- [FlourishTalents Documentation](./README.md)
