import { createClient } from '@supabase/supabase-js';
import type { Database } from './database.types';
import type { Profile } from '@/types';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || '';
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || '';

// Check if manually forced into demo mode via local storage
const forcedDemo = typeof window !== 'undefined' && localStorage.getItem('stunner_demo_mode') === 'true';

export const isDemoMode = forcedDemo || !supabaseUrl || !supabaseAnonKey;

export const toggleDemoMode = () => {
  if (typeof window !== 'undefined') {
    const currentState = localStorage.getItem('stunner_demo_mode') === 'true';
    localStorage.setItem('stunner_demo_mode', (!currentState).toString());
    window.location.reload();
  }
};

// Initialize Supabase only if credentials are provided
export const supabase: any = !isDemoMode
  ? createClient<Database>(supabaseUrl, supabaseAnonKey, {
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
    })
  : ({
      from: () => ({
        select: () => ({ eq: () => ({ single: () => Promise.resolve({ data: null, error: null }), order: () => ({ limit: () => Promise.resolve({ data: [], error: null }) }) }) }),
        insert: () => Promise.resolve({ data: null, error: null }),
        update: () => ({ eq: () => ({ select: () => ({ single: () => Promise.resolve({ data: null, error: null }) }) }) }),
        delete: () => ({ eq: () => Promise.resolve({ data: null, error: null }) }),
        upsert: () => Promise.resolve({ data: null, error: null }),
      }),
      auth: {
        signUp: () => Promise.resolve({ data: { user: null }, error: null }),
        signInWithPassword: () => Promise.resolve({ data: { user: null }, error: null }),
        signOut: () => Promise.resolve({ error: null }),
        getUser: () => Promise.resolve({ data: { user: null }, error: null }),
        onAuthStateChange: () => ({ data: { subscription: { unsubscribe: () => {} } } }),
      },
      channel: () => ({ on: () => ({ subscribe: () => ({ unsubscribe: () => {} }) }) }),
    } as any);

// Dummy profile for Demo Mode
export const demoProfile: Profile = {
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
};

// Auth helpers
export const signUp = async (email: string, password: string, username: string, fullName: string) => {
  if (isDemoMode) {
    console.log('Demo Mode: Simulating sign up for', email);
    return { data: { user: { id: 'demo-user-1', email } }, error: null };
  }

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
  if (isDemoMode) {
    console.log('Demo Mode: Simulating sign in for', email);
    return { data: { user: { id: 'demo-user-1', email }, session: {} }, error: null };
  }

  const { data, error } = await supabase.auth.signInWithPassword({
    email,
    password,
  });

  if (error) throw error;
  return data;
};

export const signOut = async () => {
  if (isDemoMode) return;
  const { error } = await supabase.auth.signOut();
  if (error) throw error;
};

export const getCurrentUser = async () => {
  if (isDemoMode) {
    return { id: 'demo-user-1', email: 'demo@example.com' } as any;
  }
  const { data: { user }, error } = await supabase.auth.getUser();
  if (error) throw error;
  return user;
};

export const getProfile = async (userId: string): Promise<Profile> => {
  if (isDemoMode) {
    return demoProfile;
  }

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
