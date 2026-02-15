import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { Toaster } from '@/components/ui/sonner';
import { LoginForm } from '@/components/auth/LoginForm';
import { RegisterForm } from '@/components/auth/RegisterForm';
import { Sidebar } from '@/components/sidebar/Sidebar';
import { ChatWindow } from '@/components/chat/ChatWindow';
import { StatusList } from '@/components/status/StatusList';
import type { Room, Profile } from '@/types';
import './App.css';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 60 * 5,
      retry: 2,
    },
  },
});

const demoUser: Profile = {
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
};

const demoOtherUser: Profile = {
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
};

const demoRooms: Room[] = [
  {
    id: 'room-1',
    name: null,
    is_group: false,
    created_by: 'demo-user-1',
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    participants: [
      { id: 'p1', room_id: 'room-1', user_id: 'demo-user-1', joined_at: new Date().toISOString(), is_admin: false, profile: demoUser },
      { id: 'p2', room_id: 'room-1', user_id: 'demo-user-2', joined_at: new Date().toISOString(), is_admin: false, profile: demoOtherUser },
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
      sender: demoOtherUser,
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
    participants: [{ id: 'p3', room_id: 'room-2', user_id: 'demo-user-1', joined_at: new Date().toISOString(), is_admin: true, profile: demoUser }],
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
      sender: demoUser,
      read_receipts: [],
    },
    unread_count: 0,
  },
];

function App() {
  const [authView, setAuthView] = useState<'login' | 'register'>('login');
  const [activeTab, setActiveTab] = useState<'chats' | 'status' | 'calls'>('chats');
  const [activeRoom, setActiveRoom] = useState<Room | null>(null);
  const [isAuthenticated, setIsAuthenticated] = useState(false);

  const handleLogin = () => setIsAuthenticated(true);
  const handleLogout = () => {
    setIsAuthenticated(false);
    setActiveRoom(null);
  };

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 flex items-center justify-center p-4">
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-emerald-500/10 rounded-full blur-3xl" />
          <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-teal-500/10 rounded-full blur-3xl" />
        </div>
        <div className="absolute top-4 left-1/2 -translate-x-1/2 z-20 bg-emerald-500/20 border border-emerald-500/30 rounded-full px-4 py-2 flex items-center gap-2">
          <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
          <span className="text-emerald-400 text-sm font-medium">Demo Mode - Click Sign In to preview</span>
        </div>
        <AnimatePresence mode="wait">
          {authView === 'login' ? (
            <LoginForm key="login" onSuccess={handleLogin} onRegisterClick={() => setAuthView('register')} />
          ) : (
            <RegisterForm key="register" onSuccess={() => setAuthView('login')} onLoginClick={() => setAuthView('login')} />
          )}
        </AnimatePresence>
      </div>
    );
  }

  return (
    <QueryClientProvider client={queryClient}>
      <div className="min-h-screen bg-slate-950 flex">
        <div className="fixed top-4 left-1/2 -translate-x-1/2 z-50 bg-emerald-500/20 border border-emerald-500/30 rounded-full px-4 py-2 flex items-center gap-2">
          <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
          <span className="text-emerald-400 text-sm font-medium">Demo Mode</span>
        </div>
        <Sidebar
          rooms={demoRooms}
          activeRoom={activeRoom}
          currentUser={demoUser}
          onRoomSelect={(room) => { setActiveRoom(room); setActiveTab('chats'); }}
          onTabChange={setActiveTab}
          activeTab={activeTab}
          onLogout={handleLogout}
          storiesCount={0}
        />
        <main className="flex-1 flex flex-col min-w-0">
          <AnimatePresence mode="wait">
            {activeTab === 'chats' && (
              <motion.div key="chats" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="flex-1 flex">
                {activeRoom ? (
                  <ChatWindow room={activeRoom} currentUser={demoUser} onBack={() => setActiveRoom(null)} />
                ) : (
                  <div className="flex-1 flex items-center justify-center bg-slate-950">
                    <div className="text-center px-4">
                      <div className="text-6xl mb-4">💬</div>
                      <h2 className="text-2xl font-bold text-white mb-2">Welcome to Stunner</h2>
                      <p className="text-slate-400 max-w-md">Select a chat from the sidebar</p>
                    </div>
                  </div>
                )}
              </motion.div>
            )}
            {activeTab === 'status' && (
              <motion.div key="status" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="flex-1 flex">
                <StatusList currentUser={demoUser} onViewStatus={() => {}} />
              </motion.div>
            )}
            {activeTab === 'calls' && (
              <motion.div key="calls" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="flex-1 flex">
                <div className="flex-1 flex items-center justify-center bg-slate-950">
                  <div className="text-center px-4">
                    <div className="text-6xl mb-4">📞</div>
                    <h2 className="text-2xl font-bold text-white mb-2">Calls</h2>
                    <p className="text-slate-400 max-w-md">Your call history will appear here</p>
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </main>
        <Toaster />
      </div>
    </QueryClientProvider>
  );
}

export default App;
