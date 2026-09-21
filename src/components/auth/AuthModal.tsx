import React, { useState } from 'react';
import { ArrowLeft, CheckCircle, Eye, EyeOff, KeyRound, Lock, Mail, User as UserIcon, X } from 'lucide-react';
import { useAuthStore } from '../../store/useAuthStore';
import { useCollaborationStore } from '../../store/useCollaborationStore';
import { useDiagramStore } from '../../store/useDiagramStore';

export const AuthModal: React.FC = () => {
  const { isAuthModalOpen, setAuthModalOpen } = useCollaborationStore();
  const { login, register, forgotPassword, resetPassword, isLoading, error, clearError } = useAuthStore();
  const fetchDiagrams = useDiagramStore((s) => s.fetchDiagrams);

  const [mode, setMode] = useState<'LOGIN' | 'REGISTER' | 'FORGOT' | 'RESET'>('LOGIN');
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [resetToken, setResetToken] = useState('');
  const [avatarColor, setAvatarColor] = useState('#6366F1');
  const [localError, setLocalError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [devToken, setDevToken] = useState<string | null>(null);

  const COLOR_PALETTE = ['#3B82F6', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6', '#EC4899', '#06B6D4'];

  if (!isAuthModalOpen) return null;

  const resetMessages = () => {
    setLocalError(null);
    setSuccessMessage(null);
    clearError();
  };

  const switchMode = (newMode: 'LOGIN' | 'REGISTER' | 'FORGOT' | 'RESET') => {
    setMode(newMode);
    resetMessages();
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    resetMessages();

    if (mode === 'LOGIN') {
      const ok = await login(email, password);
      if (ok) {
        setAuthModalOpen(false);
        await fetchDiagrams();
      }
    } else if (mode === 'REGISTER') {
      if (password.length < 6) {
        setLocalError('La contraseña debe tener al menos 6 caracteres.');
        return;
      }
      if (password !== confirmPassword) {
        setLocalError('Las contraseñas no coinciden. Verificalas por favor.');
        return;
      }
      const ok = await register(name, email, password, avatarColor);
      if (ok) {
        setAuthModalOpen(false);
        await fetchDiagrams();
      }
    } else if (mode === 'FORGOT') {
      const res = await forgotPassword(email);
      if (res.ok) {
        setSuccessMessage(res.message);
        if (res.devToken) {
          setDevToken(res.devToken);
        }
      }
    } else if (mode === 'RESET') {
      if (password.length < 6) {
        setLocalError('La nueva contraseña debe tener al menos 6 caracteres.');
        return;
      }
      if (password !== confirmPassword) {
        setLocalError('Las contraseñas no coinciden.');
        return;
      }
      const res = await resetPassword(resetToken.trim(), password);
      if (res.ok) {
        setSuccessMessage(res.message);
        setTimeout(() => {
          switchMode('LOGIN');
          setPassword('');
          setConfirmPassword('');
          setResetToken('');
        }, 1800);
      }
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4 animate-fade-in">
      <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-800 w-full max-w-md overflow-hidden">
        {/* Header with Tabs / Navigation */}
        <div className="flex items-center justify-between px-6 pt-4 pb-0 border-b border-slate-100 dark:border-slate-800">
          {mode === 'LOGIN' || mode === 'REGISTER' ? (
            <div className="flex gap-4">
              <button
                type="button"
                onClick={() => switchMode('LOGIN')}
                className={`pb-3 text-sm font-bold border-b-2 transition-colors ${
                  mode === 'LOGIN'
                    ? 'border-indigo-600 dark:border-indigo-400 text-indigo-600 dark:text-indigo-400'
                    : 'border-transparent text-slate-400 hover:text-slate-600 dark:hover:text-slate-200'
                }`}
              >
                Iniciar Sesión
              </button>
              <button
                type="button"
                onClick={() => switchMode('REGISTER')}
                className={`pb-3 text-sm font-bold border-b-2 transition-colors ${
                  mode === 'REGISTER'
                    ? 'border-indigo-600 dark:border-indigo-400 text-indigo-600 dark:text-indigo-400'
                    : 'border-transparent text-slate-400 hover:text-slate-600 dark:hover:text-slate-200'
                }`}
              >
                Crear Cuenta
              </button>
            </div>
          ) : (
            <div className="flex items-center gap-2 pb-3">
              <button
                type="button"
                onClick={() => switchMode('LOGIN')}
                className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition-colors p-1 -ml-1 rounded-md"
              >
                <ArrowLeft className="w-4 h-4" />
              </button>
              <span className="text-sm font-bold text-slate-800 dark:text-slate-100">
                {mode === 'FORGOT' ? 'Recuperar Contraseña' : 'Nueva Contraseña'}
              </span>
            </div>
          )}

          <button
            type="button"
            onClick={() => setAuthModalOpen(false)}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Body */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {(error || localError) && (
            <div className="p-3 bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-900 text-red-700 dark:text-red-300 text-xs rounded-lg">
              {localError || error}
            </div>
          )}

          {successMessage && (
            <div className="p-3 bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 text-emerald-700 dark:text-emerald-300 text-xs rounded-lg flex items-start gap-2">
              <CheckCircle className="w-4 h-4 mt-0.5 shrink-0" />
              <span>{successMessage}</span>
            </div>
          )}

          {devToken && mode === 'FORGOT' && (
            <div className="p-3 bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800 text-amber-800 dark:text-amber-200 text-xs rounded-lg space-y-2">
              <div className="font-semibold">Modo Entorno Local / Examen:</div>
              <div className="font-mono text-[11px] break-all bg-white dark:bg-slate-900 p-2 rounded border border-amber-300 dark:border-amber-700">
                {devToken}
              </div>
              <button
                type="button"
                onClick={() => {
                  setResetToken(devToken);
                  switchMode('RESET');
                }}
                className="text-xs font-semibold text-amber-700 dark:text-amber-300 underline hover:text-amber-900"
              >
                Completar token automáticamente y continuar &rarr;
              </button>
            </div>
          )}

          {mode === 'REGISTER' && (
            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">Nombre Completo</label>
              <div className="relative">
                <UserIcon className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
                <input
                  type="text"
                  required
                  placeholder="Tu Nombre o Alias"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full pl-9 pr-3 py-2 text-sm bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg text-slate-900 dark:text-slate-100 placeholder-slate-400 dark:placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>
            </div>
          )}

          {(mode === 'LOGIN' || mode === 'REGISTER' || mode === 'FORGOT') && (
            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">Correo Electrónico</label>
              <div className="relative">
                <Mail className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
                <input
                  type="email"
                  required
                  placeholder="correo@ejemplo.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full pl-9 pr-3 py-2 text-sm bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg text-slate-900 dark:text-slate-100 placeholder-slate-400 dark:placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>
            </div>
          )}

          {mode === 'RESET' && (
            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">Token de Recuperación</label>
              <div className="relative">
                <KeyRound className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
                <input
                  type="text"
                  required
                  placeholder="Pegá aquí el token recibido"
                  value={resetToken}
                  onChange={(e) => setResetToken(e.target.value)}
                  className="w-full pl-9 pr-3 py-2 text-sm bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg text-slate-900 dark:text-slate-100 placeholder-slate-400 dark:placeholder-slate-500 font-mono text-xs focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>
            </div>
          )}

          {(mode === 'LOGIN' || mode === 'REGISTER' || mode === 'RESET') && (
            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300">
                  {mode === 'RESET' ? 'Nueva Contraseña' : 'Contraseña'}
                </label>
                {mode === 'LOGIN' && (
                  <button
                    type="button"
                    onClick={() => switchMode('FORGOT')}
                    className="text-xs text-indigo-600 dark:text-indigo-400 hover:underline"
                  >
                    ¿Olvidaste tu contraseña?
                  </button>
                )}
              </div>
              <div className="relative">
                <Lock className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
                <input
                  type={showPassword ? 'text' : 'password'}
                  required
                  placeholder="Mínimo 6 caracteres"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full pl-9 pr-10 py-2 text-sm bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg text-slate-900 dark:text-slate-100 placeholder-slate-400 dark:placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-2.5 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition-colors"
                  tabIndex={-1}
                  title={showPassword ? 'Ocultar contraseña' : 'Ver contraseña'}
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>
          )}

          {(mode === 'REGISTER' || mode === 'RESET') && (
            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                Confirmar Contraseña
              </label>
              <div className="relative">
                <Lock className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
                <input
                  type={showConfirmPassword ? 'text' : 'password'}
                  required
                  placeholder="Repetí tu contraseña"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  className="w-full pl-9 pr-10 py-2 text-sm bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg text-slate-900 dark:text-slate-100 placeholder-slate-400 dark:placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
                <button
                  type="button"
                  onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                  className="absolute right-3 top-2.5 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition-colors"
                  tabIndex={-1}
                  title={showConfirmPassword ? 'Ocultar contraseña' : 'Ver contraseña'}
                >
                  {showConfirmPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>
          )}

          {mode === 'REGISTER' && (
            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
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
                      avatarColor === c ? 'scale-120 ring-2 ring-indigo-500 ring-offset-2 dark:ring-offset-slate-900' : 'hover:scale-110'
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
              : mode === 'REGISTER'
              ? 'Crear Cuenta y Entrar'
              : mode === 'FORGOT'
              ? 'Enviar Instrucciones'
              : 'Actualizar Contraseña'}
          </button>

          {mode === 'FORGOT' && (
            <div className="text-center pt-2">
              <button
                type="button"
                onClick={() => switchMode('RESET')}
                className="text-xs text-slate-500 hover:text-indigo-600 dark:hover:text-indigo-400 underline"
              >
                ¿Ya tenés un token? Ingresalo aquí &rarr;
              </button>
            </div>
          )}
        </form>
      </div>
    </div>
  );
};
