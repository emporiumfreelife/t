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

    // Get refresh token from database
    const { data: integration, error: fetchError } = await supabase
      .from('zoho_books_integrations')
      .select('refresh_token, token_expires_at')
      .eq('user_id', userId)
      .single();

    if (fetchError || !integration?.refresh_token) {
      return new Response(
        JSON.stringify({ error: 'No refresh token found' }),
        {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    // Exchange refresh token for new access token
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
      console.error('Zoho token refresh error:', tokenData.error);
      return new Response(
        JSON.stringify({ error: `Token refresh failed: ${tokenData.error}` }),
        {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    // Update tokens in database
    const { error: updateError } = await supabase
      .from('zoho_books_integrations')
      .update({
        access_token: tokenData.access_token,
        token_expires_at: new Date(Date.now() + tokenData.expires_in * 1000).toISOString(),
      })
      .eq('user_id', userId);

    if (updateError) {
      console.error('Database update error:', updateError);
      throw updateError;
    }

    return new Response(
      JSON.stringify({
        success: true,
        accessToken: tokenData.access_token,
      }),
      {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  } catch (error) {
    console.error('Token refresh error:', error);
    return new Response(
      JSON.stringify({
        error: error instanceof Error ? error.message : 'Token refresh failed',
      }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});
