import { useState, useRef } from 'react';
import { motion } from 'framer-motion';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { useAI } from '@/hooks/useAI';
import type { Message } from '@/types';
import { format } from 'date-fns';
import {
  Mic,
  Pause,
  Play,
  Languages,
  Check,
  CheckCheck,
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
  enableTranslation,
}: MessageBubbleProps) {
  const [translatedContent, setTranslatedContent] = useState<string | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isTranslating, setIsTranslating] = useState(false);
  const [transcription, setTranscription] = useState<string | null>(null);
  const [showTranscription, setShowTranscription] = useState(false);
  const audioRef = useRef<HTMLAudioElement>(null);
  const { translateMessage, transcribeVoice } = useAI();

  const handleTranslate = async () => {
    if (!message.content || translatedContent) return;
    setIsTranslating(true);
    const result = await translateMessage(message.content, 'en');
    if (result) {
      setTranslatedContent(result);
    }
    setIsTranslating(false);
  };

  const handleTranscribe = async () => {
    if (!message.media_url || transcription) return;
    const result = await transcribeVoice(message.media_url);
    if (result) {
      setTranscription(result);
      setShowTranscription(true);
    }
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
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      className={`flex ${isOwn ? 'justify-end' : 'justify-start'} mb-2`}
    >
      <div className={`max-w-[85%] sm:max-w-[70%] flex flex-col ${isOwn ? 'items-end' : 'items-start'}`}>
        <div
          className={`relative px-3 py-1.5 rounded-lg text-[14.5px] shadow-sm ${
            isOwn
              ? 'bg-[#005c4b] text-white rounded-tr-none bubble-tail-out'
              : 'bg-[#202c33] text-[#e9edef] rounded-tl-none bubble-tail-in'
          }`}
        >
          {/* Reply Reference */}
          {message.reply_to_message && (
            <div className={`mb-1.5 p-2 rounded bg-black/20 border-l-4 ${isOwn ? 'border-primary' : 'border-emerald-500'} cursor-pointer`}>
              <p className="text-[12px] font-medium text-primary">
                {message.reply_to_message.sender?.username}
              </p>
              <p className="text-[12px] text-muted-foreground truncate opacity-80">
                {message.reply_to_message.content || 'Media'}
              </p>
            </div>
          )}

          {/* Image Message */}
          {message.message_type === 'image' && message.media_url && (
            <div className="mb-1 -mx-1 -mt-1">
              <img
                src={message.media_url}
                alt="Shared image"
                className="rounded-md max-w-full h-auto cursor-pointer hover:opacity-95 transition-opacity"
                loading="lazy"
              />
            </div>
          )}

          {/* Voice Message */}
          {message.message_type === 'voice' && message.media_url && (
            <div className="flex items-center gap-2 min-w-[240px] py-1">
              <audio ref={audioRef} src={message.media_url} onEnded={() => setIsPlaying(false)} />
              <div className="relative">
                 <Avatar className="w-10 h-10">
                    <AvatarImage src={message.sender?.avatar_url || undefined} />
                    <AvatarFallback className="bg-muted text-muted-foreground">
                      {message.sender?.username?.[0]?.toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={togglePlay}
                    className="absolute -right-1 -bottom-1 w-6 h-6 rounded-full bg-background/20 text-foreground hover:bg-background/40"
                  >
                    {isPlaying ? <Pause className="w-3 h-3" /> : <Play className="w-3 h-3 ml-0.5" />}
                  </Button>
              </div>
              <div className="flex-1 space-y-1">
                <div className="h-1 bg-white/20 rounded-full overflow-hidden">
                  <div className="h-full w-0 bg-primary rounded-full transition-all duration-300" />
                </div>
                <div className="flex justify-between items-center px-1">
                   <span className="text-[11px] opacity-70">
                    {message.media_duration
                      ? `${Math.floor(message.media_duration / 60)}:${(message.media_duration % 60)
                          .toString()
                          .padStart(2, '0')}`
                      : '0:00'}
                  </span>
                   <div className="flex items-center gap-2">
                     <Mic className="w-3 h-3 text-primary" />
                     {!transcription && (
                       <button
                         onClick={handleTranscribe}
                         className="text-[10px] text-primary hover:underline"
                       >
                         Transcribe
                       </button>
                     )}
                   </div>
                 </div>
               </div>
             </div>
           )}

           {transcription && showTranscription && (
             <div className="mt-2 p-2 rounded bg-black/10 border-l-2 border-primary/50 italic text-[13px]">
               <p>{transcription}</p>
             </div>
           )}

          {/* Text Content */}
          <div className="flex flex-wrap items-end gap-x-2 gap-y-1">
            {message.content && (
              <p className="leading-normal break-words">{message.content}</p>
            )}
            
            {/* Timestamp & Read Status */}
            <div className="flex items-center gap-1 mt-auto ml-auto pt-1">
              <span className="text-[11px] opacity-60 font-light uppercase">
                {format(new Date(message.created_at), 'h:mm a')}
              </span>
              {getReadStatus()}
            </div>
          </div>

          {/* Translation */}
          {enableTranslation && message.content && !isOwn && (
            <div className="mt-2 pt-2 border-t border-white/10">
              {translatedContent ? (
                <p className="text-[12px] opacity-70 italic">{translatedContent}</p>
              ) : (
                <button
                  onClick={handleTranslate}
                  disabled={isTranslating}
                  className="text-[11px] text-primary hover:underline flex items-center gap-1"
                >
                  <Languages className="w-3 h-3" />
                  {isTranslating ? 'Translating...' : 'Translate'}
                </button>
              )}
            </div>
          )}
        </div>
      </div>
    </motion.div>

  );
}
