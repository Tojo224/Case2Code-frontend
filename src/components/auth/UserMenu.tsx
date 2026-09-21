import React, { useState, useRef, useEffect } from 'react';
import { ChevronDown, LogIn, LogOut } from 'lucide-react';
import { useAuthStore } from '../../store/useAuthStore';
import { useCollaborationStore } from '../../store/useCollaborationStore';
import { useDiagramStore } from '../../store/useDiagramStore';

export const UserMenu: React.FC = () => {
  const { currentUser, logout } = useAuthStore();
  const setAuthModalOpen = useCollaborationStore((s) => s.setAuthModalOpen);

  const [isOpen, setIsOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleLogout = () => {
    logout();
    setIsOpen(false);
    useDiagramStore.getState().resetDiagrams();
    setAuthModalOpen(true);
  };

  if (!currentUser) {
    return (
      <button
        onClick={() => setAuthModalOpen(true)}
        className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-700 rounded-lg shadow-sm transition-colors"
      >
        <LogIn className="w-3.5 h-3.5" />
        <span>Iniciar Sesión</span>
      </button>
    );
  }

  return (
    <div className="relative" ref={menuRef}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-2 pl-1.5 pr-2.5 py-1 rounded-full bg-slate-100 hover:bg-slate-200/80 dark:bg-slate-800 dark:hover:bg-slate-700 border border-slate-200 dark:border-slate-700 transition-colors shadow-2xs"
        title="Perfil de usuario"
      >
        <div
          style={{ backgroundColor: currentUser.avatar_color || '#3B82F6' }}
          className="w-6 h-6 rounded-full flex items-center justify-center text-white text-[11px] font-bold shadow-xs"
        >
          {(currentUser.name || 'U').slice(0, 2).toUpperCase()}
        </div>
        <span className="text-xs font-semibold text-slate-700 dark:text-slate-200 max-w-[110px] truncate">
          {currentUser.name}
        </span>
        <ChevronDown className="w-3 h-3 text-slate-400 dark:text-slate-500" />
      </button>

      {isOpen && (
        <div className="absolute right-0 mt-2 w-56 bg-white dark:bg-slate-900 rounded-xl shadow-xl border border-slate-200 dark:border-slate-800 py-1.5 z-50 animate-fade-in transition-colors">
          {/* Active User Info */}
          <div className="px-4 py-2.5 border-b border-slate-100 dark:border-slate-800">
            <p className="text-xs font-bold text-slate-800 dark:text-slate-100 truncate">{currentUser.name}</p>
            <p className="text-[11px] text-slate-400 dark:text-slate-500 truncate">{currentUser.email}</p>
          </div>

          {/* Actions */}
          <div className="pt-1">
            <button
              onClick={handleLogout}
              className="w-full flex items-center gap-2 px-4 py-2 text-left text-xs text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/40 transition-colors"
            >
              <LogOut className="w-3.5 h-3.5" />
              <span>Cerrar Sesión</span>
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
