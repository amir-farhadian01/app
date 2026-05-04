import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { MoreVertical, Languages, Sparkles, Edit3, Trash2, Check, X, Loader2 } from 'lucide-react';
import { translateText, regenerateText } from '../services/geminiService';
import { cn } from '../lib/utils';

interface MessageActionsProps {
  text: string;
  isOwner: boolean;
  onUpdate: (newText: string) => Promise<void>;
  onDelete?: () => Promise<void>;
  className?: string;
}

export default function MessageActions({ text, isOwner, onUpdate, onDelete, className }: MessageActionsProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [editText, setEditText] = useState(text);
  const [isLoading, setIsLoading] = useState(false);

  const handleTranslate = async () => {
    setIsLoading(true);
    const translated = await translateText(text, 'English');
    if (translated) {
      setEditText(translated);
      setIsEditing(true);
    }
    setIsLoading(false);
    setIsOpen(false);
  };

  const handleRegenerate = async () => {
    setIsLoading(true);
    const improved = await regenerateText(text);
    if (improved) {
      setEditText(improved);
      setIsEditing(true);
    }
    setIsLoading(false);
    setIsOpen(false);
  };

  const handleSave = async () => {
    setIsLoading(true);
    await onUpdate(editText);
    setIsEditing(false);
    setIsLoading(false);
  };

  return (
    <div className={cn("relative group", className)}>
      {!isEditing ? (
        <div className="flex items-center gap-2">
          <button 
            onClick={() => setIsOpen(!isOpen)}
            className="p-1 opacity-0 group-hover:opacity-100 transition-opacity text-neutral-400 hover:text-neutral-900"
          >
            <MoreVertical className="w-3 h-3" />
          </button>

          <AnimatePresence>
            {isOpen && (
              <>
                <div 
                  className="fixed inset-0 z-10" 
                  onClick={() => setIsOpen(false)} 
                />
                <motion.div
                  initial={{ opacity: 0, scale: 0.9, y: -10 }}
                  animate={{ opacity: 1, scale: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.9, y: -10 }}
                  className="absolute right-0 top-full mt-1 z-20 bg-white border border-neutral-100 rounded-xl shadow-xl p-1 min-w-[140px] overflow-hidden"
                >
                  <button
                    onClick={handleTranslate}
                    disabled={isLoading}
                    className="w-full flex items-center gap-2 px-3 py-2 text-[10px] font-bold uppercase tracking-widest text-neutral-600 hover:bg-neutral-50 hover:text-neutral-900 transition-all"
                  >
                    <Languages className="w-3 h-3" />
                    Translate
                  </button>
                  <button
                    onClick={handleRegenerate}
                    disabled={isLoading}
                    className="w-full flex items-center gap-2 px-3 py-2 text-[10px] font-bold uppercase tracking-widest text-neutral-600 hover:bg-neutral-50 hover:text-neutral-900 transition-all"
                  >
                    <Sparkles className="w-3 h-3" />
                    AI Rewrite
                  </button>
                  {isOwner && (
                    <>
                      <button
                        onClick={() => { setIsEditing(true); setIsOpen(false); }}
                        className="w-full flex items-center gap-2 px-3 py-2 text-[10px] font-bold uppercase tracking-widest text-neutral-600 hover:bg-neutral-50 hover:text-neutral-900 transition-all"
                      >
                        <Edit3 className="w-3 h-3" />
                        Edit
                      </button>
                      {onDelete && (
                        <button
                          onClick={() => { onDelete(); setIsOpen(false); }}
                          className="w-full flex items-center gap-2 px-3 py-2 text-[10px] font-bold uppercase tracking-widest text-red-500 hover:bg-red-50 transition-all"
                        >
                          <Trash2 className="w-3 h-3" />
                          Delete
                        </button>
                      )}
                    </>
                  )}
                </motion.div>
              </>
            )}
          </AnimatePresence>
        </div>
      ) : (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-6 bg-black/20 backdrop-blur-[2px]">
          <motion.div 
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            className="bg-white w-full max-w-md rounded-3xl p-6 shadow-2xl space-y-4"
          >
            <div className="flex items-center justify-between">
              <h4 className="text-xs font-black uppercase tracking-widest text-neutral-400">Edit Message</h4>
              <button onClick={() => setIsEditing(false)} className="p-1 hover:bg-neutral-100 rounded-lg">
                <X className="w-4 h-4" />
              </button>
            </div>
            <textarea
              value={editText}
              onChange={(e) => setEditText(e.target.value)}
              className="w-full p-4 bg-neutral-50 border border-neutral-100 rounded-2xl text-sm focus:outline-none focus:ring-2 focus:ring-neutral-900 min-h-[120px] resize-none"
            />
            <div className="flex gap-2">
              <button
                onClick={() => setIsEditing(false)}
                className="flex-1 py-3 text-[10px] font-black uppercase tracking-widest text-neutral-400 hover:text-neutral-900 transition-all"
              >
                Cancel
              </button>
              <button
                onClick={handleSave}
                disabled={isLoading}
                className="flex-1 py-3 bg-neutral-900 text-white text-[10px] font-black uppercase tracking-widest rounded-xl hover:scale-[1.02] transition-all disabled:opacity-50 flex items-center justify-center gap-2"
              >
                {isLoading ? <Loader2 className="w-3 h-3 animate-spin" /> : <Check className="w-3 h-3" />}
                Save Changes
              </button>
            </div>
          </motion.div>
        </div>
      )}
      {isLoading && !isEditing && (
        <div className="absolute -right-6 top-1/2 -translate-y-1/2">
          <Loader2 className="w-3 h-3 animate-spin text-neutral-400" />
        </div>
      )}
    </div>
  );
}
