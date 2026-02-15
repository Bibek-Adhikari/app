// ============================================
// STUNNER APP - TYPE DEFINITIONS
// ============================================

export interface Profile {
  id: string;
  username: string;
  full_name: string | null;
  avatar_url: string | null;
  phone_number: string | null;
  status: string | null;
  is_online: boolean;
  last_seen: string;
  preferred_language: string;
  created_at: string;
  updated_at: string;
}

export interface Room {
  id: string;
  name: string | null;
  is_group: boolean;
  created_by: string | null;
  created_at: string;
  updated_at: string;
  participants?: RoomParticipant[];
  last_message?: Message;
  unread_count?: number;
}

export interface RoomParticipant {
  id: string;
  room_id: string;
  user_id: string;
  joined_at: string;
  is_admin: boolean;
  profile?: Profile;
}

export type MessageType = 'text' | 'image' | 'voice' | 'video' | 'file';

export interface Message {
  id: string;
  room_id: string;
  sender_id: string;
  content: string | null;
  message_type: MessageType;
  media_url: string | null;
  media_duration: number | null;
  is_edited: boolean;
  edited_at: string | null;
  reply_to: string | null;
  created_at: string;
  updated_at: string;
  sender?: Profile;
  reply_to_message?: Message;
  read_receipts?: MessageReceipt[];
  isRead?: boolean;
  translation?: MessageTranslation;
  transcription?: VoiceTranscription;
}

export interface MessageReceipt {
  id: string;
  message_id: string;
  user_id: string;
  read_at: string;
  profile?: Profile;
}

export interface Story {
  id: string;
  user_id: string;
  media_url: string;
  media_type: 'image' | 'video';
  caption: string | null;
  created_at: string;
  expires_at: string;
  profile?: Profile;
  views?: StoryView[];
  view_count?: number;
  has_viewed?: boolean;
}

export interface StoryView {
  id: string;
  story_id: string;
  viewer_id: string;
  viewed_at: string;
  viewer?: Profile;
}

export interface MessageTranslation {
  id: string;
  message_id: string;
  language_code: string;
  translated_content: string;
  created_at: string;
}

export interface VoiceTranscription {
  id: string;
  message_id: string;
  transcription: string;
  language_code: string;
  created_at: string;
}

export interface ChatSummary {
  summary: string[];
  generated_at: string;
}

export interface TypingIndicator {
  room_id: string;
  user_id: string;
  is_typing: boolean;
  timestamp: number;
}

export interface CallData {
  room_id: string;
  caller_id: string;
  receiver_id: string;
  call_type: 'audio' | 'video';
  status: 'ringing' | 'connected' | 'ended' | 'declined';
  started_at?: string;
  ended_at?: string;
}

// AI-related types
export interface AISummaryRequest {
  messages: Message[];
  language?: string;
}

export interface AITranslationRequest {
  text: string;
  targetLanguage: string;
  sourceLanguage?: string;
}

export interface AITranscriptionRequest {
  audioUrl: string;
  language?: string;
}

// UI State types
export interface ChatState {
  activeRoom: Room | null;
  messages: Message[];
  isLoading: boolean;
  hasMore: boolean;
  error: string | null;
}

export interface SidebarState {
  rooms: Room[];
  activeTab: 'chats' | 'status' | 'calls';
  searchQuery: string;
  isLoading: boolean;
}

export interface UserState {
  profile: Profile | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  settings: UserSettings;
}

export interface UserSettings {
  enableAITranslation: boolean;
  preferredLanguage: string;
  enableNotifications: boolean;
  darkMode: boolean;
}

// Component Props types
export interface ChatWindowProps {
  room: Room;
  currentUser: Profile;
  onBack?: () => void;
}

export interface SidebarProps {
  rooms: Room[];
  activeRoom: Room | null;
  currentUser: Profile;
  onRoomSelect: (room: Room) => void;
  onTabChange: (tab: 'chats' | 'status' | 'calls') => void;
  activeTab: 'chats' | 'status' | 'calls';
}

export interface MessageBubbleProps {
  message: Message;
  isOwn: boolean;
  showAvatar: boolean;
  onReply?: (message: Message) => void;
  onTranslate?: (message: Message) => void;
}

export interface VoiceRecorderProps {
  onRecordingComplete: (blob: Blob, duration: number) => void;
  onCancel: () => void;
}

export interface AudioPlayerProps {
  audioUrl: string;
  duration?: number;
  onTranscribe?: () => void;
  transcription?: string;
}

export interface StatusViewerProps {
  stories: Story[];
  currentIndex: number;
  onClose: () => void;
  onNext: () => void;
  onPrevious: () => void;
}

export interface CallInterfaceProps {
  callData: CallData;
  currentUser: Profile;
  remoteUser?: Profile;
  onEndCall: () => void;
  onAcceptCall?: () => void;
  onDeclineCall?: () => void;
}
