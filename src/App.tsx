import { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
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
import './App.css';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 60 * 5,
      retry: 2,
    },
  },
});


function App() {
  const { user, profile, isAuthenticated: isAuth, isLoading: isAuthLoading } = useAuth();
  const { rooms } = useRooms(user?.id);
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
      <div className="min-h-screen bg-slate-950 flex items-center justify-center">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-emerald-500 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <p className="text-slate-400">Loading Stunner...</p>
        </div>
      </div>
    );
  }

  if (!isAuth) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 flex items-center justify-center p-4">
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-emerald-500/10 rounded-full blur-3xl" />
          <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-teal-500/10 rounded-full blur-3xl" />
        </div>
        {isDemoMode && (
          <div className="absolute top-4 left-1/2 -translate-x-1/2 z-20 bg-emerald-500/20 border border-emerald-500/30 rounded-full px-4 py-2 flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
            <span className="text-emerald-400 text-sm font-medium">Demo Mode - Click Sign In to preview</span>
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
            className={`rounded-full shadow-lg backdrop-blur-md border border-slate-700/50 flex items-center gap-2 px-4 h-10 transition-all ${
              isDemoMode 
                ? 'bg-emerald-500/10 text-emerald-400 hover:bg-emerald-500/20' 
                : 'bg-slate-900/80 text-slate-400 hover:text-white hover:bg-slate-800'
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
      <div className="min-h-screen bg-slate-950 flex">
        {isDemoMode && (
          <div className="fixed top-4 left-1/2 -translate-x-1/2 z-50 bg-emerald-500/20 border border-emerald-500/30 rounded-full px-4 py-2 flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
            <span className="text-emerald-400 text-sm font-medium">Demo Mode</span>
          </div>
        )}
        <Sidebar
          rooms={rooms}
          activeRoom={activeRoom}
          currentUser={profile || (user as any)}
          onRoomSelect={(room) => { setActiveRoomId(room.id); setActiveTab('chats'); }}
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
                  <ChatWindow 
                    room={activeRoom} 
                    currentUser={profile || (user as any)} 
                    onBack={() => setActiveRoomId(null)} 
                  />
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
                <StatusList currentUser={profile || (user as any)} onViewStatus={() => {}} />
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
      
      {/* Test Mode Toggle - Global */}
      <div className="fixed bottom-4 right-4 z-[100]">
        <Button
          variant="outline"
          size="sm"
          onClick={toggleDemoMode}
          className={`rounded-full shadow-lg backdrop-blur-md border border-slate-700/50 flex items-center gap-2 px-4 h-10 transition-all ${
            isDemoMode 
              ? 'bg-emerald-500/10 text-emerald-400 hover:bg-emerald-500/20' 
              : 'bg-slate-900/80 text-slate-400 hover:text-white hover:bg-slate-800'
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

export default App;
