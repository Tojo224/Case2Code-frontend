import React, { useState, useEffect, useRef, useMemo } from 'react';
import { useDiagramStore } from '../../store/useDiagramStore';
import { useCollaborationStore } from '../../store/useCollaborationStore';
import { useAuthStore } from '../../store/useAuthStore';
import { collaborationWs } from '../../services/websocket';
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
} from 'lucide-react';
import { ChatMessage } from '../../types/collaboration';

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

  const fileInputRef = useRef<HTMLInputElement>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const recognitionRef = useRef<any>(null);
  const typingTimeoutRef = useRef<number | null>(null);

  // Load chat history when diagram changes or drawer opens
  useEffect(() => {
    if (currentDocument?.id && isAssistantOpen) {
      loadChatHistory(currentDocument.id);
    }
  }, [currentDocument?.id, isAssistantOpen, loadChatHistory]);

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

    // Notify backend that this user is typing
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

    // Reset typing state
    if (typingTimeoutRef.current) {
      window.clearTimeout(typingTimeoutRef.current);
      typingTimeoutRef.current = null;
    }
    collaborationWs.setTyping(false);

    // If an image is attached, process it through the vision pipeline
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

    // Standard text message sent to the shared multiplayer room WebSocket
    setInputPrompt('');
    collaborationWs.sendChatMessage(prompt, aiMode);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  // Determine typing participants
  const isAiTyping = Boolean(typingUsers['ai-senior']?.isTyping);
  const typingUserNames = useMemo(() => {
    return Object.entries(typingUsers)
      .filter(([id, state]) => id !== 'ai-senior' && id !== currentUser?.id && state.isTyping)
      .map(([, state]) => state.userName);
  }, [typingUsers, currentUser?.id]);

  const quickPrompts = [
    '¿Qué opinás de la cardinalidad entre las entidades?',
    'Creá la clase Factura con id, fecha y total',
    'Revisá si el diseño cumple con 3FN',
    'Relacioná Cliente con Pedido de 1 a N',
  ];

  if (!isAssistantOpen) return null;

  return (
    <aside
      onDragOver={(e) => e.preventDefault()}
      onDrop={handleDrop}
      className="fixed right-0 sm:right-4 top-14 sm:top-16 bottom-0 sm:bottom-4 w-full sm:w-[420px] max-w-full bg-white dark:bg-slate-900 border-l sm:border border-slate-200/90 dark:border-slate-800 rounded-none sm:rounded-2xl shadow-2xl flex flex-col z-40 overflow-hidden animate-in slide-in-from-right duration-200 transition-colors"
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
              <span className="bg-purple-500/30 text-purple-200 text-[10px] font-semibold px-1.5 py-0.5 rounded border border-purple-400/30">
                Multiplayer Room
              </span>
            </div>
            <div className="flex items-center space-x-1.5 mt-0.5">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
              <span className="text-[11px] text-slate-400">
                {activeUsers.length} colega{activeUsers.length === 1 ? '' : 's'} en la sala
              </span>
            </div>
          </div>
        </div>

        <button
          onClick={toggleAssistant}
          className="text-slate-400 hover:text-white p-1.5 rounded-lg hover:bg-slate-800 transition"
          title="Cerrar chat"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      {/* Mode Selector Bar (Advisory vs Pair Programmer) */}
      <div className="px-3 py-2 bg-slate-100/90 dark:bg-slate-800/80 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between">
        <div className="flex items-center space-x-1 text-[11px] font-medium text-slate-600 dark:text-slate-300">
          <span>Modo de la IA:</span>
        </div>
        <div className="flex bg-slate-200/80 dark:bg-slate-900/80 p-0.5 rounded-lg border border-slate-300/60 dark:border-slate-700">
          <button
            onClick={() => setAiMode('advisory')}
            className={`flex items-center space-x-1 px-2.5 py-1 rounded-md text-[11px] font-medium transition ${
              aiMode === 'advisory'
                ? 'bg-white dark:bg-indigo-600 text-indigo-700 dark:text-white shadow-xs font-semibold'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
            }`}
            title="Asesor Senior: Revisa, explica y aconseja sin alterar el diagrama directamente"
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
            title="Pair Programmer: Modifica el diagrama UML en el lienzo en tiempo real"
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
              Estoy en la misma sala que ustedes. Pueden hacerme preguntas de arquitectura o pedirme que agregue clases al diagrama.
              Sé quién me pregunta y responderé mencionándolo en vivo.
            </p>
          </div>
        ) : (
          chatMessages.map((msg: ChatMessage) => {
            const isAi = msg.sender_type === 'AI';
            const isMe = msg.sender_id === currentUser?.id;

            return (
              <div
                key={msg.id}
                className={`flex flex-col ${
                  isAi ? 'items-start' : isMe ? 'items-end' : 'items-start'
                }`}
              >
                {/* Author badge header */}
                <div className="flex items-center space-x-1.5 mb-1 px-1">
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

                  {/* Applied UML Commands badge */}
                  {isAi && (msg.applied_commands_count || 0) > 0 && (
                    <div className="mt-2 pt-2 border-t border-purple-100 dark:border-purple-900/50 flex items-center space-x-1.5 text-[10px] font-semibold text-emerald-600 dark:text-emerald-400">
                      <CheckCircle2 className="w-3 h-3 text-emerald-500 shrink-0" />
                      <span>Modificó el diagrama UML (+{msg.applied_commands_count} cambios aplicados)</span>
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
        {/* Attached image preview chip */}
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
          {/* Hidden File Input for Image Upload */}
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

          {/* Upload Image Button */}
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            title="Subir foto o boceto a mano (o pegá con Ctrl+V)"
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
                  : 'Pregunta al Senior o habla con tu equipo...'
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