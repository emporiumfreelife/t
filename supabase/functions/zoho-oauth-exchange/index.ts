import { createClient } from 'jsr:@supabase/supabase-js@2';

const ZOHO_CLIENT_ID = Deno.env.get('VITE_ZOHO_CLIENT_ID');
const ZOHO_CLIENT_SECRET = Deno.env.get('VITE_ZOHO_CLIENT_SECRET');
const ZOHO_OAUTH_TOKEN_URL = 'https://accounts.zoho.com/oauth/v2/token';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

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
    const { code, redirectUri, userId } = await req.json();

    if (!code) {
      return new Response(
        JSON.stringify({ error: 'Authorization code is required' }),
        {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    if (!userId) {
      return new Response(
        JSON.stringify({ error: 'User ID is required' }),
        {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    // Exchange authorization code for access token
    const tokenResponse = await fetch(ZOHO_OAUTH_TOKEN_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({
        grant_type: 'authorization_code',
        client_id: ZOHO_CLIENT_ID!,
        client_secret: ZOHO_CLIENT_SECRET!,
        redirect_uri: redirectUri,
        code,
      }).toString(),
    });

    const tokenData = await tokenResponse.json();

    if (tokenData.error) {
      console.error('Zoho OAuth error:', tokenData.error);
      return new Response(
        JSON.stringify({ error: `Zoho OAuth failed: ${tokenData.error}` }),
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

    // Store tokens in database
    const { error: dbError } = await supabase
      .from('zoho_books_integrations')
      .upsert({
        user_id: userId,
        access_token: tokenData.access_token,
        refresh_token: tokenData.refresh_token,
        token_expires_at: new Date(Date.now() + tokenData.expires_in * 1000).toISOString(),
        organization_id: null, // Will be fetched on first API call
        is_connected: true,
        connected_at: new Date().toISOString(),
      });

    if (dbError) {
      console.error('Database error:', dbError);
      throw dbError;
    }

    return new Response(
      JSON.stringify({
        success: true,
        accessToken: tokenData.access_token,
        message: 'Zoho Books connected successfully',
      }),
      {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  } catch (error) {
    console.error('OAuth exchange error:', error);
    return new Response(
      JSON.stringify({
        error: error instanceof Error ? error.message : 'Token exchange failed',
      }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});
