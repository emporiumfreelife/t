import React, { useState, useEffect, useCallback, useRef } from 'react';
import { Camera, Edit3, Eye, EyeOff, Plus, Star, Award, MapPin, Phone, Mail, Globe, Instagram, Twitter, Linkedin, Save, Upload, X, Mic, Clock, Play, BookOpen, Trash2, AlertCircle, Loader } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { usePortfolioViewTracking } from '../hooks/usePortfolioViewTracking';
import { usePortfolioData } from '../hooks/usePortfolioData';
import { useContentDeletion } from '../hooks/useContentDeletion';
import { useMediaPageEdit } from '../hooks/useMediaPageEdit';
import { supabase } from '../lib/supabase';
import { uploadToB2 } from '../lib/b2Upload';
import EditContentModal from '../components/EditContentModal';
import ContentCountdownTimer from '../components/ContentCountdownTimer';
import HighlightSelectionModal from '../components/HighlightSelectionModal';

export default function Portfolio() {
  const { user } = useAuth();
  const { trackView } = usePortfolioViewTracking();
  const portfolioData = usePortfolioData(user?.id);
  const { deleteFromDestination, saveContent, getDeletionInfo } = useContentDeletion();
  const { editContent } = useMediaPageEdit();

  const [isEditing, setIsEditing] = useState(false);
  const [isPublic, setIsPublic] = useState(false);
  const [uploadingProfilePhoto, setUploadingProfilePhoto] = useState(false);
  const [profilePhotoError, setProfilePhotoError] = useState<string | null>(null);
  const [editingContent, setEditingContent] = useState<any>(null);
  const [savingContentId, setSavingContentId] = useState<string | null>(null);
  const [deletingContentId, setDeletingContentId] = useState<string | null>(null);
  const [editError, setEditError] = useState<string | undefined>();
  const [isSaving, setIsSaving] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [showMediaModal, setShowMediaModal] = useState(false);
  const [selectedContent, setSelectedContent] = useState<any>(null);
  const [portfolioContent, setPortfolioContent] = useState<any[]>([]);
  const [loadingContent, setLoadingContent] = useState(true);
  const [portfolioHighlights, setPortfolioHighlights] = useState<any[]>([]);
  const [loadingHighlights, setLoadingHighlights] = useState(true);
  const [showHighlightModal, setShowHighlightModal] = useState(false);
  // Helper to create user-specific cache keys
  const getCacheKey = (suffix: string) => `portfolio_${user?.id}_${suffix}`;

  const [cachedAvatarUrl, setCachedAvatarUrl] = useState<string | null>(() => {
    if (typeof window !== 'undefined' && user?.id) {
      return localStorage.getItem(getCacheKey('avatarUrl')) || null;
    }
    return null;
  });
  const [cachedCoverImageUrl, setCachedCoverImageUrl] = useState<string | null>(() => {
    if (typeof window !== 'undefined' && user?.id) {
      return localStorage.getItem(getCacheKey('coverImageUrl')) || null;
    }
    return null;
  });
  const [uploadingCoverImage, setUploadingCoverImage] = useState(false);
  const [coverImageError, setCoverImageError] = useState<string | null>(null);

  // Modal states for adding new items
  const [showAddSkillModal, setShowAddSkillModal] = useState(false);
  const [showAddCertModal, setShowAddCertModal] = useState(false);
  const [showAddAwardModal, setShowAddAwardModal] = useState(false);
  const [showAddInterviewModal, setShowAddInterviewModal] = useState(false);
  const [showAddExperienceModal, setShowAddExperienceModal] = useState(false);
  const [showAddTestimonialModal, setShowAddTestimonialModal] = useState(false);

  // Edit states for individual items
  const [editingSkillId, setEditingSkillId] = useState<string | null>(null);
  const [editingCertId, setEditingCertId] = useState<string | null>(null);
  const [editingAwardId, setEditingAwardId] = useState<string | null>(null);
  const [editingInterviewId, setEditingInterviewId] = useState<string | null>(null);
  const [editingExpId, setEditingExpId] = useState<string | null>(null);
  const [editingTestId, setEditingTestId] = useState<string | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const coverImageInputRef = useRef<HTMLInputElement>(null);
  const isInitializedRef = useRef(false);

  // Editable fields for profile - initialized from localStorage for persistence
  const [profileEdits, setProfileEdits] = useState(() => {
    if (typeof window !== 'undefined' && user?.id) {
      try {
        const cached = localStorage.getItem(getCacheKey('profileEdits'));
        if (cached) {
          return JSON.parse(cached);
        }
      } catch (error) {
        console.error('Failed to load profile edits from cache:', error);
      }
    }
    return {
      bio: '',
      location: '',
      phone: '',
      website: '',
    };
  });

  // Initialize profile edits when data loads - only once per session to avoid resetting saved changes
  useEffect(() => {
    if (portfolioData.profile && !isInitializedRef.current) {
      isInitializedRef.current = true;
      setProfileEdits({
        bio: portfolioData.profile.bio || '',
        location: portfolioData.profile.location || '',
        phone: portfolioData.profile.phone || '',
        website: portfolioData.profile.website || '',
      });
      // Load portfolio visibility from database
      setIsPublic(portfolioData.profile.portfolio_visibility === 'public');
    }
  }, [portfolioData.profile]);

  // Cache avatar URL and prefetch image to eliminate flickering
  useEffect(() => {
    if (portfolioData.profile?.avatar_url && user?.id) {
      // Set immediately to avoid jitter on initial load
      setCachedAvatarUrl(portfolioData.profile.avatar_url);
      localStorage.setItem(getCacheKey('avatarUrl'), portfolioData.profile.avatar_url);

      // Prefetch in background for next visit
      const img = new Image();
      img.src = portfolioData.profile.avatar_url;
    } else if (!user?.id) {
      // Clear cache when user logs out
      setCachedAvatarUrl(null);
    }
  }, [portfolioData.profile?.avatar_url, user?.id]);

  // Cache cover image URL and prefetch image to eliminate flickering
  useEffect(() => {
    if (portfolioData.profile?.cover_image_url && user?.id) {
      // Set immediately to avoid jitter on initial load
      setCachedCoverImageUrl(portfolioData.profile.cover_image_url);
      localStorage.setItem(getCacheKey('coverImageUrl'), portfolioData.profile.cover_image_url);

      // Prefetch in background for next visit
      const img = new Image();
      img.src = portfolioData.profile.cover_image_url;
    } else if (!user?.id) {
      // Clear cache when user logs out
      setCachedCoverImageUrl(null);
    }
  }, [portfolioData.profile?.cover_image_url, user?.id]);

  // Persist profile edits to localStorage whenever they change
  useEffect(() => {
    if (user?.id) {
      try {
        localStorage.setItem(getCacheKey('profileEdits'), JSON.stringify(profileEdits));
      } catch (error) {
        console.error('Failed to persist profile edits:', error);
      }
    }
  }, [profileEdits, user?.id]);

  // Clear portfolio caches when user ID changes (user logs out or switches accounts)
  useEffect(() => {
    if (!user?.id) {
      // Clear all portfolio-related caches when user logs out
      setCachedAvatarUrl(null);
      setCachedCoverImageUrl(null);
      // Clear any old cache keys from localStorage
      Object.keys(localStorage).forEach(key => {
        if (key.startsWith('portfolio_')) {
          try {
            localStorage.removeItem(key);
          } catch (e) {
            console.error('Failed to clear portfolio cache:', e);
          }
        }
      });
    }
  }, [user?.id]);

  // Track portfolio view on initial mount only
  useEffect(() => {
    if (user?.id) {
      trackView();
    }
  }, [user?.id]);

  // Fetch portfolio content from database (excluding highlighted items)
  const fetchPortfolioContent = useCallback(async () => {
    if (!user?.id) {
      setPortfolioContent([]);
      return;
    }
    try {
      setLoadingContent(true);
      const { data, error } = await supabase
        .from('portfolio_page_content')
        .select('*')
        .eq('user_id', user.id)
        .eq('is_highlighted', false)
        .neq('status', 'archived')
        .neq('status', 'permanently_deleted')
        .order('created_at', { ascending: false });

      if (error) throw error;
      if (data) {
        setPortfolioContent(data);
      }
    } catch (err) {
      console.error('Error fetching portfolio content:', err);
    } finally {
      setLoadingContent(false);
    }
  }, [user?.id]);

  // Fetch portfolio content on mount and when user changes
  useEffect(() => {
    fetchPortfolioContent();
  }, [fetchPortfolioContent]);

  // Fetch highlighted content from database
  const fetchHighlights = useCallback(async () => {
    if (!user?.id) {
      setPortfolioHighlights([]);
      return;
    }
    try {
      setLoadingHighlights(true);
      const { data, error } = await supabase
        .from('portfolio_page_content')
        .select('*')
        .eq('user_id', user.id)
        .eq('is_highlighted', true)
        .neq('status', 'archived')
        .neq('status', 'permanently_deleted')
        .order('created_at', { ascending: false });

      if (error) throw error;
      if (data) {
        setPortfolioHighlights(data);
      }
    } catch (err) {
      console.error('Error fetching highlights:', err);
    } finally {
      setLoadingHighlights(false);
    }
  }, [user?.id]);

  // Fetch highlights on mount and when user changes
  useEffect(() => {
    fetchHighlights();
  }, [fetchHighlights]);

  // Portfolio Content handlers
  const handleEditOpen = (content: any) => {
    setEditingContent(content);
    setEditError(undefined);
  };

  const handleEditClose = () => {
    setEditingContent(null);
    setEditError(undefined);
  };

  const handleEditSave = async (payload: {
    title: string;
    description?: string;
    category?: string;
    is_premium?: boolean;
  }) => {
    if (!editingContent) return;

    setIsSaving(true);
    setEditError(undefined);

    const result = await editContent(editingContent.id, payload, 'portfolio');

    if (result.success) {
      // Update the item in highlights if it's highlighted
      setPortfolioHighlights((prev) =>
        prev.map((item) =>
          item.id === editingContent.id
            ? {
                ...item,
                title: payload.title,
                description: payload.description || '',
                category: payload.category || '',
                is_premium: payload.is_premium ?? false,
              }
            : item
        )
      );

      // Also update in portfolio content if present
      setPortfolioContent((prev) =>
        prev.map((item) =>
          item.id === editingContent.id
            ? {
                ...item,
                title: payload.title,
                description: payload.description || '',
                category: payload.category || '',
                is_premium: payload.is_premium ?? false,
              }
            : item
        )
      );
      handleEditClose();
    } else {
      setEditError(result.error || 'Failed to save changes');
    }

    setIsSaving(false);
  };

  const handleDelete = async (contentId: string) => {
    setDeletingContentId(contentId);
    setIsDeleting(true);
    setEditError(undefined);

    try {
      const { error } = await supabase
        .from('portfolio_page_content')
        .delete()
        .eq('id', contentId);

      if (error) {
        setEditError(error.message || 'Failed to delete content');
        setIsDeleting(false);
        return;
      }

      setPortfolioContent((prev) => prev.filter((item) => item.id !== contentId));
      handleEditClose();
    } catch (err) {
      setEditError(err instanceof Error ? err.message : 'Failed to delete content');
    }

    setIsDeleting(false);
    setDeletingContentId(null);
  };

  const handleDeleteFromPortfolio = async (contentId: string) => {
    setDeletingContentId(contentId);
    const result = await deleteFromDestination(contentId, 'portfolio', 'portfolio');
    if (result.success) {
      setPortfolioContent((prev) =>
        prev.map((item) =>
          item.id === contentId
            ? { ...item, status: 'pending_deletion', is_deleted_pending: true }
            : item
        )
      );
    } else {
      setEditError(result.error || 'Failed to delete content');
    }
    setDeletingContentId(null);
  };

  const handleSaveContent = async (contentId: string) => {
    setSavingContentId(contentId);
    const result = await saveContent(contentId, 'portfolio');
    if (result.success) {
      setPortfolioContent((prev) =>
        prev.map((item) =>
          item.id === contentId
            ? {
                ...item,
                saved: true,
                status: 'draft',
                deleted_at: null,
                auto_delete_at: null,
                is_deleted_pending: false,
              }
            : item
        )
      );
    }
    setSavingContentId(null);
  };

  const handleSendToMedia = (content: any) => {
    setSelectedContent(content);
    setShowMediaModal(true);
  };

  const confirmSendToMedia = () => {
    alert('Content sent for admin review. You will be notified once it\'s approved!');
    setShowMediaModal(false);
    setSelectedContent(null);
  };

  // Handle adding content to highlights
  const handleToggleHighlight = async (contentId: string, isCurrentlyHighlighted: boolean) => {
    try {
      const { error } = await supabase
        .from('portfolio_page_content')
        .update({ is_highlighted: !isCurrentlyHighlighted })
        .eq('id', contentId);

      if (error) throw error;

      // Update local state
      if (!isCurrentlyHighlighted) {
        // Adding to highlights - move from portfolio content to highlights
        const itemToAdd = portfolioContent.find((item) => item.id === contentId);
        if (itemToAdd) {
          setPortfolioHighlights((prev) => [...prev, { ...itemToAdd, is_highlighted: true }]);
          setPortfolioContent((prev) => prev.filter((item) => item.id !== contentId));
        }
      } else {
        // Removing from highlights - move back to portfolio content
        const itemToReturn = portfolioHighlights.find((item) => item.id === contentId);
        if (itemToReturn) {
          setPortfolioContent((prev) => [...prev, { ...itemToReturn, is_highlighted: false }]);
          setPortfolioHighlights((prev) => prev.filter((item) => item.id !== contentId));
        }
      }
    } catch (err) {
      console.error('Error toggling highlight:', err);
    }
  };

  const handleRemoveFromHighlights = async (contentId: string) => {
    await handleToggleHighlight(contentId, true);
    setShowHighlightModal(false);
  };

  const handleProfilePhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !user?.id) {
      setProfilePhotoError('Please select a valid file');
      return;
    }

    const validTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];
    if (!validTypes.includes(file.type)) {
      setProfilePhotoError('Please upload a valid image (JPEG, PNG, GIF, or WebP)');
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      setProfilePhotoError('File size must be less than 5MB');
      return;
    }

    setUploadingProfilePhoto(true);
    setProfilePhotoError(null);

    try {
      const { publicUrl, error } = await uploadToB2(file, 'portfolio_profile_photos');

      if (error) {
        setProfilePhotoError(error);
        setUploadingProfilePhoto(false);
        return;
      }

      const result = await portfolioData.updateProfile({ avatar_url: publicUrl });
      if (result.error) {
        setProfilePhotoError(result.error);
      } else {
        // Immediately cache the new avatar URL to prevent flickering on next load
        setCachedAvatarUrl(publicUrl);
        if (user?.id) {
          localStorage.setItem(getCacheKey('avatarUrl'), publicUrl);
        }
        setProfilePhotoError(null);
      }
    } catch (err) {
      setProfilePhotoError(err instanceof Error ? err.message : 'Failed to upload photo');
    } finally {
      setUploadingProfilePhoto(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  const handleCoverImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !user?.id) {
      setCoverImageError('Please select a valid file');
      return;
    }

    const validTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];
    if (!validTypes.includes(file.type)) {
      setCoverImageError('Please upload a valid image (JPEG, PNG, GIF, or WebP)');
      return;
    }

    if (file.size > 10 * 1024 * 1024) {
      setCoverImageError('File size must be less than 10MB');
      return;
    }

    setUploadingCoverImage(true);
    setCoverImageError(null);

    try {
      const { publicUrl, error } = await uploadToB2(file, 'portfolio_cover_images');

      if (error) {
        setCoverImageError(error);
        setUploadingCoverImage(false);
        return;
      }

      const result = await portfolioData.updateProfile({ cover_image_url: publicUrl });
      if (result.error) {
        setCoverImageError(result.error);
      } else {
        // Immediately cache the new cover image URL to prevent flickering on next load
        setCachedCoverImageUrl(publicUrl);
        if (user?.id) {
          localStorage.setItem(getCacheKey('coverImageUrl'), publicUrl);
        }
        setCoverImageError(null);
      }
    } catch (err) {
      setCoverImageError(err instanceof Error ? err.message : 'Failed to upload cover image');
    } finally {
      setUploadingCoverImage(false);
      if (coverImageInputRef.current) {
        coverImageInputRef.current.value = '';
      }
    }
  };

  const handleSaveProfileChanges = async () => {
    setIsSaving(true);
    const result = await portfolioData.updateProfile(profileEdits);
    if (result.error) {
      setEditError(result.error);
    } else {
      setEditError(undefined);
      setIsEditing(false);
    }
    setIsSaving(false);
  };

  // Portfolio visibility toggle (save directly)
  const handlePortfolioVisibilityToggle = async () => {
    // Only Premium and above can make portfolio public
    const premiumTiers = ['premium', 'professional', 'elite'];
    if (!premiumTiers.includes(user?.tier || '')) {
      setEditError('Premium membership or higher is required to make your portfolio public. Please upgrade your membership.');
      return;
    }

    const newVisibility = isPublic ? 'private' : 'public';
    try {
      const { error } = await supabase
        .from('profiles')
        .update({ portfolio_visibility: newVisibility })
        .eq('id', user?.id);

      if (error) {
        console.error('Error updating portfolio visibility:', error);
        setEditError('Failed to update portfolio visibility');
      } else {
        setIsPublic(!isPublic);
        setEditError(undefined);
      }
    } catch (error) {
      console.error('Error:', error);
      setEditError('Failed to update portfolio visibility');
    }
  };

  // Skill handlers
  const handleAddSkill = async (skillName: string) => {
    const result = await portfolioData.addSkill({ skill_name: skillName });
    if (!result.error) {
      setShowAddSkillModal(false);
    } else {
      setEditError(result.error);
    }
  };

  const handleDeleteSkill = async (skillId: string) => {
    const result = await portfolioData.deleteSkill(skillId);
    if (result.error) {
      setEditError(result.error);
    }
  };

  // Certification handlers
  const handleAddCertification = async (cert: any) => {
    const result = await portfolioData.addCertification(cert);
    if (!result.error) {
      setShowAddCertModal(false);
    } else {
      setEditError(result.error);
    }
  };

  const handleDeleteCertification = async (certId: string) => {
    const result = await portfolioData.deleteCertification(certId);
    if (result.error) {
      setEditError(result.error);
    }
  };

  // Award handlers
  const handleAddAward = async (award: any) => {
    const result = await portfolioData.addAward(award);
    if (!result.error) {
      setShowAddAwardModal(false);
    } else {
      setEditError(result.error);
    }
  };

  const handleDeleteAward = async (awardId: string) => {
    const result = await portfolioData.deleteAward(awardId);
    if (result.error) {
      setEditError(result.error);
    }
  };

  // Interview handlers
  const handleAddInterview = async (interview: any) => {
    const result = await portfolioData.addInterview(interview);
    if (!result.error) {
      setShowAddInterviewModal(false);
    } else {
      setEditError(result.error);
    }
  };

  const handleDeleteInterview = async (interviewId: string) => {
    const result = await portfolioData.deleteInterview(interviewId);
    if (result.error) {
      setEditError(result.error);
    }
  };

  // Experience handlers
  const handleAddExperience = async (experience: any) => {
    const result = await portfolioData.addExperience(experience);
    if (!result.error) {
      setShowAddExperienceModal(false);
    } else {
      setEditError(result.error);
    }
  };

  const handleDeleteExperience = async (expId: string) => {
    const result = await portfolioData.deleteExperience(expId);
    if (result.error) {
      setEditError(result.error);
    }
  };

  // Testimonial handlers
  const handleAddTestimonial = async (testimonial: any) => {
    const result = await portfolioData.addTestimonial(testimonial);
    if (!result.error) {
      setShowAddTestimonialModal(false);
    } else {
      setEditError(result.error);
    }
  };

  const handleDeleteTestimonial = async (testId: string) => {
    const result = await portfolioData.deleteTestimonial(testId);
    if (result.error) {
      setEditError(result.error);
    }
  };


  const getIcon = (type: string) => {
    switch (type) {
      case 'music-video':
      case 'movie':
      case 'image':
        return <Play className="w-12 h-12 text-white" />;
      case 'audio-music':
        return <Clock className="w-12 h-12 text-white" />;
      case 'blog':
        return <BookOpen className="w-12 h-12 text-white" />;
      case 'document':
        return <Upload className="w-12 h-12 text-white" />;
      default:
        return <Play className="w-12 h-12 text-white" />;
    }
  };

  return (
    <div className="min-h-screen pt-20 pb-12 px-4 bg-gradient-to-b from-slate-950 via-slate-900 to-slate-950">
      <div className="max-w-6xl mx-auto">
        {/* Header Controls */}
        <div className="flex flex-col md:flex-row md:justify-between md:items-center gap-4 mb-8">
          <div>
            <h1 className="text-4xl font-playfair font-bold text-white mb-2">Portfolio</h1>
            <p className="text-gray-300">Professional record of my work</p>
          </div>

          <div className="flex items-center space-x-4">
            <div className="flex items-center space-x-2">
              <span className="text-gray-300">Public</span>
              <button
                onClick={handlePortfolioVisibilityToggle}
                className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                  isPublic ? 'bg-rose-500' : 'bg-gray-600'
                } ${!['premium', 'professional', 'elite'].includes(user?.tier || '') ? 'opacity-50 cursor-not-allowed' : ''}`}
                disabled={!['premium', 'professional', 'elite'].includes(user?.tier || '')}
                title={!['premium', 'professional', 'elite'].includes(user?.tier || '') ? 'Premium membership required' : 'Toggle portfolio visibility'}
              >
                <span
                  className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                    isPublic ? 'translate-x-6' : 'translate-x-1'
                  }`}
                />
              </button>
              {!['premium', 'professional', 'elite'].includes(user?.tier || '') && (
                <span className="text-yellow-400 text-sm text-nowrap">Premium+ required</span>
              )}
            </div>

            <button
              onClick={() => {
                if (isEditing) {
                  handleSaveProfileChanges();
                } else {
                  setIsEditing(true);
                }
              }}
              disabled={isSaving}
              className={`px-6 py-3 rounded-xl font-semibold transition-all duration-300 disabled:opacity-50 flex items-center gap-2 ${
                isEditing
                  ? 'bg-green-500 hover:bg-green-600 text-white'
                  : 'bg-gradient-to-r from-rose-500 to-purple-600 hover:shadow-xl text-white'
              }`}
            >
              {isSaving ? (
                <>
                  <Loader className="w-4 h-4 animate-spin" />
                  Saving...
                </>
              ) : isEditing ? (
                <>
                  <Save className="w-4 h-4" />
                  Save Changes
                </>
              ) : (
                <>
                  <Edit3 className="w-4 h-4" />
                  Edit Portfolio
                </>
              )}
            </button>
          </div>
        </div>

        {/* Error Alert */}
        {editError && (
          <div className="mb-6 p-4 bg-red-500/10 border border-red-500/30 rounded-lg flex items-start gap-3">
            <AlertCircle className="w-5 h-5 text-red-400 flex-shrink-0 mt-0.5" />
            <p className="text-red-300">{editError}</p>
          </div>
        )}

        {/* Cover Image Error Alert */}
        {coverImageError && (
          <div className="mb-6 p-4 bg-red-500/10 border border-red-500/30 rounded-lg flex items-start gap-3">
            <AlertCircle className="w-5 h-5 text-red-400 flex-shrink-0 mt-0.5" />
            <p className="text-red-300">{coverImageError}</p>
          </div>
        )}

        {/* Cover Image */}
        <div className="relative mb-8 group">
          <div className={`h-64 rounded-2xl overflow-hidden relative ${!cachedCoverImageUrl ? 'bg-gradient-to-r from-rose-400 via-purple-500 to-pink-500' : ''}`}>
            {cachedCoverImageUrl ? (
              <img
                src={cachedCoverImageUrl}
                alt="Portfolio Cover"
                className="w-full h-full object-cover"
              />
            ) : (
              <div className="w-full h-full flex items-center justify-center bg-gradient-to-r from-rose-400 via-purple-500 to-pink-500">
                <div className="text-center text-white">
                  <Camera className="w-12 h-12 mx-auto mb-2 opacity-50" />
                  <p className="opacity-75">Portfolio cover image</p>
                </div>
              </div>
            )}
            {isEditing && (
              <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                <button
                  type="button"
                  onClick={() => coverImageInputRef.current?.click()}
                  disabled={uploadingCoverImage}
                  className="px-6 py-3 bg-rose-500 text-white rounded-lg hover:bg-rose-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center gap-2"
                >
                  {uploadingCoverImage ? (
                    <>
                      <Loader className="w-4 h-4 animate-spin" />
                      Uploading...
                    </>
                  ) : (
                    <>
                      <Upload className="w-4 h-4" />
                      Change Cover Image
                    </>
                  )}
                </button>
              </div>
            )}
          </div>
          <input
            ref={coverImageInputRef}
            type="file"
            accept="image/*"
            onChange={handleCoverImageUpload}
            className="hidden"
            disabled={uploadingCoverImage}
          />
        </div>

        <div className="grid lg:grid-cols-3 gap-8">
          {/* Left Column - Profile Info */}
          <div className="space-y-6">
            {/* Profile Image & Basic Info */}
            <div className="glass-effect p-6 rounded-2xl">
              <div className="text-center mb-6">
                <div className="relative inline-block">
                  <div className="w-32 h-32 rounded-full bg-gradient-to-r from-rose-400 to-purple-500 p-1">
                    <div className="w-full h-full rounded-full bg-gray-800 flex items-center justify-center overflow-hidden">
                      {cachedAvatarUrl ? (
                        <img src={cachedAvatarUrl} alt="Profile" className="w-full h-full object-cover" />
                      ) : (
                        <Camera className="w-8 h-8 text-gray-400" />
                      )}
                    </div>
                  </div>
                  {isEditing && (
                    <button
                      type="button"
                      onClick={() => fileInputRef.current?.click()}
                      disabled={uploadingProfilePhoto}
                      className="absolute bottom-0 right-0 p-2 bg-rose-500 rounded-full text-white hover:bg-rose-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                    >
                      {uploadingProfilePhoto ? (
                        <Loader className="w-4 h-4 animate-spin" />
                      ) : (
                        <Upload className="w-4 h-4" />
                      )}
                    </button>
                  )}
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*"
                    onChange={handleProfilePhotoUpload}
                    className="hidden"
                  />
                </div>
                {profilePhotoError && (
                  <div className="mt-3 flex items-start gap-2 p-2 bg-red-500/10 border border-red-500/30 rounded-lg">
                    <AlertCircle className="w-4 h-4 text-red-400 flex-shrink-0 mt-0.5" />
                    <p className="text-xs text-red-300">{profilePhotoError}</p>
                  </div>
                )}

                <h2 className="text-2xl font-bold text-white mt-4">{user?.name}</h2>
                <div className="flex items-center justify-center space-x-1 mt-2">
                  {[...Array(5)].map((_, i) => (
                    <Star key={i} className="w-4 h-4 text-yellow-400 fill-current" />
                  ))}
                  <span className="text-gray-300 ml-2">
                    {portfolioData.stats?.average_rating ? `${portfolioData.stats.average_rating}` : '4.9'} (
                    {portfolioData.stats?.testimonials_count || 0} reviews)
                  </span>
                </div>
              </div>

              {/* Contact Info */}
              <div className="space-y-3">
                <div className="flex items-center space-x-3 text-gray-300">
                  <MapPin className="w-4 h-4 text-rose-400 flex-shrink-0" />
                  {isEditing ? (
                    <input
                      type="text"
                      value={profileEdits.location}
                      onChange={(e) => setProfileEdits({ ...profileEdits, location: e.target.value })}
                      className="bg-transparent border-b border-gray-600 focus:border-rose-400 outline-none flex-1 text-white"
                      placeholder="Your location"
                    />
                  ) : (
                    <span>{profileEdits.location || 'Location not set'}</span>
                  )}
                </div>

                <div className="flex items-center space-x-3 text-gray-300">
                  <Phone className="w-4 h-4 text-rose-400 flex-shrink-0" />
                  {isEditing ? (
                    <input
                      type="text"
                      value={profileEdits.phone}
                      onChange={(e) => setProfileEdits({ ...profileEdits, phone: e.target.value })}
                      className="bg-transparent border-b border-gray-600 focus:border-rose-400 outline-none flex-1 text-white"
                      placeholder="Your phone"
                    />
                  ) : (
                    <span>{profileEdits.phone || 'Phone not set'}</span>
                  )}
                </div>

                <div className="flex items-center space-x-3 text-gray-300">
                  <Mail className="w-4 h-4 text-rose-400 flex-shrink-0" />
                  <span>{user?.email}</span>
                </div>

                <div className="flex items-center space-x-3 text-gray-300">
                  <Globe className="w-4 h-4 text-rose-400 flex-shrink-0" />
                  {isEditing ? (
                    <input
                      type="text"
                      value={profileEdits.website}
                      onChange={(e) => setProfileEdits({ ...profileEdits, website: e.target.value })}
                      className="bg-transparent border-b border-gray-600 focus:border-rose-400 outline-none flex-1 text-white"
                      placeholder="Your website"
                    />
                  ) : (
                    <span>{profileEdits.website || 'Website not set'}</span>
                  )}
                </div>
              </div>

              {/* Social Media */}
              <div className="mt-6 pt-6 border-t border-gray-700">
                <h3 className="text-white font-semibold mb-3">Social Media</h3>
                <div className="flex space-x-3">
                  <Instagram className="w-5 h-5 text-pink-400 hover:text-pink-300 cursor-pointer" />
                  <Twitter className="w-5 h-5 text-blue-400 hover:text-blue-300 cursor-pointer" />
                  <Linkedin className="w-5 h-5 text-blue-600 hover:text-blue-500 cursor-pointer" />
                </div>
              </div>
            </div>

            {/* Awards & Recognitions */}
            {(portfolioData.awards.length > 0 || isEditing) && (
              <div className="glass-effect p-6 rounded-2xl">
                <div className="flex justify-between items-center mb-4">
                  <h3 className="text-xl font-semibold text-white">Awards & Recognitions</h3>
                  {isEditing && (
                    <button
                      onClick={() => setShowAddAwardModal(true)}
                      className="p-1 text-rose-400 hover:text-rose-300"
                    >
                      <Plus className="w-4 h-4" />
                    </button>
                  )}
                </div>
                <div className="space-y-3">
                  {portfolioData.awards.map((award) => (
                    <div key={award.id} className="flex items-start justify-between group">
                      <div className="flex items-start space-x-3 flex-1">
                        <Award className="w-5 h-5 text-yellow-400 mt-1 flex-shrink-0" />
                        <div>
                          <div className="text-white font-medium">{award.name}</div>
                          <div className="text-gray-400 text-sm">
                            {award.issuer} • {award.year}
                          </div>
                        </div>
                      </div>
                      {isEditing && (
                        <button
                          onClick={() => handleDeleteAward(award.id!)}
                          className="opacity-0 group-hover:opacity-100 transition-opacity p-1 hover:bg-red-500/20 rounded"
                        >
                          <Trash2 className="w-4 h-4 text-red-400" />
                        </button>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Interviews & Features */}
            {(portfolioData.interviews.length > 0 || isEditing) && (
              <div className="glass-effect p-6 rounded-2xl">
                <div className="flex justify-between items-center mb-4">
                  <h3 className="text-xl font-semibold text-white">Interviews & Features</h3>
                  {isEditing && (
                    <button
                      onClick={() => setShowAddInterviewModal(true)}
                      className="p-1 text-rose-400 hover:text-rose-300"
                    >
                      <Plus className="w-4 h-4" />
                    </button>
                  )}
                </div>
                <div className="space-y-3">
                  {portfolioData.interviews.map((interview) => (
                    <div key={interview.id} className="flex items-start justify-between group">
                      <div className="flex items-start space-x-3 flex-1">
                        <Mic className="w-5 h-5 text-blue-400 mt-1 flex-shrink-0" />
                        <div>
                          <div className="text-white font-medium">{interview.title}</div>
                          <div className="text-gray-400 text-sm">
                            {interview.platform} •{' '}
                            {new Date(interview.interview_date).toLocaleDateString()}
                          </div>
                        </div>
                      </div>
                      {isEditing && (
                        <button
                          onClick={() => handleDeleteInterview(interview.id!)}
                          className="opacity-0 group-hover:opacity-100 transition-opacity p-1 hover:bg-red-500/20 rounded"
                        >
                          <Trash2 className="w-4 h-4 text-red-400" />
                        </button>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Skills */}
            <div className="glass-effect p-6 rounded-2xl">
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-xl font-semibold text-white">Skills</h3>
                {isEditing && (
                  <button
                    onClick={() => setShowAddSkillModal(true)}
                    className="p-1 text-rose-400 hover:text-rose-300"
                  >
                    <Plus className="w-4 h-4" />
                  </button>
                )}
              </div>
              <div className="flex flex-wrap gap-2">
                {portfolioData.skills.map((skill) => (
                  <div key={skill.id} className="relative group">
                    <span className="px-3 py-1 bg-gradient-to-r from-rose-400/20 to-purple-500/20 text-rose-300 rounded-full text-sm border border-rose-400/30">
                      {skill.skill_name}
                    </span>
                    {isEditing && (
                      <button
                        onClick={() => handleDeleteSkill(skill.id!)}
                        className="absolute -top-1 -right-1 w-4 h-4 bg-red-500 rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                      >
                        <X className="w-2 h-2 text-white" />
                      </button>
                    )}
                  </div>
                ))}
              </div>
            </div>

            {/* Certifications */}
            {(portfolioData.certifications.length > 0 || isEditing) && (
              <div className="glass-effect p-6 rounded-2xl">
                <div className="flex justify-between items-center mb-4">
                  <h3 className="text-xl font-semibold text-white">Certifications</h3>
                  {isEditing && (
                    <button
                      onClick={() => setShowAddCertModal(true)}
                      className="p-1 text-rose-400 hover:text-rose-300"
                    >
                      <Plus className="w-4 h-4" />
                    </button>
                  )}
                </div>
                <div className="space-y-3">
                  {portfolioData.certifications.map((cert) => (
                    <div key={cert.id} className="flex items-start justify-between group">
                      <div className="flex items-start space-x-3 flex-1">
                        <Award className="w-5 h-5 text-yellow-400 mt-1 flex-shrink-0" />
                        <div>
                          <div className="text-white font-medium">{cert.name}</div>
                          <div className="text-gray-400 text-sm">
                            {cert.issuer} • {cert.year}
                          </div>
                        </div>
                      </div>
                      {isEditing && (
                        <button
                          onClick={() => handleDeleteCertification(cert.id!)}
                          className="opacity-0 group-hover:opacity-100 transition-opacity p-1 hover:bg-red-500/20 rounded"
                        >
                          <Trash2 className="w-4 h-4 text-red-400" />
                        </button>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Right Column - Portfolio Content */}
          <div className="lg:col-span-2 space-y-6">
            {/* Bio */}
            <div className="glass-effect p-6 rounded-2xl">
              <h3 className="text-xl font-semibold text-white mb-4">About Me</h3>
              {isEditing ? (
                <textarea
                  value={profileEdits.bio}
                  onChange={(e) => setProfileEdits({ ...profileEdits, bio: e.target.value })}
                  className="w-full h-24 bg-transparent border border-gray-600 rounded-lg p-3 text-white resize-none focus:border-rose-400 outline-none"
                  placeholder="Tell your story..."
                />
              ) : (
                <p className="text-gray-300 leading-relaxed">
                  {profileEdits.bio || 'No bio added yet.'}
                </p>
              )}
            </div>

            {/* Highlights */}
            <div className="glass-effect p-6 rounded-2xl">
              <div className="flex justify-between items-center mb-6">
                <h3 className="text-xl font-semibold text-white">Highlights</h3>
                {isEditing && (
                  <button
                    onClick={() => setShowHighlightModal(true)}
                    className="px-4 py-2 bg-gradient-to-r from-rose-500 to-purple-600 text-white rounded-lg hover:shadow-lg transition-all"
                  >
                    <Plus className="w-4 h-4 mr-2 inline" />
                    Add Work
                  </button>
                )}
              </div>

              {loadingHighlights ? (
                <div className="text-center py-8">
                  <p className="text-gray-400">Loading highlights...</p>
                </div>
              ) : portfolioHighlights.length > 0 ? (
                <div className="grid md:grid-cols-2 gap-6">
                  {portfolioHighlights.map((item) => (
                    <div key={item.id} className="group relative">
                      <div className="aspect-video bg-gray-800 rounded-xl overflow-hidden">
                        <img src={item.thumbnail_url} alt={item.title} className="w-full h-full object-cover" />
                        <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-3">
                          {isEditing ? (
                            <>
                              <button
                                onClick={() => handleEditOpen(item)}
                                className="p-2 bg-gradient-to-r from-rose-500 to-purple-600 text-white rounded-lg hover:shadow-lg transition-all"
                              >
                                <Edit3 className="w-5 h-5" />
                              </button>
                              <button
                                onClick={() => handleRemoveFromHighlights(item.id)}
                                className="px-4 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600 transition-colors"
                              >
                                Remove
                              </button>
                            </>
                          ) : (
                            <button
                              onClick={() => handleSendToMedia(item)}
                              className="px-4 py-2 bg-rose-500 text-white rounded-lg hover:bg-rose-600 transition-colors"
                            >
                              Send to Media
                            </button>
                          )}
                        </div>
                      </div>
                      <div className="mt-3">
                        <h4 className="text-white font-medium">{item.title}</h4>
                        <p className="text-gray-400 text-sm">{item.creator}</p>
                        {item.description && (
                          <p className="text-gray-400 text-sm mt-1 line-clamp-2">{item.description}</p>
                        )}
                        <div className="flex items-center gap-4 text-xs text-gray-400 mt-2">
                          {item.duration && (
                            <div className="flex items-center gap-1">
                              <Clock className="w-3 h-3" />
                              <span>{item.duration}</span>
                            </div>
                          )}
                          <div className="flex items-center gap-1">
                            <Eye className="w-3 h-3" />
                            <span>{item.views_count.toLocaleString()} views</span>
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8">
                  <p className="text-gray-400">No highlighted content yet. Click "Add Work" to highlight your best pieces.</p>
                </div>
              )}
            </div>

            {/* Portfolio Content from Content page */}
            <div className="glass-effect p-6 rounded-2xl">
              <h3 className="text-xl font-semibold text-white mb-6">Portfolio Content</h3>

              {loadingContent ? (
                <div className="text-center py-8">
                  <p className="text-gray-400">Loading portfolio content...</p>
                </div>
              ) : portfolioContent.length > 0 ? (
                <div className="grid md:grid-cols-2 gap-6">
                  {portfolioContent.map((item) => {
                    const deletionInfo = getDeletionInfo(item.status || 'draft', item.deleted_at || null, item.auto_delete_at || null, item.saved || false);

                    return (
                      <div key={item.id} className="group relative">
                        {deletionInfo.isDeletedPending && item.auto_delete_at && (
                          <div className="mb-2">
                            <ContentCountdownTimer
                              autoDeleteAt={item.auto_delete_at}
                              onSave={() => handleSaveContent(item.id)}
                              isSaving={savingContentId === item.id}
                            />
                          </div>
                        )}

                        <div className="aspect-video bg-gray-800 rounded-xl overflow-hidden relative">
                          <img src={item.thumbnail_url} alt={item.title} className="w-full h-full object-cover" />
                          <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-3 flex-wrap">
                            <button
                              onClick={() => handleEditOpen(item)}
                              className="p-2 bg-gradient-to-r from-rose-500 to-purple-600 text-white rounded-lg hover:shadow-lg transition-all"
                            >
                              <Edit3 className="w-5 h-5" />
                            </button>
                            <button
                              onClick={() => handleSendToMedia(item)}
                              className="px-3 py-2 bg-rose-500 text-white rounded-lg hover:bg-rose-600 transition-colors text-sm"
                            >
                              Send to Media
                            </button>
                            {item.status !== 'pending_deletion' && (
                              <button
                                onClick={() => handleDeleteFromPortfolio(item.id)}
                                disabled={deletingContentId === item.id}
                                className="p-2 bg-red-500 hover:bg-red-600 text-white rounded-lg transition-all disabled:opacity-50"
                              >
                                <Trash2 className="w-5 h-5" />
                              </button>
                            )}
                          </div>
                        </div>

                        <div className="mt-3">
                          <h4 className="text-white font-medium">{item.title}</h4>
                          <p className="text-gray-400 text-sm">{item.creator}</p>
                          {item.description && (
                            <p className="text-gray-400 text-sm mt-1 line-clamp-2">{item.description}</p>
                          )}
                          {item.status === 'pending_deletion' && (
                            <p className="text-yellow-400 text-xs mt-2">Pending deletion</p>
                          )}
                          <div className="flex items-center gap-4 text-xs text-gray-400 mt-2">
                            {item.duration && (
                              <div className="flex items-center gap-1">
                                <Clock className="w-3 h-3" />
                                <span>{item.duration}</span>
                              </div>
                            )}
                            <div className="flex items-center gap-1">
                              <Eye className="w-3 h-3" />
                              <span>{item.views_count.toLocaleString()} views</span>
                            </div>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div className="text-center py-8">
                  <p className="text-gray-400">No portfolio content yet. Upload content from the Content page and publish to Portfolio to display it here.</p>
                </div>
              )}
            </div>

            {/* Experience */}
            {(portfolioData.experience.length > 0 || isEditing) && (
              <div className="glass-effect p-6 rounded-2xl">
                <div className="flex justify-between items-center mb-4">
                  <h3 className="text-xl font-semibold text-white">Experience</h3>
                  {isEditing && (
                    <button
                      onClick={() => setShowAddExperienceModal(true)}
                      className="p-1 text-rose-400 hover:text-rose-300"
                    >
                      <Plus className="w-4 h-4" />
                    </button>
                  )}
                </div>
                <div className="space-y-4">
                  {portfolioData.experience.map((exp) => {
                    const period = exp.is_current
                      ? `${new Date(exp.start_date).getFullYear()} - Present`
                      : `${new Date(exp.start_date).getFullYear()} - ${exp.end_date ? new Date(exp.end_date).getFullYear() : ''}`;

                    return (
                      <div key={exp.id} className="flex justify-between items-start group">
                        <div className="border-l-2 border-rose-400 pl-4 flex-1">
                          <h4 className="text-white font-semibold">{exp.title}</h4>
                          <div className="text-rose-400 text-sm">{exp.company} • {period}</div>
                          <p className="text-gray-300 text-sm mt-2">{exp.description}</p>
                        </div>
                        {isEditing && (
                          <button
                            onClick={() => handleDeleteExperience(exp.id!)}
                            className="opacity-0 group-hover:opacity-100 transition-opacity p-1 hover:bg-red-500/20 rounded ml-2"
                          >
                            <Trash2 className="w-4 h-4 text-red-400" />
                          </button>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Client Testimonials */}
            {(portfolioData.testimonials.length > 0 || isEditing) && (
              <div className="glass-effect p-6 rounded-2xl">
                <div className="flex justify-between items-center mb-4">
                  <h3 className="text-xl font-semibold text-white">Client Testimonials</h3>
                  {isEditing && (
                    <button
                      onClick={() => setShowAddTestimonialModal(true)}
                      className="p-1 text-rose-400 hover:text-rose-300"
                    >
                      <Plus className="w-4 h-4" />
                    </button>
                  )}
                </div>
                <div className="space-y-4">
                  {portfolioData.testimonials.map((testimonial) => (
                    <div key={testimonial.id} className="flex justify-between items-start group">
                      <div className="bg-white/5 p-4 rounded-lg flex-1">
                        <div className="flex items-center space-x-1 mb-2">
                          {[...Array(testimonial.rating || 5)].map((_, i) => (
                            <Star key={i} className="w-4 h-4 text-yellow-400 fill-current" />
                          ))}
                        </div>
                        <p className="text-gray-300 italic mb-2">"{testimonial.comment}"</p>
                        <div className="text-sm">
                          <span className="text-white font-medium">{testimonial.client_name}</span>
                          <span className="text-gray-400"> - {testimonial.client_company}</span>
                        </div>
                      </div>
                      {isEditing && (
                        <button
                          onClick={() => handleDeleteTestimonial(testimonial.id!)}
                          className="opacity-0 group-hover:opacity-100 transition-opacity p-1 hover:bg-red-500/20 rounded ml-2"
                        >
                          <Trash2 className="w-4 h-4 text-red-400" />
                        </button>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Send to Media Modal */}
        {showMediaModal && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
            <div className="glass-effect p-6 rounded-2xl max-w-md w-full">
              <h3 className="text-xl font-semibold text-white mb-4">Send to Media</h3>
              <p className="text-gray-300 mb-4">
                Send "{selectedContent?.title}" to the Media section for admin review?
              </p>
              <div className="flex space-x-3">
                <button
                  onClick={confirmSendToMedia}
                  className="flex-1 py-2 bg-gradient-to-r from-rose-500 to-purple-600 text-white rounded-lg hover:shadow-lg transition-all"
                >
                  Send for Review
                </button>
                <button
                  onClick={() => setShowMediaModal(false)}
                  className="flex-1 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors"
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Edit Content Modal */}
        {editingContent && (
          <EditContentModal
            isOpen={!!editingContent}
            title={editingContent.title}
            description={editingContent.description}
            category={editingContent.category}
            isPremium={editingContent.is_premium}
            publishedTo={(editingContent.published_to || []) as string[]}
            status={editingContent.status}
            onSave={handleEditSave}
            onDelete={() => handleDelete(editingContent.id)}
            onClose={handleEditClose}
            isSaving={isSaving}
            isDeleting={isDeleting}
            error={editError}
          />
        )}

        {/* Highlight Selection Modal */}
        <HighlightSelectionModal
          isOpen={showHighlightModal}
          portfolioContent={portfolioContent}
          highlightedIds={portfolioHighlights.map((h) => h.id)}
          onToggleHighlight={handleToggleHighlight}
          onClose={() => setShowHighlightModal(false)}
        />

        {/* Modals for adding new items */}
        {showAddSkillModal && (
          <AddItemModal
            title="Add Skill"
            fields={[{ name: 'skillName', label: 'Skill Name', type: 'text', placeholder: 'e.g., Digital Marketing' }]}
            onSave={(data) => handleAddSkill(data.skillName)}
            onClose={() => setShowAddSkillModal(false)}
          />
        )}

        {showAddCertModal && (
          <AddItemModal
            title="Add Certification"
            fields={[
              { name: 'name', label: 'Certification Name', type: 'text', placeholder: 'e.g., Digital Marketing Certification' },
              { name: 'issuer', label: 'Issuer', type: 'text', placeholder: 'e.g., Creative Arts Institute' },
              { name: 'year', label: 'Year', type: 'text', placeholder: '2025' },
            ]}
            onSave={handleAddCertification}
            onClose={() => setShowAddCertModal(false)}
          />
        )}

        {showAddAwardModal && (
          <AddItemModal
            title="Add Award"
            fields={[
              { name: 'name', label: 'Award Name', type: 'text', placeholder: 'e.g., Creative of the Year' },
              { name: 'issuer', label: 'Issuer', type: 'text', placeholder: 'e.g., Creative Excellence Awards' },
              { name: 'year', label: 'Year', type: 'text', placeholder: '2025' },
            ]}
            onSave={handleAddAward}
            onClose={() => setShowAddAwardModal(false)}
          />
        )}

        {showAddInterviewModal && (
          <AddItemModal
            title="Add Interview"
            fields={[
              { name: 'title', label: 'Interview Title', type: 'text', placeholder: 'e.g., The Future of Branding' },
              { name: 'platform', label: 'Platform', type: 'text', placeholder: 'e.g., Creative Minds Podcast' },
              { name: 'interview_date', label: 'Date', type: 'date' },
            ]}
            onSave={handleAddInterview}
            onClose={() => setShowAddInterviewModal(false)}
          />
        )}

        {showAddExperienceModal && (
          <AddItemModal
            title="Add Experience"
            fields={[
              { name: 'title', label: 'Position Title', type: 'text', placeholder: 'e.g., Senior Marketing Specialist' },
              { name: 'company', label: 'Company', type: 'text', placeholder: 'e.g., Creative Agency Inc.' },
              { name: 'employment_type', label: 'Employment Type', type: 'select', options: ['full-time', 'part-time', 'contract', 'freelance', 'internship'], placeholder: 'Select type' },
              { name: 'start_date', label: 'Start Date', type: 'date' },
              { name: 'end_date', label: 'End Date (leave empty if current)', type: 'date' },
              { name: 'is_current', label: 'Currently working here', type: 'checkbox' },
              { name: 'description', label: 'Description', type: 'textarea', placeholder: 'Describe your role and achievements...' },
            ]}
            onSave={handleAddExperience}
            onClose={() => setShowAddExperienceModal(false)}
          />
        )}

        {showAddTestimonialModal && (
          <AddItemModal
            title="Add Testimonial"
            fields={[
              { name: 'client_name', label: 'Client Name', type: 'text', placeholder: 'e.g., Sarah Johnson' },
              { name: 'client_company', label: 'Client Company', type: 'text', placeholder: 'e.g., Tech Innovations' },
              { name: 'rating', label: 'Rating (1-5)', type: 'number', placeholder: '5' },
              { name: 'comment', label: 'Testimonial', type: 'textarea', placeholder: 'What did the client say?' },
            ]}
            onSave={handleAddTestimonial}
            onClose={() => setShowAddTestimonialModal(false)}
          />
        )}
      </div>
    </div>
  );
}

// Helper Modal Component
function AddItemModal({ title, fields, onSave, onClose }: any) {
  const [formData, setFormData] = useState<any>({});
  const [isSaving, setIsSaving] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    try {
      await onSave(formData);
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="glass-effect p-6 rounded-2xl max-w-md w-full max-h-[90vh] overflow-y-auto">
        <h3 className="text-xl font-semibold text-white mb-4">{title}</h3>
        <form onSubmit={handleSubmit} className="space-y-4">
          {fields.map((field: any) => (
            <div key={field.name}>
              {field.type === 'checkbox' ? (
                <label className="flex items-center space-x-2">
                  <input
                    type="checkbox"
                    checked={formData[field.name] || false}
                    onChange={(e) => setFormData({ ...formData, [field.name]: e.target.checked })}
                    className="w-4 h-4 text-rose-400 bg-gray-800 border-gray-700 rounded focus:ring-2 focus:ring-rose-400"
                  />
                  <span className="text-sm font-medium text-white">{field.label}</span>
                </label>
              ) : (
                <>
                  <label className="block text-sm font-medium text-white mb-2">{field.label}</label>
                  {field.type === 'textarea' ? (
                    <textarea
                      value={formData[field.name] || ''}
                      onChange={(e) => setFormData({ ...formData, [field.name]: e.target.value })}
                      placeholder={field.placeholder}
                      className="w-full px-4 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white placeholder-gray-400 focus:border-rose-400 outline-none resize-none"
                      rows={3}
                    />
                  ) : field.type === 'select' ? (
                    <select
                      value={formData[field.name] || ''}
                      onChange={(e) => setFormData({ ...formData, [field.name]: e.target.value })}
                      className="w-full px-4 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white focus:border-rose-400 outline-none"
                      required
                    >
                      <option value="">{field.placeholder}</option>
                      {field.options?.map((opt: string) => (
                        <option key={opt} value={opt}>{opt}</option>
                      ))}
                    </select>
                  ) : (
                    <input
                      type={field.type}
                      value={formData[field.name] || ''}
                      onChange={(e) => setFormData({ ...formData, [field.name]: field.type === 'number' ? parseInt(e.target.value) : e.target.value })}
                      placeholder={field.placeholder}
                      className="w-full px-4 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white placeholder-gray-400 focus:border-rose-400 outline-none"
                      required={field.type !== 'date' || field.name !== 'end_date'}
                    />
                  )}
                </>
              )}
            </div>
          ))}
          <div className="flex gap-3 pt-4">
            <button
              type="button"
              onClick={onClose}
              disabled={isSaving}
              className="flex-1 px-4 py-2 border border-gray-700 text-gray-300 rounded-lg hover:bg-gray-800 transition-colors disabled:opacity-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSaving}
              className="flex-1 px-4 py-2 bg-gradient-to-r from-rose-500 to-purple-600 text-white rounded-lg hover:shadow-lg transition-all disabled:opacity-50"
            >
              {isSaving ? 'Saving...' : 'Save'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
