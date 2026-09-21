import React from 'react';
import { UserPlus, WifiOff } from 'lucide-react';
import { useCollaborationStore } from '../../store/useCollaborationStore';
import { useAuthStore } from '../../store/useAuthStore';

export const CollaboratorAvatars: React.FC = () => {
  const { activeUsers, isConnected, setInviteModalOpen } = useCollaborationStore();
  const currentUser = useAuthStore((s) => s.currentUser);

  // Get initials from user name
  const getInitials = (name: string) => {
    const parts = name.trim().split(' ');
    if (parts.length >= 2) {
      return (parts[0][0] + parts[1][0]).toUpperCase();
    }
    return name.slice(0, 2).toUpperCase();
  };

  return (
    <div className="flex items-center gap-2 pl-2 pr-1 py-1 rounded-full bg-slate-100/90 dark:bg-slate-800/90 border border-slate-200/80 dark:border-slate-700/80 shadow-sm backdrop-blur-sm transition-colors">
      {/* Live status badge */}
      <div
        className="flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[11px] font-medium transition-colors"
        title={isConnected ? 'Conectado a la sala en tiempo real' : 'Reconectando sala...'}
      >
        {isConnected ? (
          <>
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
            </span>
            <span className="text-emerald-700 dark:text-emerald-400 font-semibold text-[11px] hidden sm:inline">
              En Vivo ({activeUsers.length})
            </span>
          </>
        ) : (
          <>
            <WifiOff className="w-3 h-3 text-amber-500" />
            <span className="text-amber-700 dark:text-amber-400 text-[11px] hidden sm:inline">Desconectado</span>
          </>
        )}
      </div>

      {/* Avatars Stack */}
      <div className="flex items-center -space-x-2 overflow-hidden py-0.5">
        {activeUsers.slice(0, 4).map((user) => {
          const isSelf = user.user_id === currentUser?.id;
          return (
            <div
              key={user.user_id}
              style={{ backgroundColor: user.avatar_color || '#3B82F6' }}
              className="relative inline-flex items-center justify-center w-7 h-7 rounded-full text-white text-[11px] font-bold border-2 border-white dark:border-slate-800 shadow-sm ring-1 ring-slate-200 dark:ring-slate-700 select-none group cursor-pointer transition-transform hover:scale-110 hover:z-10"
              title={`${user.name} (${user.email})${isSelf ? ' - Vos' : ''}`}
            >
              {getInitials(user.name)}
              {/* Tooltip */}
              <div className="absolute top-9 left-1/2 -translate-x-1/2 opacity-0 group-hover:opacity-100 pointer-events-none transition-opacity bg-slate-900 text-white text-[11px] px-2 py-1 rounded shadow-lg whitespace-nowrap z-50">
                {user.name} {isSelf && '(Vos)'}
              </div>
            </div>
          );
        })}

        {activeUsers.length > 4 && (
          <div className="inline-flex items-center justify-center w-7 h-7 rounded-full bg-slate-600 dark:bg-slate-700 text-white text-[10px] font-bold border-2 border-white dark:border-slate-800 shadow-sm ring-1 ring-slate-200 dark:ring-slate-700">
            +{activeUsers.length - 4}
          </div>
        )}
      </div>

      {/* Share / Invite Button */}
      <button
        onClick={() => setInviteModalOpen(true)}
        className="flex items-center gap-1.5 px-2.5 py-1 text-xs font-semibold text-indigo-700 dark:text-indigo-300 hover:text-indigo-800 dark:hover:text-indigo-200 bg-indigo-50 dark:bg-indigo-950/50 hover:bg-indigo-100/80 dark:hover:bg-indigo-900/60 border border-indigo-200/80 dark:border-indigo-800/80 rounded-full transition-colors shadow-xs ml-1"
        title="Invitar colaboradores al proyecto"
      >
        <UserPlus className="w-3.5 h-3.5" />
        <span className="hidden md:inline">Compartir</span>
      </button>
    </div>
  );
};
