import { useState, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
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
  Mic,
  Send,
  Sparkles,
  Search,
  Plus,
  Loader2,
  X,
} from 'lucide-react';
import { useMessages } from '@/hooks/useMessages';
import { useAI } from '@/hooks/useAI';
import { useVoiceRecorder } from '@/hooks/useVoiceRecorder';
import type { Room, Profile, Message } from '@/types';
import { MessageBubble } from './MessageBubble';
import { supabase } from '@/lib/supabase/client';

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
  const [enableTranslation] = useState(false);
  const [isCalling, setIsCalling] = useState(false);
  const [callType, setCallType] = useState<'audio' | 'video' | null>(null);
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
    audioBlob,
    startRecording,
    stopRecording,
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

  const handleCall = (type: 'audio' | 'video') => {
    setCallType(type);
    setIsCalling(true);
    setTimeout(() => {
      setIsCalling(false);
      setCallType(null);
    }, 5000);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  return (
    <div className="flex flex-col h-full bg-background relative">
      {/* Chat Header */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        className="flex items-center justify-between p-3 bg-secondary border-b border-border/50 z-10"
      >
        <div className="flex items-center gap-3">
          {onBack && (
            <Button
              variant="ghost"
              size="icon"
              onClick={onBack}
              className="lg:hidden text-muted-foreground hover:text-foreground"
            >
              <ArrowLeft className="w-5 h-5" />
            </Button>
          )}
          <div className="relative cursor-pointer">
            <Avatar className="w-10 h-10">
              <AvatarImage src={getRoomAvatar() || undefined} />
              <AvatarFallback className="bg-muted text-muted-foreground">
                {getRoomDisplayName()[0]?.toUpperCase()}
              </AvatarFallback>
            </Avatar>
          </div>
          <div className="cursor-pointer">
            <h3 className="font-medium text-foreground leading-tight">{getRoomDisplayName()}</h3>
            <p className="text-[12px] text-muted-foreground">
              {room.is_group
                ? `${room.participants?.length || 0} members`
                : isOnline()
                ? 'online'
                : 'last seen recently'}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => handleCall('video')}
            className="text-muted-foreground hover:text-foreground rounded-full"
            title="Video call"
          >
            <Video className="w-5 h-5" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            onClick={() => handleCall('audio')}
            className="text-muted-foreground hover:text-foreground rounded-full"
            title="Voice call"
          >
            <Phone className="w-5 h-5" />
          </Button>
          <div className="w-[1px] h-6 bg-border mx-1" />
          <Button
            variant="ghost"
            size="icon"
            className="text-muted-foreground hover:text-foreground rounded-full"
            title="Search"
          >
            <Search className="w-5 h-5" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="text-muted-foreground hover:text-foreground rounded-full"
          >
            <MoreVertical className="w-5 h-5" />
          </Button>
        </div>
      </motion.div>


      {/* Calling Overlay */}
      <AnimatePresence>
        {isCalling && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[100] bg-slate-950/90 backdrop-blur-md flex flex-col items-center justify-center p-6"
          >
            <div className="relative mb-8">
              <div className="absolute inset-0 bg-emerald-500/20 rounded-full animate-ping scale-150" />
              <Avatar className="w-32 h-32 ring-4 ring-emerald-500/50">
                <AvatarImage src={getRoomAvatar() || undefined} />
                <AvatarFallback className="bg-gradient-to-br from-slate-600 to-slate-700 text-white text-4xl">
                  {getRoomDisplayName()[0]?.toUpperCase()}
                </AvatarFallback>
              </Avatar>
            </div>
            
            <h2 className="text-3xl font-bold text-white mb-2">{getRoomDisplayName()}</h2>
            <p className="text-emerald-400 font-medium animate-pulse mb-12">
              {callType === 'video' ? 'Starting Video Call...' : 'Calling...'}
            </p>

            <div className="flex gap-6">
              <Button
                size="icon"
                onClick={() => setIsCalling(false)}
                className="w-16 h-16 rounded-full bg-red-500 hover:bg-red-600 text-white shadow-lg shadow-red-500/20"
              >
                <X className="w-8 h-8" />
              </Button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Messages Area */}
      <ScrollArea className="flex-1 whatsapp-chat-bg">
        <div className="p-4">
          {hasMore && (
            <div className="text-center mb-4">
              <Button
                variant="ghost"
                size="sm"
                onClick={loadMore}
                disabled={isLoading}
                className="text-muted-foreground hover:text-foreground"
              >
                {isLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Load more'}
              </Button>
            </div>
          )}

          <div className="max-w-4xl mx-auto space-y-2">
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
        </div>
      </ScrollArea>

      {/* Reply Preview */}
      {replyingTo && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: 10 }}
          className="px-4 py-2 bg-secondary border-t border-border/50 flex items-center gap-2"
        >
          <div className="flex-1 flex items-center gap-2 text-sm text-muted-foreground">
            <span className="text-primary font-medium">Replying to:</span>
            <span className="truncate">
              {replyingTo.content || (replyingTo.message_type === 'image' ? '📷 Photo' : '🎤 Voice')}
            </span>
          </div>
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setReplyingTo(null)}
            className="h-6 w-6 text-muted-foreground hover:text-foreground"
          >
            <X className="w-4 h-4" />
          </Button>
        </motion.div>
      )}

      {/* Input Area */}
      <div className="p-2 pb-4 bg-secondary flex items-center gap-2">
        <div className="flex items-center gap-1 px-1">
          <Button
            variant="ghost"
            size="icon"
            onClick={handleSummarize}
            disabled={isSummarizing || messages.length < 3}
            className="text-muted-foreground hover:text-foreground rounded-full"
            title="Summarize conversation"
          >
            {isSummarizing ? (
              <Loader2 className="w-6 h-6 animate-spin" />
            ) : (
              <Sparkles className="w-6 h-6" />
            )}
          </Button>
          <Popover open={showAttachMenu} onOpenChange={setShowAttachMenu}>
            <PopoverTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                disabled={isRecording || !!audioBlob}
                className="text-muted-foreground hover:text-foreground rounded-full"
              >
                <Plus className="w-6 h-6" />
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-48 bg-card border-border p-2 mb-2" align="start">
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
                  className="w-full justify-start text-foreground hover:bg-muted"
                  onClick={() => fileInputRef.current?.click()}
                  disabled={uploadingImage}
                >
                  <Plus className="w-4 h-4 mr-2" />
                  Photos & Videos
                </Button>
              </div>
            </PopoverContent>
          </Popover>
        </div>

        <div className="flex-1 relative flex items-center bg-muted rounded-xl px-4 py-1.5 ring-1 ring-border/50">
          <input
            placeholder={isRecording ? 'Recording...' : 'Type a message'}
            value={messageInput}
            onChange={(e) => setMessageInput(e.target.value)}
            onKeyDown={handleKeyDown}
            disabled={isRecording || !!audioBlob}
            className="bg-transparent border-none text-[15px] text-foreground placeholder:text-muted-foreground focus:ring-0 flex-1 outline-none py-1.5"
          />
        </div>

        <div className="flex items-center px-1">
          {!messageInput.trim() && !audioBlob ? (
            <Button
              variant="ghost"
              size="icon"
              onClick={isRecording ? stopRecording : startRecording}
              className={`rounded-full ${
                isRecording
                  ? 'text-destructive bg-destructive/10'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              <Mic className="w-6 h-6" />
            </Button>
          ) : (
            <Button
              onClick={handleSendMessage}
              disabled={uploadingImage}
              className="bg-primary hover:bg-primary/90 text-primary-foreground rounded-full w-10 h-10 p-0 flex items-center justify-center shrink-0"
            >
               <Send className="w-5 h-5 fill-current" />
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

