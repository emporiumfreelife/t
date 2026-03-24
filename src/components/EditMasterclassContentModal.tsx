import React, { useState, useEffect, useRef } from 'react';
import { X, Trash2, Upload, LinkIcon, AlertCircle, Loader } from 'lucide-react';
import { uploadToB2 } from '../lib/b2Upload';
import { useVideoDuration } from '../hooks/useVideoDuration';
import { extractDuration } from '../lib/getDuration';
import { supabase } from '../lib/supabase';

interface EditMasterclassContentModalProps {
  isOpen: boolean;
  title: string;
  description?: string;
  category?: string;
  level?: string;
  learningOutcomes?: string[];
  features?: string[];
  lessonsCount?: number;
  isPremium?: boolean;
  status?: string;
  thumbnailUrl?: string;
  contentUrl?: string;
  coursePrice?: number;
  courseCurrency?: string;
  userId?: string;
  onSave: (payload: {
    title: string;
    description?: string;
    category?: string;
    level?: string;
    learning_outcomes?: string[];
    features?: string[];
    lessons_count?: number;
    is_premium?: boolean;
    thumbnail_url?: string;
    content_url?: string;
    course_price?: number;
    course_currency?: string;
    duration?: string;
  }) => void;
  onDelete?: () => void;
  onClose: () => void;
  isSaving?: boolean;
  isDeleting?: boolean;
  error?: string;
}

export default function EditMasterclassContentModal({
  isOpen,
  title: initialTitle,
  description: initialDescription,
  category: initialCategory,
  level: initialLevel,
  learningOutcomes: initialLearningOutcomes,
  features: initialFeatures,
  lessonsCount: initialLessonsCount,
  isPremium: initialPremium,
  status = 'draft',
  thumbnailUrl: initialThumbnailUrl,
  contentUrl: initialContentUrl,
  coursePrice: initialCoursePrice = 0,
  courseCurrency: initialCourseCurrency = 'UGX',
  userId,
  onSave,
  onDelete,
  onClose,
  isSaving = false,
  isDeleting = false,
  error,
}: EditMasterclassContentModalProps) {
  const [title, setTitle] = useState(initialTitle);
  const [description, setDescription] = useState(initialDescription || '');
  const [category, setCategory] = useState(initialCategory || '');
  const [level, setLevel] = useState(initialLevel || 'All Levels');
  const [learningOutcomes, setLearningOutcomes] = useState<string[]>(initialLearningOutcomes || []);
  const [learningOutcomeInput, setLearningOutcomeInput] = useState('');
  const [features, setFeatures] = useState<string[]>(initialFeatures || []);
  const [featureInput, setFeatureInput] = useState('');
  const [lessonsCount, setLessonsCount] = useState(initialLessonsCount || 0);
  const [isPremium, setIsPremium] = useState(initialPremium || false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  // Thumbnail state
  const [thumbnailUrl, setThumbnailUrl] = useState(initialThumbnailUrl || '');
  const [thumbnailFile, setThumbnailFile] = useState<File | null>(null);
  const [thumbnailPreview, setThumbnailPreview] = useState<string | null>(null);
  const [thumbnailEditMode, setThumbnailEditMode] = useState<'current' | 'url' | 'upload'>('current');
  const [thumbnailUrlInput, setThumbnailUrlInput] = useState('');
  const [thumbnailLoading, setThumbnailLoading] = useState(false);
  const [thumbnailError, setThumbnailError] = useState<string | null>(null);
  const [thumbnailDragActive, setThumbnailDragActive] = useState(false);

  // Video state
  const [contentUrl, setContentUrl] = useState(initialContentUrl || '');
  const [videoEditMode, setVideoEditMode] = useState<'current' | 'url' | 'upload'>('current');
  const [videoUrlInput, setVideoUrlInput] = useState('');
  const [videoDuration, setVideoDuration] = useState<string | null>(null);
  const [detectedDuration, setDetectedDuration] = useState<string | null>(null);
  const [videoDragActive, setVideoDragActive] = useState(false);
  const [videoFile, setVideoFile] = useState<File | null>(null);
  const [isUploadingVideo, setIsUploadingVideo] = useState(false);
  const [isProcessingVideo, setIsProcessingVideo] = useState(false);
  const [videoUploadError, setVideoUploadError] = useState<string | null>(null);
  const [uploadedVideoDuration, setUploadedVideoDuration] = useState<string | null>(null);
  const videoFileInputRef = useRef<HTMLInputElement>(null);

  // Use hook to detect duration from content URL
  const { duration: urlDuration, isLoading: isDurationLoading } = useVideoDuration(contentUrl);

  // Price state (add course price and currency)
  const [coursePrice, setCoursePrice] = useState<number>(initialCoursePrice);
  const [courseCurrency, setCourseCurrency] = useState(initialCourseCurrency);

  const isPendingDeletion = status === 'pending_deletion';

  // Update detected duration when URL changes
  useEffect(() => {
    if (contentUrl && !isDurationLoading && urlDuration) {
      setDetectedDuration(urlDuration);
    }
  }, [contentUrl, isDurationLoading, urlDuration]);

  if (!isOpen) return null;

  const handleThumbnailFileSelect = (selectedFile: File | null) => {
    if (!selectedFile) return;

    if (!['image/jpeg', 'image/png', 'image/gif', 'image/webp'].includes(selectedFile.type)) {
      setThumbnailError('Thumbnail must be an image file (JPEG, PNG, GIF, or WebP)');
      return;
    }

    if (selectedFile.size > 10 * 1024 * 1024) {
      setThumbnailError('Thumbnail must be smaller than 10MB');
      return;
    }

    setThumbnailFile(selectedFile);
    setThumbnailError(null);

    const reader = new FileReader();
    reader.onload = (e) => {
      setThumbnailPreview(e.target?.result as string);
    };
    reader.readAsDataURL(selectedFile);
  };

  const handleThumbnailDrag = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setThumbnailDragActive(true);
    } else if (e.type === 'dragleave') {
      setThumbnailDragActive(false);
    }
  };

  const handleThumbnailDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setThumbnailDragActive(false);

    const droppedFile = e.dataTransfer.files?.[0];
    if (droppedFile) handleThumbnailFileSelect(droppedFile);
  };

  const handleVideoDrag = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setVideoDragActive(true);
    } else if (e.type === 'dragleave') {
      setVideoDragActive(false);
    }
  };

  const handleVideoDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setVideoDragActive(false);

    const droppedFile = e.dataTransfer.files?.[0];
    if (droppedFile) {
      handleVideoFileSelect(droppedFile);
    }
  };

  const handleVideoFileSelect = (file: File) => {
    if (!['video/mp4', 'video/webm', 'video/quicktime'].includes(file.type)) {
      setVideoUploadError('Only MP4, WebM, and MOV files are allowed.');
      return;
    }

    if (file.size > 500 * 1024 * 1024) {
      setVideoUploadError('File must be under 500MB.');
      return;
    }

    setVideoFile(file);
    setVideoUploadError(null);
  };

  const handleVideoUpload = async () => {
    if (!videoFile || !userId) {
      setVideoUploadError('Please select a video first.');
      return;
    }

    setIsUploadingVideo(true);
    setVideoUploadError(null);

    try {
      // Extract duration
      let extractedDuration: string | null = null;
      try {
        extractedDuration = await extractDuration(videoFile);
        setUploadedVideoDuration(extractedDuration);
      } catch (durationError) {
        extractedDuration = null;
      }

      // Upload to B2
      const filename = `masterclass_videos/${userId}/${Date.now()}-${videoFile.name}`;

      const formData = new FormData();
      formData.append('file', videoFile);
      formData.append('filename', filename);
      formData.append('contentType', videoFile.type);

      const uploadRes = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/upload-to-b2`,
        {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`,
          },
          body: formData,
        }
      );

      if (!uploadRes.ok) throw new Error('Upload to storage failed');
      setIsUploadingVideo(false);
      setIsProcessingVideo(true);

      // Process with Mux
      const processRes = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/process-masterclass-video`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`,
          },
          body: JSON.stringify({
            filename,
            userId
          }),
        }
      );

      if (!processRes.ok) throw new Error('Failed to process video');

      const muxData = await processRes.json();
      const assetId = muxData.data?.id;

      if (!assetId) throw new Error('Video asset ID missing');

      // Poll for playback ID
      await pollVideoMuxStatus(assetId, extractedDuration);
    } catch (err: any) {
      setVideoUploadError(err.message || 'Upload failed');
      setIsUploadingVideo(false);
      setIsProcessingVideo(false);
    }
  };

  const pollVideoMuxStatus = async (assetId: string, duration: string | null = null, tries = 0): Promise<void> => {
    const { data, error } = await supabase
      .from('masterclass_video_uploads')
      .select('id, playback_id, status')
      .eq('asset_id', assetId)
      .single();

    if (error) throw new Error('Failed to check video status');

    if (data.playback_id && data.status === 'ready') {
      // Form the Mux playback URL
      const playbackUrl = `https://stream.mux.com/${data.playback_id}.m3u8`;
      setContentUrl(playbackUrl);
      setDetectedDuration(duration);
      setUploadedVideoDuration(duration || null);
      setVideoFile(null);
      setVideoEditMode('current');
      setIsProcessingVideo(false);
      return;
    }

    if (tries > 120) throw new Error('Video processing took too long');

    await new Promise(r => setTimeout(r, 1000));
    return pollVideoMuxStatus(assetId, duration, tries + 1);
  };

  const handleThumbnailUpload = async () => {
    if (!thumbnailFile || !userId) {
      setThumbnailError('Please select a thumbnail file');
      return;
    }

    setThumbnailLoading(true);
    setThumbnailError(null);

    try {
      const { publicUrl, error: uploadError } = await uploadToB2(
        thumbnailFile,
        `masterclass_page_content/${userId}`
      );

      if (uploadError) throw new Error(uploadError);

      setThumbnailUrl(publicUrl);
      setThumbnailFile(null);
      setThumbnailPreview(null);
      setThumbnailEditMode('current');
    } catch (err) {
      setThumbnailError(err instanceof Error ? err.message : 'Failed to upload thumbnail');
    } finally {
      setThumbnailLoading(false);
    }
  };

  const handleThumbnailUrlSubmit = () => {
    if (!thumbnailUrlInput.trim()) {
      setThumbnailError('Please enter a valid URL');
      return;
    }

    try {
      new URL(thumbnailUrlInput);
      setThumbnailUrl(thumbnailUrlInput);
      setThumbnailUrlInput('');
      setThumbnailEditMode('current');
      setThumbnailError(null);
    } catch {
      setThumbnailError('Please enter a valid URL');
    }
  };

  const handleAddLearningOutcome = () => {
    if (learningOutcomeInput.trim() && learningOutcomes.length < 10) {
      setLearningOutcomes([...learningOutcomes, learningOutcomeInput.trim()]);
      setLearningOutcomeInput('');
    }
  };

  const handleRemoveLearningOutcome = (index: number) => {
    setLearningOutcomes(learningOutcomes.filter((_, i) => i !== index));
  };

  const handleAddFeature = () => {
    if (featureInput.trim() && features.length < 8) {
      setFeatures([...features, featureInput.trim()]);
      setFeatureInput('');
    }
  };

  const handleRemoveFeature = (index: number) => {
    setFeatures(features.filter((_, i) => i !== index));
  };

  const handleSave = () => {
    const payload: any = {
      title,
      description: description || undefined,
      category: category || undefined,
      level: level || undefined,
      learning_outcomes: learningOutcomes.length > 0 ? learningOutcomes : undefined,
      features: features.length > 0 ? features : undefined,
      lessons_count: lessonsCount || undefined,
      is_premium: isPremium,
      course_price: coursePrice,
      course_currency: courseCurrency,
    };

    if (thumbnailUrl !== initialThumbnailUrl) {
      payload.thumbnail_url = thumbnailUrl;
    }

    if (contentUrl !== initialContentUrl) {
      payload.content_url = contentUrl;
      // Include detected duration if available for updated video URL or file upload
      if (detectedDuration) {
        payload.duration = detectedDuration;
      } else if (uploadedVideoDuration) {
        payload.duration = uploadedVideoDuration;
      }
    }

    onSave(payload);
  };

  const courseCategories = [
    'digital-marketing',
    'brand-ambassador',
    'media-communications',
    'media-production',
    'art-&-design',
    'modelling',
    'dance-&-choreography',
    'acting',
    'critical-media-literacy',
    'film-video-production',
    'audio-production',
    'music',
    'event-management',
    'marketing-&-advertising',
    'AI-research-&-innovation',
    'business-development',
    'professional-development',
    'personal-development'
  ];

  const levelOptions = [
    'Beginner',
    'Intermediate',
    'Advanced',
    'All Levels',
    'Beginner to Intermediate',
    'Beginner to Advanced',
    'Intermediate to Advanced'
  ];

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
      <div className="bg-gray-900 rounded-2xl shadow-xl max-w-2xl w-full border border-gray-800 max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between p-6 border-b border-gray-800 sticky top-0 bg-gray-900">
          <h3 className="text-xl font-bold text-white">Edit Course</h3>
          <button
            onClick={onClose}
            disabled={isSaving || isDeleting}
            className="text-gray-400 hover:text-white transition-colors disabled:opacity-50"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        <form
          onSubmit={(e) => {
            e.preventDefault();
            handleSave();
          }}
          className="p-6 space-y-4"
        >
          {/* Title */}
          <div>
            <label className="block text-sm font-medium text-white mb-2">
              Title *
            </label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="w-full px-4 py-3 bg-gray-800 border border-gray-700 rounded-lg text-white placeholder-gray-400 focus:ring-2 focus:ring-rose-400 focus:border-transparent transition-all"
              placeholder="Course title"
              required
              disabled={isSaving || isDeleting}
            />
          </div>

          {/* Description */}
          <div>
            <label className="block text-sm font-medium text-white mb-2">
              Description
            </label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="w-full px-4 py-3 bg-gray-800 border border-gray-700 rounded-lg text-white placeholder-gray-400 focus:ring-2 focus:ring-rose-400 focus:border-transparent transition-all resize-none"
              placeholder="Course description"
              rows={3}
              disabled={isSaving || isDeleting}
            />
          </div>

          {/* Category */}
          <div>
            <label className="block text-sm font-medium text-white mb-2">
              Category
            </label>
            <select
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              className="w-full px-4 py-3 bg-gray-800 border border-gray-700 rounded-lg text-white focus:ring-2 focus:ring-rose-400 focus:border-transparent transition-all"
              disabled={isSaving || isDeleting}
            >
              <option value="">Select a category</option>
              {courseCategories.map((cat) => (
                <option key={cat} value={cat}>
                  {cat
                    .split('-')
                    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
                    .join(' ')}
                </option>
              ))}
            </select>
          </div>

          {/* Level */}
          <div>
            <label className="block text-sm font-medium text-white mb-2">
              Course Level
            </label>
            <select
              value={level}
              onChange={(e) => setLevel(e.target.value)}
              className="w-full px-4 py-3 bg-gray-800 border border-gray-700 rounded-lg text-white focus:ring-2 focus:ring-rose-400 focus:border-transparent transition-all"
              disabled={isSaving || isDeleting}
            >
              {levelOptions.map((lvl) => (
                <option key={lvl} value={lvl}>
                  {lvl}
                </option>
              ))}
            </select>
          </div>

          {/* Lessons Count */}
          <div>
            <label className="block text-sm font-medium text-white mb-2">
              Number of Lessons
            </label>
            <input
              type="number"
              min="0"
              value={lessonsCount}
              onChange={(e) => setLessonsCount(parseInt(e.target.value) || 0)}
              className="w-full px-4 py-3 bg-gray-800 border border-gray-700 rounded-lg text-white placeholder-gray-400 focus:ring-2 focus:ring-rose-400 focus:border-transparent transition-all"
              placeholder="Number of lessons"
              disabled={isSaving || isDeleting}
            />
          </div>

          {/* Learning Outcomes */}
          <div>
            <label className="block text-sm font-medium text-white mb-2">
              Learning Outcomes
            </label>
            <div className="flex gap-2 mb-3">
              <input
                type="text"
                value={learningOutcomeInput}
                onChange={(e) => setLearningOutcomeInput(e.target.value)}
                onKeyPress={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    handleAddLearningOutcome();
                  }
                }}
                className="flex-1 px-4 py-3 bg-gray-800 border border-gray-700 rounded-lg text-white placeholder-gray-400 focus:ring-2 focus:ring-rose-400 focus:border-transparent transition-all"
                placeholder="Add a learning outcome and press Enter"
                disabled={isSaving || isDeleting}
              />
              <button
                type="button"
                onClick={handleAddLearningOutcome}
                disabled={!learningOutcomeInput.trim() || learningOutcomes.length >= 10 || isSaving || isDeleting}
                className="px-4 py-3 bg-rose-500/20 text-rose-300 rounded-lg hover:bg-rose-500/30 transition-all disabled:opacity-50"
              >
                Add
              </button>
            </div>
            {learningOutcomes.length > 0 && (
              <div className="flex flex-wrap gap-2">
                {learningOutcomes.map((outcome, index) => (
                  <div
                    key={index}
                    className="px-3 py-1 bg-green-400/20 text-green-300 text-sm rounded-full flex items-center gap-2"
                  >
                    {outcome}
                    <button
                      type="button"
                      onClick={() => handleRemoveLearningOutcome(index)}
                      disabled={isSaving || isDeleting}
                      className="text-green-300 hover:text-green-200 disabled:opacity-50"
                    >
                      ×
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Features */}
          <div>
            <label className="block text-sm font-medium text-white mb-2">
              Course Features
            </label>
            <div className="flex gap-2 mb-3">
              <input
                type="text"
                value={featureInput}
                onChange={(e) => setFeatureInput(e.target.value)}
                onKeyPress={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    handleAddFeature();
                  }
                }}
                className="flex-1 px-4 py-3 bg-gray-800 border border-gray-700 rounded-lg text-white placeholder-gray-400 focus:ring-2 focus:ring-rose-400 focus:border-transparent transition-all"
                placeholder="Add a feature (e.g., Live Sessions) and press Enter"
                disabled={isSaving || isDeleting}
              />
              <button
                type="button"
                onClick={handleAddFeature}
                disabled={!featureInput.trim() || features.length >= 8 || isSaving || isDeleting}
                className="px-4 py-3 bg-rose-500/20 text-rose-300 rounded-lg hover:bg-rose-500/30 transition-all disabled:opacity-50"
              >
                Add
              </button>
            </div>
            {features.length > 0 && (
              <div className="flex flex-wrap gap-2">
                {features.map((feature, index) => (
                  <div
                    key={index}
                    className="px-3 py-1 bg-purple-400/20 text-purple-300 text-sm rounded-full flex items-center gap-2"
                  >
                    {feature}
                    <button
                      type="button"
                      onClick={() => handleRemoveFeature(index)}
                      disabled={isSaving || isDeleting}
                      className="text-purple-300 hover:text-purple-200 disabled:opacity-50"
                    >
                      ×
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Thumbnail Editor */}
          <div className="border border-gray-700 rounded-lg p-4 bg-gray-800/50">
            <label className="block text-sm font-medium text-white mb-3">
              Course Thumbnail
            </label>

            {thumbnailEditMode === 'current' && (
              <div className="space-y-3">
                {thumbnailUrl && (
                  <img
                    src={thumbnailUrl}
                    alt="Current thumbnail"
                    className="w-full h-48 object-cover rounded-lg"
                  />
                )}
                <p className="text-xs text-gray-400">
                  {thumbnailUrl ? 'Current thumbnail' : 'No thumbnail set'}
                </p>
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      setThumbnailEditMode('url');
                      setThumbnailError(null);
                    }}
                    className="flex-1 px-3 py-2 bg-blue-500/20 text-blue-300 rounded-lg hover:bg-blue-500/30 text-sm transition-all"
                    disabled={isSaving || isDeleting || thumbnailLoading}
                  >
                    <LinkIcon className="w-4 h-4 inline mr-2" />
                    Use URL
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setThumbnailEditMode('upload');
                      setThumbnailError(null);
                    }}
                    className="flex-1 px-3 py-2 bg-purple-500/20 text-purple-300 rounded-lg hover:bg-purple-500/30 text-sm transition-all"
                    disabled={isSaving || isDeleting || thumbnailLoading}
                  >
                    <Upload className="w-4 h-4 inline mr-2" />
                    Upload New
                  </button>
                </div>
              </div>
            )}

            {thumbnailEditMode === 'url' && (
              <div className="space-y-3">
                <input
                  type="url"
                  value={thumbnailUrlInput}
                  onChange={(e) => setThumbnailUrlInput(e.target.value)}
                  placeholder="Enter image URL (https://...)"
                  className="w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:ring-2 focus:ring-blue-400 focus:border-transparent transition-all text-sm"
                  disabled={isSaving || isDeleting || thumbnailLoading}
                />
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={handleThumbnailUrlSubmit}
                    disabled={isSaving || isDeleting || thumbnailLoading || !thumbnailUrlInput.trim()}
                    className="flex-1 px-3 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 text-sm transition-all disabled:opacity-50"
                  >
                    Confirm URL
                  </button>
                  <button
                    type="button"
                    onClick={() => setThumbnailEditMode('current')}
                    disabled={isSaving || isDeleting || thumbnailLoading}
                    className="flex-1 px-3 py-2 bg-gray-700 text-gray-300 rounded-lg hover:bg-gray-600 text-sm transition-all"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            )}

            {thumbnailEditMode === 'upload' && (
              <div className="space-y-3">
                <div
                  onDragEnter={handleThumbnailDrag}
                  onDragLeave={handleThumbnailDrag}
                  onDragOver={handleThumbnailDrag}
                  onDrop={handleThumbnailDrop}
                  className={`border-2 border-dashed rounded-lg p-4 text-center cursor-pointer transition-colors ${
                    thumbnailDragActive
                      ? 'border-purple-400 bg-purple-400/10'
                      : 'border-gray-600 hover:border-purple-400 hover:bg-purple-400/5'
                  }`}
                >
                  {thumbnailPreview ? (
                    <img
                      src={thumbnailPreview}
                      alt="Preview"
                      className="w-full h-32 object-cover rounded mb-2"
                    />
                  ) : (
                    <Upload className={`w-8 h-8 mx-auto mb-2 ${thumbnailDragActive ? 'text-purple-400' : 'text-gray-400'}`} />
                  )}
                  <input
                    type="file"
                    accept="image/*"
                    onChange={(e) => {
                      if (e.target.files?.[0]) {
                        handleThumbnailFileSelect(e.target.files[0]);
                      }
                    }}
                    className="hidden"
                    id="thumbnail-upload"
                    disabled={isSaving || isDeleting || thumbnailLoading}
                  />
                  <label
                    htmlFor="thumbnail-upload"
                    className={`block text-sm cursor-pointer transition-colors ${
                      thumbnailDragActive
                        ? 'text-purple-400'
                        : 'text-gray-400 hover:text-gray-300'
                    }`}
                  >
                    Click to select or drag and drop
                  </label>
                </div>
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={handleThumbnailUpload}
                    disabled={!thumbnailFile || isSaving || isDeleting || thumbnailLoading}
                    className="flex-1 px-3 py-2 bg-purple-500 text-white rounded-lg hover:bg-purple-600 text-sm transition-all disabled:opacity-50"
                  >
                    {thumbnailLoading ? 'Uploading...' : 'Upload Thumbnail'}
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setThumbnailEditMode('current');
                      setThumbnailFile(null);
                      setThumbnailPreview(null);
                    }}
                    disabled={isSaving || isDeleting || thumbnailLoading}
                    className="flex-1 px-3 py-2 bg-gray-700 text-gray-300 rounded-lg hover:bg-gray-600 text-sm transition-all"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            )}

            {thumbnailError && (
              <div className="mt-2 p-2 bg-red-500/10 border border-red-500/20 rounded text-red-400 text-xs">
                <AlertCircle className="w-3 h-3 inline mr-1" />
                {thumbnailError}
              </div>
            )}
          </div>

          {/* Video Editor */}
          <div className="border border-gray-700 rounded-lg p-4 bg-gray-800/50">
            <label className="block text-sm font-medium text-white mb-3">
              Course Video
            </label>

            {videoEditMode === 'current' && (
              <div className="space-y-3">
                <p className="text-xs text-gray-400 break-all">
                  {contentUrl ? (() => {
                    // Extract playback ID from Mux URL (e.g., from https://stream.mux.com/{playbackId}.m3u8)
                    const playbackIdMatch = contentUrl.match(/\/([a-zA-Z0-9]+)\.m3u8$/);
                    const playbackId = playbackIdMatch ? playbackIdMatch[1] : null;
                    return playbackId ? `Current URL has PlayBack_ID: ${playbackId}` : `Current: ${contentUrl}`;
                  })() : 'No video set'}
                </p>
                {detectedDuration && (
                  <p className="text-xs text-green-400">
                    ✓ Duration detected: {detectedDuration}
                  </p>
                )}
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      setVideoEditMode('upload');
                      setVideoUploadError(null);
                    }}
                    className="flex-1 px-3 py-2 bg-purple-500/20 text-purple-300 rounded-lg hover:bg-purple-500/30 text-sm transition-all"
                    disabled={isSaving || isDeleting}
                  >
                    <Upload className="w-4 h-4 inline mr-2" />
                    Upload New Video
                  </button>
                  <button
                    type="button"
                    onClick={() => setVideoEditMode('url')}
                    className="flex-1 px-3 py-2 bg-blue-500/20 text-blue-300 rounded-lg hover:bg-blue-500/30 text-sm transition-all"
                    disabled={isSaving || isDeleting}
                  >
                    <LinkIcon className="w-4 h-4 inline mr-2" />
                    Change URL
                  </button>
                </div>
              </div>
            )}

            {videoEditMode === 'upload' && (
              <div className="space-y-3">
                <input
                  ref={videoFileInputRef}
                  type="file"
                  accept="video/*"
                  onChange={(e) => {
                    if (e.target.files?.[0]) {
                      handleVideoFileSelect(e.target.files[0]);
                    }
                  }}
                  className="hidden"
                />

                <div
                  className={`border-2 border-dashed rounded-lg p-8 text-center cursor-pointer transition-colors ${
                    videoDragActive
                      ? 'border-purple-500 bg-purple-50'
                      : 'border-gray-600 hover:border-purple-500 hover:bg-purple-500/5'
                  }`}
                  onClick={() => videoFileInputRef.current?.click()}
                  onDragEnter={handleVideoDrag}
                  onDragLeave={handleVideoDrag}
                  onDragOver={handleVideoDrag}
                  onDrop={handleVideoDrop}
                >
                  {isUploadingVideo || isProcessingVideo ? (
                    <Loader className="w-6 h-6 animate-spin mx-auto text-purple-600" />
                  ) : (
                    <>
                      <Upload className="w-6 h-6 mx-auto text-gray-400 mb-2" />
                      <p className="text-gray-300 text-sm">Click to select or drag and drop a video</p>
                      <p className="text-xs text-gray-500">MP4, WebM, MOV — up to 500MB</p>
                    </>
                  )}
                </div>

                {videoFile && !isProcessingVideo && (
                  <button
                    type="button"
                    onClick={handleVideoUpload}
                    disabled={isUploadingVideo}
                    className="w-full bg-purple-600 hover:bg-purple-700 text-white px-4 py-2 rounded-lg text-sm font-medium transition-all disabled:opacity-50"
                  >
                    <Upload className="w-4 h-4 inline mr-2" />
                    {isUploadingVideo ? 'Uploading...' : 'Upload Video'}
                  </button>
                )}

                {videoUploadError && (
                  <div className="p-3 bg-red-500/10 border border-red-500/20 rounded text-red-400 text-xs flex items-start gap-2">
                    <AlertCircle className="w-3 h-3 mt-0.5 flex-shrink-0" />
                    {videoUploadError}
                  </div>
                )}

                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => setVideoEditMode('current')}
                    disabled={isSaving || isDeleting || isUploadingVideo || isProcessingVideo}
                    className="flex-1 px-3 py-2 bg-gray-700 text-gray-300 rounded-lg hover:bg-gray-600 text-sm transition-all"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            )}

            {videoEditMode === 'url' && (
              <div className="space-y-3">
                <p className="text-xs text-gray-400">
                  Enter a video URL (e.g., https://...)
                </p>
                <input
                  type="url"
                  value={videoUrlInput}
                  onChange={(e) => setVideoUrlInput(e.target.value)}
                  placeholder="https://..."
                  className="w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:ring-2 focus:ring-blue-400 focus:border-transparent transition-all text-sm"
                  disabled={isSaving || isDeleting}
                />
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      if (videoUrlInput.trim()) {
                        try {
                          new URL(videoUrlInput);
                          setContentUrl(videoUrlInput);
                          setDetectedDuration(null);
                          setVideoUrlInput('');
                          setVideoEditMode('current');
                        } catch {
                          // URL validation failed - let the input show error on submit
                        }
                      }
                    }}
                    disabled={isSaving || isDeleting || !videoUrlInput.trim()}
                    className="flex-1 px-3 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 text-sm transition-all disabled:opacity-50"
                  >
                    Confirm URL
                  </button>
                  <button
                    type="button"
                    onClick={() => setVideoEditMode('current')}
                    disabled={isSaving || isDeleting}
                    className="flex-1 px-3 py-2 bg-gray-700 text-gray-300 rounded-lg hover:bg-gray-600 text-sm transition-all"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Course Price & Currency */}
          <div>
            <label className="block text-sm font-medium text-white mb-2">
              Course Price - Optional
            </label>
            <p className="text-xs text-gray-400 mb-2">Leave at 0 for free courses</p>
            <div className="flex gap-3">
              <div className="flex-1">
                <input
                  type="number"
                  min="0"
                  step="100"
                  value={coursePrice}
                  onChange={(e) => setCoursePrice(parseFloat(e.target.value) || 0)}
                  className="w-full px-4 py-3 bg-gray-800 border border-gray-700 rounded-lg text-white placeholder-gray-400 focus:ring-2 focus:ring-rose-400 focus:border-transparent transition-all"
                  placeholder="Enter course price (0 for free)"
                  disabled={isSaving || isDeleting}
                />
              </div>
              <div className="flex-shrink-0">
                <select
                  value={courseCurrency}
                  onChange={(e) => setCourseCurrency(e.target.value)}
                  className="px-4 py-3 bg-gray-800 border border-gray-700 rounded-lg text-white focus:ring-2 focus:ring-rose-400 focus:border-transparent transition-all"
                  disabled={isSaving || isDeleting}
                >
                  <option value="USD">USD</option>
                  <option value="EUR">EUR</option>
                  <option value="GBP">GBP</option>
                  <option value="UGX">UGX</option>
                  <option value="KES">KES</option>
                  <option value="CAD">CAD</option>
                  <option value="AUD">AUD</option>
                </select>
              </div>
            </div>
          </div>

          {/* Premium Checkbox */}
          <div className="flex items-center">
            <input
              type="checkbox"
              id="isPremium"
              checked={isPremium}
              onChange={(e) => setIsPremium(e.target.checked)}
              className="w-4 h-4 text-rose-400 bg-gray-800 border-gray-700 rounded focus:ring-2 focus:ring-rose-400"
              disabled={isSaving || isDeleting}
            />
            <label htmlFor="isPremium" className="ml-2 text-sm text-white">
              Mark as premium content
            </label>
          </div>

          {/* Error Message */}
          {error && (
            <div className="p-3 bg-red-500/10 border border-red-500/20 rounded-lg">
              <p className="text-red-400 text-sm">{error}</p>
            </div>
          )}

          {/* Buttons */}
          <div className="flex gap-3 pt-4">
            <button
              type="button"
              onClick={onClose}
              disabled={isSaving || isDeleting}
              className="flex-1 px-4 py-2 border border-gray-700 text-gray-300 rounded-lg hover:bg-gray-800 transition-colors disabled:opacity-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSaving || isDeleting || !title}
              className="flex-1 px-4 py-2 bg-gradient-to-r from-rose-500 to-purple-600 text-white rounded-lg hover:shadow-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isSaving ? 'Saving...' : 'Save'}
            </button>
          </div>

          {/* Delete Section - Only show for draft content or pending deletion */}
          {(status === 'draft' || isPendingDeletion) && onDelete && (
            <div className="pt-4 border-t border-gray-800">
              {!showDeleteConfirm ? (
                <button
                  type="button"
                  onClick={() => setShowDeleteConfirm(true)}
                  disabled={isSaving || isDeleting}
                  className="w-full flex items-center justify-center gap-2 px-4 py-2 text-red-400 hover:bg-red-500/10 rounded-lg transition-colors disabled:opacity-50"
                >
                  <Trash2 className="w-4 h-4" />
                  {isPendingDeletion ? 'Permanently Delete' : 'Delete Course'}
                </button>
              ) : (
                <div className="space-y-2">
                  <p className="text-sm text-gray-300">
                    {isPendingDeletion
                      ? 'This will permanently delete your course. This action cannot be undone.'
                      : 'Are you sure you want to delete this course? It will be removed from the platform.'}
                  </p>
                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={() => setShowDeleteConfirm(false)}
                      disabled={isDeleting}
                      className="flex-1 px-4 py-2 border border-gray-700 text-gray-300 rounded-lg hover:bg-gray-800 transition-colors disabled:opacity-50"
                    >
                      Cancel
                    </button>
                    <button
                      type="button"
                      onClick={onDelete}
                      disabled={isDeleting}
                      className="flex-1 px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {isDeleting ? 'Deleting...' : (isPendingDeletion ? 'Permanently Delete' : 'Delete')}
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}
        </form>
      </div>
    </div>
  );
}
