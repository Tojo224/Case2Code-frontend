import React, { useState, useRef, useEffect } from 'react';
import { ChevronDown, LogIn, LogOut, Sparkles, UserCheck } from 'lucide-react';
import { useAuthStore } from '../../store/useAuthStore';
import { useCollaborationStore } from '../../store/useCollaborationStore';
import { useDiagramStore } from '../../store/useDiagramStore';

export const UserMenu: React.FC = () => {
  const { currentUser, demoUsers, switchUser, logout } = useAuthStore();
  const setAuthModalOpen = useCollaborationStore((s) => s.setAuthModalOpen);
  const fetchDiagrams = useDiagramStore((s) => s.fetchDiagrams);

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

  const handleSwitchUser = async (demo: any) => {
    switchUser(demo);
    setIsOpen(false);
    // Refresh diagrams for newly active user
    await fetchDiagrams();
  };

  const handleLogout = async () => {
    logout();
    setIsOpen(false);
    await fetchDiagrams();
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
        className="flex items-center gap-2 pl-1.5 pr-2.5 py-1 rounded-full bg-slate-100 hover:bg-slate-200/80 border border-slate-200 transition-colors shadow-2xs"
        title="Perfil y conmutador de usuarios"
      >
        <div
          style={{ backgroundColor: currentUser.avatar_color || '#3B82F6' }}
          className="w-6 h-6 rounded-full flex items-center justify-center text-white text-[11px] font-bold shadow-xs"
        >
          {(currentUser.name || 'U').slice(0, 2).toUpperCase()}
        </div>
        <span className="text-xs font-semibold text-slate-700 max-w-[110px] truncate">
          {currentUser.name}
        </span>
        <ChevronDown className="w-3 h-3 text-slate-400" />
      </button>

      {isOpen && (
        <div className="absolute right-0 mt-2 w-64 bg-white rounded-xl shadow-xl border border-slate-200 py-2 z-50 animate-fade-in">
          {/* Active User Info */}
          <div className="px-4 py-2 border-b border-slate-100">
            <p className="text-xs font-bold text-slate-800">{currentUser.name}</p>
            <p className="text-[11px] text-slate-400 truncate">{currentUser.email}</p>
          </div>

          {/* Quick Demo Switcher Section */}
          <div className="py-2 border-b border-slate-100">
            <div className="flex items-center gap-1 px-4 py-1 text-[10px] font-bold text-slate-400 uppercase tracking-wider">
              <Sparkles className="w-3 h-3 text-amber-500" />
              <span>Conmutador Rápido (Demo)</span>
            </div>
            {demoUsers.map((d) => {
              const isSelected = d.user.id === currentUser.id;
              return (
                <button
                  key={d.user.id}
                  onClick={() => handleSwitchUser(d)}
                  className={`w-full flex items-center justify-between px-4 py-2 text-left text-xs transition-colors ${
                    isSelected ? 'bg-indigo-50 font-semibold text-indigo-900' : 'hover:bg-slate-50 text-slate-700'
                  }`}
                >
                  <div className="flex items-center gap-2">
                    <span
                      style={{ backgroundColor: d.user.avatar_color }}
                      className="w-2.5 h-2.5 rounded-full ring-1 ring-slate-300"
                    />
                    <div className="truncate">
                      <p className="truncate text-xs">{d.user.name}</p>
                    </div>
                  </div>
                  {isSelected && <UserCheck className="w-3.5 h-3.5 text-indigo-600 shrink-0" />}
                </button>
              );
            })}
          </div>

          {/* Custom Account Actions */}
          <div className="pt-1">
            <button
              onClick={() => {
                setIsOpen(false);
                setAuthModalOpen(true);
              }}
              className="w-full flex items-center gap-2 px-4 py-2 text-left text-xs text-slate-700 hover:bg-slate-50 transition-colors"
            >
              <LogIn className="w-3.5 h-3.5 text-slate-400" />
              <span>Crear otra cuenta / Login manual</span>
            </button>
            <button
              onClick={handleLogout}
              className="w-full flex items-center gap-2 px-4 py-2 text-left text-xs text-red-600 hover:bg-red-50 transition-colors"
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
