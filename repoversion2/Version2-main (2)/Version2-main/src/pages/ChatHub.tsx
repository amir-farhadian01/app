import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { useParams, useNavigate } from 'react-router-dom';
import { 
  Send, Paperclip, MoreHorizontal, ShieldCheck, 
  Sparkles, CheckCircle2, XCircle, FileText,
  DollarSign, Clock, MapPin, Zap, ChevronRight
} from 'lucide-react';
import { cn } from '../lib/utils';
import { auth, db } from '../lib/firebase';
import { 
  collection, query, where, orderBy, onSnapshot, 
  addDoc, serverTimestamp, doc, getDoc, updateDoc 
} from 'firebase/firestore';

export default function ChatHub() {
  const { id } = useParams(); // Request ID
  const navigate = useNavigate();
  const [messages, setMessages] = useState<any[]>([]);
  const [request, setRequest] = useState<any>(null);
  const [newMessage, setNewMessage] = useState('');
  const [showContract, setShowContract] = useState(false);
  const [loading, setLoading] = useState(true);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!id) return;

    const fetchRequest = async () => {
      const docRef = doc(db, 'requests', id);
      const docSnap = await getDoc(docRef);
      if (docSnap.exists()) {
        setRequest({ id: docSnap.id, ...docSnap.data() });
      }
      setLoading(false);
    };
    fetchRequest();

    const mQ = query(
      collection(db, 'messages'),
      where('requestId', '==', id),
      orderBy('createdAt', 'asc')
    );

    const unsubscribe = onSnapshot(mQ, (snapshot) => {
      setMessages(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
      // Scroll to bottom
      setTimeout(() => {
        if (scrollRef.current) scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
      }, 100);
    });

    return () => unsubscribe();
  }, [id]);

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMessage.trim() || !id) return;

    try {
      await addDoc(collection(db, 'messages'), {
        requestId: id,
        text: newMessage,
        senderId: auth.currentUser?.uid,
        createdAt: serverTimestamp(),
      });
      setNewMessage('');
    } catch (err) {
      console.error(err);
    }
  };

  if (loading) return null;

  return (
    <div className="h-[calc(100vh-12rem)] flex flex-col md:flex-row gap-6">
      {/* Messages Panel */}
      <div className="flex-1 bg-app-card border border-app-border rounded-[3rem] shadow-xl flex flex-col overflow-hidden relative">
        {/* Header */}
        <div className="p-6 border-b border-app-border flex items-center justify-between bg-app-card/50 backdrop-blur-md sticky top-0 z-10">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 bg-neutral-900 rounded-2xl flex items-center justify-center font-black text-emerald-500 border border-app-border">
              {request?.category?.[0]?.toUpperCase() || 'N'}
            </div>
            <div>
              <h3 className="font-black italic uppercase tracking-tight text-app-text">Conversation Hub</h3>
              <p className="text-[9px] font-black uppercase text-neutral-500 tracking-widest">
                Job ID: {request?.id?.slice(0, 8)} • {request?.status}
              </p>
            </div>
          </div>
          <button 
            onClick={() => setShowContract(!showContract)}
            className="md:hidden p-3 bg-neutral-100 dark:bg-neutral-800 rounded-xl text-neutral-500"
          >
            <FileText className="w-5 h-5" />
          </button>
        </div>

        {/* Scroll Area */}
        <div 
          ref={scrollRef}
          className="flex-1 overflow-y-auto p-6 space-y-4 scroll-smooth"
        >
          {messages.map((m) => {
            const isMe = m.senderId === auth.currentUser?.uid;
            return (
              <motion.div
                initial={{ opacity: 0, y: 10, scale: 0.95 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                key={m.id} 
                className={cn(
                  "flex flex-col max-w-[80%] space-y-1",
                  isMe ? "ml-auto items-end" : "mr-auto items-start"
                )}
              >
                <div className={cn(
                  "px-5 py-3 rounded-2xl text-sm font-medium shadow-sm",
                  isMe ? "bg-neutral-900 text-white rounded-br-sm shadow-black/10" : "bg-neutral-50 dark:bg-neutral-800 text-app-text rounded-bl-sm border border-app-border"
                )}>
                  {m.text}
                </div>
                <span className="text-[8px] font-black uppercase text-neutral-400 px-1">
                  {m.createdAt ? new Date(m.createdAt.toDate()).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '...'}
                </span>
              </motion.div>
            );
          })}
        </div>

        {/* Action Bar */}
        <div className="p-6 border-t border-app-border bg-app-card/50 backdrop-blur-md">
          <form onSubmit={handleSendMessage} className="flex items-center gap-3">
            <button type="button" className="p-4 bg-app-bg border border-app-border rounded-2xl text-neutral-400 hover:text-emerald-500 transition-all">
              <Paperclip className="w-5 h-5" />
            </button>
            <input 
              value={newMessage}
              onChange={(e) => setNewMessage(e.target.value)}
              className="flex-1 bg-neutral-50 dark:bg-neutral-800 border border-app-border rounded-2xl p-4 text-sm font-medium focus:ring-2 focus:ring-emerald-500 transition-all outline-none"
              placeholder="Message your neighbor..."
            />
            <button type="submit" className="p-4 bg-neutral-900 dark:bg-white text-white dark:text-neutral-900 rounded-2xl shadow-xl hover:scale-105 active:scale-95 transition-all">
              <Send className="w-5 h-5" />
            </button>
          </form>
        </div>
      </div>

      {/* Contract Detail Panel */}
      <AnimatePresence>
        {(showContract || window.innerWidth > 768) && (
          <motion.div 
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: 20 }}
            className="w-full md:w-96 flex flex-col gap-6"
          >
            {/* The Deal Card */}
            <div className="bg-app-card border border-app-border rounded-[3rem] p-8 shadow-xl overflow-y-auto max-h-full space-y-8">
              <div className="space-y-4">
                 <div className="flex items-center gap-2 px-4 py-1.5 bg-emerald-500/10 text-emerald-500 rounded-full w-fit">
                    <Sparkles className="w-3 h-3" />
                    <span className="text-[9px] font-black uppercase tracking-widest">AI Generated Contract</span>
                 </div>
                 <h2 className="text-3xl font-black italic uppercase tracking-tighter leading-none">The Service Agreement</h2>
              </div>

              <div className="space-y-6">
                 {[
                   { icon: FileText, label: 'Work Scope', value: request?.description },
                   { icon: DollarSign, label: 'Total Budget', value: `$ ${request?.budget}` },
                   { icon: MapPin, label: 'Location', value: request?.address },
                   { icon: Clock, label: 'Timeline', value: 'Within 48 hours' }
                 ].map(item => (
                   <div key={item.label} className="space-y-2">
                     <div className="flex items-center gap-2 ml-1">
                       <item.icon className="w-3 h-3 text-neutral-400" />
                       <span className="text-[9px] font-black uppercase tracking-widest text-neutral-500">{item.label}</span>
                     </div>
                     <p className="bg-neutral-50 dark:bg-neutral-800 p-4 rounded-xl text-xs font-bold text-app-text leading-relaxed">
                       {item.value || 'Not specified'}
                     </p>
                   </div>
                 ))}
              </div>

              <div className="pt-8 border-t border-app-border space-y-4">
                 <div className="flex items-center gap-3 p-4 bg-neutral-900 border border-neutral-800 rounded-2xl text-white">
                    <ShieldCheck className="w-6 h-6 text-emerald-500" />
                    <div>
                      <p className="text-[10px] font-black uppercase tracking-widest">Verified Neighborhood Deal</p>
                      <p className="text-[8px] opacity-60">Secured by Neighborly Escrow System</p>
                    </div>
                 </div>

                 <div className="grid grid-cols-2 gap-3">
                    <button className="py-4 bg-app-bg border border-app-border rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-all">
                      Decline
                    </button>
                    <button className="py-4 bg-emerald-500 text-black rounded-xl text-[10px] font-black uppercase tracking-widest shadow-lg shadow-emerald-500/20 hover:scale-105 transition-all">
                      Accept & Pay
                    </button>
                 </div>
              </div>
            </div>

            {/* Tracking Card */}
            <div className="bg-neutral-900 rounded-[2.5rem] p-6 text-white space-y-4 shadow-2xl">
               <div className="flex items-center justify-between">
                 <span className="text-[9px] font-black uppercase tracking-widest opacity-40">System Log</span>
                 <Zap className="w-4 h-4 text-emerald-500 animate-pulse" />
               </div>
               <div className="space-y-1">
                 <p className="font-bold text-xs">Tracking ID</p>
                 <p className="text-xl font-black italic uppercase tracking-widest text-emerald-500 underline decoration-2">{request?.trackingNumber || 'NBRLY-XXXXXX'}</p>
               </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
