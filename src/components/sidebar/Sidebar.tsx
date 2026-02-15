import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import {
  MessageCircle,
  Clock,
  Search,
  MoreVertical,
  Menu,
  X,
  CheckCheck,
} from 'lucide-react';
import type { Room, Profile } from '@/types';
import { formatDistanceToNow } from 'date-fns';

interface SidebarProps {
  rooms: Room[];
  activeRoom: Room | null;
  currentUser: Profile;
  onRoomSelect: (room: Room) => void;
  onTabChange: (tab: 'chats' | 'status' | 'calls') => void;
  activeTab: 'chats' | 'status' | 'calls';
  onLogout: () => void;
  storiesCount?: number;
  className?: string;
}

export function Sidebar({
  rooms,
  activeRoom,
  currentUser,
  onRoomSelect,
  onTabChange,
  className = '',
}: SidebarProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  const filteredRooms = rooms.filter((room) => {
    const searchLower = searchQuery.toLowerCase();
    if (room.is_group) {
      return room.name?.toLowerCase().includes(searchLower);
    }
    const otherParticipant = room.participants?.find(
      (p) => p.user_id !== currentUser.id
    );
    return (
      otherParticipant?.profile?.username?.toLowerCase().includes(searchLower) ||
      otherParticipant?.profile?.full_name?.toLowerCase().includes(searchLower)
    );
  });

  const getOtherParticipant = (room: Room) => {
    return room.participants?.find((p) => p.user_id !== currentUser.id);
  };

  const getRoomDisplayName = (room: Room) => {
    if (room.is_group) return room.name || 'Group Chat';
    const other = getOtherParticipant(room);
    return other?.profile?.full_name || other?.profile?.username || 'Unknown';
  };

  const getRoomAvatar = (room: Room) => {
    if (room.is_group) return null;
    const other = getOtherParticipant(room);
    return other?.profile?.avatar_url;
  };


  const getLastMessagePreview = (room: Room) => {
    if (!room.last_message) return 'No messages yet';
    const prefix = room.last_message.sender_id === currentUser.id ? 'You: ' : '';
    if (room.last_message.message_type === 'image') return `${prefix}📷 Photo`;
    if (room.last_message.message_type === 'voice') return `${prefix}🎤 Voice message`;
    return `${prefix}${room.last_message.content}`;
  };

  return (
    <>
      {/* Mobile Menu Button */}
      {!activeRoom && (
        <button
          onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
          className="lg:hidden fixed top-4 left-4 z-50 p-2 rounded-lg bg-slate-800/80 backdrop-blur-sm text-white"
        >
          {isMobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
        </button>
      )}

      <motion.aside
        initial={{ x: -320 }}
        animate={{ x: (isMobileMenuOpen || window.innerWidth >= 1024) ? 0 : -320 }}
        transition={{ type: 'spring', damping: 25, stiffness: 200 }}
        className={`
          fixed lg:static inset-y-0 left-0 z-40 w-85
          bg-secondary border-r border-border
          flex flex-col ${className}
        `}
      >
        {/* Header */}
        <div className="p-4 bg-secondary flex items-center justify-between">
          <Avatar className="w-10 h-10 cursor-pointer">
            <AvatarImage src={currentUser.avatar_url || undefined} />
            <AvatarFallback className="bg-muted text-muted-foreground">
              {currentUser.username?.[0]?.toUpperCase()}
            </AvatarFallback>
          </Avatar>
          <div className="flex items-center gap-2">
            <Button
              variant="ghost"
              size="icon"
              className="text-muted-foreground hover:text-foreground rounded-full"
              title="Communities"
            >
              <svg className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor">
                <path d="M12 2C6.477 2 2 6.477 2 12s4.477 10 10 10 10-4.477 10-10S17.523 2 12 2zm0 18c-4.411 0-8-3.589-8-8s3.589-8 8-8 8 3.589 8 8-3.589 8-8 8zM12 6c-3.314 0-6 2.686-6 6s2.686 6 6 6 6-2.686 6-6-2.686-6-6-6zm0 10c-2.206 0-4-1.794-4-4s1.794-4 4-4 4 1.794 4 4-1.794 4-4 4z"/>
              </svg>
            </Button>
            <Button
              variant="ghost"
              size="icon"
              className="text-muted-foreground hover:text-foreground rounded-full"
              title="Status"
              onClick={() => onTabChange('status')}
            >
              <Clock className="w-5 h-5" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              className="text-muted-foreground hover:text-foreground rounded-full"
              title="New Chat"
            >
              <MessageCircle className="w-5 h-5" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              className="text-muted-foreground hover:text-foreground rounded-full"
              title="Settings"
            >
              <MoreVertical className="w-5 h-5" />
            </Button>
          </div>
        </div>

        {/* Search */}
        <div className="p-2 px-3 border-b border-border/50">
          <div className="relative flex items-center bg-muted rounded-lg px-3 py-1.5">
            <Search className="w-4 h-4 text-muted-foreground mr-3" />
            <input
              placeholder="Search or start new chat"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="bg-transparent border-none text-sm text-foreground placeholder:text-muted-foreground focus:ring-0 flex-1 outline-none"
            />
          </div>
        </div>

        {/* Chat List */}
        <ScrollArea className="flex-1 bg-background">
          <AnimatePresence mode="popLayout">
            {filteredRooms.map((room: Room) => (
              <motion.button
                key={room.id}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                onClick={() => {
                  onRoomSelect(room);
                  setIsMobileMenuOpen(false);
                }}
                className={`w-full p-4 h-[72px] flex items-center gap-3 hover:bg-secondary transition-colors border-b border-border/30 relative ${
                  activeRoom?.id === room.id ? 'bg-secondary' : ''
                }`}
              >
                <div className="relative flex-shrink-0">
                  <Avatar className="w-12 h-12">
                    <AvatarImage src={getRoomAvatar(room) || undefined} />
                    <AvatarFallback className="bg-muted text-muted-foreground">
                      {getRoomDisplayName(room)[0]?.toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
                </div>
                <div className="flex-1 min-w-0 text-left h-full flex flex-col justify-center">
                  <div className="flex items-center justify-between mb-0.5">
                    <h4 className="font-normal text-[17px] text-foreground truncate">
                      {getRoomDisplayName(room)}
                    </h4>
                    {room.last_message && (
                      <span className={`text-[12px] ${room.unread_count ? 'text-primary font-medium' : 'text-muted-foreground'}`}>
                        {formatDistanceToNow(new Date(room.last_message.created_at), {
                          addSuffix: false,
                        })}
                      </span>
                    )}
                  </div>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center text-[14px] text-muted-foreground truncate mr-2">
                       {room.last_message?.sender_id === currentUser.id && (
                        <span className="mr-1">
                          <CheckCheck className={`w-4 h-4 ${room.last_message.read_receipts?.length ? 'text-primary' : 'text-muted-foreground'}`} />
                        </span>
                      )}
                      <span className="truncate">{getLastMessagePreview(room)}</span>
                    </div>
                    {room.unread_count && room.unread_count > 0 && (
                      <Badge className="bg-primary text-black font-bold text-[11px] min-w-[20px] h-5 rounded-full flex items-center justify-center border-none">
                        {room.unread_count}
                      </Badge>
                    )}
                  </div>
                </div>
              </motion.button>
            ))}
          </AnimatePresence>

          {filteredRooms.length === 0 && (
            <div className="p-8 text-center bg-background h-full">
              <p className="text-muted-foreground text-sm">No chats found</p>
            </div>
          )}
        </ScrollArea>
      </motion.aside>

      {/* Mobile Overlay */}
      {isMobileMenuOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={() => setIsMobileMenuOpen(false)}
          className="lg:hidden fixed inset-0 bg-black/50 backdrop-blur-sm z-30"
        />
      )}
    </>
  );
}
