import React, { useState, useEffect } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { CheckCircle, AlertCircle, Loader } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

type VerificationStatus = 'verifying' | 'success' | 'error';

export default function MembershipCallback() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [status, setStatus] = useState<VerificationStatus>('verifying');
  const [message, setMessage] = useState('Verifying your payment...');

  useEffect(() => {
    // Payment gateway redirects here after payment attempt
    // The backend webhook handler processes verification asynchronously
    // Just redirect back to appropriate membership page based on type

    const membershipType = searchParams.get('type') || 'creator';
    const redirectPath = membershipType === 'member' ? '/members-membership' : '/creators-membership';

    const timer = setTimeout(() => {
      if (user?.id) {
        setStatus('success');
        setMessage(`Payment processed. Checking your ${membershipType} membership status...`);

        setTimeout(() => {
          navigate(redirectPath, { replace: true });
        }, 2000);
      } else {
        setStatus('error');
        setMessage('Please sign in to continue.');

        setTimeout(() => {
          navigate('/signin', { replace: true });
        }, 2000);
      }
    }, 2000);

    return () => clearTimeout(timer);
  }, [searchParams, user?.id, navigate]);

  return (
    <div className="min-h-screen pt-20 pb-12 px-4 bg-gradient-to-b from-slate-950 via-slate-900 to-slate-950 flex items-center justify-center">
      <div className="max-w-md w-full">
        <div className="glass-effect rounded-2xl p-8 border border-white/10 text-center">
          {status === 'verifying' && (
            <div className="space-y-6">
              <div className="flex justify-center">
                <div className="relative w-16 h-16">
                  <div className="absolute inset-0 border-4 border-rose-500/20 rounded-full animate-spin"></div>
                  <div className="absolute inset-0 flex items-center justify-center">
                    <Loader className="w-8 h-8 text-rose-400 animate-pulse" />
                  </div>
                </div>
              </div>
              <div>
                <h2 className="text-2xl font-bold text-white mb-2">Verifying Payment</h2>
                <p className="text-gray-300">{message}</p>
              </div>
            </div>
          )}

          {status === 'success' && (
            <div className="space-y-6">
              <div className="flex justify-center">
                <div className="p-4 bg-green-500/20 rounded-full">
                  <CheckCircle className="w-12 h-12 text-green-400" />
                </div>
              </div>
              <div>
                <h2 className="text-2xl font-bold text-white mb-2">Upgrade Successful</h2>
                <p className="text-gray-300 mb-4">{message}</p>
                <p className="text-sm text-gray-400">Redirecting you to your membership...</p>
              </div>
            </div>
          )}

          {status === 'error' && (
            <div className="space-y-6">
              <div className="flex justify-center">
                <div className="p-4 bg-red-500/20 rounded-full">
                  <AlertCircle className="w-12 h-12 text-red-400" />
                </div>
              </div>
              <div>
                <h2 className="text-2xl font-bold text-white mb-2">Verification Failed</h2>
                <p className="text-red-300 mb-6">{message}</p>
                <button
                  onClick={() => {
                    const membershipType = searchParams.get('type') || 'creator';
                    const redirectPath = membershipType === 'member' ? '/members-membership' : '/creators-membership';
                    navigate(redirectPath, { replace: true });
                  }}
                  className="w-full py-3 bg-gradient-to-r from-rose-500 to-purple-600 text-white font-semibold rounded-lg hover:shadow-lg transition-all"
                >
                  Back to Membership
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
