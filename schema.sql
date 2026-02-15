-- Stunner App - WhatsApp Clone with AI Features
-- Supabase Database Schema
-- Enable required extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================
-- PROFILES TABLE (extends auth.users)
-- ============================================
CREATE TABLE profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  username TEXT UNIQUE NOT NULL,
  full_name TEXT,
  avatar_url TEXT,
  phone_number TEXT UNIQUE,
  status TEXT DEFAULT 'Hey there! I am using Stunner.',
  is_online BOOLEAN DEFAULT false,
  last_seen TIMESTAMPTZ DEFAULT NOW(),
  preferred_language TEXT DEFAULT 'en',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS on profiles
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

-- Profiles RLS Policies
CREATE POLICY "Users can view all profiles"
  ON profiles FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Users can update own profile"
  ON profiles FOR UPDATE
  TO authenticated
  USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);

CREATE POLICY "Users can insert own profile"
  ON profiles FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = id);

-- ============================================
-- ROOMS TABLE (chat rooms/conversations)
-- ============================================
CREATE TABLE rooms (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT,
  is_group BOOLEAN DEFAULT false,
  created_by UUID REFERENCES profiles(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS on rooms
ALTER TABLE rooms ENABLE ROW LEVEL SECURITY;

-- Rooms RLS Policies
CREATE POLICY "Users can view rooms they are part of"
  ON rooms FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM room_participants
      WHERE room_id = rooms.id AND user_id = auth.uid()
    )
  );

CREATE POLICY "Users can create rooms"
  ON rooms FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = created_by);

-- ============================================
-- ROOM PARTICIPANTS TABLE
-- ============================================
CREATE TABLE room_participants (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  room_id UUID REFERENCES rooms(id) ON DELETE CASCADE,
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  joined_at TIMESTAMPTZ DEFAULT NOW(),
  is_admin BOOLEAN DEFAULT false,
  UNIQUE(room_id, user_id)
);

-- Enable RLS on room_participants
ALTER TABLE room_participants ENABLE ROW LEVEL SECURITY;

-- Room Participants RLS Policies
CREATE POLICY "Users can view participants of their rooms"
  ON room_participants FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM room_participants rp
      WHERE rp.room_id = room_participants.room_id AND rp.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can join rooms they are invited to"
  ON room_participants FOR INSERT
  TO authenticated
  WITH CHECK (
    user_id = auth.uid() OR
    EXISTS (
      SELECT 1 FROM rooms WHERE id = room_id AND created_by = auth.uid()
    )
  );

-- ============================================
-- MESSAGES TABLE
-- ============================================
CREATE TABLE messages (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  room_id UUID REFERENCES rooms(id) ON DELETE CASCADE,
  sender_id UUID REFERENCES profiles(id) ON DELETE SET NULL,
  content TEXT,
  message_type TEXT DEFAULT 'text' CHECK (message_type IN ('text', 'image', 'voice', 'video', 'file')),
  media_url TEXT,
  media_duration INTEGER, -- for voice notes (seconds)
  is_edited BOOLEAN DEFAULT false,
  edited_at TIMESTAMPTZ,
  reply_to UUID REFERENCES messages(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS on messages
ALTER TABLE messages ENABLE ROW LEVEL SECURITY;

-- Messages RLS Policies
CREATE POLICY "Users can view messages from their rooms"
  ON messages FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM room_participants
      WHERE room_id = messages.room_id AND user_id = auth.uid()
    )
  );

CREATE POLICY "Users can send messages to their rooms"
  ON messages FOR INSERT
  TO authenticated
  WITH CHECK (
    sender_id = auth.uid() AND
    EXISTS (
      SELECT 1 FROM room_participants
      WHERE room_id = messages.room_id AND user_id = auth.uid()
    )
  );

CREATE POLICY "Users can edit their own messages"
  ON messages FOR UPDATE
  TO authenticated
  USING (sender_id = auth.uid())
  WITH CHECK (sender_id = auth.uid());

CREATE POLICY "Users can delete their own messages"
  ON messages FOR DELETE
  TO authenticated
  USING (sender_id = auth.uid());

-- ============================================
-- MESSAGE READ RECEIPTS TABLE
-- ============================================
CREATE TABLE message_receipts (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  message_id UUID REFERENCES messages(id) ON DELETE CASCADE,
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  read_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(message_id, user_id)
);

-- Enable RLS on message_receipts
ALTER TABLE message_receipts ENABLE ROW LEVEL SECURITY;

-- Message Receipts RLS Policies
CREATE POLICY "Users can view receipts for their messages"
  ON message_receipts FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM messages
      WHERE id = message_receipts.message_id AND sender_id = auth.uid()
    ) OR
    user_id = auth.uid()
  );

CREATE POLICY "Users can mark messages as read"
  ON message_receipts FOR INSERT
  TO authenticated
  WITH CHECK (
    user_id = auth.uid() AND
    EXISTS (
      SELECT 1 FROM room_participants rp
      JOIN messages m ON m.room_id = rp.room_id
      WHERE m.id = message_receipts.message_id AND rp.user_id = auth.uid()
    )
  );

-- ============================================
-- STORIES/SHORTS TABLE (24h disappearing content)
-- ============================================
CREATE TABLE stories (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  media_url TEXT NOT NULL,
  media_type TEXT DEFAULT 'image' CHECK (media_type IN ('image', 'video')),
  caption TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  expires_at TIMESTAMPTZ DEFAULT (NOW() + INTERVAL '24 hours')
);

-- Enable RLS on stories
ALTER TABLE stories ENABLE ROW LEVEL SECURITY;

-- Stories RLS Policies
CREATE POLICY "Users can view stories from contacts"
  ON stories FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM room_participants rp1
      JOIN room_participants rp2 ON rp1.room_id = rp2.room_id
      WHERE rp1.user_id = auth.uid() AND rp2.user_id = stories.user_id
    ) OR user_id = auth.uid()
  );

CREATE POLICY "Users can create their own stories"
  ON stories FOR INSERT
  TO authenticated
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can delete their own stories"
  ON stories FOR DELETE
  TO authenticated
  USING (user_id = auth.uid());

-- ============================================
-- STORY VIEWS TABLE
-- ============================================
CREATE TABLE story_views (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  story_id UUID REFERENCES stories(id) ON DELETE CASCADE,
  viewer_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  viewed_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(story_id, viewer_id)
);

-- Enable RLS on story_views
ALTER TABLE story_views ENABLE ROW LEVEL SECURITY;

-- Story Views RLS Policies
CREATE POLICY "Users can view story views for their stories"
  ON story_views FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM stories WHERE id = story_views.story_id AND user_id = auth.uid()
    ) OR viewer_id = auth.uid()
  );

CREATE POLICY "Users can mark stories as viewed"
  ON story_views FOR INSERT
  TO authenticated
  WITH CHECK (viewer_id = auth.uid());

-- ============================================
-- AI MESSAGE TRANSLATIONS TABLE
-- ============================================
CREATE TABLE message_translations (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  message_id UUID REFERENCES messages(id) ON DELETE CASCADE,
  language_code TEXT NOT NULL,
  translated_content TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(message_id, language_code)
);

-- Enable RLS on message_translations
ALTER TABLE message_translations ENABLE ROW LEVEL SECURITY;

-- Message Translations RLS Policies
CREATE POLICY "Users can view translations for their messages"
  ON message_translations FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM room_participants rp
      JOIN messages m ON m.room_id = rp.room_id
      WHERE m.id = message_translations.message_id AND rp.user_id = auth.uid()
    )
  );

-- ============================================
-- VOICE TRANSCRIPTIONS TABLE
-- ============================================
CREATE TABLE voice_transcriptions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  message_id UUID REFERENCES messages(id) ON DELETE CASCADE,
  transcription TEXT NOT NULL,
  language_code TEXT DEFAULT 'en',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS on voice_transcriptions
ALTER TABLE voice_transcriptions ENABLE ROW LEVEL SECURITY;

-- Voice Transcriptions RLS Policies
CREATE POLICY "Users can view transcriptions for their messages"
  ON voice_transcriptions FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM room_participants rp
      JOIN messages m ON m.room_id = rp.room_id
      WHERE m.id = voice_transcriptions.message_id AND rp.user_id = auth.uid()
    )
  );

-- ============================================
-- FUNCTIONS AND TRIGGERS
-- ============================================

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Triggers for updated_at
CREATE TRIGGER update_profiles_updated_at
  BEFORE UPDATE ON profiles
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_rooms_updated_at
  BEFORE UPDATE ON rooms
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_messages_updated_at
  BEFORE UPDATE ON messages
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Function to update room's updated_at when new message is added
CREATE OR REPLACE FUNCTION update_room_on_new_message()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE rooms SET updated_at = NOW() WHERE id = NEW.room_id;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_room_timestamp_on_message
  AFTER INSERT ON messages
  FOR EACH ROW EXECUTE FUNCTION update_room_on_new_message();

-- Function to clean up expired stories (can be called by a cron job)
CREATE OR REPLACE FUNCTION cleanup_expired_stories()
RETURNS void AS $$
BEGIN
  DELETE FROM stories WHERE expires_at < NOW();
END;
$$ LANGUAGE plpgsql;

-- ============================================
-- REALTIME SUBSCRIPTIONS
-- ============================================
-- Enable realtime for messages
ALTER PUBLICATION supabase_realtime ADD TABLE messages;
ALTER PUBLICATION supabase_realtime ADD TABLE message_receipts;
ALTER PUBLICATION supabase_realtime ADD TABLE profiles;
ALTER PUBLICATION supabase_realtime ADD TABLE stories;
ALTER PUBLICATION supabase_realtime ADD TABLE story_views;

-- ============================================
-- INDEXES FOR PERFORMANCE
-- ============================================
CREATE INDEX idx_messages_room_id ON messages(room_id);
CREATE INDEX idx_messages_sender_id ON messages(sender_id);
CREATE INDEX idx_messages_created_at ON messages(created_at);
CREATE INDEX idx_room_participants_room_id ON room_participants(room_id);
CREATE INDEX idx_room_participants_user_id ON room_participants(user_id);
CREATE INDEX idx_message_receipts_message_id ON message_receipts(message_id);
CREATE INDEX idx_stories_user_id ON stories(user_id);
CREATE INDEX idx_stories_expires_at ON stories(expires_at);
CREATE INDEX idx_story_views_story_id ON story_views(story_id);

-- ============================================
-- STORAGE BUCKETS
-- ============================================
-- Create storage buckets for media
INSERT INTO storage.buckets (id, name, public) VALUES
  ('chat-media', 'chat-media', false),
  ('voice-notes', 'voice-notes', false),
  ('stories', 'stories', false),
  ('avatars', 'avatars', true);

-- Storage RLS Policies
CREATE POLICY "Users can upload chat media to their rooms"
  ON storage.objects FOR INSERT
  TO authenticated
  WITH CHECK (
    bucket_id = 'chat-media' AND
    (storage.foldername(name))[1] IN (
      SELECT room_id::text FROM room_participants WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Users can view chat media from their rooms"
  ON storage.objects FOR SELECT
  TO authenticated
  USING (
    bucket_id = 'chat-media' AND
    (storage.foldername(name))[1] IN (
      SELECT room_id::text FROM room_participants WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Users can upload voice notes to their rooms"
  ON storage.objects FOR INSERT
  TO authenticated
  WITH CHECK (
    bucket_id = 'voice-notes' AND
    (storage.foldername(name))[1] IN (
      SELECT room_id::text FROM room_participants WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Users can view voice notes from their rooms"
  ON storage.objects FOR SELECT
  TO authenticated
  USING (
    bucket_id = 'voice-notes' AND
    (storage.foldername(name))[1] IN (
      SELECT room_id::text FROM room_participants WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Users can upload their own stories"
  ON storage.objects FOR INSERT
  TO authenticated
  WITH CHECK (
    bucket_id = 'stories' AND
    (storage.foldername(name))[1] = auth.uid()::text
  );

CREATE POLICY "Users can view stories from contacts"
  ON storage.objects FOR SELECT
  TO authenticated
  USING (
    bucket_id = 'stories' AND
    (storage.foldername(name))[1] IN (
      SELECT user_id::text FROM room_participants rp
      JOIN room_participants rp2 ON rp.room_id = rp2.room_id
      WHERE rp2.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can upload their own avatar"
  ON storage.objects FOR INSERT
  TO authenticated
  WITH CHECK (
    bucket_id = 'avatars' AND
    (storage.foldername(name))[1] = auth.uid()::text
  );

CREATE POLICY "Anyone can view avatars"
  ON storage.objects FOR SELECT
  TO authenticated
  USING (bucket_id = 'avatars');
