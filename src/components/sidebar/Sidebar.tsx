import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import {
  MessageCircle,
  Clock,
  Search,
  Plus,
  Phone,
  Image as ImageIcon,
  Settings,
  LogOut,
  Menu,
  X,
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
}

export function Sidebar({
  rooms,
  activeRoom,
  currentUser,
  onRoomSelect,
  onTabChange,
  activeTab,
  onLogout,
  storiesCount = 0,
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

  const isOnline = (room: Room) => {
    if (room.is_group) return false;
    const other = getOtherParticipant(room);
    return other?.profile?.is_online || false;
  };

  const getLastSeen = (room: Room) => {
    if (room.is_group) return null;
    const other = getOtherParticipant(room);
    if (!other?.profile?.last_seen) return null;
    return formatDistanceToNow(new Date(other.profile.last_seen), { addSuffix: true });
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
      <button
        onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
        className="lg:hidden fixed top-4 left-4 z-50 p-2 rounded-lg bg-slate-800/80 backdrop-blur-sm text-white"
      >
        {isMobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
      </button>

      <motion.aside
        initial={{ x: -100, opacity: 0 }}
        animate={{ x: 0, opacity: 1 }}
        className={`
          fixed lg:static inset-y-0 left-0 z-40 w-80
          bg-slate-900/95 backdrop-blur-xl border-r border-slate-800/50
          flex flex-col
          transition-transform duration-300 lg:translate-x-0
          ${isMobileMenuOpen ? 'translate-x-0' : '-translate-x-full'}
        `}
      >
        {/* Header */}
        <div className="p-4 border-b border-slate-800/50">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3">
              <Avatar className="w-10 h-10 ring-2 ring-emerald-500/30">
                <AvatarImage src={currentUser.avatar_url || undefined} />
                <AvatarFallback className="bg-gradient-to-br from-emerald-500 to-teal-600 text-white text-sm">
                  {currentUser.username?.[0]?.toUpperCase()}
                </AvatarFallback>
              </Avatar>
              <div>
                <h3 className="font-semibold text-white">{currentUser.full_name || currentUser.username}</h3>
                <p className="text-xs text-emerald-400 flex items-center gap-1">
                  <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                  Online
                </p>
              </div>
            </div>
            <div className="flex items-center gap-1">
              <Button
                variant="ghost"
                size="icon"
                className="text-slate-400 hover:text-white hover:bg-slate-800/50"
              >
                <Settings className="w-5 h-5" />
              </Button>
              <Button
                variant="ghost"
                size="icon"
                onClick={onLogout}
                className="text-slate-400 hover:text-red-400 hover:bg-red-500/10"
              >
                <LogOut className="w-5 h-5" />
              </Button>
            </div>
          </div>

          {/* Search */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
            <Input
              placeholder="Search chats..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10 bg-slate-800/50 border-slate-700 text-white placeholder:text-slate-500 focus:border-emerald-500 focus:ring-emerald-500/20"
            />
          </div>
        </div>

        {/* Navigation Tabs */}
        <div className="flex items-center gap-1 p-2 border-b border-slate-800/50">
          <button
            onClick={() => onTabChange('chats')}
            className={`flex-1 flex items-center justify-center gap-2 py-2 px-4 rounded-lg text-sm font-medium transition-all ${
              activeTab === 'chats'
                ? 'bg-emerald-500/20 text-emerald-400'
                : 'text-slate-400 hover:text-white hover:bg-slate-800/50'
            }`}
          >
            <MessageCircle className="w-4 h-4" />
            Chats
          </button>
          <button
            onClick={() => onTabChange('status')}
            className={`flex-1 flex items-center justify-center gap-2 py-2 px-4 rounded-lg text-sm font-medium transition-all relative ${
              activeTab === 'status'
                ? 'bg-emerald-500/20 text-emerald-400'
                : 'text-slate-400 hover:text-white hover:bg-slate-800/50'
            }`}
          >
            <ImageIcon className="w-4 h-4" />
            Status
            {storiesCount > 0 && (
              <span className="absolute -top-1 -right-1 w-5 h-5 rounded-full bg-emerald-500 text-white text-xs flex items-center justify-center">
                {storiesCount}
              </span>
            )}
          </button>
          <button
            onClick={() => onTabChange('calls')}
            className={`flex-1 flex items-center justify-center gap-2 py-2 px-4 rounded-lg text-sm font-medium transition-all ${
              activeTab === 'calls'
                ? 'bg-emerald-500/20 text-emerald-400'
                : 'text-slate-400 hover:text-white hover:bg-slate-800/50'
            }`}
          >
            <Phone className="w-4 h-4" />
            Calls
          </button>
        </div>

        {/* Chat List */}
        <ScrollArea className="flex-1">
          <AnimatePresence mode="popLayout">
            {filteredRooms.map((room, index) => (
              <motion.button
                key={room.id}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                transition={{ delay: index * 0.05 }}
                onClick={() => {
                  onRoomSelect(room);
                  setIsMobileMenuOpen(false);
                }}
                className={`w-full p-4 flex items-center gap-3 hover:bg-slate-800/50 transition-colors border-b border-slate-800/30 ${
                  activeRoom?.id === room.id ? 'bg-slate-800/70' : ''
                }`}
              >
                <div className="relative">
                  <Avatar className="w-12 h-12">
                    <AvatarImage src={getRoomAvatar(room) || undefined} />
                    <AvatarFallback className="bg-gradient-to-br from-slate-600 to-slate-700 text-white">
                      {getRoomDisplayName(room)[0]?.toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
                  {!room.is_group && (
                    <span
                      className={`absolute -bottom-0.5 -right-0.5 w-4 h-4 rounded-full border-2 border-slate-900 ${
                        isOnline(room) ? 'bg-emerald-500' : 'bg-slate-500'
                      }`}
                    />
                  )}
                </div>
                <div className="flex-1 min-w-0 text-left">
                  <div className="flex items-center justify-between">
                    <h4 className="font-medium text-white truncate">
                      {getRoomDisplayName(room)}
                    </h4>
                    {room.last_message && (
                      <span className="text-xs text-slate-500">
                        {formatDistanceToNow(new Date(room.last_message.created_at), {
                          addSuffix: false,
                        })}
                      </span>
                    )}
                  </div>
                  <div className="flex items-center justify-between">
                    <p className="text-sm text-slate-400 truncate">
                      {getLastMessagePreview(room)}
                    </p>
                    {room.unread_count && room.unread_count > 0 ? (
                      <Badge className="bg-emerald-500 text-white text-xs min-w-[20px] h-5 flex items-center justify-center">
                        {room.unread_count}
                      </Badge>
                    ) : (
                      room.last_message?.sender_id === currentUser.id && (
                        <span className="text-emerald-500">
                          <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                            <path d="M18 3a1 1 0 00-1.196-.98l-10 2A1 1 0 006 5v9.114A4.369 4.369 0 005 14c-1.657 0-3 .895-3 2s1.343 2 3 2 3-.895 3-2V7.82l8-1.6v5.894A4.369 4.369 0 0015 12c-1.657 0-3 .895-3 2s1.343 2 3 2 3-.895 3-2V3z" />
                          </svg>
                        </span>
                      )
                    )}
                  </div>
                  {!isOnline(room) && !room.is_group && getLastSeen(room) && (
                    <p className="text-xs text-slate-500 flex items-center gap-1 mt-0.5">
                      <Clock className="w-3 h-3" />
                      Last seen {getLastSeen(room)}
                    </p>
                  )}
                </div>
              </motion.button>
            ))}
          </AnimatePresence>

          {filteredRooms.length === 0 && (
            <div className="p-8 text-center">
              <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-slate-800/50 flex items-center justify-center">
                <MessageCircle className="w-8 h-8 text-slate-600" />
              </div>
              <p className="text-slate-500">No chats found</p>
              <p className="text-sm text-slate-600 mt-1">
                Start a new conversation to see it here
              </p>
            </div>
          )}
        </ScrollArea>

        {/* New Chat Button */}
        <div className="p-4 border-t border-slate-800/50">
          <Button
            className="w-full bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-600 hover:to-teal-700 text-white"
          >
            <Plus className="w-4 h-4 mr-2" />
            New Chat
          </Button>
        </div>
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
