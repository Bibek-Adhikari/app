import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { Toaster } from '@/components/ui/sonner';
import { LoginForm } from '@/components/auth/LoginForm';
import { RegisterForm } from '@/components/auth/RegisterForm';
import { Sidebar } from '@/components/sidebar/Sidebar';
import { ChatWindow } from '@/components/chat/ChatWindow';
import { StatusList } from '@/components/status/StatusList';
import { useAuth } from '@/hooks/useAuth';
import { useRooms } from '@/hooks/useRooms';
import { isDemoMode, toggleDemoMode } from '@/lib/supabase/client';
import { Button } from '@/components/ui/button';
import { FlaskConical } from 'lucide-react';
import type { Profile } from '@/types';
import './App.css';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 60 * 5,
      retry: 2,
    },
  },
});

export default function App() {
  const { user, profile, isLoading: isAuthLoading } = useAuth();
  const { rooms } = useRooms(user?.id ?? undefined);
  const [authView, setAuthView] = useState<'login' | 'register'>('login');
  const [activeTab, setActiveTab] = useState<'chats' | 'status' | 'calls'>('chats');
  const [activeRoomId, setActiveRoomId] = useState<string | null>(null);

  const activeRoom = rooms.find(r => r.id === activeRoomId) || null;

  const handleLogin = () => {
    // Auth state is handled by useAuth
  };

  const handleLogout = () => {
    // Auth state is handled by useAuth
    setActiveRoomId(null);
  };

  if (isAuthLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <p className="text-muted-foreground">Loading WhatsApp...</p>
        </div>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <div className="absolute inset-0 overflow-hidden pointer-events-none opacity-20">
          <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-primary/20 rounded-full blur-3xl" />
          <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-primary/20 rounded-full blur-3xl" />
        </div>
        {isDemoMode && (
          <div className="absolute top-4 left-1/2 -translate-x-1/2 z-20 bg-primary/20 border border-primary/30 rounded-full px-4 py-2 flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-primary animate-pulse" />
            <span className="text-primary text-sm font-medium">Demo Mode - Click Sign In to preview</span>
          </div>
        )}
        <AnimatePresence mode="wait">
          {authView === 'login' ? (
            <LoginForm key="login" onSuccess={handleLogin} onRegisterClick={() => setAuthView('register')} />
          ) : (
            <RegisterForm key="register" onSuccess={() => setAuthView('login')} onLoginClick={() => setAuthView('login')} />
          )}
        </AnimatePresence>

        {/* Test Mode Toggle - Global (Non-auth) */}
        <div className="fixed bottom-4 right-4 z-[100]">
          <Button
            variant="outline"
            size="sm"
            onClick={toggleDemoMode}
            className={`rounded-full shadow-lg backdrop-blur-md border border-border flex items-center gap-2 px-4 h-10 transition-all ${
              isDemoMode 
                ? 'bg-primary/10 text-primary hover:bg-primary/20' 
                : 'bg-secondary/80 text-muted-foreground hover:text-foreground hover:bg-secondary'
            }`}
          >
            <FlaskConical className={`w-4 h-4 ${isDemoMode ? 'animate-pulse' : ''}`} />
            <span className="text-xs font-semibold uppercase tracking-wider">
              {isDemoMode ? 'Exit Test Mode' : 'Enter Test Mode'}
            </span>
          </Button>
        </div>
      </div>
    );
  }

  return (
    <QueryClientProvider client={queryClient}>
      <div className="min-h-screen bg-background flex overflow-hidden">
        {isDemoMode && (
          <div className="fixed top-4 left-1/2 -translate-x-1/2 z-50 bg-primary/20 border border-primary/30 rounded-full px-4 py-2 flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-primary animate-pulse" />
            <span className="text-primary text-sm font-medium">Demo Mode</span>
          </div>
        )}
        <Sidebar
          rooms={rooms}
          activeRoom={activeRoom}
          currentUser={(profile || user) as unknown as Profile}
          onRoomSelect={(room) => { setActiveRoomId(room.id); setActiveTab('chats'); }}
          onTabChange={setActiveTab}
          activeTab={activeTab}
          onLogout={handleLogout}
          storiesCount={0}
          className={activeRoom ? 'hidden lg:flex' : 'flex'}
        />
        <main className={`flex-1 flex flex-col min-w-0 ${!activeRoom ? 'hidden lg:flex' : 'flex'}`}>
          <AnimatePresence mode="wait">
            {activeTab === 'chats' && (
              <motion.div key="chats" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="flex-1 flex">
                {activeRoom ? ( // Original condition for ChatWindow
                  <ChatWindow
                    room={activeRoom}
                    currentUser={(profile || user) as unknown as Profile}
                    onBack={() => setActiveRoomId(null)}
                  />
                ) : (
                  <div className="flex-1 flex items-center justify-center whatsapp-chat-bg">
                    <div className="text-center px-4">
                      <div className="w-24 h-24 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-6">
                        <svg className="w-12 h-12 text-primary" viewBox="0 0 24 24" fill="currentColor">
                          <path d="M12.031 6.172c-3.181 0-5.767 2.586-5.768 5.766-.001 1.298.38 2.27 1.025 3.212l-.582 2.128 2.181-.571c.902.502 1.888.854 3.123.854 3.181 0 5.767-2.586 5.768-5.766 0-3.18-2.587-5.766-5.767-5.766zM15.54 14.505c-.176.495-.862.904-1.182.964-.32.06-.61.127-1.664-.289-1.256-.499-2.072-1.765-2.135-1.848-.063-.083-.51-.678-.51-1.294s.324-.908.439-1.032c.116-.124.254-.155.338-.155s.168.001.242.005c.08.003.186-.03.291.221.105.251.358.871.39 0.933s.053.134-.01.268c-.063.134-.116.223-.23.355s-.242.223-.346.335c-.105.111-.215.234-.092.443.122.21.543.896 1.164 1.448.799.712 1.47.933 1.68.995s.339.043.465-.104c.127-.145.545-.635.692-.852s.296-.182.497-.107c.201.076 1.272.6 1.494.712s.369.168.422.26c.053.092.053.535-.123 1.03z"/>
                        </svg>
                      </div>
                      <h2 className="text-3xl font-light text-foreground mb-4">WhatsApp Web</h2>
                      <p className="text-muted-foreground max-w-sm mx-auto leading-relaxed">
                        Send and receive messages without keeping your phone online. Use WhatsApp on up to 4 linked devices and 1 phone at the same time.
                      </p>
                    </div>
                  </div>
                )}
              </motion.div>
            )}
            {activeTab === 'status' && (
              <motion.div key="status" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="flex-1 flex overflow-hidden">
                <StatusList currentUser={profile || (user as unknown as Profile)} onViewStatus={() => {}} />
              </motion.div>
            )}
            {activeTab === 'calls' && (
              <motion.div key="calls" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="flex-1 flex">
                <div className="flex-1 flex items-center justify-center bg-background">
                  <div className="text-center px-4">
                    <div className="text-6xl mb-4">📞</div>
                    <h2 className="text-2xl font-bold text-foreground mb-2">Calls</h2>
                    <p className="text-muted-foreground max-w-md">Your call history will appear here</p>
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </main>
        <Toaster />
      </div>
      
      {/* Test Mode Toggle - Global */}
      <div className="fixed bottom-4 right-4 z-[100]">
        <Button
          variant="outline"
          size="sm"
          onClick={toggleDemoMode}
          className={`rounded-full shadow-lg backdrop-blur-md border border-border flex items-center gap-2 px-4 h-10 transition-all ${
            isDemoMode 
              ? 'bg-primary/10 text-primary hover:bg-primary/20' 
              : 'bg-secondary/80 text-muted-foreground hover:text-foreground hover:bg-secondary'
          }`}
        >
          <FlaskConical className={`w-4 h-4 ${isDemoMode ? 'animate-pulse' : ''}`} />
          <span className="text-xs font-semibold uppercase tracking-wider">
            {isDemoMode ? 'Exit Test Mode' : 'Enter Test Mode'}
          </span>
        </Button>
      </div>
    </QueryClientProvider>
  );
}


