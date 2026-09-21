import React, { useState } from 'react';
import { Check, Copy, Trash2, UserPlus, Users, X } from 'lucide-react';
import { useCollaborationStore } from '../../store/useCollaborationStore';
import { useDiagramStore } from '../../store/useDiagramStore';
import { useAuthStore } from '../../store/useAuthStore';
import { api } from '../../services/api';

export const InviteModal: React.FC = () => {
  const { isInviteModalOpen, setInviteModalOpen, collaborators, setCollaborators } =
    useCollaborationStore();
  const currentDoc = useDiagramStore((s) => s.currentDocument);
  const demoUsers = useAuthStore((s) => s.demoUsers);
  const currentUser = useAuthStore((s) => s.currentUser);

  const [email, setEmail] = useState('');
  const [role, setRole] = useState<'EDITOR' | 'VIEWER'>('EDITOR');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  if (!isInviteModalOpen || !currentDoc) return null;

  const handleInvite = async (targetEmail: string, targetRole: 'EDITOR' | 'VIEWER' = role) => {
    if (!targetEmail.trim()) return;
    setIsSubmitting(true);
    setError(null);
    try {
      const newCollab = await api.addCollaborator(currentDoc.id, targetEmail.trim(), targetRole);
      // Update store
      const updated = collaborators.filter((c) => c.user_id !== newCollab.user_id);
      setCollaborators([...updated, newCollab]);
      setEmail('');
    } catch (err: any) {
      setError(err.message || 'Error al invitar colaborador');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleRemove = async (userId: string) => {
    try {
      await api.removeCollaborator(currentDoc.id, userId);
      setCollaborators(collaborators.filter((c) => c.user_id !== userId));
    } catch (err: any) {
      setError(err.message || 'Error al remover colaborador');
    }
  };

  const handleCopyLink = () => {
    navigator.clipboard.writeText(window.location.href);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  // Demo users not yet in this project
  const availableDemoUsers = demoUsers.filter(
    (d) =>
      d.user.id !== currentUser?.id &&
      !collaborators.some((c) => c.user_email === d.user.email || c.user_id === d.user.id)
  );

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4 animate-fade-in transition-colors">
      <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-800 w-full max-w-lg overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-950/50">
          <div className="flex items-center gap-2">
            <div className="p-2 rounded-lg bg-indigo-100 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400">
              <Users className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-800 dark:text-slate-100">Colaboradores del Proyecto</h2>
              <p className="text-xs text-slate-500 dark:text-slate-400 truncate max-w-xs">{currentDoc.name}</p>
            </div>
          </div>
          <button
            onClick={() => setInviteModalOpen(false)}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-6 max-h-[75vh] overflow-y-auto">
          {/* Invite form */}
          <div>
            <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-2">
              Invitar por Correo Electrónico
            </label>
            <div className="flex gap-2">
              <input
                type="email"
                placeholder="ej. colega@universidad.edu"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleInvite(email)}
                className="flex-1 px-3.5 py-2 text-sm border border-slate-300 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
              />
              <select
                value={role}
                onChange={(e) => setRole(e.target.value as 'EDITOR' | 'VIEWER')}
                className="px-3 py-2 text-xs font-semibold bg-slate-100 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg text-slate-700 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500"
              >
                <option value="EDITOR">Editor</option>
                <option value="VIEWER">Lector</option>
              </select>
              <button
                disabled={isSubmitting || !email.trim()}
                onClick={() => handleInvite(email)}
                className="flex items-center gap-1.5 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white text-xs font-semibold rounded-lg transition-colors shadow-sm"
              >
                <UserPlus className="w-4 h-4" />
                <span>Invitar</span>
              </button>
            </div>
            {error && <p className="mt-1.5 text-xs text-red-600 dark:text-red-400">{error}</p>}
          </div>

          {/* Quick Add Demo Users */}
          {availableDemoUsers.length > 0 && (
            <div className="p-3.5 bg-indigo-50/60 dark:bg-indigo-950/40 rounded-xl border border-indigo-100 dark:border-indigo-900/50">
              <span className="block text-[11px] font-bold text-indigo-900 dark:text-indigo-300 uppercase tracking-wide mb-2">
                Sugerencias Rápidas para Pruebas (1-Clic)
              </span>
              <div className="flex flex-wrap gap-2">
                {availableDemoUsers.map((d) => (
                  <button
                    key={d.user.id}
                    onClick={() => handleInvite(d.user.email, 'EDITOR')}
                    disabled={isSubmitting}
                    className="flex items-center gap-1.5 px-2.5 py-1 text-xs bg-white dark:bg-slate-800 hover:bg-indigo-100 dark:hover:bg-slate-700 border border-indigo-200 dark:border-slate-700 text-indigo-800 dark:text-indigo-200 rounded-lg font-medium transition-colors shadow-2xs"
                  >
                    <span
                      style={{ backgroundColor: d.user.avatar_color }}
                      className="w-2 h-2 rounded-full"
                    />
                    <span>{d.user.name}</span>
                    <span className="text-[10px] text-indigo-400 font-normal">+ Agregar</span>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Existing Collaborators List */}
          <div>
            <h3 className="text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-3">
              Miembros Actuales ({collaborators.length})
            </h3>
            <div className="divide-y divide-slate-100 dark:divide-slate-800 border border-slate-200 dark:border-slate-800 rounded-xl overflow-hidden">
              {collaborators.map((c) => {
                const isOwner = c.role === 'OWNER';
                return (
                  <div key={c.id} className="flex items-center justify-between p-3 bg-white dark:bg-slate-850">
                    <div className="flex items-center gap-3">
                      <div
                        style={{ backgroundColor: c.avatar_color || '#6366F1' }}
                        className="w-8 h-8 rounded-full flex items-center justify-center text-white text-xs font-bold shadow-xs"
                      >
                        {(c.user_name || 'U').slice(0, 2).toUpperCase()}
                      </div>
                      <div>
                        <p className="text-sm font-semibold text-slate-800 dark:text-slate-100">
                          {c.user_name || c.user_email}
                        </p>
                        <p className="text-xs text-slate-400 dark:text-slate-500">{c.user_email}</p>
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      <span
                        className={`text-[10px] font-bold px-2 py-0.5 rounded-md ${
                          isOwner
                            ? 'bg-amber-100 dark:bg-amber-950/60 text-amber-800 dark:text-amber-300 border border-amber-200 dark:border-amber-800'
                            : c.role === 'EDITOR'
                            ? 'bg-blue-100 dark:bg-blue-950/60 text-blue-800 dark:text-blue-300 border border-blue-200 dark:border-blue-800'
                            : 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700'
                        }`}
                      >
                        {isOwner ? 'PROPIETARIO' : c.role === 'EDITOR' ? 'EDITOR' : 'LECTOR'}
                      </span>

                      {!isOwner && (
                        <button
                          onClick={() => handleRemove(c.user_id)}
                          className="p-1 text-slate-400 hover:text-red-600 dark:hover:text-red-400 rounded transition-colors"
                          title="Remover colaborador"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}

              {collaborators.length === 0 && (
                <div className="p-4 text-center text-xs text-slate-400 dark:text-slate-500">
                  Aún no hay colaboradores agregados a este proyecto.
                </div>
              )}
            </div>
          </div>

          {/* Copy link bar */}
          <div className="flex items-center justify-between p-3 bg-slate-50 dark:bg-slate-800/50 rounded-xl border border-slate-200 dark:border-slate-800">
            <div>
              <p className="text-xs font-semibold text-slate-700 dark:text-slate-200">Enlace directo al proyecto</p>
              <p className="text-[11px] text-slate-400 dark:text-slate-500">Cualquier miembro invitado puede entrar con este enlace</p>
            </div>
            <button
              onClick={handleCopyLink}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-slate-700 dark:text-slate-200 hover:text-slate-900 dark:hover:text-white bg-white dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 border border-slate-300 dark:border-slate-700 rounded-lg transition-colors shadow-2xs"
            >
              {copied ? <Check className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
              <span>{copied ? 'Copiado' : 'Copiar'}</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

