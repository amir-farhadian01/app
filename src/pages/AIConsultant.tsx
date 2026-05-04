import React, { useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'motion/react';
import { Sparkles, Send, Bot, User, Trash2, Paperclip } from 'lucide-react';
import { getAIConsultantResponse } from '../services/aiService';
import { cn } from '../lib/utils';
import { useAuth } from '../lib/AuthContext';

export default function AIConsultant() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [prompt, setPrompt] = useState('');
  const [messages, setMessages] = useState<{ role: 'user' | 'ai', text: string; attachmentDataUrl?: string; attachmentName?: string }[]>([
    { role: 'ai', text: 'Hello! I am your Neighborly AI Consultant. How can I help you with your home or neighborhood projects today?' }
  ]);
  const [isLoading, setIsLoading] = useState(false);
  const [attachment, setAttachment] = useState<File | null>(null);
  const [attachmentPreviewUrl, setAttachmentPreviewUrl] = useState<string | null>(null);
  const [showAttachMenu, setShowAttachMenu] = useState(false);
  const galleryRef = useRef<HTMLInputElement>(null);
  const cameraRef = useRef<HTMLInputElement>(null);

  const clearChat = () => {
    setMessages([{ role: 'ai', text: 'Hello! I am your Neighborly AI Consultant. How can I help you with your home or neighborhood projects today?' }]);
  };

  const clearAttachment = () => {
    if (attachmentPreviewUrl) {
      URL.revokeObjectURL(attachmentPreviewUrl);
    }
    setAttachment(null);
    setAttachmentPreviewUrl(null);
  };

  const setSelectedAttachment = (file: File | null) => {
    if (attachmentPreviewUrl) {
      URL.revokeObjectURL(attachmentPreviewUrl);
    }
    setAttachment(file);
    setAttachmentPreviewUrl(file ? URL.createObjectURL(file) : null);
  };

  const fileToDataUrl = (file: File): Promise<string> => new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === 'string') {
        resolve(reader.result);
        return;
      }
      reject(new Error('Could not read image data.'));
    };
    reader.onerror = () => reject(new Error('Could not read image data.'));
    reader.readAsDataURL(file);
  });

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) {
      navigate('/auth');
      return;
    }
    if ((!prompt.trim() && !attachment) || isLoading) return;

    const userMsg = prompt.trim();
    const currentAttachment = attachment;
    setPrompt('');
    let attachmentDataUrl: string | undefined;
    if (currentAttachment) {
      try {
        attachmentDataUrl = await fileToDataUrl(currentAttachment);
      } catch {
        setMessages(prev => [...prev, { role: 'ai', text: 'Could not preview the attached image. Please try again.' }]);
        clearAttachment();
        return;
      }
    }
    setMessages(prev => [
      ...prev,
      {
        role: 'user',
        text: userMsg || (currentAttachment ? 'Sent an image' : ''),
        attachmentDataUrl,
        attachmentName: currentAttachment?.name,
      }
    ]);
    setIsLoading(true);

    try {
      const response = await getAIConsultantResponse('General', userMsg);
      setMessages(prev => [...prev, { role: 'ai', text: response }]);
      // TODO(F5+): When the consultant returns structured service recommendations
      // (serviceCatalogId + label), render a "Book this" chip linking to
      // `/orders/new?from=ai&serviceCatalogId=…&suggestion=…`.
    } catch (error) {
      setMessages(prev => [...prev, { role: 'ai', text: 'Sorry, I encountered an error. Please try again.' }]);
    } finally {
      clearAttachment();
      setIsLoading(false);
    }
  };

  return (
    <div className="flex flex-col h-[calc(100vh-180px)] max-w-2xl mx-auto bg-app-card rounded-[3rem] border border-app-border shadow-2xl overflow-hidden">
      <header className="p-8 border-b border-app-border flex items-center justify-between bg-neutral-900 dark:bg-white text-white dark:text-neutral-900">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 bg-white/10 dark:bg-neutral-900/10 rounded-2xl flex items-center justify-center">
            <Sparkles className="w-6 h-6 text-white dark:text-neutral-900" />
          </div>
          <div>
            <h2 className="text-xl font-black tracking-tight italic uppercase">AI Consultant</h2>
            <p className="text-[10px] font-bold text-white/40 dark:text-neutral-400 uppercase tracking-widest">Always active • Expert Advice</p>
          </div>
        </div>

        <button 
          onClick={clearChat}
          className="p-3 bg-white/10 dark:bg-neutral-900/10 rounded-xl hover:bg-white/20 dark:hover:bg-neutral-900/20 transition-all text-white dark:text-neutral-900 group"
          title="Clear Chat History"
        >
          <Trash2 className="w-5 h-5 group-hover:rotate-12 transition-transform" />
        </button>
      </header>

      <div className="flex-1 overflow-y-auto p-8 space-y-6 no-scrollbar">
        {messages.map((msg, i) => (
          <motion.div
            key={i}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className={cn(
              "flex gap-4 max-w-[85%]",
              msg.role === 'user' ? "ml-auto flex-row-reverse" : ""
            )}
          >
            <div className={cn(
              "w-10 h-10 rounded-2xl flex items-center justify-center shrink-0",
              msg.role === 'ai' ? "bg-neutral-900 dark:bg-white text-white dark:text-neutral-900" : "bg-neutral-100 dark:bg-neutral-800 text-neutral-400"
            )}>
              {msg.role === 'ai' ? <Bot className="w-5 h-5" /> : <User className="w-5 h-5" />}
            </div>
            <div className={cn(
              "p-5 rounded-[2rem] text-sm leading-relaxed",
              msg.role === 'ai' ? "bg-neutral-50 dark:bg-neutral-800 text-app-text rounded-tl-none" : "bg-neutral-900 dark:bg-white text-white dark:text-neutral-900 rounded-tr-none"
            )}>
              {msg.attachmentDataUrl && (
                <img
                  src={msg.attachmentDataUrl}
                  alt={msg.attachmentName ?? 'Attached image'}
                  className="mb-3 max-h-56 w-full rounded-2xl object-cover"
                />
              )}
              {msg.text}
            </div>
          </motion.div>
        ))}
        {isLoading && (
          <div className="flex gap-4 max-w-[85%]">
            <div className="w-10 h-10 rounded-2xl bg-neutral-900 dark:bg-white text-white dark:text-neutral-900 flex items-center justify-center shrink-0">
              <Bot className="w-5 h-5" />
            </div>
            <div className="p-5 bg-neutral-50 dark:bg-neutral-800 rounded-[2rem] rounded-tl-none flex gap-1">
              <div className="w-1.5 h-1.5 bg-neutral-300 rounded-full animate-bounce" />
              <div className="w-1.5 h-1.5 bg-neutral-300 rounded-full animate-bounce [animation-delay:0.2s]" />
              <div className="w-1.5 h-1.5 bg-neutral-300 rounded-full animate-bounce [animation-delay:0.4s]" />
            </div>
          </div>
        )}
      </div>

      <form onSubmit={handleSend} className="p-6 bg-neutral-50 dark:bg-neutral-800/50 border-t border-app-border">
        {attachment && (
          <div className="mb-3 flex items-center justify-between rounded-2xl border border-app-border bg-app-card px-3 py-2 text-xs">
            <div className="flex min-w-0 items-center gap-3">
              {attachmentPreviewUrl ? (
                <img src={attachmentPreviewUrl} alt={attachment.name} className="h-10 w-10 shrink-0 rounded-xl object-cover" />
              ) : (
                <div className="h-10 w-10 shrink-0 rounded-xl bg-neutral-100 dark:bg-neutral-700" />
              )}
              <span className="truncate">{attachment.name}</span>
            </div>
            <button type="button" onClick={clearAttachment} className="text-neutral-500 hover:text-red-500">Remove</button>
          </div>
        )}
        <div className="relative">
          <div className="absolute left-3 top-1/2 -translate-y-1/2 z-20">
            <button
              type="button"
              onClick={() => setShowAttachMenu(v => !v)}
              className="w-10 h-10 rounded-xl flex items-center justify-center text-neutral-500 hover:bg-neutral-100 dark:hover:bg-neutral-700"
              title="Attach"
            >
              <Paperclip className="w-4 h-4" />
            </button>
            {showAttachMenu && (
              <div className="absolute left-0 bottom-12 w-36 rounded-2xl border border-app-border bg-app-card shadow-xl p-1">
                <button type="button" className="w-full text-left px-3 py-2 rounded-xl hover:bg-neutral-100 dark:hover:bg-neutral-800 text-sm" onClick={() => { galleryRef.current?.click(); setShowAttachMenu(false); }}>Gallery</button>
                <button type="button" className="w-full text-left px-3 py-2 rounded-xl hover:bg-neutral-100 dark:hover:bg-neutral-800 text-sm" onClick={() => { cameraRef.current?.click(); setShowAttachMenu(false); }}>Camera</button>
              </div>
            )}
          </div>
          <input
            type="text"
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            placeholder="Ask anything about your home..."
            className="w-full pl-16 pr-16 py-5 bg-app-card border-none rounded-[2rem] shadow-xl dark:shadow-none focus:ring-2 focus:ring-neutral-900 dark:focus:ring-white transition-all font-medium text-app-text"
          />
          <input
            ref={galleryRef}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={(e) => setSelectedAttachment(e.target.files?.[0] || null)}
          />
          <input
            ref={cameraRef}
            type="file"
            accept="image/*"
            capture="environment"
            className="hidden"
            onChange={(e) => setSelectedAttachment(e.target.files?.[0] || null)}
          />
          <button
            type="submit"
            disabled={isLoading || (!prompt.trim() && !attachment)}
            className="absolute right-2 top-1/2 -translate-y-1/2 w-12 h-12 bg-neutral-900 dark:bg-white text-white dark:text-neutral-900 rounded-2xl flex items-center justify-center hover:scale-105 transition-all disabled:opacity-50"
          >
            <Send className="w-5 h-5" />
          </button>
        </div>
      </form>
    </div>
  );
}
