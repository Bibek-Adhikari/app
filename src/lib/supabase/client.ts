import { createClient } from '@supabase/supabase-js';
import type { Database } from './database.types';
import type { Profile } from '@/types';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || '';
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || '';

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true,
  },
  realtime: {
    params: {
      eventsPerSecond: 10,
    },
  },
});

// Auth helpers
export const signUp = async (email: string, password: string, username: string, fullName: string) => {
  const { data: authData, error: authError } = await supabase.auth.signUp({
    email,
    password,
    options: {
      data: {
        username,
        full_name: fullName,
      },
    },
  });

  if (authError) throw authError;

  // Create profile
  if (authData.user) {
    const { error: profileError } = await supabase
      .from('profiles')
      .insert({
        id: authData.user.id,
        username,
        full_name: fullName,
      } as Database['public']['Tables']['profiles']['Insert']);

    if (profileError) throw profileError;
  }

  return authData;
};

export const signIn = async (email: string, password: string) => {
  const { data, error } = await supabase.auth.signInWithPassword({
    email,
    password,
  });

  if (error) throw error;
  return data;
};

export const signOut = async () => {
  const { error } = await supabase.auth.signOut();
  if (error) throw error;
};

export const getCurrentUser = async () => {
  const { data: { user }, error } = await supabase.auth.getUser();
  if (error) throw error;
  return user;
};

export const getProfile = async (userId: string): Promise<Profile> => {
  const { data, error } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', userId)
    .single();

  if (error) throw error;
  return data as Profile;
};

export const updateProfile = async (userId: string, updates: Partial<Profile>) => {
  const { data, error } = await supabase
    .from('profiles')
    .update(updates as Database['public']['Tables']['profiles']['Update'])
    .eq('id', userId)
    .select()
    .single();

  if (error) throw error;
  return data;
};

// Presence helpers
export const updateOnlineStatus = async (userId: string, isOnline: boolean) => {
  const { error } = await supabase
    .from('profiles')
    .update({
      is_online: isOnline,
      last_seen: new Date().toISOString(),
    } as Database['public']['Tables']['profiles']['Update'])
    .eq('id', userId);

  if (error) console.error('Error updating online status:', error);
};
