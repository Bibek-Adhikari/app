import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/lib/supabase/client';
import type { Story } from '@/types';
import type { Database } from '@/lib/supabase/database.types';

// Demo mode check
const isDemoMode = !import.meta.env.VITE_SUPABASE_URL;

export function useStories(userId: string | undefined) {
  const [stories, setStories] = useState<Story[]>([]);
  const [isLoading, setIsLoading] = useState(!isDemoMode);
  const [error, setError] = useState<string | null>(null);

  // Fetch stories from contacts
  const fetchStories = useCallback(async () => {
    if (!userId || isDemoMode) {
      setIsLoading(false);
      return;
    }

    try {
      setIsLoading(true);
      setError(null);

      // Get stories that haven't expired
      const { data, error } = await supabase
        .from('stories')
        .select(`
          *,
          profile:profiles(*),
          views:story_views(*, viewer:profiles(*))
        `)
        .gt('expires_at', new Date().toISOString())
        .order('created_at', { ascending: false });

      if (error) throw error;

      // Process stories to add view count and has_viewed flag
      const processedStories: Story[] = ((data as unknown[]) || []).map((story) => {
        const s = story as Record<string, unknown> & { views?: { viewer_id: string }[] };
        return {
          ...s,
          view_count: s.views?.length || 0,
          has_viewed: s.views?.some((v) => v.viewer_id === userId) || false,
        } as unknown as Story;
      });

      setStories(processedStories);
    } catch (err) {
      console.error('Error fetching stories:', err);
      setError('Failed to load stories');
    } finally {
      setIsLoading(false);
    }
  }, [userId]);

  // Create a new story
  const createStory = useCallback(async (mediaUrl: string, mediaType: 'image' | 'video', caption?: string) => {
    if (!userId || isDemoMode) return;

    try {
      const { data, error } = await supabase
        .from('stories')
        .insert({
          user_id: userId,
          media_url: mediaUrl,
          media_type: mediaType,
          caption: caption || null,
        } as Database['public']['Tables']['stories']['Insert'])
        .select()
        .single();

      if (error) throw error;

      await fetchStories();
      return data;
    } catch (error) {
      console.error('Error creating story:', error);
      throw error;
    }
  }, [userId, fetchStories]);

  // View a story
  const viewStory = useCallback(async (storyId: string) => {
    if (!userId || isDemoMode) return;

    try {
      const { error } = await supabase
        .from('story_views')
        .insert({
          story_id: storyId,
          viewer_id: userId,
        } as Database['public']['Tables']['story_views']['Insert']);

      if (error && !error.message.includes('duplicate')) throw error;

      // Update local state
      setStories(prev =>
        prev.map(s =>
          s.id === storyId
            ? { ...s, has_viewed: true, view_count: (s.view_count || 0) + 1 }
            : s
        )
      );
    } catch (error) {
      console.error('Error viewing story:', error);
    }
  }, [userId]);

  // Delete own story
  const deleteStory = useCallback(async (storyId: string) => {
    if (!userId || isDemoMode) return;

    try {
      const { error } = await supabase
        .from('stories')
        .delete()
        .eq('id', storyId)
        .eq('user_id', userId);

      if (error) throw error;

      setStories(prev => prev.filter(s => s.id !== storyId));
    } catch (error) {
      console.error('Error deleting story:', error);
      throw error;
    }
  }, [userId]);

  // Subscribe to story updates
  useEffect(() => {
    if (!userId || isDemoMode) {
      setIsLoading(false);
      return;
    }

    fetchStories();

    const subscription = supabase
      .channel('stories_changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'stories',
        },
        () => {
          fetchStories();
        }
      )
      .subscribe();

    return () => {
      subscription.unsubscribe();
    };
  }, [userId, fetchStories]);

  // Group stories by user
  const storiesByUser = stories.reduce((acc, story) => {
    const userId = story.user_id;
    if (!acc[userId]) {
      acc[userId] = [];
    }
    acc[userId].push(story);
    return acc;
  }, {} as Record<string, Story[]>);

  return {
    stories,
    storiesByUser,
    isLoading,
    error,
    refetch: fetchStories,
    createStory,
    viewStory,
    deleteStory,
  };
}
