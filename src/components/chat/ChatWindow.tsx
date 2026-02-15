import { useState, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Input } from '@/components/ui/input';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import {
  ArrowLeft,
  Phone,
  Video,
  MoreVertical,
  Paperclip,
  Mic,
  Send,
  Image as ImageIcon,
  Sparkles,
  Languages,
  Check,
  X,
  Loader2,
} from 'lucide-react';
import { useMessages } from '@/hooks/useMessages';
import { useAI } from '@/hooks/useAI';
import { useVoiceRecorder } from '@/hooks/useVoiceRecorder';
import { supabase } from '@/lib/supabase/client';
import type { Room, Profile, Message } from '@/types';
import { MessageBubble } from './MessageBubble';

interface ChatWindowProps {
  room: Room;
  currentUser: Profile;
  onBack?: () => void;
}

export function ChatWindow({ room, currentUser, onBack }: ChatWindowProps) {
  const [messageInput, setMessageInput] = useState('');
  const [showAttachMenu, setShowAttachMenu] = useState(false);
  const [replyingTo, setReplyingTo] = useState<Message | null>(null);
  const [showSummary, setShowSummary] = useState(false);
  const [summary, setSummary] = useState<string[] | null>(null);
  const [enableTranslation, setEnableTranslation] = useState(false);
  const [uploadingImage, setUploadingImage] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const {
    messages,
    isLoading,
    hasMore,
    messagesEndRef,
    sendMessage,
    loadMore,
    scrollToBottom,
  } = useMessages(room.id, currentUser.id);

  const {
    isSummarizing,
    summarizeConversation,
  } = useAI();

  const {
    isRecording,
    recordingDuration,
    formattedDuration,
    audioBlob,
    startRecording,
    stopRecording,
    cancelRecording,
    resetRecording,
  } = useVoiceRecorder();

  const getOtherParticipant = () => {
    return room.participants?.find((p) => p.user_id !== currentUser.id);
  };

  const getRoomDisplayName = () => {
    if (room.is_group) return room.name || 'Group Chat';
    const other = getOtherParticipant();
    return other?.profile?.full_name || other?.profile?.username || 'Unknown';
  };

  const getRoomAvatar = () => {
    if (room.is_group) return null;
    const other = getOtherParticipant();
    return other?.profile?.avatar_url;
  };

  const isOnline = () => {
    if (room.is_group) return false;
    const other = getOtherParticipant();
    return other?.profile?.is_online || false;
  };

  const handleSendMessage = async () => {
    if (!messageInput.trim() && !audioBlob) return;

    if (audioBlob) {
      // Upload voice note
      const fileName = `${room.id}/${Date.now()}.webm`;
      const { error } = await supabase.storage
        .from('voice-notes')
        .upload(fileName, audioBlob);

      if (error) {
        console.error('Error uploading voice note:', error);
        return;
      }

      const { data: urlData } = supabase.storage
        .from('voice-notes')
        .getPublicUrl(fileName);

      await sendMessage(
        '',
        'voice',
        urlData.publicUrl,
        recordingDuration
      );
      resetRecording();
    } else {
      await sendMessage(
        messageInput,
        'text',
        undefined,
        undefined,
        replyingTo?.id
      );
      setMessageInput('');
      setReplyingTo(null);
    }

    scrollToBottom();
  };

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploadingImage(true);
    try {
      const fileName = `${room.id}/${Date.now()}-${file.name}`;
      const { error } = await supabase.storage
        .from('chat-media')
        .upload(fileName, file);

      if (error) throw error;

      const { data: urlData } = supabase.storage
        .from('chat-media')
        .getPublicUrl(fileName);

      await sendMessage('', 'image', urlData.publicUrl);
      scrollToBottom();
    } catch (error) {
      console.error('Error uploading image:', error);
    } finally {
      setUploadingImage(false);
      setShowAttachMenu(false);
    }
  };

  const handleSummarize = async () => {
    const result = await summarizeConversation(messages, currentUser.preferred_language);
    if (result) {
      setSummary(result.summary);
      setShowSummary(true);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  return (
    <div className="flex flex-col h-full bg-slate-950">
      {/* Chat Header */}
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex items-center justify-between p-4 bg-slate-900/80 backdrop-blur-xl border-b border-slate-800/50"
      >
        <div className="flex items-center gap-3">
          {onBack && (
            <Button
              variant="ghost"
              size="icon"
              onClick={onBack}
              className="lg:hidden text-slate-400 hover:text-white"
            >
              <ArrowLeft className="w-5 h-5" />
            </Button>
          )}
          <div className="relative">
            <Avatar className="w-10 h-10">
              <AvatarImage src={getRoomAvatar() || undefined} />
              <AvatarFallback className="bg-gradient-to-br from-slate-600 to-slate-700 text-white">
                {getRoomDisplayName()[0]?.toUpperCase()}
              </AvatarFallback>
            </Avatar>
            {!room.is_group && (
              <span
                className={`absolute -bottom-0.5 -right-0.5 w-3.5 h-3.5 rounded-full border-2 border-slate-900 ${
                  isOnline() ? 'bg-emerald-500' : 'bg-slate-500'
                }`}
              />
            )}
          </div>
          <div>
            <h3 className="font-semibold text-white">{getRoomDisplayName()}</h3>
            <p className="text-xs text-slate-400">
              {room.is_group
                ? `${room.participants?.length || 0} members`
                : isOnline()
                ? 'Online'
                : 'Offline'}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-1">
          {/* AI Summary Button */}
          <Button
            variant="ghost"
            size="sm"
            onClick={handleSummarize}
            disabled={isSummarizing || messages.length < 3}
            className="hidden sm:flex items-center gap-2 text-emerald-400 hover:text-emerald-300 hover:bg-emerald-500/10"
          >
            {isSummarizing ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <Sparkles className="w-4 h-4" />
            )}
            Summarize
          </Button>

          {/* Translation Toggle */}
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setEnableTranslation(!enableTranslation)}
            className={`${
              enableTranslation
                ? 'text-emerald-400 bg-emerald-500/10'
                : 'text-slate-400 hover:text-white'
            }`}
            title="Auto-translate messages"
          >
            <Languages className="w-5 h-5" />
          </Button>

          <Button
            variant="ghost"
            size="icon"
            className="text-slate-400 hover:text-white hover:bg-slate-800/50"
          >
            <Phone className="w-5 h-5" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="text-slate-400 hover:text-white hover:bg-slate-800/50"
          >
            <Video className="w-5 h-5" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="text-slate-400 hover:text-white hover:bg-slate-800/50"
          >
            <MoreVertical className="w-5 h-5" />
          </Button>
        </div>
      </motion.div>

      {/* Messages Area */}
      <ScrollArea className="flex-1 p-4">
        {hasMore && (
          <div className="text-center mb-4">
            <Button
              variant="ghost"
              size="sm"
              onClick={loadMore}
              disabled={isLoading}
              className="text-slate-500 hover:text-slate-300"
            >
              {isLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Load more'}
            </Button>
          </div>
        )}

        <div className="space-y-4">
          <AnimatePresence>
            {messages.map((message, index) => {
              const isOwn = message.sender_id === currentUser.id;
              const showAvatar =
                index === 0 || messages[index - 1].sender_id !== message.sender_id;

              return (
                <MessageBubble
                  key={message.id}
                  message={message}
                  isOwn={isOwn}
                  showAvatar={showAvatar}
                  enableTranslation={enableTranslation}
                  onReply={() => setReplyingTo(message)}
                />
              );
            })}
          </AnimatePresence>
          <div ref={messagesEndRef} />
        </div>
      </ScrollArea>

      {/* Reply Preview */}
      {replyingTo && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: 10 }}
          className="px-4 py-2 bg-slate-800/50 border-t border-slate-800/50 flex items-center gap-2"
        >
          <div className="flex-1 flex items-center gap-2 text-sm text-slate-400">
            <span className="text-emerald-400">Replying to:</span>
            <span className="truncate">
              {replyingTo.content || (replyingTo.message_type === 'image' ? '📷 Photo' : '🎤 Voice')}
            </span>
          </div>
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setReplyingTo(null)}
            className="h-6 w-6 text-slate-500 hover:text-white"
          >
            <X className="w-4 h-4" />
          </Button>
        </motion.div>
      )}

      {/* Voice Recording Preview */}
      {isRecording && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="px-4 py-3 bg-slate-800/50 border-t border-slate-800/50 flex items-center gap-4"
        >
          <div className="flex items-center gap-2 text-red-400">
            <span className="w-3 h-3 rounded-full bg-red-500 animate-pulse" />
            <span>Recording...</span>
          </div>
          <span className="text-white font-mono">{formattedDuration}</span>
          <div className="flex-1" />
          <Button
            variant="ghost"
            size="sm"
            onClick={cancelRecording}
            className="text-slate-400 hover:text-white"
          >
            <X className="w-4 h-4 mr-1" />
            Cancel
          </Button>
          <Button
            size="sm"
            onClick={stopRecording}
            className="bg-emerald-500 hover:bg-emerald-600 text-white"
          >
            <Check className="w-4 h-4 mr-1" />
            Done
          </Button>
        </motion.div>
      )}

      {/* Audio Preview */}
      {audioBlob && !isRecording && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="px-4 py-3 bg-slate-800/50 border-t border-slate-800/50 flex items-center gap-4"
        >
          <span className="text-emerald-400 flex items-center gap-2">
            <Mic className="w-4 h-4" />
            Voice note ready
          </span>
          <span className="text-slate-400">{formattedDuration}</span>
          <div className="flex-1" />
          <Button
            variant="ghost"
            size="sm"
            onClick={resetRecording}
            className="text-slate-400 hover:text-white"
          >
            <X className="w-4 h-4 mr-1" />
            Remove
          </Button>
        </motion.div>
      )}

      {/* Input Area */}
      <div className="p-4 bg-slate-900/80 backdrop-blur-xl border-t border-slate-800/50">
        <div className="flex items-center gap-2">
          <Popover open={showAttachMenu} onOpenChange={setShowAttachMenu}>
            <PopoverTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                disabled={isRecording || !!audioBlob}
                className="text-slate-400 hover:text-white hover:bg-slate-800/50"
              >
                <Paperclip className="w-5 h-5" />
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-48 bg-slate-800 border-slate-700 p-2">
              <div className="space-y-1">
                <input
                  type="file"
                  accept="image/*"
                  ref={fileInputRef}
                  onChange={handleImageUpload}
                  className="hidden"
                />
                <Button
                  variant="ghost"
                  className="w-full justify-start text-slate-300 hover:text-white hover:bg-slate-700"
                  onClick={() => fileInputRef.current?.click()}
                  disabled={uploadingImage}
                >
                  {uploadingImage ? (
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  ) : (
                    <ImageIcon className="w-4 h-4 mr-2" />
                  )}
                  Photo
                </Button>
              </div>
            </PopoverContent>
          </Popover>

          <div className="flex-1 relative">
            <Input
              placeholder={isRecording ? 'Recording...' : 'Type a message...'}
              value={messageInput}
              onChange={(e) => setMessageInput(e.target.value)}
              onKeyDown={handleKeyDown}
              disabled={isRecording || !!audioBlob}
              className="bg-slate-800/50 border-slate-700 text-white placeholder:text-slate-500 focus:border-emerald-500 focus:ring-emerald-500/20 pr-10"
            />
          </div>

          {!messageInput.trim() && !audioBlob ? (
            <Button
              variant="ghost"
              size="icon"
              onClick={isRecording ? stopRecording : startRecording}
              className={`${
                isRecording
                  ? 'text-red-400 bg-red-500/10'
                  : 'text-slate-400 hover:text-white hover:bg-slate-800/50'
              }`}
            >
              <Mic className="w-5 h-5" />
            </Button>
          ) : (
            <Button
              onClick={handleSendMessage}
              disabled={uploadingImage}
              className="bg-emerald-500 hover:bg-emerald-600 text-white"
            >
              {uploadingImage ? (
                <Loader2 className="w-5 h-5 animate-spin" />
              ) : (
                <Send className="w-5 h-5" />
              )}
            </Button>
          )}
        </div>
      </div>

      {/* Summary Dialog */}
      <Dialog open={showSummary} onOpenChange={setShowSummary}>
        <DialogContent className="bg-slate-900 border-slate-800 max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-white">
              <Sparkles className="w-5 h-5 text-emerald-400" />
              Conversation Summary
            </DialogTitle>
            <DialogDescription className="text-slate-400">
              AI-generated summary of your recent conversation
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3 mt-4">
            {summary?.map((point, index) => (
              <motion.div
                key={index}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: index * 0.1 }}
                className="flex items-start gap-3 p-3 rounded-lg bg-slate-800/50"
              >
                <span className="flex-shrink-0 w-6 h-6 rounded-full bg-emerald-500/20 text-emerald-400 text-sm flex items-center justify-center">
                  {index + 1}
                </span>
                <p className="text-slate-300 text-sm">{point}</p>
              </motion.div>
            ))}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

