import React, { useState, useEffect, useRef, useMemo } from 'react';
import { useDiagramStore } from '../../store/useDiagramStore';
import { useCollaborationStore } from '../../store/useCollaborationStore';
import { useAuthStore } from '../../store/useAuthStore';
import { collaborationWs } from '../../services/websocket';
import { api } from '../../services/api';
import {
  Bot,
  Sparkles,
  Mic,
  MicOff,
  Send,
  X,
  CheckCircle2,
  Loader2,
  Image as ImageIcon,
  Lightbulb,
  Zap,
  AtSign,
  Cpu,
  Terminal,
  RefreshCw,
} from 'lucide-react';
import { AiProviderStatus, ChatMessage } from '../../types/collaboration';

export const CaseAssistantChat: React.FC = () => {
  const { isAssistantOpen, toggleAssistant, sendAssistantPrompt, currentDocument } =
    useDiagramStore();
  const {
    chatMessages,
    typingUsers,
    activeUsers,
    aiMode,
    setAiMode,
    loadChatHistory,
  } = useCollaborationStore();
  const { currentUser } = useAuthStore();

  const [inputPrompt, setInputPrompt] = useState('');
  const [isUploadingImage, setIsUploadingImage] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const [speechSupported, setSpeechSupported] = useState(false);
  const [attachedImage, setAttachedImage] = useState<{
    base64: string;
    mimeType: string;
    previewUrl: string;
    name: string;
  } | null>(null);

  // Local AI & Provider Configuration State
  const [isConfigOpen, setIsConfigOpen] = useState(false);
  const [aiStatus, setAiStatus] = useState<AiProviderStatus | null>(null);
  const [providerModeInput, setProviderModeInput] = useState<'local' | 'hybrid' | 'gemini'>('hybrid');
  const [localUrlInput, setLocalUrlInput] = useState('http://localhost:11434');
  const [localModelInput, setLocalModelInput] = useState('qwen2.5-coder:3b');
  const [isSavingConfig, setIsSavingConfig] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const recognitionRef = useRef<any>(null);
  const typingTimeoutRef = useRef<number | null>(null);

  const fetchAiStatus = async () => {
    try {
      const status = await api.getAiConfig();
      setAiStatus(status);
      setProviderModeInput(status.provider_mode);
      setLocalUrlInput(status.local_base_url);
      setLocalModelInput(status.local_model);
    } catch {
      // Ignore if offline during initial render
    }
  };

  // Load chat history and AI provider status when diagram changes or drawer opens
  useEffect(() => {
    if (currentDocument?.id && isAssistantOpen) {
      loadChatHistory(currentDocument.id);
      fetchAiStatus();
    }
  }, [currentDocument?.id, isAssistantOpen, loadChatHistory]);

  const handleSaveAiConfig = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSavingConfig(true);
    try {
      const updated = await api.updateAiConfig({
        provider_mode: providerModeInput,
        local_base_url: localUrlInput.trim(),
        local_model: localModelInput.trim(),
      });
      setAiStatus(updated);
    } catch (err) {
      console.error('Failed to update AI config:', err);
    } finally {
      setIsSavingConfig(false);
    }
  };

  // Speech Recognition setup
  useEffect(() => {
    const SpeechRecognition =
      (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (SpeechRecognition) {
      setSpeechSupported(true);
      const recognition = new SpeechRecognition();
      recognition.continuous = false;
      recognition.interimResults = false;
      recognition.lang = 'es-ES';

      recognition.onstart = () => {
        setIsListening(true);
      };

      recognition.onresult = (event: any) => {
        const transcript = event.results[0][0]?.transcript;
        setIsListening(false);
        if (transcript && transcript.trim()) {
          setInputPrompt(transcript);
        }
      };

      recognition.onerror = () => {
        setIsListening(false);
      };

      recognition.onend = () => {
        setIsListening(false);
      };

      recognitionRef.current = recognition;
    }
  }, []);

  // Auto-scroll chat to bottom
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [chatMessages, typingUsers, isUploadingImage, attachedImage]);

  // Typing indicator broadcast logic
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setInputPrompt(e.target.value);

    collaborationWs.setTyping(true);

    if (typingTimeoutRef.current) {
      window.clearTimeout(typingTimeoutRef.current);
    }

    typingTimeoutRef.current = window.setTimeout(() => {
      collaborationWs.setTyping(false);
      typingTimeoutRef.current = null;
    }, 2500);
  };

  const processImageFile = (file: File) => {
    if (!file.type.startsWith('image/')) return;
    const reader = new FileReader();
    reader.onload = () => {
      const result = reader.result as string;
      const commaIndex = result.indexOf(',');
      const base64 = commaIndex !== -1 ? result.substring(commaIndex + 1) : result;
      setAttachedImage({
        base64,
        mimeType: file.type,
        previewUrl: result,
        name: file.name || 'boceto.png',
      });
    };
    reader.readAsDataURL(file);
  };

  const handlePaste = (e: React.ClipboardEvent) => {
    const items = e.clipboardData?.items;
    if (!items) return;
    for (let i = 0; i < items.length; i++) {
      const item = items[i];
      if (item.type.indexOf('image') !== -1) {
        const file = item.getAsFile();
        if (file) {
          processImageFile(file);
          e.preventDefault();
          break;
        }
      }
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      const file = e.dataTransfer.files[0];
      if (file.type.startsWith('image/')) {
        processImageFile(file);
      }
    }
  };

  const handleToggleVoice = () => {
    if (!recognitionRef.current) return;
    if (isListening) {
      recognitionRef.current.stop();
      setIsListening(false);
    } else {
      try {
        recognitionRef.current.start();
      } catch (e) {
        console.error('Speech recognition error:', e);
      }
    }
  };

  const handleSendMessage = async (textToSend?: string) => {
    const prompt = (textToSend || inputPrompt).trim();
    if ((!prompt && !attachedImage) || !currentDocument) return;

    if (typingTimeoutRef.current) {
      window.clearTimeout(typingTimeoutRef.current);
      typingTimeoutRef.current = null;
    }
    collaborationWs.setTyping(false);

    if (attachedImage) {
      const finalPrompt = prompt || 'Replicar este boceto en el diagrama UML.';
      const currentAttached = attachedImage;
      setInputPrompt('');
      setAttachedImage(null);
      setIsUploadingImage(true);

      try {
        await sendAssistantPrompt(finalPrompt, {
          base64: currentAttached.base64,
          mimeType: currentAttached.mimeType,
        });
      } catch (e: any) {
        console.error('Vision assistant error:', e);
      } finally {
        setIsUploadingImage(false);
      }
      return;
    }

    setInputPrompt('');
    collaborationWs.sendChatMessage(prompt, aiMode);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  const isAiTyping = Boolean(typingUsers['ai-senior']?.isTyping);
  const typingUserNames = useMemo(() => {
    return Object.entries(typingUsers)
      .filter(([id, state]) => id !== 'ai-senior' && id !== currentUser?.id && state.isTyping)
      .map(([, state]) => state.userName);
  }, [typingUsers, currentUser?.id]);

  const quickPrompts = [
    '¿Qué opinas de la cardinalidad entre las entidades?',
    'Crea la clase Factura con id, fecha y total',
    'Revisa si el diseño cumple con 3FN',
    'Relaciona Cliente con Pedido de 1 a N',
  ];

  if (!isAssistantOpen) return null;

  return (
    <aside
      onDragOver={(e) => e.preventDefault()}
      onDrop={handleDrop}
      className="fixed right-0 sm:right-4 top-14 sm:top-16 bottom-0 sm:bottom-4 w-full sm:w-[430px] max-w-full bg-white dark:bg-slate-900 border-l sm:border border-slate-200/90 dark:border-slate-800 rounded-none sm:rounded-2xl shadow-2xl flex flex-col z-40 overflow-hidden animate-in slide-in-from-right duration-200 transition-colors"
    >
      {/* Header */}
      <div className="bg-slate-900 dark:bg-slate-950 text-white px-4 py-3 flex items-center justify-between border-b border-slate-800">
        <div className="flex items-center space-x-2.5">
          <div className="bg-gradient-to-tr from-purple-600 to-indigo-500 text-white p-2 rounded-xl shadow-md border border-purple-400/30">
            <Bot className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center space-x-1.5">
              <h3 className="font-bold text-sm tracking-tight text-white">Senior AI Colleague</h3>
              <span
                className={`text-[10px] font-semibold px-1.5 py-0.5 rounded border ${
                  aiStatus?.local_online
                    ? 'bg-emerald-500/20 text-emerald-300 border-emerald-400/40'
                    : 'bg-purple-500/30 text-purple-200 border-purple-400/30'
                }`}
              >
                {aiStatus?.local_online ? `Local: ${aiStatus.local_model}` : 'Hybrid AI Room'}
              </span>
            </div>
            <div className="flex items-center space-x-1.5 mt-0.5">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
              <span className="text-[11px] text-slate-400">
                {activeUsers.length} desarrollador{activeUsers.length === 1 ? '' : 'es'} en sala
              </span>
            </div>
          </div>
        </div>

        <div className="flex items-center space-x-1">
          <button
            onClick={() => {
              setIsConfigOpen((v) => !v);
              if (!isConfigOpen) fetchAiStatus();
            }}
            className={`p-1.5 rounded-lg transition ${
              isConfigOpen
                ? 'bg-purple-600 text-white'
                : 'text-slate-400 hover:text-white hover:bg-slate-800'
            }`}
            title="Configurar Motor IA Local (Ollama / vLLM / Colab)"
          >
            <Cpu className="w-4 h-4" />
          </button>
          <button
            onClick={toggleAssistant}
            className="text-slate-400 hover:text-white p-1.5 rounded-lg hover:bg-slate-800 transition"
            title="Cerrar chat"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Collapsible Local AI Configuration Panel */}
      {isConfigOpen && (
        <form
          onSubmit={handleSaveAiConfig}
          className="p-3 bg-slate-900/95 text-slate-200 border-b border-slate-800 space-y-2.5 text-xs animate-in fade-in duration-150"
        >
          <div className="flex items-center justify-between">
            <span className="font-bold text-[11px] uppercase tracking-wider text-purple-300 flex items-center space-x-1.5">
              <Cpu className="w-3.5 h-3.5" />
              <span>Motor de Inferencia (Local / Híbrido)</span>
            </span>
            <span
              className={`inline-flex items-center space-x-1 text-[10px] px-2 py-0.5 rounded-full font-semibold ${
                aiStatus?.local_online
                  ? 'bg-emerald-950 text-emerald-300 border border-emerald-700'
                  : 'bg-amber-950 text-amber-300 border border-amber-700'
              }`}
            >
              <span
                className={`w-1.5 h-1.5 rounded-full ${
                  aiStatus?.local_online ? 'bg-emerald-400' : 'bg-amber-400'
                }`}
              />
              <span>{aiStatus?.local_online ? 'Ollama Online' : 'Fallback Activo'}</span>
            </span>
          </div>

          <div className="grid grid-cols-3 gap-1 bg-slate-950 p-1 rounded-lg border border-slate-800">
            {(['local', 'hybrid', 'gemini'] as const).map((m) => (
              <button
                key={m}
                type="button"
                onClick={() => setProviderModeInput(m)}
                className={`py-1 rounded text-[11px] font-medium transition ${
                  providerModeInput === m
                    ? 'bg-purple-600 text-white font-semibold'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                {m === 'local' ? 'Solo Local' : m === 'hybrid' ? 'Híbrido (Auto)' : 'Cloud Gemini'}
              </button>
            ))}
          </div>

          <div className="space-y-1.5">
            <div>
              <label className="block text-[10px] text-slate-400 mb-0.5">
                URL del Nodo Local (Ollama / LM Studio / Túnel Colab):
              </label>
              <input
                type="text"
                value={localUrlInput}
                onChange={(e) => setLocalUrlInput(e.target.value)}
                placeholder="http://localhost:11434 o https://xxxx.trycloudflare.com"
                className="w-full bg-slate-950 border border-slate-700 rounded-lg px-2.5 py-1.5 text-[11px] text-white focus:outline-none focus:border-purple-500"
              />
            </div>
            <div>
              <label className="block text-[10px] text-slate-400 mb-0.5">
                Modelo Local (Ollama / GGUF):
              </label>
              <input
                type="text"
                value={localModelInput}
                onChange={(e) => setLocalModelInput(e.target.value)}
                placeholder="qwen2.5-coder:3b o llama3.2:3b"
                className="w-full bg-slate-950 border border-slate-700 rounded-lg px-2.5 py-1.5 text-[11px] text-white focus:outline-none focus:border-purple-500"
              />
              {aiStatus?.local_available_models && aiStatus.local_available_models.length > 0 && (
                <div className="flex flex-wrap gap-1 mt-1">
                  {aiStatus.local_available_models.slice(0, 4).map((mdl) => (
                    <button
                      key={mdl}
                      type="button"
                      onClick={() => setLocalModelInput(mdl)}
                      className="text-[10px] bg-slate-800 hover:bg-purple-900/60 text-purple-200 px-1.5 py-0.5 rounded border border-slate-700"
                    >
                      {mdl}
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>

          <div className="flex items-center justify-between pt-1">
            <span className="text-[10px] text-slate-400 truncate max-w-[230px]">
              Último motor: <strong className="text-slate-200">{aiStatus?.last_used_engine || 'N/A'}</strong>
            </span>
            <button
              type="submit"
              disabled={isSavingConfig}
              className="flex items-center space-x-1 bg-purple-600 hover:bg-purple-500 text-white px-2.5 py-1 rounded-lg text-[11px] font-semibold transition cursor-pointer"
            >
              <RefreshCw className={`w-3 h-3 ${isSavingConfig ? 'animate-spin' : ''}`} />
              <span>Guardar y Probar</span>
            </button>
          </div>
        </form>
      )}

      {/* Mode Selector Bar (Advisory vs Pair Programmer) */}
      <div className="px-3 py-2 bg-slate-100/90 dark:bg-slate-800/80 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between">
        <div className="flex items-center space-x-1 text-[11px] font-medium text-slate-600 dark:text-slate-300">
          <span>Rol del Senior AI:</span>
        </div>
        <div className="flex bg-slate-200/80 dark:bg-slate-900/80 p-0.5 rounded-lg border border-slate-300/60 dark:border-slate-700">
          <button
            onClick={() => setAiMode('advisory')}
            className={`flex items-center space-x-1 px-2.5 py-1 rounded-md text-[11px] font-medium transition ${
              aiMode === 'advisory'
                ? 'bg-white dark:bg-indigo-600 text-indigo-700 dark:text-white shadow-xs font-semibold'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
            }`}
            title="Asesor Senior: Revisa arquitectura, sugiere patrones y responde dudas sin modificar el lienzo"
          >
            <Lightbulb className="w-3 h-3 text-amber-500 dark:text-amber-300" />
            <span>Asesor</span>
          </button>
          <button
            onClick={() => setAiMode('pair_programmer')}
            className={`flex items-center space-x-1 px-2.5 py-1 rounded-md text-[11px] font-medium transition ${
              aiMode === 'pair_programmer'
                ? 'bg-white dark:bg-purple-600 text-purple-700 dark:text-white shadow-xs font-semibold'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
            }`}
            title="Pair Programmer: Ejecuta modificaciones y crea clases/relaciones en el diagrama en tiempo real"
          >
            <Zap className="w-3 h-3 text-purple-500 dark:text-purple-300" />
            <span>Pair Dev</span>
          </button>
        </div>
      </div>

      {/* Messages Feed */}
      <div className="flex-1 overflow-y-auto p-4 space-y-3.5 bg-slate-50/60 dark:bg-slate-950/60">
        {chatMessages.length === 0 ? (
          <div className="text-center py-6 px-4">
            <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-purple-500/20 to-indigo-500/20 border border-purple-500/30 text-purple-600 dark:text-purple-400 flex items-center justify-center mx-auto mb-3">
              <Bot className="w-6 h-6" />
            </div>
            <h4 className="text-xs font-bold text-slate-800 dark:text-slate-100 mb-1">
              ¡Hola equipo! Soy su desarrollador Senior AI
            </h4>
            <p className="text-[11px] text-slate-500 dark:text-slate-400 leading-relaxed max-w-xs mx-auto">
              Estoy conectado en la misma sala con ustedes. Pueden hacerme consultas de arquitectura o pedirme cambios en el diagrama; sé quién pregunta y le responderé mencionándolo en vivo.
            </p>
          </div>
        ) : (
          chatMessages.map((msg: ChatMessage) => {
            const isAi = msg.sender_type === 'AI';
            const isMe = msg.sender_id === currentUser?.id;
            const cmdCount =
              (msg.executed_commands ? msg.executed_commands.length : 0) ||
              msg.applied_commands_count ||
              0;

            return (
              <div
                key={msg.id}
                className={`flex flex-col ${
                  isAi ? 'items-start' : isMe ? 'items-end' : 'items-start'
                }`}
              >
                {/* Author badge header */}
                <div className="flex flex-wrap items-center gap-1.5 mb-1 px-1">
                  {isAi ? (
                    <>
                      <div className="w-4 h-4 rounded-full bg-gradient-to-tr from-purple-600 to-indigo-500 flex items-center justify-center text-[9px] text-white font-bold">
                        AI
                      </div>
                      <span className="text-[11px] font-bold text-purple-700 dark:text-purple-300">
                        {msg.sender_name}
                      </span>
                      {msg.addressed_to && (
                        <span className="inline-flex items-center space-x-0.5 bg-indigo-100 dark:bg-indigo-950/70 text-indigo-700 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800 rounded px-1.5 py-0.2 text-[10px] font-medium">
                          <AtSign className="w-2.5 h-2.5" />
                          <span>{msg.addressed_to}</span>
                        </span>
                      )}
                      {msg.ai_engine && (
                        <span className="inline-flex items-center space-x-1 bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800/70 rounded px-1.5 py-0.2 text-[9px] font-mono">
                          <Cpu className="w-2.5 h-2.5" />
                          <span>{msg.ai_engine}</span>
                        </span>
                      )}
                    </>
                  ) : (
                    <>
                      <div
                        className="w-4 h-4 rounded-full flex items-center justify-center text-[9px] text-white font-bold"
                        style={{ backgroundColor: msg.sender_avatar_color || '#6B7280' }}
                      >
                        {msg.sender_name.charAt(0).toUpperCase()}
                      </div>
                      <span className="text-[11px] font-semibold text-slate-700 dark:text-slate-300">
                        {msg.sender_name} {isMe && <span className="text-slate-400 font-normal">(Tú)</span>}
                      </span>
                    </>
                  )}
                  <span className="text-[10px] text-slate-400">
                    {msg.created_at
                      ? new Date(msg.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
                      : ''}
                  </span>
                </div>

                {/* Message Bubble */}
                <div
                  className={`max-w-[88%] rounded-2xl px-3.5 py-2.5 text-xs leading-relaxed shadow-xs ${
                    isAi
                      ? 'bg-white dark:bg-slate-800/90 text-slate-800 dark:text-slate-100 border border-purple-200/80 dark:border-purple-900/60 rounded-tl-none'
                      : isMe
                      ? 'bg-indigo-600 text-white rounded-tr-none'
                      : 'bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-100 border border-slate-200/80 dark:border-slate-700 rounded-tl-none'
                  }`}
                >
                  <p className="whitespace-pre-line select-text">{msg.content}</p>

                  {/* Applied UML Commands badge and command chips */}
                  {isAi && cmdCount > 0 && (
                    <div className="mt-2 pt-2 border-t border-purple-100 dark:border-purple-900/50 space-y-1">
                      <div className="flex items-center space-x-1.5 text-[10px] font-semibold text-emerald-600 dark:text-emerald-400">
                        <CheckCircle2 className="w-3 h-3 text-emerald-500 shrink-0" />
                        <span>Modificó el diagrama UML (+{cmdCount} cambios aplicados)</span>
                      </div>
                      {msg.executed_commands && msg.executed_commands.length > 0 && (
                        <div className="flex flex-wrap gap-1 mt-1">
                          {msg.executed_commands.map((cmd, idx) => (
                            <span
                              key={idx}
                              className="bg-emerald-50 dark:bg-emerald-950/50 text-emerald-700 dark:text-emerald-300 border border-emerald-200/60 dark:border-emerald-800 rounded px-1.5 py-0.5 text-[9px] font-mono flex items-center space-x-1"
                            >
                              <Terminal className="w-2.5 h-2.5" />
                              <span>{cmd.command_type}</span>
                            </span>
                          ))}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </div>
            );
          })
        )}

        {/* Real-time Senior AI Typing Indicator */}
        {isAiTyping && (
          <div className="flex items-center space-x-2 text-xs text-purple-700 dark:text-purple-300 bg-purple-50 dark:bg-purple-950/50 border border-purple-200 dark:border-purple-800/60 rounded-xl p-2.5 max-w-[85%] animate-pulse">
            <Loader2 className="w-3.5 h-3.5 animate-spin text-purple-600 dark:text-purple-400 shrink-0" />
            <span className="text-[11px] font-medium">Senior AI está analizando el contexto y respondiendo...</span>
          </div>
        )}

        {/* Real-time Human Teammate Typing Indicator */}
        {typingUserNames.length > 0 && (
          <div className="flex items-center space-x-1.5 text-[11px] text-slate-500 dark:text-slate-400 italic px-1">
            <span className="w-1.5 h-1.5 rounded-full bg-slate-400 animate-ping" />
            <span>
              {typingUserNames.join(', ')} {typingUserNames.length === 1 ? 'está' : 'están'} escribiendo...
            </span>
          </div>
        )}

        {/* Image upload in progress */}
        {isUploadingImage && (
          <div className="flex items-center space-x-2 text-xs text-slate-600 dark:text-slate-300 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl p-3 max-w-[85%] animate-pulse">
            <Loader2 className="w-4 h-4 animate-spin text-indigo-600 dark:text-indigo-400 shrink-0" />
            <span>Interpretando boceto con visión por computadora y replicando tablas...</span>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Quick Prompts Suggestions */}
      {chatMessages.length <= 3 && (
        <div className="px-3 py-2 bg-slate-100/70 dark:bg-slate-800/70 border-t border-slate-200 dark:border-slate-800">
          <p className="text-[10px] font-semibold text-slate-500 dark:text-slate-400 mb-1.5 flex items-center space-x-1">
            <Sparkles className="w-3 h-3 text-amber-500" />
            <span>Preguntas sugeridas al Senior:</span>
          </p>
          <div className="flex flex-wrap gap-1.5">
            {quickPrompts.map((qp, idx) => (
              <button
                key={idx}
                onClick={() => handleSendMessage(qp)}
                className="text-[11px] bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 hover:border-indigo-400 text-slate-600 dark:text-slate-300 px-2 py-1 rounded-lg transition text-left"
              >
                {qp}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Input Form */}
      <div className="p-3 bg-white dark:bg-slate-900 border-t border-slate-200 dark:border-slate-800">
        {attachedImage && (
          <div className="mb-2 flex items-center justify-between bg-indigo-50 dark:bg-indigo-950/50 border border-indigo-200 dark:border-indigo-800 p-2 rounded-xl text-xs text-indigo-900 dark:text-indigo-200 animate-in fade-in">
            <div className="flex items-center space-x-2 min-w-0">
              <img
                src={attachedImage.previewUrl}
                alt="Boceto"
                className="w-9 h-9 object-cover rounded-lg border border-indigo-300 dark:border-indigo-700 shrink-0"
              />
              <div className="min-w-0">
                <span className="font-semibold block truncate text-[11px]">{attachedImage.name}</span>
                <span className="text-[10px] text-indigo-600 dark:text-indigo-400">Boceto listo para interpretar y replicar</span>
              </div>
            </div>
            <button
              onClick={() => setAttachedImage(null)}
              className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 p-1 rounded-md hover:bg-indigo-100 dark:hover:bg-indigo-900/60 transition shrink-0"
              title="Quitar imagen"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        )}

        {isListening && (
          <div className="mb-2 flex items-center justify-between bg-red-50 dark:bg-red-950/60 border border-red-200 dark:border-red-900 px-3 py-1.5 rounded-lg text-xs text-red-600 dark:text-red-300 animate-pulse">
            <div className="flex items-center space-x-2">
              <span className="w-2 h-2 rounded-full bg-red-500 animate-ping" />
              <span>Escuchando... Di tu pregunta o comando</span>
            </div>
            <button
              onClick={handleToggleVoice}
              className="text-[11px] font-semibold hover:underline"
            >
              Detener
            </button>
          </div>
        )}

        <div className="flex items-center space-x-1.5">
          <input
            type="file"
            ref={fileInputRef}
            accept="image/*"
            onChange={(e) => {
              if (e.target.files && e.target.files[0]) {
                processImageFile(e.target.files[0]);
              }
            }}
            className="hidden"
          />

          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            title="Subir foto o boceto a mano (Ctrl+V)"
            className="p-2 text-slate-400 hover:text-indigo-600 dark:hover:text-indigo-400 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl transition shrink-0"
          >
            <ImageIcon className="w-4 h-4" />
          </button>

          <div className="relative flex-1">
            <input
              type="text"
              value={inputPrompt}
              onChange={handleInputChange}
              onKeyDown={handleKeyDown}
              onPaste={handlePaste}
              disabled={isUploadingImage}
              placeholder={
                attachedImage
                  ? 'Instrucción para el boceto (Enter para replicar)...'
                  : 'Pregunta al Senior AI o escribe al equipo...'
              }
              className="w-full text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 dark:text-slate-100 rounded-xl px-3 py-2.5 pr-9 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:bg-white dark:focus:bg-slate-750 transition"
            />
            {speechSupported && (
              <button
                type="button"
                onClick={handleToggleVoice}
                title={isListening ? 'Detener micrófono' : 'Hablar por voz'}
                className={`absolute right-2 top-1/2 -translate-y-1/2 p-1 rounded-md transition ${
                  isListening
                    ? 'text-red-500 bg-red-100 dark:bg-red-900/50 hover:bg-red-200'
                    : 'text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-200/50 dark:hover:bg-slate-700'
                }`}
              >
                {isListening ? <MicOff className="w-3.5 h-3.5" /> : <Mic className="w-3.5 h-3.5" />}
              </button>
            )}
          </div>

          <button
            onClick={() => handleSendMessage()}
            disabled={(!inputPrompt.trim() && !attachedImage) || isUploadingImage}
            className="bg-indigo-600 hover:bg-indigo-700 disabled:opacity-40 text-white p-2.5 rounded-xl transition shadow-sm flex-shrink-0"
            title="Enviar mensaje a la sala"
          >
            <Send className="w-4 h-4" />
          </button>
        </div>
      </div>
    </aside>
  );
};
