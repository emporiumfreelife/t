import { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { useToast } from './useToast';
import { getZohoBooksStatus, getOrganizationId, getOrganizationDetails, disconnectZohoBooks } from '../lib/zohoBooksService';
import { supabase } from '../lib/supabase';

export function useZohoBooksConnection() {
  const { user } = useAuth();
  const { addToast } = useToast();
  const [isConnected, setIsConnected] = useState(false);
  const [organizationId, setOrganizationId] = useState<string | null>(null);
  const [currency, setCurrency] = useState<string>('USD');
  const [loading, setLoading] = useState(true);
  const [isProcessingCallback, setIsProcessingCallback] = useState(false);

  // Handle OAuth callback from Zoho Books
  useEffect(() => {
    const handleOAuthCallback = async () => {
      try {
        const url = new URL(window.location.href);
        const code = url.searchParams.get('code');
        const errorParam = url.searchParams.get('error');

        if (!code && !errorParam) {
          return;
        }

        console.log('🔵 OAuth callback detected on Books page', { code: !!code, error: errorParam, userAuthenticated: !!user?.id });

        if (errorParam) {
          addToast(`Authorization failed: ${errorParam}`, 'error');
          window.history.replaceState({}, document.title, '/books');
          return;
        }

        if (!user?.id) {
          console.warn('⚠️ User not authenticated yet, waiting...');
          return;
        }

        if (!code) {
          console.warn('⚠️ No authorization code received');
          return;
        }

        setIsProcessingCallback(true);

        const redirectUri = import.meta.env.VITE_ZOHO_REDIRECT_URI || `${window.location.origin}/books`;

        console.log('🔵 Exchanging OAuth code via Edge Function');

        const { data, error: functionError } = await supabase.functions.invoke('zoho-oauth-exchange', {
          body: {
            code,
            redirectUri,
            userId: user.id,
          },
        });

        if (functionError) {
          console.error('🔴 Edge Function error:', functionError);
          addToast('Failed to connect Zoho Books', 'error');
          window.history.replaceState({}, document.title, '/books');
          return;
        }

        if (!data?.success) {
          console.error('🔴 Token exchange failed:', data?.error);
          addToast(`Connection failed: ${data?.error || 'Unknown error'}`, 'error');
          window.history.replaceState({}, document.title, '/books');
          return;
        }

        console.log('✅ OAuth callback processed successfully');
        addToast('Zoho Books connected successfully!', 'success');

        window.history.replaceState({}, document.title, '/books');

        setTimeout(() => {
          window.location.reload();
        }, 1500);
      } catch (error) {
        console.error('🔴 OAuth callback error:', error);
        addToast(error instanceof Error ? error.message : 'Connection failed', 'error');
        window.history.replaceState({}, document.title, '/books');
      } finally {
        setIsProcessingCallback(false);
      }
    };

    handleOAuthCallback();
  }, [user?.id, addToast]);

  // Check Zoho Books connection status
  useEffect(() => {
    if (!user?.id || isProcessingCallback) return;

    const checkStatus = async () => {
      try {
        const status = await getZohoBooksStatus(user.id);
        setIsConnected(status.is_connected);

        if (status.is_connected) {
          if (status.organization_id) {
            setOrganizationId(status.organization_id);
            try {
              const details = await getOrganizationDetails(user.id, status.organization_id);
              setCurrency(details.currency_code);
              console.log('✅ Organization currency loaded:', details.currency_code);
            } catch (error) {
              console.error('❌ Failed to fetch currency:', error);
              setCurrency('USD');
            }
          } else {
            console.log('🔵 Organization ID not cached, fetching from Zoho API...');
            try {
              const orgId = await getOrganizationId(user.id);
              setOrganizationId(orgId);
              console.log('✅ Organization ID fetched and cached:', orgId);

              const details = await getOrganizationDetails(user.id, orgId);
              setCurrency(details.currency_code);
              console.log('✅ Organization currency loaded:', details.currency_code);
            } catch (error) {
              console.error('❌ Failed to fetch organization details:', error);
              addToast('Failed to fetch organization details', 'error');
            }
          }
        }
      } catch (error) {
        console.error('Error checking Zoho Books status:', error);
      } finally {
        setLoading(false);
      }
    };

    checkStatus();
  }, [user, isProcessingCallback, addToast]);

  const handleDisconnect = async () => {
    if (!user?.id || !window.confirm('Are you sure you want to disconnect Zoho Books?')) return;

    try {
      await disconnectZohoBooks(user.id);
      setIsConnected(false);
      setOrganizationId(null);
      addToast('Zoho Books disconnected', 'success');
    } catch (error) {
      console.error('Error disconnecting:', error);
      addToast('Failed to disconnect', 'error');
    }
  };

  return {
    isConnected,
    organizationId,
    currency,
    loading,
    isProcessingCallback,
    handleDisconnect,
  };
}
