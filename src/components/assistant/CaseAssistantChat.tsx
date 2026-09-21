import React, { useState, useEffect, useRef } from 'react';
import { useDiagramStore } from '../../store/useDiagramStore';
import {
  Bot,
  Sparkles,
  Mic,
  MicOff,
  Send,
  X,
  CheckCircle2,
  Loader2,
  Terminal,
  Image as ImageIcon,
} from 'lucide-react';
import { UmlCommand } from '../../types/uml';

interface ChatMessage {
  id: string;
  sender: 'user' | 'assistant';
  text: string;
  imageUrl?: string;
  executedCommands?: UmlCommand[];
  isError?: boolean;
  timestamp: Date;
}

export const CaseAssistantChat: React.FC = () => {
  const { isAssistantOpen, toggleAssistant, sendAssistantPrompt, currentDocument } =
    useDiagramStore();
  const [inputPrompt, setInputPrompt] = useState('');
  const [isLoading, setIsLoading] = useState(false);
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

  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: 'welcome',
      sender: 'assistant',
      text: '¡Hola! Soy tu Asistente CASE. Podés pedirme en lenguaje natural, hablarme por voz o subir una foto/boceto a mano de tu base de datos para replicarla.',
      timestamp: new Date(),
    },
  ]);

  // Initialize Speech Recognition
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
        const transcript = event.results[0][0].transcript;
        setInputPrompt(transcript);
        setIsListening(false);
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
  }, [messages, isLoading, attachedImage]);

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
    if ((!prompt && !attachedImage) || isLoading || !currentDocument) return;

    const finalPrompt = prompt || 'Replicar este diseño de base de datos en el diagrama.';
    const currentAttached = attachedImage;

    const userMsg: ChatMessage = {
      id: `usr-${Date.now()}`,
      sender: 'user',
      text: finalPrompt,
      imageUrl: currentAttached?.previewUrl,
      timestamp: new Date(),
    };

    setMessages((prev) => [...prev, userMsg]);
    setInputPrompt('');
    setAttachedImage(null);
    setIsLoading(true);

    try {
      const res = await sendAssistantPrompt(
        finalPrompt,
        currentAttached
          ? { base64: currentAttached.base64, mimeType: currentAttached.mimeType }
          : undefined
      );

      const assistantMsg: ChatMessage = {
        id: `asst-${Date.now()}`,
        sender: 'assistant',
        text: res.reply || 'Hecho.',
        executedCommands: res.executed_commands,
        timestamp: new Date(),
      };
      setMessages((prev) => [...prev, assistantMsg]);
    } catch (e: any) {
      const errorMsg: ChatMessage = {
        id: `err-${Date.now()}`,
        sender: 'assistant',
        text: e.message || 'Error al comunicarse con el asistente.',
        isError: true,
        timestamp: new Date(),
      };
      setMessages((prev) => [...prev, errorMsg]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  const quickPrompts = [
    'Crea la clase Cliente con id y nombre',
    'Crea la clase Reserva con id y fecha',
    'Relaciona Cliente con Reserva 1 a N',
    'Agrega atributo telefono a Cliente',
  ];

  if (!isAssistantOpen) return null;

  return (
    <aside
      onDragOver={(e) => e.preventDefault()}
      onDrop={handleDrop}
      className="fixed right-0 sm:right-4 top-14 sm:top-16 bottom-0 sm:bottom-4 w-full sm:w-96 max-w-full bg-white dark:bg-slate-900 border-l sm:border border-slate-200/90 dark:border-slate-800 rounded-none sm:rounded-2xl shadow-2xl flex flex-col z-40 overflow-hidden animate-in slide-in-from-right duration-200 transition-colors"
    >
      {/* Header */}
      <div className="bg-slate-900 dark:bg-slate-950 text-white px-4 py-3 flex items-center justify-between border-b border-slate-800">
        <div className="flex items-center space-x-2.5">
          <div className="bg-sky-500/20 text-sky-400 p-1.5 rounded-lg border border-sky-500/30">
            <Bot className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center space-x-1.5">
              <h3 className="font-bold text-sm tracking-tight text-white">Asistente CASE</h3>
              <span className="bg-sky-500/30 text-sky-300 text-[10px] font-semibold px-1.5 py-0.2 rounded border border-sky-400/30">
                IA Multimodal & Voz
              </span>
            </div>
            <p className="text-[11px] text-slate-400">Texto, voz o foto de tu diseño</p>
          </div>
        </div>

        <button
          onClick={toggleAssistant}
          className="text-slate-400 hover:text-white p-1 rounded-lg hover:bg-slate-800 transition"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      {/* Messages List */}
      <div className="flex-1 overflow-y-auto p-4 space-y-3.5 bg-slate-50/50 dark:bg-slate-950/50">
        {messages.map((msg) => (
          <div
            key={msg.id}
            className={`flex flex-col ${
              msg.sender === 'user' ? 'items-end' : 'items-start'
            }`}
          >
            <div
              className={`max-w-[85%] rounded-2xl px-3.5 py-2.5 text-xs leading-relaxed shadow-sm ${
                msg.sender === 'user'
                  ? 'bg-sky-600 text-white rounded-tr-none'
                  : msg.isError
                  ? 'bg-red-50 dark:bg-red-950/60 text-red-800 dark:text-red-300 border border-red-200 dark:border-red-900 rounded-tl-none'
                  : 'bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-100 border border-slate-200/80 dark:border-slate-700 rounded-tl-none'
              }`}
            >
              {/* Optional Attached Image in Message */}
              {msg.imageUrl && (
                <div className="mb-2 overflow-hidden rounded-xl border border-white/20 dark:border-slate-700 max-h-48">
                  <img
                    src={msg.imageUrl}
                    alt="Boceto adjunto"
                    className="object-cover w-full max-h-48 rounded-lg"
                  />
                </div>
              )}

              <p className="whitespace-pre-line">{msg.text}</p>

              {/* Render executed command badges */}
              {msg.executedCommands && msg.executedCommands.length > 0 && (
                <div className="mt-2.5 pt-2 border-t border-slate-100 dark:border-slate-700 space-y-1">
                  <div className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider flex items-center space-x-1">
                    <CheckCircle2 className="w-3 h-3 text-emerald-500" />
                    <span>Comandos Aplicados ({msg.executedCommands.length})</span>
                  </div>
                  <div className="flex flex-wrap gap-1 mt-1">
                    {msg.executedCommands.map((cmd, idx) => (
                      <span
                        key={idx}
                        className="bg-emerald-50 dark:bg-emerald-950/50 text-emerald-700 dark:text-emerald-300 border border-emerald-200/60 dark:border-emerald-800 rounded px-1.5 py-0.5 text-[10px] font-mono flex items-center space-x-1"
                      >
                        <Terminal className="w-2.5 h-2.5" />
                        <span>{cmd.command_type}</span>
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </div>
            <span className="text-[10px] text-slate-400 dark:text-slate-500 mt-1 px-1">
              {msg.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
            </span>
          </div>
        ))}

        {isLoading && (
          <div className="flex items-center space-x-2 text-xs text-slate-500 dark:text-slate-400 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl p-3 max-w-[80%] animate-pulse">
            <Loader2 className="w-4 h-4 animate-spin text-sky-600 dark:text-sky-400 shrink-0" />
            <span>Analizando diseño, resolviendo roles y replicando tablas...</span>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Quick Prompts Suggestions */}
      {messages.length <= 2 && (
        <div className="px-3 py-2 bg-slate-100/70 dark:bg-slate-800/70 border-t border-slate-200 dark:border-slate-800">
          <p className="text-[10px] font-semibold text-slate-500 dark:text-slate-400 mb-1.5 flex items-center space-x-1">
            <Sparkles className="w-3 h-3 text-amber-500" />
            <span>Sugerencias rápidas:</span>
          </p>
          <div className="flex flex-wrap gap-1.5">
            {quickPrompts.map((qp, idx) => (
              <button
                key={idx}
                onClick={() => handleSendMessage(qp)}
                className="text-[11px] bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 hover:border-sky-400 text-slate-600 dark:text-slate-300 px-2 py-1 rounded-lg transition text-left"
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
          <div className="mb-2 flex items-center justify-between bg-sky-50 dark:bg-sky-950/50 border border-sky-200 dark:border-sky-800 p-2 rounded-xl text-xs text-sky-900 dark:text-sky-200 animate-in fade-in">
            <div className="flex items-center space-x-2 min-w-0">
              <img
                src={attachedImage.previewUrl}
                alt="Boceto"
                className="w-9 h-9 object-cover rounded-lg border border-sky-300 dark:border-sky-700 shrink-0"
              />
              <div className="min-w-0">
                <span className="font-semibold block truncate text-[11px]">{attachedImage.name}</span>
                <span className="text-[10px] text-sky-600 dark:text-sky-400">Boceto listo para replicar en el diagrama</span>
              </div>
            </div>
            <button
              onClick={() => setAttachedImage(null)}
              className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 p-1 rounded-md hover:bg-sky-100 dark:hover:bg-sky-900/60 transition shrink-0"
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
              <span>Escuchando... Di un comando en voz alta</span>
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
            className="p-2 text-slate-400 hover:text-sky-600 dark:hover:text-sky-400 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl transition shrink-0"
          >
            <ImageIcon className="w-4 h-4" />
          </button>

          <div className="relative flex-1">
            <input
              type="text"
              value={inputPrompt}
              onChange={(e) => setInputPrompt(e.target.value)}
              onKeyDown={handleKeyDown}
              onPaste={handlePaste}
              disabled={isLoading}
              placeholder={attachedImage ? 'Instrucción opcional (Enter para enviar)...' : 'Escribe, habla o pega un boceto (Ctrl+V)...'}
              className="w-full text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 dark:text-slate-100 rounded-xl px-3 py-2.5 pr-9 focus:outline-none focus:ring-2 focus:ring-sky-500 focus:bg-white dark:focus:bg-slate-750 transition"
            />
            {speechSupported && (
              <button
                type="button"
                onClick={handleToggleVoice}
                title={isListening ? 'Detener micrófono' : 'Hablar comando por voz'}
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
            disabled={(!inputPrompt.trim() && !attachedImage) || isLoading}
            className="bg-sky-600 hover:bg-sky-700 disabled:opacity-40 text-white p-2.5 rounded-xl transition shadow-sm flex-shrink-0"
            title="Enviar al Asistente"
          >
            <Send className="w-4 h-4" />
          </button>
        </div>
      </div>
    </aside>
  );
};
