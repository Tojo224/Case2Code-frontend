import React, { useState } from 'react';
import { Lock, Mail, User as UserIcon, X } from 'lucide-react';
import { useAuthStore } from '../../store/useAuthStore';
import { useCollaborationStore } from '../../store/useCollaborationStore';
import { useDiagramStore } from '../../store/useDiagramStore';

export const AuthModal: React.FC = () => {
  const { isAuthModalOpen, setAuthModalOpen } = useCollaborationStore();
  const { login, register, isLoading, error } = useAuthStore();
  const fetchDiagrams = useDiagramStore((s) => s.fetchDiagrams);

  const [mode, setMode] = useState<'LOGIN' | 'REGISTER'>('LOGIN');
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [avatarColor, setAvatarColor] = useState('#6366F1');

  const COLOR_PALETTE = ['#3B82F6', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6', '#EC4899', '#06B6D4'];

  if (!isAuthModalOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (mode === 'LOGIN') {
      const ok = await login(email, password);
      if (ok) {
        setAuthModalOpen(false);
        await fetchDiagrams();
      }
    } else {
      const ok = await register(name, email, password, avatarColor);
      if (ok) {
        setAuthModalOpen(false);
        await fetchDiagrams();
      }
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-xs p-4 animate-fade-in">
      <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-md overflow-hidden">
        {/* Header with Tabs */}
        <div className="flex items-center justify-between px-6 pt-4 pb-0 border-b border-slate-100">
          <div className="flex gap-4">
            <button
              onClick={() => setMode('LOGIN')}
              className={`pb-3 text-sm font-bold border-b-2 transition-colors ${
                mode === 'LOGIN'
                  ? 'border-indigo-600 text-indigo-600'
                  : 'border-transparent text-slate-400 hover:text-slate-600'
              }`}
            >
              Iniciar Sesión
            </button>
            <button
              onClick={() => setMode('REGISTER')}
              className={`pb-3 text-sm font-bold border-b-2 transition-colors ${
                mode === 'REGISTER'
                  ? 'border-indigo-600 text-indigo-600'
                  : 'border-transparent text-slate-400 hover:text-slate-600'
              }`}
            >
              Crear Cuenta
            </button>
          </div>
          <button
            onClick={() => setAuthModalOpen(false)}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Body */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {error && (
            <div className="p-3 bg-red-50 border border-red-200 text-red-700 text-xs rounded-lg">
              {error}
            </div>
          )}

          {mode === 'REGISTER' && (
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">Nombre Completo</label>
              <div className="relative">
                <UserIcon className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
                <input
                  type="text"
                  required
                  placeholder="Tu Nombre o Alias"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full pl-9 pr-3 py-2 text-sm border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>
            </div>
          )}

          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">Correo Electrónico</label>
            <div className="relative">
              <Mail className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
              <input
                type="email"
                required
                placeholder="correo@ejemplo.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full pl-9 pr-3 py-2 text-sm border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">Contraseña</label>
            <div className="relative">
              <Lock className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
              <input
                type="password"
                required
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full pl-9 pr-3 py-2 text-sm border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>
          </div>

          {mode === 'REGISTER' && (
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1.5">
                Color de Puntero y Avatar
              </label>
              <div className="flex gap-2">
                {COLOR_PALETTE.map((c) => (
                  <button
                    key={c}
                    type="button"
                    onClick={() => setAvatarColor(c)}
                    style={{ backgroundColor: c }}
                    className={`w-7 h-7 rounded-full transition-transform ${
                      avatarColor === c ? 'scale-120 ring-2 ring-indigo-500 ring-offset-2' : 'hover:scale-110'
                    }`}
                  />
                ))}
              </div>
            </div>
          )}

          <button
            type="submit"
            disabled={isLoading}
            className="w-full py-2.5 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white text-sm font-semibold rounded-lg shadow-sm transition-colors mt-2"
          >
            {isLoading
              ? 'Procesando...'
              : mode === 'LOGIN'
              ? 'Iniciar Sesión'
              : 'Crear Cuenta y Entrar'}
          </button>
        </form>
      </div>
    </div>
  );
};
