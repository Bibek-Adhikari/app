import { useState, useEffect, useCallback } from 'react';
import { supabase, getCurrentUser, getProfile, isDemoMode } from '@/lib/supabase/client';
import type { Profile, UserSettings } from '@/types';
import type { User, AuthChangeEvent, Session } from '@supabase/supabase-js';
import type { Database } from '@/lib/supabase/database.types';

export function useAuth() {
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [isLoading, setIsLoading] = useState(!isDemoMode);
  const [settings, setSettings] = useState<UserSettings>({
    enableAITranslation: false,
    preferredLanguage: 'en',
    enableNotifications: true,
    darkMode: true,
  });

  // Load user and profile on mount
  useEffect(() => {
    if (isDemoMode) {
      setUser({ id: 'demo-user-1', email: 'demo@example.com' } as User);
      setProfile({
        id: 'demo-user-1',
        username: 'johndoe',
        full_name: 'John Doe',
        avatar_url: null,
        phone_number: '+1234567890',
        status: 'Hey there! I am using Stunner.',
        is_online: true,
        last_seen: new Date().toISOString(),
        preferred_language: 'en',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      });
      setIsLoading(false);
      return;
    }

    const loadUser = async () => {
      try {
        const currentUser = await getCurrentUser();
        setUser(currentUser);

        if (currentUser) {
          const userProfile = await getProfile(currentUser.id);
          setProfile(userProfile);
          setSettings(prev => ({
            ...prev,
            preferredLanguage: userProfile.preferred_language || 'en',
          }));

          // Update online status
          await supabase
            .from('profiles')
            .update({ is_online: true } as Database['public']['Tables']['profiles']['Update'])
            .eq('id', currentUser.id);
        }
      } catch (error) {
        console.error('Error loading user:', error);
      } finally {
        setIsLoading(false);
      }
    };

    loadUser();

    // Subscribe to auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (_event: AuthChangeEvent, session: Session | null) => {
      if (session?.user) {
        setUser(session.user);
        try {
          const userProfile = await getProfile(session.user.id);
          setProfile(userProfile);
          await supabase
            .from('profiles')
            .update({ is_online: true } as Database['public']['Tables']['profiles']['Update'])
            .eq('id', session.user.id);
        } catch (error) {
          console.error('Error loading profile:', error);
        }
      } else {
        if (user) {
          await supabase
            .from('profiles')
            .update({ is_online: false } as Database['public']['Tables']['profiles']['Update'])
            .eq('id', user.id);
        }
        setUser(null);
        setProfile(null);
      }
      setIsLoading(false);
    });

    // Handle window unload to update offline status
    const handleBeforeUnload = () => {
      if (user) {
        supabase
          .from('profiles')
          .update({ is_online: false } as Database['public']['Tables']['profiles']['Update'])
          .eq('id', user.id);
      }
    };

    window.addEventListener('beforeunload', handleBeforeUnload);

    return () => {
      subscription.unsubscribe();
      window.removeEventListener('beforeunload', handleBeforeUnload);
    };
  }, []);

  // Update settings
  const updateSettings = useCallback((newSettings: Partial<UserSettings>) => {
    setSettings(prev => ({ ...prev, ...newSettings }));
  }, []);

  // Update profile
  const updateUserProfile = useCallback(async (updates: Partial<Profile>) => {
    if (!user || isDemoMode) return;

    try {
      const { data, error } = await supabase
        .from('profiles')
        .update(updates as Database['public']['Tables']['profiles']['Update'])
        .eq('id', user.id)
        .select()
        .single();

      if (error) throw error;
      setProfile(data as Profile);
      return data;
    } catch (error) {
      console.error('Error updating profile:', error);
      throw error;
    }
  }, [user]);

  return {
    user,
    profile,
    isLoading,
    isAuthenticated: !!user,
    settings,
    updateSettings,
    updateUserProfile,
  };
}
