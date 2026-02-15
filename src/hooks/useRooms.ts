import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/lib/supabase/client';
import type { Database } from '@/lib/supabase/database.types';
import type { Room, RoomParticipant, Message } from '@/types';

// Demo mode check
const isDemoMode = !import.meta.env.VITE_SUPABASE_URL;

// Demo rooms for preview
const demoRooms: Room[] = [
  {
    id: 'room-1',
    name: null,
    is_group: false,
    created_by: 'demo-user-1',
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    participants: [
      {
        id: 'p1',
        room_id: 'room-1',
        user_id: 'demo-user-1',
        joined_at: new Date().toISOString(),
        is_admin: false,
        profile: {
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
        },
      },
      {
        id: 'p2',
        room_id: 'room-1',
        user_id: 'demo-user-2',
        joined_at: new Date().toISOString(),
        is_admin: false,
        profile: {
          id: 'demo-user-2',
          username: 'janedoe',
          full_name: 'Jane Smith',
          avatar_url: null,
          phone_number: null,
          status: 'Available',
          is_online: true,
          last_seen: new Date().toISOString(),
          preferred_language: 'en',
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        },
      },
    ],
    last_message: {
      id: 'msg-1',
      room_id: 'room-1',
      sender_id: 'demo-user-2',
      content: 'Hey! How are you doing?',
      message_type: 'text',
      media_url: null,
      media_duration: null,
      is_edited: false,
      edited_at: null,
      reply_to: null,
      created_at: new Date(Date.now() - 1000 * 60 * 5).toISOString(),
      updated_at: new Date(Date.now() - 1000 * 60 * 5).toISOString(),
      sender: {
        id: 'demo-user-2',
        username: 'janedoe',
        full_name: 'Jane Smith',
        avatar_url: null,
        phone_number: null,
        status: 'Available',
        is_online: true,
        last_seen: new Date().toISOString(),
        preferred_language: 'en',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      },
      read_receipts: [],
    },
    unread_count: 1,
  },
  {
    id: 'room-2',
    name: 'Design Team',
    is_group: true,
    created_by: 'demo-user-1',
    created_at: new Date().toISOString(),
    updated_at: new Date(Date.now() - 1000 * 60 * 60 * 2).toISOString(),
    participants: [
      {
        id: 'p3',
        room_id: 'room-2',
        user_id: 'demo-user-1',
        joined_at: new Date().toISOString(),
        is_admin: true,
        profile: {
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
        },
      },
    ],
    last_message: {
      id: 'msg-2',
      room_id: 'room-2',
      sender_id: 'demo-user-1',
      content: 'Great work everyone! 🎉',
      message_type: 'text',
      media_url: null,
      media_duration: null,
      is_edited: false,
      edited_at: null,
      reply_to: null,
      created_at: new Date(Date.now() - 1000 * 60 * 60 * 2).toISOString(),
      updated_at: new Date(Date.now() - 1000 * 60 * 60 * 2).toISOString(),
      sender: {
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
      },
      read_receipts: [],
    },
    unread_count: 0,
  },
];

export function useRooms(userId: string | undefined) {
  const [rooms, setRooms] = useState<Room[]>(isDemoMode ? demoRooms : []);
  const [isLoading, setIsLoading] = useState(!isDemoMode);
  const [error, setError] = useState<string | null>(null);

  // Fetch rooms for the user
  const fetchRooms = useCallback(async () => {
    if (!userId || isDemoMode) return;

    try {
      setIsLoading(true);
      setError(null);

      // Get rooms where user is a participant
      const { data: participantData, error: participantError } = await supabase
        .from('room_participants')
        .select('room_id')
        .eq('user_id', userId);

      if (participantError) throw participantError;

      if (!participantData || participantData.length === 0) {
        setRooms([]);
        return;
      }

      const roomIds = (participantData as { room_id: string }[]).map(p => p.room_id);

      // Fetch rooms with participants and last message
      const { data: roomsData, error: roomsError } = await supabase
        .from('rooms')
        .select(`
          *,
          room_participants(
            *,
            profile:profiles(*)
          ),
          messages:messages(
            *,
            sender:profiles(*),
            read_receipts:message_receipts(*)
          )
        `)
        .in('id', roomIds)
        .order('updated_at', { ascending: false });

      if (roomsError) throw roomsError;

      // Process rooms to include last message and unread count
      const processedRooms: Room[] = ((roomsData as unknown[]) || []).map((roomData: unknown) => {
        const room = roomData as Room & { room_participants: RoomParticipant[]; messages: Message[] };
        const messages = room.messages || [];
        const lastMessage = messages.length > 0
          ? messages.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())[0]
          : undefined;

        // Count unread messages
        const unreadCount = messages.filter((m) =>
          m.sender_id !== userId &&
          !m.read_receipts?.some((r) => r.user_id === userId)
        ).length;

        return {
          ...room,
          participants: room.room_participants,
          last_message: lastMessage,
          unread_count: unreadCount,
        };
      }) || [];

      setRooms(processedRooms);
    } catch (err) {
      console.error('Error fetching rooms:', err);
      setError('Failed to load chats');
    } finally {
      setIsLoading(false);
    }
  }, [userId]);

  // Subscribe to room updates
  useEffect(() => {
    if (!userId || isDemoMode) {
      setIsLoading(false);
      return;
    }

    fetchRooms();

    // Subscribe to room changes
    const subscription = supabase
      .channel('rooms_changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'rooms',
        },
        () => {
          fetchRooms();
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'messages',
        },
        () => {
          fetchRooms();
        }
      )
      .subscribe();

    return () => {
      subscription.unsubscribe();
    };
  }, [userId, fetchRooms]);

  // Create a new private chat
  const createPrivateChat = useCallback(async (otherUserId: string) => {
    if (!userId || isDemoMode) return;

    try {
      // Check if chat already exists
      const { data: existingRooms } = await supabase
        .from('room_participants')
        .select('room_id')
        .eq('user_id', userId);

      const userRoomIds = (existingRooms as { room_id: string }[])?.map(r => r.room_id) || [];

      if (userRoomIds.length > 0) {
        const { data: commonRooms } = await supabase
          .from('room_participants')
          .select('room_id')
          .eq('user_id', otherUserId)
          .in('room_id', userRoomIds);

        if (commonRooms && commonRooms.length > 0) {
          // Return existing room
          const { data: room } = await supabase
            .from('rooms')
            .select('*')
            .eq('id', (commonRooms[0] as { room_id: string }).room_id)
            .single();
          return room;
        }
      }

      // Create new room
      const { data: newRoom, error: roomError } = await supabase
        .from('rooms')
        .insert({
          is_group: false,
          created_by: userId,
        } as Database['public']['Tables']['rooms']['Insert'])
        .select()
        .single();

      if (roomError) throw roomError;

      // Add participants
      await supabase
        .from('room_participants')
        .insert([
          { room_id: (newRoom as Room).id, user_id: userId },
          { room_id: (newRoom as Room).id, user_id: otherUserId },
        ] as Database['public']['Tables']['room_participants']['Insert'][]);

      await fetchRooms();
      return newRoom;
    } catch (error) {
      console.error('Error creating private chat:', error);
      throw error;
    }
  }, [userId, fetchRooms]);

  return {
    rooms,
    isLoading,
    error,
    refetch: fetchRooms,
    createPrivateChat,
  };
}
