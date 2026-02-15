import { useState, useRef } from 'react';
import { motion } from 'framer-motion';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { useAI } from '@/hooks/useAI';
import type { Message } from '@/types';
import { format } from 'date-fns';
import {
  CheckCheck,
  Check,
  Pause,
  Play,
  Languages,
  Loader2,
  Wand2,
} from 'lucide-react';

interface MessageBubbleProps {
  message: Message;
  isOwn: boolean;
  showAvatar: boolean;
  enableTranslation: boolean;
  onReply: () => void;
}

export function MessageBubble({
  message,
  isOwn,
  showAvatar,
  enableTranslation,
  onReply,
}: MessageBubbleProps) {
  const [showTranscription, setShowTranscription] = useState(false);
  const [translatedContent, setTranslatedContent] = useState<string | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isTranslating, setIsTranslating] = useState(false);
  const audioRef = useRef<HTMLAudioElement>(null);
  const { translateMessage } = useAI();

  const handleTranslate = async () => {
    if (!message.content || translatedContent) return;
    setIsTranslating(true);
    const result = await translateMessage(message.content, 'en');
    if (result) {
      setTranslatedContent(result);
    }
    setIsTranslating(false);
  };

  const togglePlay = () => {
    if (audioRef.current) {
      if (isPlaying) {
        audioRef.current.pause();
      } else {
        audioRef.current.play();
      }
      setIsPlaying(!isPlaying);
    }
  };

  const getReadStatus = () => {
    if (!isOwn) return null;
    const readCount = message.read_receipts?.length || 0;

    if (readCount > 0) {
      return <CheckCheck className="w-4 h-4 text-emerald-400" />;
    }
    return <Check className="w-4 h-4 text-slate-500" />;
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className={`flex ${isOwn ? 'justify-end' : 'justify-start'} gap-2`}
    >
      {!isOwn && showAvatar && (
        <Avatar className="w-8 h-8 mt-1">
          <AvatarImage src={message.sender?.avatar_url || undefined} />
          <AvatarFallback className="bg-slate-700 text-white text-xs">
            {message.sender?.username?.[0]?.toUpperCase()}
          </AvatarFallback>
        </Avatar>
      )}
      {!isOwn && !showAvatar && <div className="w-8" />}

      <div className={`max-w-[70%] ${isOwn ? 'items-end' : 'items-start'}`}>
        {/* Reply Reference */}
        {message.reply_to_message && (
          <div className="mb-1 px-3 py-1.5 rounded-lg bg-slate-800/70 border-l-2 border-emerald-500">
            <p className="text-xs text-emerald-400">
              {message.reply_to_message.sender?.username}
            </p>
            <p className="text-xs text-slate-400 truncate">
              {message.reply_to_message.content || '📷 Media'}
            </p>
          </div>
        )}

        {/* Message Content */}
        <div
          className={`relative group px-4 py-2.5 rounded-2xl ${
            isOwn
              ? 'bg-gradient-to-br from-emerald-500 to-teal-600 text-white rounded-br-md'
              : 'bg-slate-800 text-slate-100 rounded-bl-md'
          }`}
        >
          {/* Image Message */}
          {message.message_type === 'image' && message.media_url && (
            <img
              src={message.media_url}
              alt="Shared image"
              className="max-w-full rounded-lg mb-2"
              loading="lazy"
            />
          )}

          {/* Voice Message */}
          {message.message_type === 'voice' && message.media_url && (
            <div className="flex items-center gap-3 min-w-[200px]">
              <audio ref={audioRef} src={message.media_url} onEnded={() => setIsPlaying(false)} />
              <Button
                variant="ghost"
                size="icon"
                onClick={togglePlay}
                className={`w-10 h-10 rounded-full ${
                  isOwn ? 'bg-white/20 text-white' : 'bg-slate-700 text-slate-300'
                }`}
              >
                {isPlaying ? <Pause className="w-5 h-5" /> : <Play className="w-5 h-5" />}
              </Button>
              <div className="flex-1">
                <div className={`h-1 rounded-full ${isOwn ? 'bg-white/30' : 'bg-slate-700'}`}>
                  <div className={`h-full w-1/3 rounded-full ${isOwn ? 'bg-white' : 'bg-emerald-500'}`} />
                </div>
              </div>
              <span className="text-sm">
                {message.media_duration
                  ? `${Math.floor(message.media_duration / 60)}:${(message.media_duration % 60)
                      .toString()
                      .padStart(2, '0')}`
                  : '0:00'}
              </span>
            </div>
          )}

          {/* Text Content */}
          {message.content && (
            <p className="text-sm whitespace-pre-wrap">{message.content}</p>
          )}

          {/* Translation */}
          {enableTranslation && message.content && !isOwn && (
            <div className="mt-2 pt-2 border-t border-slate-700/50">
              {translatedContent ? (
                <p className="text-xs text-slate-400 italic">{translatedContent}</p>
              ) : (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleTranslate}
                  disabled={isTranslating}
                  className="h-6 text-xs text-emerald-400 hover:text-emerald-300 hover:bg-emerald-500/10"
                >
                  {isTranslating ? (
                    <Loader2 className="w-3 h-3 mr-1 animate-spin" />
                  ) : (
                    <Languages className="w-3 h-3 mr-1" />
                  )}
                  Translate
                </Button>
              )}
            </div>
          )}

          {/* AI Transcribe Button for Voice */}
          {message.message_type === 'voice' && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setShowTranscription(!showTranscription)}
              className={`mt-2 h-6 text-xs ${
                isOwn
                  ? 'text-white/70 hover:text-white hover:bg-white/10'
                  : 'text-slate-400 hover:text-slate-300 hover:bg-slate-700'
              }`}
            >
              <Wand2 className="w-3 h-3 mr-1" />
              {showTranscription ? 'Hide transcript' : 'AI Transcribe'}
            </Button>
          )}

          {/* Transcription Display */}
          {showTranscription && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              className={`mt-2 p-2 rounded text-xs ${
                isOwn ? 'bg-white/10 text-white/80' : 'bg-slate-700 text-slate-400'
              }`}
            >
              <p className="italic">Transcription would appear here from Gemini AI...</p>
            </motion.div>
          )}

          {/* Timestamp & Read Status */}
          <div className={`flex items-center gap-1 mt-1 ${isOwn ? 'justify-end' : 'justify-start'}`}>
            <span className={`text-xs ${isOwn ? 'text-white/70' : 'text-slate-500'}`}>
              {format(new Date(message.created_at), 'h:mm a')}
            </span>
            {isOwn && getReadStatus()}
          </div>

          {/* Hover Actions */}
          <div
            className={`absolute top-0 ${
              isOwn ? 'left-0 -translate-x-full' : 'right-0 translate-x-full'
            } opacity-0 group-hover:opacity-100 transition-opacity`}
          >
            <Button
              variant="ghost"
              size="icon"
              onClick={onReply}
              className="h-8 w-8 text-slate-400 hover:text-white"
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M3 10h10a8 8 0 018 8v2M3 10l6 6m-6-6l6-6"
                />
              </svg>
            </Button>
          </div>
        </div>
      </div>
    </motion.div>
  );
}
