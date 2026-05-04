import React, { useState, useEffect, useRef } from 'react';
import { db, auth, handleFirestoreError, OperationType } from '../lib/firebase';
import { collection, query, where, onSnapshot, addDoc, serverTimestamp, orderBy, limit, getDocs, doc, setDoc } from 'firebase/firestore';
import { motion, AnimatePresence } from 'motion/react';
import { MessageSquare, Users, Search, Send, Hash, ArrowLeft, Building2, Star, Info, MoreVertical } from 'lucide-react';
import { cn } from '../lib/utils';
import MessageActions from '../components/MessageActions';
import { updateDoc, deleteDoc } from 'firebase/firestore';

export default function ProviderCommunity() {
  const [categories, setCategories] = useState<any[]>([]);
  const [activeRoom, setActiveRoom] = useState<any>(null);
  const [messages, setMessages] = useState<any[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [providers, setProviders] = useState<any[]>([]);
  const [view, setView] = useState<'rooms' | 'providers'>('rooms');
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    // Fetch top-level categories
    const unsubscribe = onSnapshot(collection(db, 'categories'), (snap) => {
      setCategories(snap.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    });

    // Fetch all providers for the search/directory
    const fetchProviders = async () => {
      const q = query(collection(db, 'users'), where('role', '==', 'provider'));
      const snap = await getDocs(q);
      setProviders(snap.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    };
    fetchProviders();

    return () => unsubscribe();
  }, []);

  useEffect(() => {
    if (!activeRoom) return;

    const q = query(
      collection(db, 'chat_messages'),
      where('roomId', '==', activeRoom.id),
      orderBy('timestamp', 'asc'),
      limit(50)
    );

    const unsubscribe = onSnapshot(q, (snap) => {
      setMessages(snap.docs.map(doc => ({ id: doc.id, ...doc.data() })));
      setTimeout(() => {
        if (scrollRef.current) {
          scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
        }
      }, 100);
    }, (error) => handleFirestoreError(error, OperationType.GET, 'chat_messages'));

    return () => unsubscribe();
  }, [activeRoom]);

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMessage.trim() || !activeRoom || !auth.currentUser) return;

    try {
      await addDoc(collection(db, 'chat_messages'), {
        roomId: activeRoom.id,
        senderId: auth.currentUser.uid,
        senderName: auth.currentUser.displayName || 'Provider',
        text: newMessage,
        timestamp: serverTimestamp()
      });
      setNewMessage('');
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, 'chat_messages');
    }
  };

  const handleUpdateMessage = async (messageId: string, newText: string) => {
    try {
      await updateDoc(doc(db, 'chat_messages', messageId), {
        text: newText,
        isEdited: true,
        updatedAt: serverTimestamp()
      });
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, `chat_messages/${messageId}`);
    }
  };

  const handleDeleteMessage = async (messageId: string) => {
    if (!window.confirm('Are you sure you want to delete this message?')) return;
    try {
      await deleteDoc(doc(db, 'chat_messages', messageId));
    } catch (error) {
      handleFirestoreError(error, OperationType.DELETE, `chat_messages/${messageId}`);
    }
  };

  const joinRoom = async (category: any) => {
    const roomId = `room_${category.id}`;
    const roomRef = doc(db, 'chat_rooms', roomId);
    
    // Ensure room exists
    await setDoc(roomRef, {
      id: roomId,
      categoryId: category.id,
      name: category.name,
      lastMessageAt: serverTimestamp()
    }, { merge: true });

    setActiveRoom({ id: roomId, ...category });
  };

  return (
    <div className="h-[calc(100vh-12rem)] flex gap-8">
      {/* Sidebar */}
      <div className="w-80 flex flex-col gap-6">
        <div className="bg-white p-6 rounded-[2.5rem] border border-neutral-100 shadow-sm space-y-6">
          <div className="flex p-1 bg-neutral-100 rounded-2xl">
            <button 
              onClick={() => setView('rooms')}
              className={cn(
                "flex-1 py-2 text-xs font-black uppercase tracking-widest rounded-xl transition-all",
                view === 'rooms' ? "bg-white text-neutral-900 shadow-sm" : "text-neutral-400"
              )}
            >
              Rooms
            </button>
            <button 
              onClick={() => setView('providers')}
              className={cn(
                "flex-1 py-2 text-xs font-black uppercase tracking-widest rounded-xl transition-all",
                view === 'providers' ? "bg-white text-neutral-900 shadow-sm" : "text-neutral-400"
              )}
            >
              Directory
            </button>
          </div>

          <div className="relative">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-neutral-400" />
            <input 
              type="text"
              placeholder={view === 'rooms' ? "Search rooms..." : "Search providers..."}
              className="w-full pl-12 pr-4 py-3 bg-neutral-50 border border-neutral-100 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-neutral-900"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
        </div>

        <div className="flex-1 bg-white rounded-[2.5rem] border border-neutral-100 shadow-sm overflow-hidden flex flex-col">
          <div className="p-6 border-b border-neutral-50">
            <h3 className="text-sm font-black italic uppercase tracking-tight">
              {view === 'rooms' ? 'Category Rooms' : 'Provider Directory'}
            </h3>
          </div>
          <div className="flex-1 overflow-y-auto p-4 space-y-2 custom-scrollbar">
            {view === 'rooms' ? (
              categories
                .filter(c => c.name.toLowerCase().includes(searchQuery.toLowerCase()))
                .map(cat => (
                  <button
                    key={cat.id}
                    onClick={() => joinRoom(cat)}
                    className={cn(
                      "w-full flex items-center gap-3 p-4 rounded-2xl transition-all group",
                      activeRoom?.id === `room_${cat.id}` ? "bg-neutral-900 text-white" : "hover:bg-neutral-50"
                    )}
                  >
                    <Hash className={cn("w-4 h-4", activeRoom?.id === `room_${cat.id}` ? "text-white/40" : "text-neutral-300")} />
                    <span className="font-bold text-sm">{cat.name}</span>
                  </button>
                ))
            ) : (
              providers
                .filter(p => p.displayName?.toLowerCase().includes(searchQuery.toLowerCase()))
                .map(p => (
                  <div key={p.id} className="p-4 rounded-2xl border border-neutral-50 hover:border-neutral-200 transition-all space-y-2">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 bg-neutral-900 text-white rounded-lg flex items-center justify-center text-[10px] font-black italic">
                        {p.displayName?.[0]}
                      </div>
                      <div>
                        <p className="text-sm font-bold">{p.displayName}</p>
                        <p className="text-[10px] text-neutral-400 uppercase font-black">{p.role}</p>
                      </div>
                    </div>
                  </div>
                ))
            )}
          </div>
        </div>
      </div>

      {/* Main Chat Area */}
      <div className="flex-1 flex flex-col bg-white rounded-[3rem] border border-neutral-100 shadow-sm overflow-hidden relative">
        {activeRoom ? (
          <>
            {/* Chat Header */}
            <div className="p-6 border-b border-neutral-50 flex items-center justify-between bg-neutral-50/50">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 bg-neutral-900 text-white rounded-2xl flex items-center justify-center">
                  <Hash className="w-6 h-6" />
                </div>
                <div>
                  <h2 className="text-xl font-black italic uppercase tracking-tight">{activeRoom.name} Room</h2>
                  <p className="text-xs text-neutral-400 font-bold uppercase tracking-widest">Provider Community Chat</p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <button className="p-3 text-neutral-400 hover:text-neutral-900 hover:bg-white rounded-xl transition-all">
                  <Users className="w-5 h-5" />
                </button>
                <button className="p-3 text-neutral-400 hover:text-neutral-900 hover:bg-white rounded-xl transition-all">
                  <Info className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* Messages */}
            <div 
              ref={scrollRef}
              className="flex-1 overflow-y-auto p-8 space-y-6 custom-scrollbar"
            >
              {messages.map((msg, i) => {
                const isMe = msg.senderId === auth.currentUser?.uid;
                return (
                  <div key={msg.id} className={cn("flex flex-col", isMe ? "items-end" : "items-start")}>
                    <div className="flex items-center gap-2 mb-1">
                      {!isMe && <span className="text-[10px] font-black uppercase text-neutral-400">{msg.senderName}</span>}
                      <span className="text-[8px] text-neutral-300 font-bold">
                        {msg.timestamp?.toDate().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </span>
                    </div>
                    <div className={cn(
                      "max-w-[70%] p-4 rounded-2xl text-sm leading-relaxed relative group/msg",
                      isMe ? "bg-neutral-900 text-white rounded-tr-none" : "bg-neutral-50 text-neutral-900 rounded-tl-none border border-neutral-100"
                    )}>
                      {msg.text}
                      {msg.isEdited && <span className="text-[8px] opacity-40 ml-2 italic">(edited)</span>}
                      
                      <MessageActions 
                        text={msg.text}
                        isOwner={isMe}
                        onUpdate={(newText) => handleUpdateMessage(msg.id, newText)}
                        onDelete={() => handleDeleteMessage(msg.id)}
                        className={cn(
                          "absolute top-2",
                          isMe ? "-left-8" : "-right-8"
                        )}
                      />
                    </div>
                  </div>
                );
              })}
              {messages.length === 0 && (
                <div className="h-full flex flex-col items-center justify-center text-center space-y-4 opacity-20">
                  <MessageSquare className="w-16 h-16" />
                  <p className="font-black uppercase tracking-widest text-xs">No messages yet. Start the conversation!</p>
                </div>
              )}
            </div>

            {/* Input Area */}
            <form onSubmit={handleSendMessage} className="p-6 bg-neutral-50/50 border-t border-neutral-50">
              <div className="relative">
                <input 
                  type="text"
                  placeholder="Type your message..."
                  className="w-full pl-6 pr-16 py-4 bg-white border border-neutral-200 rounded-2xl focus:outline-none focus:ring-2 focus:ring-neutral-900 shadow-sm"
                  value={newMessage}
                  onChange={(e) => setNewMessage(e.target.value)}
                />
                <button 
                  type="submit"
                  disabled={!newMessage.trim()}
                  className="absolute right-2 top-1/2 -translate-y-1/2 p-3 bg-neutral-900 text-white rounded-xl hover:scale-105 transition-all disabled:opacity-50"
                >
                  <Send className="w-4 h-4" />
                </button>
              </div>
            </form>
          </>
        ) : (
          <div className="flex-1 flex flex-col items-center justify-center p-12 text-center space-y-6">
            <div className="w-24 h-24 bg-neutral-50 rounded-[2.5rem] flex items-center justify-center">
              <MessageSquare className="w-10 h-10 text-neutral-200" />
            </div>
            <div className="space-y-2">
              <h2 className="text-2xl font-black italic uppercase tracking-tight">Provider Community</h2>
              <p className="text-neutral-500 max-w-sm mx-auto">
                Select a category room from the sidebar to start chatting with other professionals in your field.
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
