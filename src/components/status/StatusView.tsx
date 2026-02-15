import { useState, useRef, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import {
  X,
  Eye,
  Plus,
  Loader2,
} from 'lucide-react';
import { useStories } from '@/hooks/useStories';
import { supabase } from '@/lib/supabase/client';
import type { Profile } from '@/types';

interface StatusViewProps {
  currentUser: Profile;
  onClose: () => void;
}

export function StatusView({ currentUser, onClose }: StatusViewProps) {
  const { stories, storiesByUser, isLoading, createStory, viewStory } = useStories(currentUser.id);
  const [selectedUserIndex, setSelectedUserIndex] = useState(0);
  const [selectedStoryIndex, setSelectedStoryIndex] = useState(0);
  const [isUploading, setIsUploading] = useState(false);
  const [showViews, setShowViews] = useState(false);
  const progressRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const [progress, setProgress] = useState(0);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const userIds = Object.keys(storiesByUser);
  const currentUserStories = storiesByUser[userIds[selectedUserIndex]] || [];
  const currentStory = currentUserStories[selectedStoryIndex];

  // Auto-progress through stories
  useEffect(() => {
    if (!currentStory) return;

    setProgress(0);
    progressRef.current = setInterval(() => {
      setProgress((prev) => {
        if (prev >= 100) {
          handleNext();
          return 0;
        }
        return prev + 2;
      });
    }, 100);

    // Mark as viewed
    if (currentStory.user_id !== currentUser.id) {
      viewStory(currentStory.id);
    }

    return () => {
      if (progressRef.current) {
        clearInterval(progressRef.current);
      }
    };
  }, [currentStory, selectedUserIndex, selectedStoryIndex, currentUser.id, handleNext, viewStory]);

  const handleNext = () => {
    if (selectedStoryIndex < currentUserStories.length - 1) {
      setSelectedStoryIndex(selectedStoryIndex + 1);
    } else if (selectedUserIndex < userIds.length - 1) {
      setSelectedUserIndex(selectedUserIndex + 1);
      setSelectedStoryIndex(0);
    } else {
      onClose();
    }
  };

  const handlePrevious = () => {
    if (selectedStoryIndex > 0) {
      setSelectedStoryIndex(selectedStoryIndex - 1);
    } else if (selectedUserIndex > 0) {
      setSelectedUserIndex(selectedUserIndex - 1);
      const prevUserStories = storiesByUser[userIds[selectedUserIndex - 1]];
      setSelectedStoryIndex(prevUserStories.length - 1);
    }
  };

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsUploading(true);
    try {
      const fileName = `${currentUser.id}/${Date.now()}-${file.name}`;
      const { error } = await supabase.storage
        .from('stories')
        .upload(fileName, file);

      if (error) throw error;

      const { data: urlData } = supabase.storage
        .from('stories')
        .getPublicUrl(fileName);

      const mediaType = file.type.startsWith('video/') ? 'video' : 'image';
      await createStory(urlData.publicUrl, mediaType);
    } catch (error) {
      console.error('Error uploading story:', error);
    } finally {
      setIsUploading(false);
    }
  };

  if (isLoading) {
    return (
      <div className="fixed inset-0 bg-black z-50 flex items-center justify-center">
        <Loader2 className="w-8 h-8 text-white animate-spin" />
      </div>
    );
  }

  if (stories.length === 0) {
    return (
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 bg-black z-50 flex flex-col items-center justify-center"
      >
        <Button
          variant="ghost"
          size="icon"
          onClick={onClose}
          className="absolute top-4 right-4 text-white hover:bg-white/10"
        >
          <X className="w-6 h-6" />
        </Button>

        <div className="text-center">
          <div className="w-24 h-24 mx-auto mb-6 rounded-full bg-slate-800 flex items-center justify-center">
            <Plus className="w-10 h-10 text-slate-500" />
          </div>
          <h3 className="text-xl font-semibold text-white mb-2">No Stories Yet</h3>
          <p className="text-slate-400 mb-6">Be the first to share a story!</p>
          <input
            type="file"
            accept="image/*,video/*"
            ref={fileInputRef}
            onChange={handleUpload}
            className="hidden"
          />
          <Button
            onClick={() => fileInputRef.current?.click()}
            disabled={isUploading}
            className="bg-emerald-500 hover:bg-emerald-600 text-white"
          >
            {isUploading ? (
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
            ) : (
              <Plus className="w-4 h-4 mr-2" />
            )}
            Add Story
          </Button>
        </div>
      </motion.div>
    );
  }

  if (!currentStory) {
    onClose();
    return null;
  }

  const isOwnStory = currentStory.user_id === currentUser.id;

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 bg-black z-50"
    >
      {/* Progress Bar */}
      <div className="absolute top-0 left-0 right-0 z-10 p-4">
        <div className="flex gap-1">
          {currentUserStories.map((_, index) => (
            <div key={index} className="flex-1 h-1 bg-white/30 rounded-full overflow-hidden">
              <div
                className="h-full bg-white transition-all duration-100"
                style={{
                  width:
                    index < selectedStoryIndex
                      ? '100%'
                      : index === selectedStoryIndex
                      ? `${progress}%`
                      : '0%',
                }}
              />
            </div>
          ))}
        </div>
      </div>

      {/* Header */}
      <div className="absolute top-8 left-0 right-0 z-10 p-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Avatar className="w-10 h-10 ring-2 ring-white/30">
            <AvatarImage src={currentStory.profile?.avatar_url || undefined} />
            <AvatarFallback className="bg-slate-700 text-white">
              {currentStory.profile?.username?.[0]?.toUpperCase()}
            </AvatarFallback>
          </Avatar>
          <div>
            <p className="text-white font-medium">
              {currentStory.profile?.full_name || currentStory.profile?.username}
            </p>
            <p className="text-white/60 text-sm">
              {new Date(currentStory.created_at).toLocaleTimeString([], {
                hour: '2-digit',
                minute: '2-digit',
              })}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {isOwnStory && (
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setShowViews(true)}
              className="text-white hover:bg-white/10"
            >
              <Eye className="w-5 h-5" />
              <span className="ml-1 text-sm">{currentStory.view_count || 0}</span>
            </Button>
          )}
          <Button
            variant="ghost"
            size="icon"
            onClick={onClose}
            className="text-white hover:bg-white/10"
          >
            <X className="w-6 h-6" />
          </Button>
        </div>
      </div>

      {/* Story Content */}
      <div className="h-full flex items-center justify-center">
        {currentStory.media_type === 'video' ? (
          <video
            src={currentStory.media_url}
            autoPlay
            muted
            playsInline
            className="max-h-full max-w-full object-contain"
          />
        ) : (
          <img
            src={currentStory.media_url}
            alt="Story"
            className="max-h-full max-w-full object-contain"
          />
        )}

        {/* Navigation Areas */}
        <div
          className="absolute left-0 top-0 bottom-0 w-1/3 cursor-pointer"
          onClick={handlePrevious}
        />
        <div
          className="absolute right-0 top-0 bottom-0 w-1/3 cursor-pointer"
          onClick={handleNext}
        />
      </div>

      {/* Caption */}
      {currentStory.caption && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="absolute bottom-8 left-4 right-4 p-4 bg-black/50 backdrop-blur-sm rounded-xl"
        >
          <p className="text-white text-center">{currentStory.caption}</p>
        </motion.div>
      )}

      {/* Views Dialog */}
      {showViews && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="absolute inset-0 bg-black/90 z-20 flex flex-col"
        >
          <div className="flex items-center justify-between p-4 border-b border-white/10">
            <h3 className="text-white font-semibold flex items-center gap-2">
              <Eye className="w-5 h-5" />
              Views ({currentStory.views?.length || 0})
            </h3>
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setShowViews(false)}
              className="text-white hover:bg-white/10"
            >
              <X className="w-5 h-5" />
            </Button>
          </div>
          <div className="flex-1 overflow-auto p-4">
            {currentStory.views?.map((view) => (
              <div
                key={view.id}
                className="flex items-center gap-3 p-3 rounded-lg hover:bg-white/5"
              >
                <Avatar className="w-10 h-10">
                  <AvatarImage src={view.viewer?.avatar_url || undefined} />
                  <AvatarFallback className="bg-slate-700 text-white">
                    {view.viewer?.username?.[0]?.toUpperCase()}
                  </AvatarFallback>
                </Avatar>
                <div>
                  <p className="text-white font-medium">
                    {view.viewer?.full_name || view.viewer?.username}
                  </p>
                  <p className="text-white/50 text-sm">
                    {new Date(view.viewed_at).toLocaleTimeString()}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </motion.div>
      )}

      {/* Add Story Button (for current user) */}
      {isOwnStory && (
        <div className="absolute bottom-8 right-4">
          <input
            type="file"
            accept="image/*,video/*"
            ref={fileInputRef}
            onChange={handleUpload}
            className="hidden"
          />
          <Button
            onClick={() => fileInputRef.current?.click()}
            disabled={isUploading}
            className="bg-emerald-500 hover:bg-emerald-600 text-white rounded-full w-14 h-14"
          >
            {isUploading ? (
              <Loader2 className="w-6 h-6 animate-spin" />
            ) : (
              <Plus className="w-6 h-6" />
            )}
          </Button>
        </div>
      )}
    </motion.div>
  );
}

