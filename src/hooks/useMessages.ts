import { useState, useEffect, useCallback, useRef } from 'react';
import { supabase } from '@/lib/supabase/client';
import type { Database } from '@/lib/supabase/database.types';
import type { Message } from '@/types';
import type { RealtimePostgresInsertPayload, RealtimePostgresUpdatePayload } from '@supabase/supabase-js';

const MESSAGES_PER_PAGE = 50;

// Demo messages for preview
const demoMessages: Record<string, Message[]> = {
  'room-1': [
    {
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
    {
      id: 'msg-2',
      room_id: 'room-1',
      sender_id: 'demo-user-1',
      content: 'I\'m doing great! Just finished the new project. 🎉',
      message_type: 'text',
      media_url: null,
      media_duration: null,
      is_edited: false,
      edited_at: null,
      reply_to: null,
      created_at: new Date(Date.now() - 1000 * 60 * 3).toISOString(),
      updated_at: new Date(Date.now() - 1000 * 60 * 3).toISOString(),
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
      read_receipts: [{ id: 'r1', message_id: 'msg-2', user_id: 'demo-user-2', read_at: new Date().toISOString() }],
    },
    {
      id: 'msg-3',
      room_id: 'room-1',
      sender_id: 'demo-user-2',
      content: 'That\'s awesome! Can you share some details?',
      message_type: 'text',
      media_url: null,
      media_duration: null,
      is_edited: false,
      edited_at: null,
      reply_to: null,
      created_at: new Date(Date.now() - 1000 * 60 * 2).toISOString(),
      updated_at: new Date(Date.now() - 1000 * 60 * 2).toISOString(),
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
    {
      id: 'msg-4',
      room_id: 'room-1',
      sender_id: 'demo-user-1',
      content: 'Sure! It\'s an AI-powered chat app with real-time messaging, voice notes, and smart summaries. Check out this screenshot!',
      message_type: 'text',
      media_url: null,
      media_duration: null,
      is_edited: false,
      edited_at: null,
      reply_to: null,
      created_at: new Date(Date.now() - 1000 * 60).toISOString(),
      updated_at: new Date(Date.now() - 1000 * 60).toISOString(),
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
      read_receipts: [{ id: 'r2', message_id: 'msg-4', user_id: 'demo-user-2', read_at: new Date().toISOString() }],
    },
    {
      id: 'msg-5',
      room_id: 'room-1',
      sender_id: 'demo-user-2',
      content: 'Wow, that looks amazing! The dark theme is so sleek 🔥',
      message_type: 'text',
      media_url: null,
      media_duration: null,
      is_edited: false,
      edited_at: null,
      reply_to: null,
      created_at: new Date(Date.now() - 1000 * 30).toISOString(),
      updated_at: new Date(Date.now() - 1000 * 30).toISOString(),
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
  ],
};

export function useMessages(roomId: string | undefined, userId: string | undefined) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [hasMore, setHasMore] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Demo mode check
  const isDemoMode = !import.meta.env.VITE_SUPABASE_URL;

  // Fetch messages for the room
  const fetchMessages = useCallback(async (before?: string) => {
    if (!roomId) return;

    // Demo mode - return mock data
    if (isDemoMode) {
      setIsLoading(false);
      setMessages(demoMessages[roomId] || []);
      setHasMore(false);
      return;
    }

    try {
      setIsLoading(true);
      setError(null);

      let query = supabase
        .from('messages')
        .select(`
          *,
          sender:profiles(*),
          read_receipts:message_receipts(*, profile:profiles(*)),
          reply_to_message:messages(*, sender:profiles(*))
        `)
        .eq('room_id', roomId)
        .order('created_at', { ascending: false })
        .limit(MESSAGES_PER_PAGE);

      if (before) {
        query = query.lt('created_at', before);
      }

      const { data, error } = await query;

      if (error) throw error;

      const fetchedMessages = ((data as Message[]) || []).reverse();

      if (before) {
        setMessages(prev => [...fetchedMessages, ...prev]);
      } else {
        setMessages(fetchedMessages);
      }

      setHasMore(fetchedMessages.length === MESSAGES_PER_PAGE);
    } catch (err) {
      console.error('Error fetching messages:', err);
      setError('Failed to load messages');
    } finally {
      setIsLoading(false);
    }
  }, [roomId, isDemoMode]);

  // Load more messages (pagination)
  const loadMore = useCallback(async () => {
    if (!messages.length || isLoading || isDemoMode) return;
    const oldestMessage = messages[0];
    await fetchMessages(oldestMessage.created_at);
  }, [messages, isLoading, isDemoMode, fetchMessages]);

  // Send a message (with optimistic update)
  const sendMessage = useCallback(async (
    content: string,
    messageType: string = 'text',
    mediaUrl?: string,
    mediaDuration?: number,
    replyTo?: string
  ) => {
    if (!roomId || !userId) return;

    // Demo mode - just add to local state
    if (isDemoMode) {
      const newMessage: Message = {
        id: `demo-${Date.now()}`,
        room_id: roomId,
        sender_id: userId,
        content,
        message_type: messageType as Message['message_type'],
        media_url: mediaUrl || null,
        media_duration: mediaDuration || null,
        is_edited: false,
        edited_at: null,
        reply_to: replyTo || null,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
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
      };
      setMessages(prev => [...prev, newMessage]);
      return;
    }

    // Create optimistic message
    const optimisticMessage: Message = {
      id: `temp-${Date.now()}`,
      room_id: roomId,
      sender_id: userId,
      content,
      message_type: messageType as Message['message_type'],
      media_url: mediaUrl || null,
      media_duration: mediaDuration || null,
      is_edited: false,
      edited_at: null,
      reply_to: replyTo || null,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      sender: undefined,
      read_receipts: [],
    };

    // Optimistic update
    setMessages(prev => [...prev, optimisticMessage]);

    try {
      const { data, error } = await supabase
        .from('messages')
        .insert({
          room_id: roomId,
          sender_id: userId,
          content,
          message_type: messageType,
          media_url: mediaUrl,
          media_duration: mediaDuration,
          reply_to: replyTo,
        })
        .select(`
          *,
          sender:profiles(*),
          read_receipts:message_receipts(*)
        `)
        .single();

      if (error) throw error;

      // Replace optimistic message with real one
      setMessages(prev =>
        prev.map(m => m.id === optimisticMessage.id ? (data as Message) : m)
      );

      return data;
    } catch (error) {
      // Remove optimistic message on error
      setMessages(prev => prev.filter(m => m.id !== optimisticMessage.id));
      console.error('Error sending message:', error);
      throw error;
    }
  }, [roomId, userId, isDemoMode]);

  // Mark messages as read
  const markAsRead = useCallback(async (messageIds: string[]) => {
    if (!userId || messageIds.length === 0 || isDemoMode) return;

    try {
      const receipts = messageIds.map(messageId => ({
        message_id: messageId,
        user_id: userId,
      }));

      await supabase
        .from('message_receipts')
        .upsert(receipts as Database['public']['Tables']['message_receipts']['Insert'][], { onConflict: 'message_id,user_id' });
    } catch (error) {
      console.error('Error marking messages as read:', error);
    }
  }, [userId, isDemoMode]);

  // Subscribe to new messages
  useEffect(() => {
    if (!roomId || isDemoMode) {
      if (roomId) {
        setMessages(demoMessages[roomId] || []);
        setIsLoading(false);
      }
      return;
    }

    fetchMessages();

    const subscription = supabase
      .channel(`messages:${roomId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'messages',
          filter: `room_id=eq.${roomId}`,
        },
        async (payload: RealtimePostgresInsertPayload<Message>) => {
          const newMessage = payload.new as Message;

          // Fetch full message with sender info
          const { data } = await supabase
            .from('messages')
            .select(`
              *,
              sender:profiles(*),
              read_receipts:message_receipts(*)
            `)
            .eq('id', newMessage.id)
            .single();

          if (data) {
            setMessages(prev => {
              // Avoid duplicates
              if (prev.some(m => m.id === (data as Message).id)) return prev;
              return [...prev, data as Message];
            });

            // Mark as read if not from current user
            if ((data as Message).sender_id !== userId) {
              await markAsRead([(data as Message).id]);
            }
          }
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'messages',
          filter: `room_id=eq.${roomId}`,
        },
        (payload: RealtimePostgresUpdatePayload<Message>) => {
          const updatedMessage = payload.new as Message;
          setMessages(prev =>
            prev.map(m => m.id === updatedMessage.id ? { ...m, ...updatedMessage } : m)
          );
        }
      )
      .subscribe();

    return () => {
      subscription.unsubscribe();
    };
  }, [roomId, userId, fetchMessages, markAsRead, isDemoMode]);

  // Mark unread messages as read when entering room
  useEffect(() => {
    if (!messages.length || !userId || isDemoMode) return;

    const unreadMessages = messages.filter(
      m => m.sender_id !== userId && !m.read_receipts?.some(r => r.user_id === userId)
    );

    if (unreadMessages.length > 0) {
      markAsRead(unreadMessages.map(m => m.id));
    }
  }, [messages, userId, markAsRead, isDemoMode]);

  // Scroll to bottom
  const scrollToBottom = useCallback(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, []);

  return {
    messages,
    isLoading,
    hasMore,
    error,
    messagesEndRef,
    sendMessage,
    loadMore,
    scrollToBottom,
    refetch: () => fetchMessages(),
  };
}
