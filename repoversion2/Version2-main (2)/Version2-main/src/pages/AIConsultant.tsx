import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'motion/react';
import { Sparkles, Send, Bot, User, ArrowLeft, Trash2 } from 'lucide-react';
import { getAIConsultantResponse } from '../services/aiService';
import { cn } from '../lib/utils';
import { auth } from '../lib/firebase';
import { useAuthState } from 'react-firebase-hooks/auth';

export default function AIConsultant() {
  const [user] = useAuthState(auth);
  const navigate = useNavigate();
  const [prompt, setPrompt] = useState('');
  const [messages, setMessages] = useState<{ role: 'user' | 'ai', text: string }[]>([
    { role: 'ai', text: 'Hello! I am your Neighborly AI Consultant. How can I help you with your home or neighborhood projects today?' }
  ]);
  const [isLoading, setIsLoading] = useState(false);

  const clearChat = () => {
    setMessages([{ role: 'ai', text: 'Hello! I am your Neighborly AI Consultant. How can I help you with your home or neighborhood projects today?' }]);
  };

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) {
      navigate('/auth');
      return;
    }
    if (!prompt.trim() || isLoading) return;

    const userMsg = prompt;
    setPrompt('');
    setMessages(prev => [...prev, { role: 'user', text: userMsg }]);
    setIsLoading(true);

    try {
      const response = await getAIConsultantResponse('General', userMsg);
      setMessages(prev => [...prev, { role: 'ai', text: response }]);
    } catch (error) {
      setMessages(prev => [...prev, { role: 'ai', text: 'Sorry, I encountered an error. Please try again.' }]);
    } finally {
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
        <div className="relative">
          <input
            type="text"
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            placeholder="Ask anything about your home..."
            className="w-full pl-6 pr-16 py-5 bg-app-card border-none rounded-[2rem] shadow-xl dark:shadow-none focus:ring-2 focus:ring-neutral-900 dark:focus:ring-white transition-all font-medium text-app-text"
          />
          <button
            type="submit"
            disabled={isLoading || !prompt.trim()}
            className="absolute right-2 top-1/2 -translate-y-1/2 w-12 h-12 bg-neutral-900 dark:bg-white text-white dark:text-neutral-900 rounded-2xl flex items-center justify-center hover:scale-105 transition-all disabled:opacity-50"
          >
            <Send className="w-5 h-5" />
          </button>
        </div>
      </form>
    </div>
  );
}
