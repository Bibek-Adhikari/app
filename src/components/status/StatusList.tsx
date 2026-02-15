import { useState } from 'react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Plus, Loader2 } from 'lucide-react';
import { useStories } from '@/hooks/useStories';
import type { Profile } from '@/types';
import { StatusView } from './StatusView';

interface StatusListProps {
  currentUser: Profile;
  onViewStatus?: () => void;
}

export function StatusList({ currentUser }: StatusListProps) {
  const { stories, storiesByUser, isLoading } = useStories(currentUser.id);
  const [showStatusView, setShowStatusView] = useState(false);

  if (isLoading) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <Loader2 className="w-8 h-8 text-emerald-500 animate-spin" />
      </div>
    );
  }

  return (
    <>
      <div className="flex-1 overflow-auto p-4">
        {/* My Status */}
        <div className="mb-6">
          <h3 className="text-sm font-medium text-slate-500 mb-3">My Status</h3>
          <button
            onClick={() => setShowStatusView(true)}
            className="w-full flex items-center gap-3 p-3 rounded-xl hover:bg-slate-800/50 transition-colors"
          >
            <div className="relative">
              <Avatar className="w-14 h-14 ring-2 ring-dashed ring-slate-600">
                <AvatarImage src={currentUser.avatar_url || undefined} />
                <AvatarFallback className="bg-gradient-to-br from-emerald-500 to-teal-600 text-white">
                  {currentUser.username?.[0]?.toUpperCase()}
                </AvatarFallback>
              </Avatar>
              <div className="absolute -bottom-1 -right-1 w-6 h-6 rounded-full bg-emerald-500 flex items-center justify-center">
                <Plus className="w-4 h-4 text-white" />
              </div>
            </div>
            <div className="text-left">
              <p className="font-medium text-white">My Status</p>
              <p className="text-sm text-slate-400">Tap to add status update</p>
            </div>
          </button>
        </div>

        {/* Recent Updates */}
        {Object.entries(storiesByUser).length > 0 && (
          <div>
            <h3 className="text-sm font-medium text-slate-500 mb-3">Recent Updates</h3>
            <div className="space-y-2">
              {Object.entries(storiesByUser).map(([userId, userStories]) => {
                const profile = userStories[0]?.profile;
                const hasUnviewed = userStories.some((s) => !s.has_viewed);

                return (
                  <button
                    key={userId}
                    onClick={() => setShowStatusView(true)}
                    className="w-full flex items-center gap-3 p-3 rounded-xl hover:bg-slate-800/50 transition-colors"
                  >
                    <div className="relative">
                      <Avatar
                        className={`w-14 h-14 ring-2 ${
                          hasUnviewed ? 'ring-emerald-500' : 'ring-slate-600'
                        }`}
                      >
                        <AvatarImage src={profile?.avatar_url || undefined} />
                        <AvatarFallback className="bg-slate-700 text-white">
                          {profile?.username?.[0]?.toUpperCase()}
                        </AvatarFallback>
                      </Avatar>
                    </div>
                    <div className="text-left">
                      <p className="font-medium text-white">
                        {profile?.full_name || profile?.username}
                      </p>
                      <p className="text-sm text-slate-400">
                        {userStories.length} {userStories.length === 1 ? 'update' : 'updates'}
                      </p>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {stories.length === 0 && (
          <div className="text-center py-12">
            <div className="w-20 h-20 mx-auto mb-4 rounded-full bg-slate-800/50 flex items-center justify-center">
              <Plus className="w-8 h-8 text-slate-600" />
            </div>
            <p className="text-slate-500">No status updates yet</p>
            <p className="text-sm text-slate-600 mt-1">
              Be the first to share a story!
            </p>
          </div>
        )}
      </div>

      {showStatusView && (
        <StatusView currentUser={currentUser} onClose={() => setShowStatusView(false)} />
      )}
    </>
  );
}
