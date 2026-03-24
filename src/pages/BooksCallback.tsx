import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { supabase } from '../lib/supabase';
import { useToast } from '../hooks/useToast';
import { CheckCircle2, AlertCircle, Zap } from 'lucide-react';

export default function BooksCallback() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { addToast } = useToast();
  const [status, setStatus] = useState<'processing' | 'success' | 'error'>('processing');
  const [error, setError] = useState<string>('');

  useEffect(() => {
    const handleCallback = async () => {
      try {
        // Parse the URL to extract parameters, ignoring unsupported ones
        const url = new URL(window.location.href);
        const code = url.searchParams.get('code');
        const state = url.searchParams.get('state');
        const errorParam = url.searchParams.get('error');

        console.log('🔵 BooksCallback triggered', { code: !!code, errorParam, userAuthenticated: !!user?.id });

        if (errorParam) {
          throw new Error(`Authorization failed: ${errorParam}`);
        }

        if (!code) {
          throw new Error('No authorization code received');
        }

        // Wait for user to be authenticated (with timeout)
        if (!user?.id) {
          console.warn('⚠️ User not yet authenticated, waiting...');
          // Return without error - component will retry when user loads
          return;
        }

        console.log('✅ User authenticated, exchanging code for token');

        // Call Supabase Edge Function to exchange code for token
        const redirectUri = import.meta.env.VITE_ZOHO_REDIRECT_URI || `${window.location.origin}/books/callback`;

        console.log('🔵 Calling Edge Function with:', { redirectUri, userId: user.id });

        const { data, error: functionError } = await supabase.functions.invoke('zoho-oauth-exchange', {
          body: {
            code,
            redirectUri,
            userId: user.id,
          },
        });

        if (functionError) {
          console.error('🔴 Edge Function error:', functionError);
          throw new Error(functionError.message || 'Failed to exchange authorization code');
        }

        if (!data?.success) {
          console.error('🔴 Token exchange failed:', data?.error);
          throw new Error(data?.error || 'Token exchange failed');
        }

        console.log('✅ Token exchange successful!');
        setStatus('success');
        addToast('Zoho Books connected successfully!', 'success');

        // Redirect to Books page after 2 seconds
        setTimeout(() => {
          navigate('/books');
        }, 2000);
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Unknown error occurred';
        console.error('🔴 Callback error:', message);
        setError(message);
        setStatus('error');
        addToast(`Connection failed: ${message}`, 'error');

        // Redirect back to Books page after 3 seconds
        setTimeout(() => {
          navigate('/books');
        }, 3000);
      }
    };

    handleCallback();
  }, [user?.id, navigate, addToast]);

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 to-slate-800 pt-20 px-4">
      <div className="max-w-md mx-auto mt-20">
        <div className="bg-gradient-to-br from-slate-800 to-slate-700 rounded-xl border border-white/10 p-12 text-center">
          {status === 'processing' && (
            <>
              <Zap className="w-16 h-16 text-rose-400 mx-auto mb-6 animate-spin" />
              <h2 className="text-2xl font-bold text-white mb-4">Connecting Zoho Books</h2>
              <p className="text-gray-300">Please wait while we authenticate your account...</p>
            </>
          )}

          {status === 'success' && (
            <>
              <CheckCircle2 className="w-16 h-16 text-emerald-400 mx-auto mb-6" />
              <h2 className="text-2xl font-bold text-white mb-4">Connection Successful!</h2>
              <p className="text-gray-300 mb-4">Your Zoho Books account has been connected securely.</p>
              <p className="text-sm text-gray-400">Redirecting to Books dashboard...</p>
            </>
          )}

          {status === 'error' && (
            <>
              <AlertCircle className="w-16 h-16 text-red-400 mx-auto mb-6" />
              <h2 className="text-2xl font-bold text-white mb-4">Connection Failed</h2>
              <p className="text-red-300 mb-4">{error}</p>
              <p className="text-sm text-gray-400">Redirecting back...</p>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
