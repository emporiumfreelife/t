import { createClient } from 'jsr:@supabase/supabase-js@2';

const ZOHO_BOOKS_API_BASE = 'https://www.zohoapis.com/books/v3';
const ZOHO_OAUTH_TOKEN_URL = 'https://accounts.zoho.com/oauth/v2/token';
const ZOHO_CLIENT_ID = Deno.env.get('VITE_ZOHO_CLIENT_ID');
const ZOHO_CLIENT_SECRET = Deno.env.get('VITE_ZOHO_CLIENT_SECRET');

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

async function getValidAccessToken(
  supabase: any,
  userId: string
): Promise<string> {
  const { data: integration, error: fetchError } = await supabase
    .from('zoho_books_integrations')
    .select('access_token, token_expires_at, refresh_token')
    .eq('user_id', userId)
    .single();

  if (fetchError || !integration?.access_token) {
    throw new Error('No Zoho Books integration found');
  }

  const expiresAt = new Date(integration.token_expires_at);
  if (expiresAt < new Date()) {
    // Token expired, refresh it
    if (!integration.refresh_token) {
      throw new Error('No refresh token found');
    }

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
    const { error: updateError } = await supabase
      .from('zoho_books_integrations')
      .update({
        access_token: tokenData.access_token,
        token_expires_at: new Date(
          Date.now() + tokenData.expires_in * 1000
        ).toISOString(),
      })
      .eq('user_id', userId);

    if (updateError) throw updateError;

    return tokenData.access_token;
  }

  return integration.access_token;
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  if (!['GET', 'POST', 'PUT', 'DELETE'].includes(req.method)) {
    return new Response('Method Not Allowed', {
      status: 405,
      headers: corsHeaders,
    });
  }

  try {
    let userId, organizationId, endpoint, method = 'GET', body;

    try {
      const bodyData = await req.json();
      userId = bodyData.userId;
      organizationId = bodyData.organizationId;
      endpoint = bodyData.endpoint;
      method = bodyData.method || 'GET';
      body = bodyData.body;
    } catch (parseError) {
      console.error('Failed to parse request body:', parseError);
      return new Response(
        JSON.stringify({ error: 'Invalid request body' }),
        {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    console.log(`🔵 Zoho API call: ${method} ${endpoint} for user ${userId}`);

    if (!userId || !organizationId || !endpoint) {
      return new Response(
        JSON.stringify({
          error: 'userId, organizationId, and endpoint are required',
        }),
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

    // Get valid access token
    console.log(`🔵 Getting access token for user: ${userId}`);
    const accessToken = await getValidAccessToken(supabase, userId);
    console.log(`✅ Access token obtained`);

    // Build request URL
    const url = new URL(`${ZOHO_BOOKS_API_BASE}${endpoint}`);
    url.searchParams.set('organization_id', organizationId);

    // Make API call
    const options: RequestInit = {
      method,
      headers: {
        'Authorization': `Zoho-oauthtoken ${accessToken}`,
        'Content-Type': 'application/json',
      },
    };

    if (body && (method === 'POST' || method === 'PUT')) {
      options.body = JSON.stringify(body);
      console.log(`📝 Request body:`, JSON.stringify(body, null, 2));
    }

    console.log(`📡 Making ${method} request to: ${url.toString()}`);
    console.log(`📝 Headers: Authorization: Zoho-oauthtoken [***], Content-Type: application/json`);

    const response = await fetch(url.toString(), options);
    const responseText = await response.text();

    console.log(`📊 Response status: ${response.status}`);
    console.log(`📊 Response body:`, responseText);

    if (!response.ok) {
      let errorMessage = response.statusText;
      let errorCode = null;
      let fullErrorData = null;
      try {
        fullErrorData = JSON.parse(responseText);
        errorCode = fullErrorData.code;
        errorMessage = fullErrorData.message || fullErrorData.error || response.statusText;
        console.error(`🔴 Zoho API error (code ${errorCode}): ${errorMessage}`);
        console.error(`🔴 Full error response:`, JSON.stringify(fullErrorData));
      } catch (e) {
        errorMessage = responseText || response.statusText;
        console.error(`🔴 Failed to parse error response: ${errorMessage}`);
      }

      // Return error response with detailed information
      return new Response(
        JSON.stringify({
          success: false,
          error: errorMessage,
          code: errorCode,
          httpStatus: response.status,
          details: fullErrorData,
        }),
        {
          status: 200, // Return 200 so Supabase treats it as successful function execution
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    let data;
    try {
      data = JSON.parse(responseText);
    } catch (e) {
      console.error('Failed to parse response:', responseText);
      throw new Error('Invalid JSON response from Zoho Books API');
    }

    console.log('✅ Zoho API call successful');

    return new Response(JSON.stringify({ success: true, data }), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'API call failed';
    const errorStack = error instanceof Error ? error.stack : '';
    console.error('🔴 Zoho API call error:', errorMessage);
    console.error('🔴 Full error:', error);
    console.error('🔴 Error stack:', errorStack);

    // Return detailed error information
    return new Response(
      JSON.stringify({
        success: false,
        error: errorMessage,
        details: errorStack || 'No stack trace available',
      }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});
