import { createClient } from 'jsr:@supabase/supabase-js@2';

const ZOHO_BOOKS_API_BASE = 'https://www.zohoapis.com/books/v3';
const ZOHO_OAUTH_TOKEN_URL = 'https://accounts.zoho.com/oauth/v2/token';
const ZOHO_CLIENT_ID = Deno.env.get('VITE_ZOHO_CLIENT_ID');
const ZOHO_CLIENT_SECRET = Deno.env.get('VITE_ZOHO_CLIENT_SECRET');

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

async function refreshToken(supabase: any, userId: string): Promise<string> {
  const { data: integration, error: fetchError } = await supabase
    .from('zoho_books_integrations')
    .select('refresh_token, token_expires_at')
    .eq('user_id', userId)
    .single();

  if (fetchError || !integration?.refresh_token) {
    throw new Error('No refresh token found');
  }

  const expiresAt = new Date(integration.token_expires_at);
  if (expiresAt > new Date()) {
    // Token still valid, get it
    const { data: intData } = await supabase
      .from('zoho_books_integrations')
      .select('access_token')
      .eq('user_id', userId)
      .single();
    if (intData?.access_token) return intData.access_token;
  }

  // Refresh the token
  const tokenResponse = await fetch(ZOHO_OAUTH_TOKEN_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: new URLSearchParams({
      grant_type: 'refresh_token',
      client_id: ZOHO_CLIENT_ID!,
      client_secret: ZOHO_CLIENT_SECRET!,
      refresh_token: integration.refresh_token,
    }).toString(),
  });

  const tokenData = await tokenResponse.json();
  if (tokenData.error) {
    throw new Error(`Token refresh failed: ${tokenData.error}`);
  }

  // Update tokens
  await supabase
    .from('zoho_books_integrations')
    .update({
      access_token: tokenData.access_token,
      token_expires_at: new Date(Date.now() + tokenData.expires_in * 1000).toISOString(),
    })
    .eq('user_id', userId);

  return tokenData.access_token;
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  if (req.method !== 'POST') {
    return new Response('Method Not Allowed', {
      status: 405,
      headers: corsHeaders,
    });
  }

  try {
    const { userId } = await req.json();

    if (!userId) {
      return new Response(
        JSON.stringify({ error: 'User ID is required' }),
        {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    // Initialize Supabase client
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Check if organization ID is already cached
    const { data: integration } = await supabase
      .from('zoho_books_integrations')
      .select('organization_id')
      .eq('user_id', userId)
      .single();

    if (integration?.organization_id) {
      return new Response(
        JSON.stringify({
          success: true,
          organizationId: integration.organization_id,
        }),
        {
          status: 200,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    // Get valid access token (refresh if needed)
    const accessToken = await refreshToken(supabase, userId);

    // Fetch organization ID from Zoho
    const response = await fetch(`${ZOHO_BOOKS_API_BASE}/organizations`, {
      headers: {
        'Authorization': `Zoho-oauthtoken ${accessToken}`,
      },
    });

    const data = await response.json();
    const orgId = data.organizations?.[0]?.organization_id;

    if (!orgId) {
      return new Response(
        JSON.stringify({ error: 'No organization found in Zoho Books' }),
        {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    // Cache the organization ID
    await supabase
      .from('zoho_books_integrations')
      .update({ organization_id: orgId })
      .eq('user_id', userId);

    return new Response(
      JSON.stringify({
        success: true,
        organizationId: orgId,
      }),
      {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  } catch (error) {
    console.error('Error fetching organization:', error);
    return new Response(
      JSON.stringify({
        error: error instanceof Error ? error.message : 'Failed to fetch organization',
      }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});
