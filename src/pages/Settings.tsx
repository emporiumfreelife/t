import { useState, useEffect } from 'react';
import {
  User,
  Mail,
  Lock,
  Bell,
  Heart,
  LogOut,
  Eye,
  EyeOff,
  Save,
  X,
  Crown,
  Calendar,
  TrendingUp,
  Shield,
  Download,
  AlertCircle,
  CheckCircle,
  Edit2,
  MessageSquare,
  ArrowRight,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { supabase } from '../lib/supabase';

interface UserProfile {
  name: string;
  email: string;
  phone?: string;
  bio?: string;
  avatar_url?: string;
}

interface Toast {
  id: string;
  type: 'success' | 'error';
  message: string;
}

export default function Settings() {
  const { user, signOut } = useAuth();
  const [activeTab, setActiveTab] = useState<'profile' | 'settings' | 'security' | 'membership'>('profile');
  const [isEditing, setIsEditing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [toasts, setToasts] = useState<Toast[]>([]);
  const [profile, setProfile] = useState<UserProfile>({
    name: user?.name || '',
    email: user?.email || '',
    phone: '',
    bio: '',
    avatar_url: user?.profileImage || '',
  });
  const [showPasswordModal, setShowPasswordModal] = useState(false);
  const [passwordInput, setPasswordInput] = useState({ current: '', new: '', confirm: '' });
  const [showPassword, setShowPassword] = useState(false);
  const [notifications, setNotifications] = useState({
    emailNotifications: true,
    messageAlerts: true,
    contentUpdates: true,
    weeklyDigest: false,
    promotionalEmails: false,
  });

  useEffect(() => {
    if (user?.id) {
      loadUserProfile();
    }
  }, [user?.id]);

  const loadUserProfile = async () => {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', user?.id)
        .single();

      if (!error && data) {
        setProfile({
          name: data.name || '',
          email: data.email || '',
          phone: data.phone_number || '',
          bio: data.bio || '',
          avatar_url: data.avatar_url || '',
        });
      }
    } catch (error) {
      console.error('Error loading profile:', error);
    }
  };

  const handleSaveProfile = async () => {
    if (!user?.id) return;
    setIsSaving(true);

    try {
      const { error } = await supabase
        .from('profiles')
        .update({
          name: profile.name,
          phone_number: profile.phone,
          bio: profile.bio,
        })
        .eq('id', user.id);

      if (!error) {
        setIsEditing(false);
        addToast('Profile updated successfully', 'success');
      } else {
        addToast('Failed to update profile', 'error');
      }
    } catch (error) {
      console.error('Error saving profile:', error);
      addToast('Error updating profile', 'error');
    } finally {
      setIsSaving(false);
    }
  };

  const handleChangePassword = async () => {
    if (!passwordInput.new || passwordInput.new !== passwordInput.confirm) {
      addToast('Passwords do not match', 'error');
      return;
    }

    try {
      const { error } = await supabase.auth.updateUser({
        password: passwordInput.new,
      });

      if (!error) {
        setShowPasswordModal(false);
        setPasswordInput({ current: '', new: '', confirm: '' });
        addToast('Password changed successfully', 'success');
      } else {
        addToast('Failed to change password', 'error');
      }
    } catch (error) {
      console.error('Error changing password:', error);
      addToast('Error changing password', 'error');
    }
  };

  const handleUpdateNotifications = async (key: string, value: boolean) => {
    setNotifications((prev) => ({ ...prev, [key]: value }));
    
    try {
      await supabase
        .from('profiles')
        .update({
          notification_preferences: {
            ...notifications,
            [key]: value,
          },
        })
        .eq('id', user?.id);
    } catch (error) {
      console.error('Error updating notifications:', error);
    }
  };

  const addToast = (message: string, type: 'success' | 'error') => {
    const id = Math.random().toString(36).substr(2, 9);
    const toast: Toast = { id, type, message };
    setToasts((prev) => [...prev, toast]);

    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 4000);
  };

  const handleSignOut = () => {
    signOut();
  };

  if (!user) {
    return (
      <div className="min-h-screen pt-20 pb-12 px-4 bg-gradient-to-b from-slate-950 via-slate-900 to-slate-950">
        <div className="max-w-7xl mx-auto text-center py-20">
          <AlertCircle className="w-12 h-12 text-rose-400 mx-auto mb-4" />
          <p className="text-gray-300 text-lg">Please sign in to access settings</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen pt-20 pb-12 px-4 bg-gradient-to-b from-slate-950 via-slate-900 to-slate-950">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="mb-10">
          <h1 className="text-4xl font-playfair font-bold text-white mb-2">Settings</h1>
          <p className="text-gray-300">Manage your profile, preferences, and account security</p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
          {/* Sidebar Navigation */}
          <div className="lg:col-span-1">
            <div className="glass-effect rounded-2xl border border-white/10 p-4 space-y-2 h-fit sticky top-24">
              <button
                onClick={() => setActiveTab('profile')}
                className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-all text-left ${
                  activeTab === 'profile'
                    ? 'bg-rose-500/20 border border-rose-400/50 text-rose-300'
                    : 'text-gray-300 hover:bg-white/5'
                }`}
              >
                <User className="w-5 h-5" />
                Profile
              </button>
              <button
                onClick={() => setActiveTab('membership')}
                className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-all text-left ${
                  activeTab === 'membership'
                    ? 'bg-rose-500/20 border border-rose-400/50 text-rose-300'
                    : 'text-gray-300 hover:bg-white/5'
                }`}
              >
                <Crown className="w-5 h-5" />
                Membership
              </button>
              <button
                onClick={() => setActiveTab('settings')}
                className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-all text-left ${
                  activeTab === 'settings'
                    ? 'bg-rose-500/20 border border-rose-400/50 text-rose-300'
                    : 'text-gray-300 hover:bg-white/5'
                }`}
              >
                <Bell className="w-5 h-5" />
                Preferences
              </button>
              <button
                onClick={() => setActiveTab('security')}
                className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-all text-left ${
                  activeTab === 'security'
                    ? 'bg-rose-500/20 border border-rose-400/50 text-rose-300'
                    : 'text-gray-300 hover:bg-white/5'
                }`}
              >
                <Shield className="w-5 h-5" />
                Security
              </button>
              <button
                onClick={handleSignOut}
                className="w-full flex items-center gap-3 px-4 py-3 rounded-lg text-red-400 hover:bg-red-500/10 transition-all text-left mt-4"
              >
                <LogOut className="w-5 h-5" />
                Sign Out
              </button>
            </div>
          </div>

          {/* Content Area */}
          <div className="lg:col-span-3">
            {/* Profile Tab */}
            {activeTab === 'profile' && (
              <div className="space-y-6">
                <div className="glass-effect rounded-2xl border border-white/10 p-8">
                  <h2 className="text-2xl font-bold text-white mb-6">Profile Information</h2>
                  
                  <div className="flex flex-col sm:flex-row gap-8 mb-8">
                    <div className="flex-shrink-0">
                      <img
                        src={profile.avatar_url || 'https://via.placeholder.com/120'}
                        alt={profile.name}
                        className="w-24 h-24 rounded-full object-cover border-2 border-rose-400/50"
                      />
                    </div>
                    <div className="flex-1">
                      {isEditing ? (
                        <div className="space-y-4">
                          <div>
                            <label className="text-sm text-gray-400 font-medium">Full Name</label>
                            <input
                              type="text"
                              value={profile.name}
                              onChange={(e) => setProfile({ ...profile, name: e.target.value })}
                              className="mt-1 w-full px-4 py-2 bg-white/5 border border-white/10 rounded-lg text-white focus:outline-none focus:border-rose-400"
                            />
                          </div>
                          <div>
                            <label className="text-sm text-gray-400 font-medium">Phone Number</label>
                            <input
                              type="tel"
                              value={profile.phone || ''}
                              onChange={(e) => setProfile({ ...profile, phone: e.target.value })}
                              className="mt-1 w-full px-4 py-2 bg-white/5 border border-white/10 rounded-lg text-white focus:outline-none focus:border-rose-400"
                            />
                          </div>
                          <div>
                            <label className="text-sm text-gray-400 font-medium">Bio</label>
                            <textarea
                              value={profile.bio || ''}
                              onChange={(e) => setProfile({ ...profile, bio: e.target.value })}
                              rows={3}
                              className="mt-1 w-full px-4 py-2 bg-white/5 border border-white/10 rounded-lg text-white focus:outline-none focus:border-rose-400"
                              placeholder="Tell us about yourself..."
                            />
                          </div>
                        </div>
                      ) : (
                        <div className="space-y-2">
                          <div>
                            <p className="text-sm text-gray-400">Name</p>
                            <p className="text-lg font-semibold text-white">{profile.name}</p>
                          </div>
                          <div>
                            <p className="text-sm text-gray-400">Email</p>
                            <p className="text-lg font-semibold text-white">{profile.email}</p>
                          </div>
                          {profile.phone && (
                            <div>
                              <p className="text-sm text-gray-400">Phone</p>
                              <p className="text-lg font-semibold text-white">{profile.phone}</p>
                            </div>
                          )}
                          {profile.bio && (
                            <div>
                              <p className="text-sm text-gray-400">Bio</p>
                              <p className="text-white">{profile.bio}</p>
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  </div>

                  {isEditing ? (
                    <div className="flex gap-3">
                      <button
                        onClick={handleSaveProfile}
                        disabled={isSaving}
                        className="flex-1 py-2 bg-gradient-to-r from-rose-500 to-purple-600 text-white font-semibold rounded-lg hover:shadow-lg transition-all disabled:opacity-50 flex items-center justify-center gap-2"
                      >
                        <Save className="w-4 h-4" />
                        Save Changes
                      </button>
                      <button
                        onClick={() => {
                          setIsEditing(false);
                          loadUserProfile();
                        }}
                        className="flex-1 py-2 bg-white/10 text-white font-semibold rounded-lg hover:bg-white/20 transition-colors"
                      >
                        Cancel
                      </button>
                    </div>
                  ) : (
                    <button
                      onClick={() => setIsEditing(true)}
                      className="py-2 px-6 bg-gradient-to-r from-rose-500 to-purple-600 text-white font-semibold rounded-lg hover:shadow-lg transition-all flex items-center gap-2"
                    >
                      <Edit2 className="w-4 h-4" />
                      Edit Profile
                    </button>
                  )}
                </div>
              </div>
            )}

            {/* Membership Tab */}
            {activeTab === 'membership' && (
              <div className="glass-effect rounded-2xl border border-white/10 p-8">
                <div className="flex items-center gap-3 mb-8">
                  <Crown className="w-8 h-8 text-rose-400" />
                  <h2 className="text-3xl font-bold text-white">Membership Tier</h2>
                </div>

                <div className="bg-white/5 rounded-lg p-6 border border-white/10 mb-8">
                  <p className="text-sm text-gray-400 mb-2">Your Current Tier</p>
                  <p className="text-3xl font-bold text-white capitalize mb-3">{user.tier}</p>
                  <p className="text-sm text-gray-300 mb-4">Your membership tier determines your access level and benefits across the entire platform.</p>
                  <button className="py-2 px-4 bg-gradient-to-r from-rose-500 to-purple-600 text-white font-semibold rounded-lg hover:shadow-lg transition-all text-sm">
                    Upgrade Tier
                  </button>
                </div>

                <div className="space-y-6">
                  <div>
                    <h3 className="text-lg font-bold text-white mb-4">Tier Benefits</h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="bg-white/5 rounded-lg p-4 border border-white/10">
                        <p className="text-white font-semibold mb-2">Priority Support</p>
                        <p className="text-gray-400 text-sm">Get faster response times from our support team</p>
                      </div>
                      <div className="bg-white/5 rounded-lg p-4 border border-white/10">
                        <p className="text-white font-semibold mb-2">Exclusive Content</p>
                        <p className="text-gray-400 text-sm">Access premium content from your favorite creators</p>
                      </div>
                      <div className="bg-white/5 rounded-lg p-4 border border-white/10">
                        <p className="text-white font-semibold mb-2">Advanced Features</p>
                        <p className="text-gray-400 text-sm">Unlock powerful tools and analytics features</p>
                      </div>
                      <div className="bg-white/5 rounded-lg p-4 border border-white/10">
                        <p className="text-white font-semibold mb-2">Special Discounts</p>
                        <p className="text-gray-400 text-sm">Enjoy exclusive discounts and early access</p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Preferences Tab */}
            {activeTab === 'settings' && (
              <div className="glass-effect rounded-2xl border border-white/10 p-8">
                <h2 className="text-2xl font-bold text-white mb-6">Notification Preferences</h2>

                <div className="space-y-4">
                  <div className="flex items-center justify-between p-4 bg-white/5 rounded-lg border border-white/10">
                    <div className="flex items-center gap-3">
                      <Mail className="w-5 h-5 text-rose-400" />
                      <div>
                        <p className="font-semibold text-white">Email Notifications</p>
                        <p className="text-sm text-gray-400">Receive important updates via email</p>
                      </div>
                    </div>
                    <button
                      onClick={() => handleUpdateNotifications('emailNotifications', !notifications.emailNotifications)}
                      className={`relative w-12 h-6 rounded-full transition-colors ${
                        notifications.emailNotifications ? 'bg-rose-500' : 'bg-white/10'
                      }`}
                    >
                      <div
                        className={`absolute top-1 w-4 h-4 rounded-full bg-white transition-transform ${
                          notifications.emailNotifications ? 'translate-x-7' : 'translate-x-1'
                        }`}
                      />
                    </button>
                  </div>

                  <div className="flex items-center justify-between p-4 bg-white/5 rounded-lg border border-white/10">
                    <div className="flex items-center gap-3">
                      <MessageSquare className="w-5 h-5 text-blue-400" />
                      <div>
                        <p className="font-semibold text-white">Message Alerts</p>
                        <p className="text-sm text-gray-400">Get notified when you receive messages</p>
                      </div>
                    </div>
                    <button
                      onClick={() => handleUpdateNotifications('messageAlerts', !notifications.messageAlerts)}
                      className={`relative w-12 h-6 rounded-full transition-colors ${
                        notifications.messageAlerts ? 'bg-rose-500' : 'bg-white/10'
                      }`}
                    >
                      <div
                        className={`absolute top-1 w-4 h-4 rounded-full bg-white transition-transform ${
                          notifications.messageAlerts ? 'translate-x-7' : 'translate-x-1'
                        }`}
                      />
                    </button>
                  </div>

                  <div className="flex items-center justify-between p-4 bg-white/5 rounded-lg border border-white/10">
                    <div className="flex items-center gap-3">
                      <Heart className="w-5 h-5 text-red-400" />
                      <div>
                        <p className="font-semibold text-white">Content Updates</p>
                        <p className="text-sm text-gray-400">New content from creators you follow</p>
                      </div>
                    </div>
                    <button
                      onClick={() => handleUpdateNotifications('contentUpdates', !notifications.contentUpdates)}
                      className={`relative w-12 h-6 rounded-full transition-colors ${
                        notifications.contentUpdates ? 'bg-rose-500' : 'bg-white/10'
                      }`}
                    >
                      <div
                        className={`absolute top-1 w-4 h-4 rounded-full bg-white transition-transform ${
                          notifications.contentUpdates ? 'translate-x-7' : 'translate-x-1'
                        }`}
                      />
                    </button>
                  </div>

                  <div className="flex items-center justify-between p-4 bg-white/5 rounded-lg border border-white/10">
                    <div className="flex items-center gap-3">
                      <Calendar className="w-5 h-5 text-green-400" />
                      <div>
                        <p className="font-semibold text-white">Weekly Digest</p>
                        <p className="text-sm text-gray-400">Get a summary of top content weekly</p>
                      </div>
                    </div>
                    <button
                      onClick={() => handleUpdateNotifications('weeklyDigest', !notifications.weeklyDigest)}
                      className={`relative w-12 h-6 rounded-full transition-colors ${
                        notifications.weeklyDigest ? 'bg-rose-500' : 'bg-white/10'
                      }`}
                    >
                      <div
                        className={`absolute top-1 w-4 h-4 rounded-full bg-white transition-transform ${
                          notifications.weeklyDigest ? 'translate-x-7' : 'translate-x-1'
                        }`}
                      />
                    </button>
                  </div>

                  <div className="flex items-center justify-between p-4 bg-white/5 rounded-lg border border-white/10">
                    <div className="flex items-center gap-3">
                      <TrendingUp className="w-5 h-5 text-purple-400" />
                      <div>
                        <p className="font-semibold text-white">Promotional Emails</p>
                        <p className="text-sm text-gray-400">Special offers and promotions</p>
                      </div>
                    </div>
                    <button
                      onClick={() => handleUpdateNotifications('promotionalEmails', !notifications.promotionalEmails)}
                      className={`relative w-12 h-6 rounded-full transition-colors ${
                        notifications.promotionalEmails ? 'bg-rose-500' : 'bg-white/10'
                      }`}
                    >
                      <div
                        className={`absolute top-1 w-4 h-4 rounded-full bg-white transition-transform ${
                          notifications.promotionalEmails ? 'translate-x-7' : 'translate-x-1'
                        }`}
                      />
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* Security Tab */}
            {activeTab === 'security' && (
              <div className="space-y-6">
                <div className="glass-effect rounded-2xl border border-white/10 p-8">
                  <h2 className="text-2xl font-bold text-white mb-6 flex items-center gap-2">
                    <Lock className="w-6 h-6 text-rose-400" />
                    Change Password
                  </h2>

                  <button
                    onClick={() => setShowPasswordModal(true)}
                    className="py-2 px-6 bg-gradient-to-r from-rose-500 to-purple-600 text-white font-semibold rounded-lg hover:shadow-lg transition-all"
                  >
                    Update Password
                  </button>
                </div>

                <div className="glass-effect rounded-2xl border border-white/10 p-8">
                  <h2 className="text-2xl font-bold text-white mb-6 flex items-center gap-2">
                    <Shield className="w-6 h-6 text-blue-400" />
                    Security Information
                  </h2>

                  <div className="space-y-4">
                    <div className="bg-white/5 rounded-lg p-4 border border-white/10">
                      <p className="text-sm text-gray-400 mb-1">Account Email</p>
                      <p className="text-white font-semibold">{profile.email}</p>
                    </div>
                    <div className="bg-white/5 rounded-lg p-4 border border-white/10">
                      <p className="text-sm text-gray-400 mb-1">Last Password Change</p>
                      <p className="text-white font-semibold">Not available</p>
                    </div>
                    <div className="bg-green-500/10 rounded-lg p-4 border border-green-500/30 flex items-start gap-3">
                      <CheckCircle className="w-5 h-5 text-green-400 flex-shrink-0 mt-0.5" />
                      <div>
                        <p className="font-semibold text-green-300">Two-Factor Authentication</p>
                        <p className="text-sm text-green-200">Not currently enabled</p>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="glass-effect rounded-2xl border border-white/10 p-8">
                  <h2 className="text-2xl font-bold text-white mb-6">Data & Privacy</h2>

                  <div className="space-y-3">
                    <button className="w-full text-left py-3 px-4 bg-white/5 hover:bg-white/10 rounded-lg transition-colors flex items-center justify-between text-white">
                      <span>Download Your Data</span>
                      <Download className="w-5 h-5 text-gray-400" />
                    </button>
                    <button className="w-full text-left py-3 px-4 bg-white/5 hover:bg-white/10 rounded-lg transition-colors flex items-center justify-between text-white">
                      <span>Privacy Policy</span>
                      <ArrowRight className="w-5 h-5 text-gray-400" />
                    </button>
                    <button className="w-full text-left py-3 px-4 bg-red-500/10 hover:bg-red-500/20 rounded-lg transition-colors flex items-center justify-between text-red-300">
                      <span>Delete Account</span>
                      <AlertCircle className="w-5 h-5" />
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Change Password Modal */}
        {showPasswordModal && (
          <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
            <div className="glass-effect rounded-2xl border border-white/10 w-full max-w-md p-8">
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-2xl font-bold text-white">Change Password</h3>
                <button onClick={() => setShowPasswordModal(false)} className="text-gray-400 hover:text-white">
                  <X className="w-6 h-6" />
                </button>
              </div>

              <div className="space-y-4">
                <div>
                  <label className="text-sm text-gray-400 font-medium">New Password</label>
                  <div className="relative mt-1">
                    <input
                      type={showPassword ? 'text' : 'password'}
                      value={passwordInput.new}
                      onChange={(e) => setPasswordInput({ ...passwordInput, new: e.target.value })}
                      className="w-full px-4 py-2 bg-white/5 border border-white/10 rounded-lg text-white focus:outline-none focus:border-rose-400"
                      placeholder="Enter new password"
                    />
                    <button
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-white"
                    >
                      {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                    </button>
                  </div>
                </div>

                <div>
                  <label className="text-sm text-gray-400 font-medium">Confirm Password</label>
                  <input
                    type={showPassword ? 'text' : 'password'}
                    value={passwordInput.confirm}
                    onChange={(e) => setPasswordInput({ ...passwordInput, confirm: e.target.value })}
                    className="mt-1 w-full px-4 py-2 bg-white/5 border border-white/10 rounded-lg text-white focus:outline-none focus:border-rose-400"
                    placeholder="Confirm new password"
                  />
                </div>

                <div className="flex gap-3 pt-4">
                  <button
                    onClick={() => setShowPasswordModal(false)}
                    className="flex-1 py-2 bg-white/10 text-white font-semibold rounded-lg hover:bg-white/20"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleChangePassword}
                    className="flex-1 py-2 bg-gradient-to-r from-rose-500 to-purple-600 text-white font-semibold rounded-lg hover:shadow-lg"
                  >
                    Update
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Toast Notifications */}
      <div className="fixed bottom-6 right-6 space-y-3 z-40">
        {toasts.map((toast) => (
          <div
            key={toast.id}
            className={`flex items-center gap-3 px-6 py-4 rounded-lg backdrop-blur-md border shadow-lg ${
              toast.type === 'success'
                ? 'bg-green-500/20 border-green-400/50 text-green-100'
                : 'bg-red-500/20 border-red-400/50 text-red-100'
            }`}
          >
            {toast.type === 'success' ? (
              <CheckCircle className="w-5 h-5 flex-shrink-0" />
            ) : (
              <AlertCircle className="w-5 h-5 flex-shrink-0" />
            )}
            <span className="font-medium text-sm">{toast.message}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
